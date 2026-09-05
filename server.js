require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const { routeMessage, routeStream } = require("./services/router");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

/*
|--------------------------------------------------------------------------
| SECURITY
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(cors());

/*
|--------------------------------------------------------------------------
| REQUEST PARSING
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "25mb"
  })
);

/*
|--------------------------------------------------------------------------
| RATE LIMITING
|--------------------------------------------------------------------------
*/

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please wait a moment."
  }
});

/*
|--------------------------------------------------------------------------
| FRONTEND
|--------------------------------------------------------------------------
*/

app.use(express.static(path.join(__dirname, "public")));

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
  res.json({
    name: "Adnova AI",
    status: "online",
    version: "1.0.0",
    ai: process.env.GROQ_API_KEY ? "configured" : "missing",
    streaming: true,
    timestamp: new Date().toISOString()
  });
});

/*
|--------------------------------------------------------------------------
| NORMAL CHAT ENDPOINT
|--------------------------------------------------------------------------
*/

app.post("/api/chat", chatLimiter, async (req, res) => {
  try {
    const {
      messages,
      aiPreference
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "A valid messages array is required."
      });
    }

    if (messages.length > 50) {
      return res.status(400).json({
        error: "Conversation is too long."
      });
    }

    const invalidMessageIndex =
      messages.findIndex(message => {
        if (
          !message ||
          !["user", "assistant"].includes(message.role)
        ) {
          return true;
        }

        if (typeof message.content === "string") {
          return !message.content.trim();
        }

        if (Array.isArray(message.content)) {
          return !message.content.some(part =>
            part &&
            part.type === "text" &&
            typeof part.text === "string" &&
            part.text.trim()
          ) && !message.content.some(part =>
            part &&
            part.type === "image_url" &&
            typeof part.image_url?.url === "string"
          );
        }

        return true;
      });

    if (invalidMessageIndex !== -1) {
      const invalidMessage =
        messages[invalidMessageIndex];

      console.error(
        "Invalid streaming message:",
        JSON.stringify({
          index: invalidMessageIndex,
          role: invalidMessage?.role,
          contentType:
            Array.isArray(invalidMessage?.content)
              ? "array"
              : typeof invalidMessage?.content,
          parts:
            Array.isArray(invalidMessage?.content)
              ? invalidMessage.content.map(part => ({
                  type: part?.type,
                  hasText:
                    typeof part?.text === "string",
                  hasImageUrl:
                    typeof part?.image_url?.url === "string",
                  imageUrlPrefix:
                    typeof part?.image_url?.url === "string"
                      ? part.image_url.url.slice(0, 30)
                      : null
                }))
              : null
        })
      );

      return res.status(400).json({
        error:
          `Invalid message at index ${invalidMessageIndex}.`
      });
    }

    const reply =
      await routeMessage(
        messages,
        aiPreference
      );

    res.json({
      reply
    });
  } catch (error) {
    console.error("Chat error:", error.message);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Adnova encountered an error while processing your request."
      });
    }
  }
});

/*
|--------------------------------------------------------------------------
| STREAMING CHAT ENDPOINT
|--------------------------------------------------------------------------
*/

app.post("/api/chat/stream", chatLimiter, async (req, res) => {
  let clientDisconnected = false;

  req.on("aborted", () => {
    clientDisconnected = true;
  });

  res.on("close", () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
    }
  });

  try {
    const {
      messages,
      aiPreference
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "A valid messages array is required."
      });
    }

    if (messages.length > 50) {
      return res.status(400).json({
        error: "Conversation is too long."
      });
    }

    const invalidMessage = messages.some(message => {
      if (
        !message ||
        !["user", "assistant"].includes(message.role)
      ) {
        return true;
      }

      if (typeof message.content === "string") {
        return !message.content.trim();
      }

      if (Array.isArray(message.content)) {
        return !message.content.some(part =>
          part &&
          part.type === "text" &&
          typeof part.text === "string" &&
          part.text.trim()
        ) && !message.content.some(part =>
          part &&
          (
            (
              part.type === "image_url" &&
              typeof part.image_url?.url === "string"
            ) ||
            (
              part.type === "file_data" &&
              typeof part.file_data?.data_url === "string"
            )
          )
        );
      }

      return true;
    });

    if (invalidMessage) {
      return res.status(400).json({
        error: "One or more messages are invalid."
      });
    }

    res.setHeader(
      "Content-Type",
      "text/event-stream; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache, no-transform"
    );

    res.setHeader(
      "Connection",
      "keep-alive"
    );

    res.setHeader(
      "X-Accel-Buffering",
      "no"
    );

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    await routeStream(
      messages,
      async chunk => {
        if (clientDisconnected || res.writableEnded) {
          return;
        }

        res.write(
          `data: ${JSON.stringify({
            content: chunk
          })}\n\n`
        );
      },
      undefined,
      aiPreference
    );

    if (
      !clientDisconnected &&
      !res.writableEnded
    ) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error) {
    if (clientDisconnected) {
      return;
    }

    console.error(
      "Streaming chat error:",
      error.message
    );

    if (!res.headersSent) {
      return res.status(500).json({
        error:
          "Adnova encountered an error while processing your request."
      });
    }

    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({
          error:
            "Adnova encountered an error while generating the response."
        })}\n\n`
      );

      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});

/*
|--------------------------------------------------------------------------
| UNKNOWN API ROUTES
|--------------------------------------------------------------------------
*/

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      error: "API route not found."
    });
  }

  next();
});

/*
|--------------------------------------------------------------------------
| FRONTEND FALLBACK
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
  console.log("");
  console.log("================================");
  console.log("        ADNOVA AI ONLINE");
  console.log("================================");
  console.log(`Local: http://localhost:${PORT}`);
  console.log("");
});

/* =========================================================
   SIMPLE PDF TEXT READER
   PDF -> extracted text -> AI
   ========================================================= */

const { PDFParse } = require("pdf-parse");

app.post("/api/pdf-text", async (req, res) => {
  try {
    const dataUrl = req.body?.data_url;

    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
      return res.status(400).json({
        error: "Invalid PDF data."
      });
    }

    const match = dataUrl.match(/^data:application\/pdf;base64,(.+)$/);

    if (!match) {
      return res.status(400).json({
        error: "Only base64 PDF data is supported."
      });
    }

    const buffer = Buffer.from(match[1], "base64");

    if (!buffer.length) {
      return res.status(400).json({
        error: "PDF is empty."
      });
    }

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        error: "PDF is too large. Maximum size is 10MB."
      });
    }

    const pdf = new PDFParse({
      data: buffer
    });

    const result = await pdf.getText();

    await pdf.destroy();

    const text = String(result.text || "").trim();

    if (!text) {
      return res.status(400).json({
        error: "No readable text was found in this PDF."
      });
    }

    res.json({
      text,
      pages: result.total
    });

  } catch (error) {
    console.error("PDF extraction error:", error);

    res.status(500).json({
      error: "Unable to read this PDF."
    });
  }
});
