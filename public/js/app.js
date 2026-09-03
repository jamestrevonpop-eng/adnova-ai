const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const sendButton = document.getElementById("send-button");

let conversation = [];

let studyMode = false;

/* =========================================================
   CHAT HISTORY
   ========================================================= */

const CHAT_HISTORY_KEY = "adnova_chat_history_v1";

let chatHistory = [];
let currentChatId = null;

function createChatId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function loadChatHistory() {
  try {
    const stored =
      localStorage.getItem(
        CHAT_HISTORY_KEY
      );

    const parsed =
      stored
        ? JSON.parse(stored)
        : [];

    chatHistory =
      Array.isArray(parsed)
        ? parsed
        : [];
  } catch {
    chatHistory = [];
  }
}

function saveChatHistory() {
  try {
    localStorage.setItem(
      CHAT_HISTORY_KEY,
      JSON.stringify(
        chatHistory.slice(0, 50)
      )
    );
  } catch (error) {
    console.error(
      "Could not save chat history:",
      error
    );
  }
}

function getConversationTitle() {
  const firstUser =
    conversation.find(
      message =>
        message &&
        message.role === "user"
    );

  if (!firstUser) {
    return "New chat";
  }

  let text = "";

  if (
    typeof firstUser.content ===
    "string"
  ) {
    text = firstUser.content;
  } else if (
    Array.isArray(
      firstUser.content
    )
  ) {
    text =
      firstUser.content
        .filter(
          part =>
            part &&
            part.type ===
              "text"
        )
        .map(
          part =>
            part.text || ""
        )
        .join(" ");
  }

  text =
    text
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (!text) {
    return "New chat";
  }

  return text.length > 42
    ? `${text.slice(0, 42)}…`
    : text;
}

function saveCurrentChat() {
  if (
    !conversation.length
  ) {
    return;
  }

  if (!currentChatId) {
    currentChatId =
      createChatId();
  }

  const existingIndex =
    chatHistory.findIndex(
      chat =>
        chat.id ===
        currentChatId
    );

  const chat = {
    id: currentChatId,
    title:
      getConversationTitle(),
    updatedAt: Date.now(),
    messages:
      conversation
  };

  if (
    existingIndex === -1
  ) {
    chatHistory.unshift(
      chat
    );
  } else {
    chatHistory[
      existingIndex
    ] = chat;

    chatHistory.sort(
      (a, b) =>
        b.updatedAt -
        a.updatedAt
    );
  }

  saveChatHistory();
  renderChatHistory();
}

function renderChatHistory() {
  const list =
    document.getElementById(
      "chat-history-list"
    );

  if (!list) {
    return;
  }

  list.innerHTML = "";

  if (!chatHistory.length) {
    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "chat-history-empty";

    empty.textContent =
      "No saved chats yet.";

    list.appendChild(
      empty
    );

    return;
  }

  chatHistory
    .forEach(chat => {
      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.className =
        "chat-history-item";

      if (
        chat.id ===
        currentChatId
      ) {
        button.classList.add(
          "active"
        );
      }

      button.dataset.chatId =
        chat.id;

      button.textContent =
        chat.title ||
        "New chat";

      button.addEventListener(
        "click",
        () => {
          openChat(
            chat.id
          );
        }
      );

      list.appendChild(
        button
      );
    });
}

function openChat(chatId) {
  const chat =
    chatHistory.find(
      item =>
        item.id ===
        chatId
    );

  if (!chat) {
    return;
  }

  if (isGenerating) {
    stopGeneration();
  }

  currentChatId =
    chat.id;

  conversation =
    Array.isArray(
      chat.messages
    )
      ? JSON.parse(
          JSON.stringify(
            chat.messages
          )
        )
      : [];

  messages.innerHTML =
    "";

  welcome.classList.add(
    "hidden"
  );

  conversation.forEach(
    (message, index) => {
      if (
        !message ||
        !["user", "assistant"]
          .includes(
            message.role
          )
      ) {
        return;
      }

      let displayText = "";

      if (
        typeof message.content ===
        "string"
      ) {
        displayText =
          message.content;
      } else if (
        Array.isArray(
          message.content
        )
      ) {
        displayText =
          message.content
            .filter(
              part =>
                part &&
                part.type ===
                  "text"
            )
            .map(
              part =>
                part.text || ""
            )
            .join("\n")
            .trim();
      }

      if (
        message.role ===
          "user" &&
        !displayText
      ) {
        displayText =
          "Attachment";
      }

      const result =
        addMessage(
          displayText,
          message.role,
          {
            conversationIndex:
              index
          }
        );

      if (
        message.role ===
        "assistant"
      ) {
        addMessageActions(
          result.message,
          result.bubble,
          index
        );
      }
    }
  );

  renderChatHistory();

  requestAnimationFrame(
    () => {
      messages.scrollTop =
        messages.scrollHeight;
    }
  );
}

function startNewChat() {
  if (isGenerating) {
    stopGeneration();
  }

  saveCurrentChat();

  conversation = [];

  currentChatId = null;

  messages.innerHTML =
    "";

  welcome.classList.remove(
    "hidden"
  );

  clearAttachments();

  input.value = "";

  resizeInput();

  renderChatHistory();

  input.focus();
}

loadChatHistory();

let currentController = null;
let isGenerating = false;
let generationStopped = false;


/*
|--------------------------------------------------------------------------
| ATTACHMENT SYSTEM
|--------------------------------------------------------------------------
*/

const composer =
  document.getElementById("chat-form");

let attachments = [];
let attachmentList = null;

function formatAttachmentSize(bytes) {
  if (!Number.isFinite(bytes)) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeAttachmentText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderAttachments() {
  if (!attachmentList) {
    return;
  }

  attachmentList.innerHTML = "";

  if (!attachments.length) {
    attachmentList.hidden = true;
    return;
  }

  attachmentList.hidden = false;

  attachments.forEach(
    (attachment, index) => {
      if (!attachment) {
        return;
      }

      const chip =
        document.createElement("div");

      chip.className =
        "attachment-chip";

      chip.dataset.index =
        String(index);

      /* IMAGE PREVIEW */
      if (
        attachment.kind === "image" &&
        attachment.previewUrl
      ) {
        const preview =
          document.createElement("img");

        preview.src =
          attachment.previewUrl;

        preview.alt =
          attachment.name ||
          "Attached image";

        preview.className =
          "attachment-chip-preview";

        preview.addEventListener(
          "click",
          () => {
            openAttachmentPreview(
              attachment
            );
          }
        );

        chip.appendChild(
          preview
        );
      } else {
        const icon =
          document.createElement("div");

        icon.className =
          "attachment-chip-icon";

        if (
          attachment.kind === "web"
        ) {
          icon.textContent = "↗";
        } else if (
          attachment.type === "application/pdf" ||
          attachment.name
            ?.toLowerCase()
            .endsWith(".pdf")
        ) {
          icon.textContent = "PDF";
        } else if (
          attachment.type ===
          "text/plain"
        ) {
          icon.textContent = "TXT";
        } else if (
          attachment.type ===
          "text/csv"
        ) {
          icon.textContent = "CSV";
        } else {
          icon.textContent = "▧";
        }

        chip.appendChild(
          icon
        );
      }

      const info =
        document.createElement("div");

      info.className =
        "attachment-chip-info";

      const name =
        document.createElement("div");

      name.className =
        "attachment-chip-name";

      name.textContent =
        attachment.name ||
        "Attachment";

      const meta =
        document.createElement("div");

      meta.className =
        "attachment-chip-meta";

      if (attachment.kind === "web") {
        meta.textContent =
          "Web link";
      } else {
        meta.textContent =
          formatAttachmentSize(
            attachment.size
          );
      }

      info.appendChild(
        name
      );

      info.appendChild(
        meta
      );

      chip.appendChild(
        info
      );

      const remove =
        document.createElement("button");

      remove.type = "button";

      remove.className =
        "attachment-chip-remove";

      remove.setAttribute(
        "aria-label",
        `Remove ${
          attachment.name ||
          "attachment"
        }`
      );

      remove.textContent = "×";

      remove.addEventListener(
        "click",
        event => {
          event.stopPropagation();

          if (
            attachment.previewUrl
          ) {
            URL.revokeObjectURL(
              attachment.previewUrl
            );
          }

          attachments.splice(
            index,
            1
          );

          renderAttachments();
        }
      );

      chip.appendChild(
        remove
      );

      /* CLICK NON-IMAGE ATTACHMENTS */
      if (
        attachment.kind === "file" &&
        attachment.file
      ) {
        chip.addEventListener(
          "click",
          event => {
            if (
              event.target.closest(
                ".attachment-chip-remove"
              )
            ) {
              return;
            }

            openAttachmentPreview(
              attachment
            );
          }
        );
      }

      attachmentList.appendChild(
        chip
      );
    }
  );
}

function readFileAsDataUrl(file) {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload =
        () => resolve(
          reader.result
        );

      reader.onerror =
        () => reject(
          reader.error ||
          new Error(
            "Could not read the image."
          )
        );

      reader.readAsDataURL(
        file
      );
    }
  );
}

async function prepareAttachmentsForMessage() {
  const parts = [];

  for (const attachment of attachments) {
    if (!attachment) continue;

    /* IMAGE */
    if (attachment.kind === "image" && attachment.file) {
      if (!attachment.dataUrl) {
        attachment.dataUrl = await readFileAsDataUrl(attachment.file);
      }

      if (typeof attachment.dataUrl === "string") {
        parts.push({
          type: "image_url",
          image_url: {
            url: attachment.dataUrl
          }
        });
      }

      continue;
    }

    /* PDF */
    if (
      attachment.kind === "file" &&
      (
        attachment.type === "application/pdf" ||
        attachment.name?.toLowerCase().endsWith(".pdf")
      )
    ) {
      if (!attachment.dataUrl) {
        attachment.dataUrl = await readFileAsDataUrl(attachment.file);
      }

      const response = await fetch("/api/pdf-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          data_url: attachment.dataUrl
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to read PDF.");
      }

      parts.push({
        type: "text",
        text:
          `[ATTACHED PDF]
` +
          `Filename: ${attachment.name || "document.pdf"}
` +
          `Pages: ${data.pages || "unknown"}

` +
          `PDF CONTENT:
${data.text}

` +
          `[END ATTACHED PDF]`
      });

      continue;
    }

    /* WEB LINK */
    if (attachment.kind === "web" && attachment.url) {
      parts.push({
        type: "text",
        text: `Attached link: ${attachment.url}`
      });

      continue;
    }

    /* OTHER FILES */
    if (attachment.kind === "file" && attachment.name) {
      parts.push({
        type: "text",
        text:
          `Attached file: ${attachment.name}` +
          (attachment.type ? ` (${attachment.type})` : "")
      });
    }
  }

  return parts;
}

function createUserMessageContent(
  text,
  attachmentParts
) {
  const cleanText =
    String(text || "").trim();

  if (
    !attachmentParts.length
  ) {
    return cleanText;
  }

  const parts = [];

  if (cleanText) {
    parts.push({
      type: "text",
      text: cleanText
    });
  }

  parts.push(
    ...attachmentParts
  );

  return parts;
}

function showSentAttachments(
  bubble,
  sentParts,
  sourceAttachments = []
) {
  if (
    !bubble ||
    !Array.isArray(sentParts)
  ) {
    return;
  }

  if (!sentParts.length) {
    return;
  }

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "sent-attachments";

  sourceAttachments.forEach(
    attachment => {
      if (!attachment) {
        return;
      }

      const item =
        document.createElement("div");

      item.className =
        "sent-attachment";

      if (
        attachment.kind === "image" &&
        attachment.previewUrl
      ) {
        const image =
          document.createElement("img");

        image.src =
          attachment.previewUrl;

        image.alt =
          attachment.name ||
          "Attached image";

        image.className =
          "sent-image-attachment";

        item.appendChild(
          image
        );

        wrapper.appendChild(
          item
        );

        return;
      }

      if (
        attachment.kind === "web" &&
        attachment.url
      ) {
        const icon =
          document.createElement("div");

        icon.className =
          "sent-attachment-icon";

        icon.textContent =
          "↗";

        const content =
          document.createElement("div");

        content.className =
          "sent-attachment-content";

        const title =
          document.createElement("div");

        title.className =
          "sent-attachment-title";

        title.textContent =
          attachment.name ||
          "Web link";

        const link =
          document.createElement("a");

        link.className =
          "sent-attachment-link";

        link.href =
          attachment.url;

        link.target =
          "_blank";

        link.rel =
          "noopener noreferrer";

        link.textContent =
          attachment.url;

        content.appendChild(
          title
        );

        content.appendChild(
          link
        );

        item.appendChild(
          icon
        );

        item.appendChild(
          content
        );

        wrapper.appendChild(
          item
        );

        return;
      }

      if (
        attachment.kind === "file"
      ) {
        const icon =
          document.createElement("div");

        icon.className =
          "sent-attachment-icon";

        icon.textContent =
          "▧";

        const content =
          document.createElement("div");

        content.className =
          "sent-attachment-content";

        const title =
          document.createElement("div");

        title.className =
          "sent-attachment-title";

        title.textContent =
          attachment.name ||
          "Attached file";

        const meta =
          document.createElement("div");

        meta.className =
          "sent-attachment-meta";

        meta.textContent =
          [
            attachment.type ||
              "File",
            formatAttachmentSize(
              attachment.size
            )
          ]
            .filter(Boolean)
            .join(" • ");

        content.appendChild(
          title
        );

        content.appendChild(
          meta
        );

        item.appendChild(
          icon
        );

        item.appendChild(
          content
        );

        wrapper.appendChild(
          item
        );
      }
    }
  );

  if (
    wrapper.children.length
  ) {
    bubble.prepend(
      wrapper
    );
  }
}


function openAttachmentPreview(
  attachment
) {
  if (!attachment) {
    return;
  }

  let overlay =
    document.getElementById(
      "attachment-preview-overlay"
    );

  if (!overlay) {
    overlay =
      document.createElement("div");

    overlay.id =
      "attachment-preview-overlay";

    overlay.className =
      "attachment-preview-overlay";

    overlay.innerHTML = `
      <div class="attachment-preview-backdrop"></div>
      <div class="attachment-preview-window" role="dialog" aria-modal="true">
        <button
          type="button"
          class="attachment-preview-close"
          aria-label="Close preview"
        >
          ×
        </button>

        <div class="attachment-preview-content"></div>
        <div class="attachment-preview-name"></div>
      </div>
    `;

    document.body.appendChild(
      overlay
    );

    const close =
      () => {
        overlay.classList.remove(
          "open"
        );
      };

    overlay
      .querySelector(
        ".attachment-preview-backdrop"
      )
      .addEventListener(
        "click",
        close
      );

    overlay
      .querySelector(
        ".attachment-preview-close"
      )
      .addEventListener(
        "click",
        close
      );

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Escape"
        ) {
          close();
        }
      }
    );
  }

  const content =
    overlay.querySelector(
      ".attachment-preview-content"
    );

  const name =
    overlay.querySelector(
      ".attachment-preview-name"
    );

  content.innerHTML = "";

  name.textContent =
    attachment.name ||
    "Attachment";

  if (
    attachment.kind === "image" &&
    attachment.previewUrl
  ) {
    const image =
      document.createElement("img");

    image.src =
      attachment.previewUrl;

    image.alt =
      attachment.name ||
      "Attached image";

    image.className =
      "attachment-preview-image";

    content.appendChild(
      image
    );
  } else {
    const card =
      document.createElement("div");

    card.className =
      "attachment-preview-file";

    card.innerHTML = `
      <div class="attachment-preview-file-icon">▧</div>
      <div class="attachment-preview-file-name"></div>
      <div class="attachment-preview-file-meta"></div>
    `;

    card.querySelector(
      ".attachment-preview-file-name"
    ).textContent =
      attachment.name ||
      "Attached file";

    card.querySelector(
      ".attachment-preview-file-meta"
    ).textContent =
      attachment.type ||
      "File";

    content.appendChild(
      card
    );
  }

  overlay.classList.add(
    "open"
  );
}

function clearAttachments() {
  attachments.forEach(
    attachment => {
      if (
        attachment?.previewUrl
      ) {
        URL.revokeObjectURL(
          attachment.previewUrl
        );
      }
    }
  );

  attachments = [];

  renderAttachments();
}

function addAttachment(file) {
  if (!(file instanceof File)) {
    return;
  }

  const isImage =
    typeof file.type === "string" &&
    file.type.startsWith("image/");

  const existing = attachments.some(
    attachment =>
      attachment &&
      attachment.kind === (isImage ? "image" : "file") &&
      attachment.name === file.name &&
      attachment.size === file.size &&
      attachment.type === file.type
  );

  if (existing) {
    return;
  }

  attachments.push({
    kind: isImage ? "image" : "file",
    name: file.name || (isImage ? "Image" : "File"),
    type: file.type || "application/octet-stream",
    size: Number(file.size) || 0,
    file,
    previewUrl: isImage
      ? URL.createObjectURL(file)
      : null,
    dataUrl: null
  });

  renderAttachments();
}

function addWebAttachment(url) {
  const value =
    String(url || "").trim();

  if (!value) {
    return;
  }

  let parsed;

  try {
    parsed =
      new URL(value);
  } catch {
    return;
  }

  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {
    return;
  }

  attachments.push({
    kind: "web",
    name:
      parsed.hostname +
      parsed.pathname,
    url: value,
    type: "text/uri-list",
    size: 0
  });

  renderAttachments();
}

function detectAndAttachUrls(text) {
  const value =
    String(text || "");

  const matches =
    value.match(
      /https?:\/\/[^\s<>"']+/gi
    );

  if (!matches) {
    return;
  }

  matches.forEach(
    url => {
      const cleanUrl =
        url.replace(
          /[.,!?;:)]$/,
          ""
        );

      if (
        !cleanUrl
      ) {
        return;
      }

      const exists =
        attachments.some(
          attachment =>
            attachment &&
            attachment.kind ===
              "web" &&
            attachment.url ===
              cleanUrl
        );

      if (!exists) {
        addWebAttachment(
          cleanUrl
        );
      }
    }
  );
}

function createAttachmentSystem() {
  if (
    !composer ||
    document.getElementById(
      "attachment-button"
    )
  ) {
    return;
  }

  const button =
    document.createElement("button");

  button.id =
    "attachment-button";

  button.type = "button";
  button.className =
    "attachment-button";

  button.setAttribute(
    "aria-label",
    "Add attachment"
  );

  button.setAttribute(
    "aria-expanded",
    "false"
  );

  button.innerHTML = `
    <span class="attachment-plus" aria-hidden="true">+</span>
    <span class="attachment-close" aria-hidden="true">×</span>
  `;

  const panel =
    document.createElement("div");

  panel.id =
    "attachment-panel";

  panel.className =
    "attachment-panel";

  panel.innerHTML = `
    <div class="attachment-panel-title">
      Add to your message
    </div>

    <button
      type="button"
      class="attachment-option"
      data-attachment-action="file"
    >
      <span class="attachment-option-icon">▧</span>
      <span class="attachment-option-text">
        <span class="attachment-option-title">
          Upload file
        </span>
        <span class="attachment-option-subtitle">
          PDFs, documents and other files
        </span>
      </span>
    </button>

    <button
      type="button"
      class="attachment-option"
      data-attachment-action="image"
    >
      <span class="attachment-option-icon">▣</span>
      <span class="attachment-option-text">
        <span class="attachment-option-title">
          Upload image
        </span>
        <span class="attachment-option-subtitle">
          Add an image for analysis
        </span>
      </span>
    </button>

    <button
      type="button"
      class="attachment-option"
      data-attachment-action="web"
    >
      <span class="attachment-option-icon">↗</span>
      <span class="attachment-option-text">
        <span class="attachment-option-title">
          Add from web
        </span>
        <span class="attachment-option-subtitle">
          Paste a webpage or image URL
        </span>
      </span>
    </button>

    <div class="attachment-web-box">
      <input
        class="attachment-web-input"
        type="url"
        placeholder="https://example.com"
        autocomplete="off"
      >

      <button
        class="attachment-web-add"
        type="button"
      >
        Add
      </button>
    </div>
  `;

  attachmentList =
    document.createElement("div");

  attachmentList.id =
    "attachment-list";

  attachmentList.className =
    "attachment-list";

  attachmentList.hidden = true;

  const fileInput =
    document.createElement("input");

  fileInput.type = "file";
  fileInput.hidden = true;
  fileInput.multiple = true;

  const imageInput =
    document.createElement("input");

  imageInput.type = "file";
  imageInput.hidden = true;
  imageInput.accept =
    "image/*";
  imageInput.multiple = true;

  composer.insertBefore(
    attachmentList,
    composer.firstChild
  );

  composer.appendChild(
    panel
  );

  composer.insertBefore(
    button,
    sendButton
  );

  document.body.appendChild(
    fileInput
  );

  document.body.appendChild(
    imageInput
  );

  function closePanel() {
    button.classList.remove(
      "active"
    );

    button.setAttribute(
      "aria-expanded",
      "false"
    );

    panel.classList.remove(
      "open"
    );

    const webBox =
      panel.querySelector(
        ".attachment-web-box"
      );

    webBox?.classList.remove(
      "open"
    );
  }

  button.addEventListener(
    "click",
    () => {
      const isOpen =
        panel.classList.toggle(
          "open"
        );

      button.classList.toggle(
        "active",
        isOpen
      );

      button.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    }
  );

  panel.addEventListener(
    "click",
    event => {
      const option =
        event.target.closest(
          "[data-attachment-action]"
        );

      if (!option) {
        return;
      }

      const action =
        option.dataset
          .attachmentAction;

      if (action === "file") {
        fileInput.click();
        return;
      }

      if (action === "image") {
        imageInput.click();
        return;
      }

      if (action === "web") {
        panel
          .querySelector(
            ".attachment-web-box"
          )
          ?.classList.add(
            "open"
          );

        panel
          .querySelector(
            ".attachment-web-input"
          )
          ?.focus();
      }
    }
  );

  fileInput.addEventListener(
    "change",
    () => {
      Array.from(
        fileInput.files || []
      ).forEach(addAttachment);

      fileInput.value = "";
      closePanel();
    }
  );

  imageInput.addEventListener(
    "change",
    () => {
      Array.from(
        imageInput.files || []
      ).forEach(addAttachment);

      imageInput.value = "";
      closePanel();
    }
  );

  const webInput =
    panel.querySelector(
      ".attachment-web-input"
    );

  const webAdd =
    panel.querySelector(
      ".attachment-web-add"
    );

  function submitWebUrl() {
    addWebAttachment(
      webInput.value
    );

    webInput.value = "";
    closePanel();
  }

  webAdd.addEventListener(
    "click",
    submitWebUrl
  );

  webInput.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter"
      ) {
        event.preventDefault();
        submitWebUrl();
      }
    }
  );

  composer.addEventListener(
    "dragover",
    event => {
      event.preventDefault();

      composer.classList.add(
        "drag-over"
      );
    }
  );

  composer.addEventListener(
    "dragleave",
    event => {
      if (
        !composer.contains(
          event.relatedTarget
        )
      ) {
        composer.classList.remove(
          "drag-over"
        );
      }
    }
  );

  composer.addEventListener(
    "drop",
    event => {
      event.preventDefault();

      composer.classList.remove(
        "drag-over"
      );

      const files =
        Array.from(
          event.dataTransfer?.files ||
          []
        );

      files.forEach(
        addAttachment
      );
    }
  );

  input.addEventListener(
    "paste",
    event => {
      const items =
        Array.from(
          event.clipboardData?.items ||
          []
        );

      let foundImage =
        false;

      items.forEach(
        item => {
          if (
            item.kind !== "file" ||
            !item.type.startsWith(
              "image/"
            )
          ) {
            return;
          }

          const file =
            item.getAsFile();

          if (file) {
            addAttachment(file);
            foundImage = true;
          }
        }
      );

      if (foundImage) {
        event.preventDefault();
        renderAttachments();
      }
    }
  );

  document.addEventListener(
    "click",
    event => {
      if (
        !composer.contains(
          event.target
        )
      ) {
        closePanel();
      }
    }
  );
}

createAttachmentSystem();

/*
|--------------------------------------------------------------------------
| CODE BLOCK ACTIONS
|--------------------------------------------------------------------------
*/

document.addEventListener(
  "click",
  async event => {
    const button =
      event.target.closest(
        ".copy-code-button"
      );

    if (!button) {
      return;
    }

    const codeBlock =
      button.closest(".code-block");

    const code =
      codeBlock?.querySelector("pre code");

    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        code.textContent
      );

      const originalText =
        button.textContent;

      button.textContent =
        "Copied!";

      button.classList.add(
        "copied"
      );

      setTimeout(() => {
        button.textContent =
          originalText;
        button.classList.remove(
          "copied"
        );
      }, 1400);
    } catch {
      button.textContent =
        "Failed";

      setTimeout(() => {
        button.textContent =
          "Copy";
      }, 1400);
    }
  }
);

/*
|--------------------------------------------------------------------------
| INPUT
|--------------------------------------------------------------------------
*/

function resizeInput() {
  input.style.height = "auto";

  const height = Math.min(input.scrollHeight, 180);

  input.style.height = `${height}px`;
  input.style.overflowY =
    input.scrollHeight > 180 ? "auto" : "hidden";
}

/*
|--------------------------------------------------------------------------
| TEXT CLEANING
|--------------------------------------------------------------------------
*/

function cleanText(text) {
  return String(text)
    .replace(/\u00A0/g, " ")
    .replace(/\u202F/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\\\/g, "\\");
}

/*
|--------------------------------------------------------------------------
| HTML ESCAPING
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| INLINE MARKDOWN
|--------------------------------------------------------------------------
*/

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatInline(text) {
  let result = escapeHtml(text);

  /*
   * Markdown links
   * [Open website](https://example.com)
   */
  result = result.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  /*
   * Plain URLs
   * https://example.com
   */
  result = result.replace(
    /(^|[\s>])(https?:\/\/[^\s<]+)/g,
    '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
  );

  /*
   * Bold
   */
  result = result.replace(
    /\*\*(.+?)\*\*/g,
    "<strong>$1</strong>"
  );

  /*
   * Italic
   */
  result = result.replace(
    /(?<!\*)\*([^*]+?)\*(?!\*)/g,
    "<em>$1</em>"
  );

  /*
   * Inline code
   */
  result = result.replace(
    /`([^`]+)`/g,
    "<code>$1</code>"
  );

  return result;
}
function renderCodeBlock(code, language = "") {
  const cleanCode = code.trim();

  const cleanLanguage = language
    ? language.trim().toLowerCase()
    : "";

  const label = cleanLanguage || "code";

  return `
    <div class="code-block">
      <div class="code-header">
        <span class="code-language">${escapeHtml(label)}</span>

        <button
          class="copy-code-button"
          type="button"
          aria-label="Copy code"
          title="Copy code"
        >
          Copy
        </button>
      </div>

      <pre><code>${escapeHtml(cleanCode)}</code></pre>
    </div>
  `;
}

/*
|--------------------------------------------------------------------------
| TABLES
|--------------------------------------------------------------------------
*/

function renderTable(lines) {
  if (!Array.isArray(lines) || lines.length < 2) {
    return lines.map(formatInline).join("<br>");
  }

  function splitRow(line) {
    let cells =
      String(line)
        .trim()
        .split("|")
        .map(cell => cell.trim());

    if (cells[0] === "") {
      cells.shift();
    }

    if (
      cells.length > 0 &&
      cells[cells.length - 1] === ""
    ) {
      cells.pop();
    }

    return cells;
  }

  const headerCells =
    splitRow(lines[0]);

  const separatorCells =
    splitRow(lines[1]);

  /*
  |--------------------------------------------------------------------------
  | VALIDATE TABLE STRUCTURE
  |--------------------------------------------------------------------------
  */

  const validSeparator =
    separatorCells.length ===
      headerCells.length &&
    separatorCells.length > 0 &&
    separatorCells.every(cell =>
      /^:?-+:?$/.test(cell)
    );

  if (
    !validSeparator ||
    headerCells.length === 0
  ) {
    return lines
      .map(formatInline)
      .join("<br>");
  }

  const bodyLines =
    lines.slice(2);

  const headers =
    headerCells
      .map(cell =>
        `<th>${formatInline(cell)}</th>`
      )
      .join("");

  const rows =
    bodyLines
      .map(line => {
        const cells =
          splitRow(line);

        /*
        |--------------------------------------------------------------------------
        | INVALID ROW
        |--------------------------------------------------------------------------
        |
        | Do not let one malformed row destroy the table.
        |
        */

        if (
          cells.length !==
          headerCells.length
        ) {
          return "";
        }

        return `
          <tr>
            ${cells
              .map(cell =>
                `<td>${formatInline(cell)}</td>`
              )
              .join("")}
          </tr>
        `;
      })
      .join("");

  return `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>${headers}</tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

/*
|--------------------------------------------------------------------------
| MARKDOWN
|--------------------------------------------------------------------------
*/


function highlightCodeBlocks(container) {
  if (
    !container ||
    typeof hljs === "undefined"
  ) {
    return;
  }

  const blocks =
    container.querySelectorAll(
      "pre code"
    );

  blocks.forEach((block) => {
    if (
      block.dataset.highlighted === "yes"
    ) {
      return;
    }

    const languageClass =
      Array.from(
        block.classList
      ).find((className) =>
        className.startsWith(
          "language-"
        )
      );

    if (languageClass) {
      const language =
        languageClass
          .replace(
            "language-",
            ""
          )
          .toLowerCase();

      const aliases = {
        js: "javascript",
        jsx: "javascript",
        ts: "typescript",
        tsx: "typescript",
        py: "python",
        rb: "ruby",
        sh: "bash",
        shell: "bash",
        yml: "yaml",
        md: "markdown",
        html: "xml",
        svg: "xml",
        cs: "csharp",
        cpp: "cpp",
        cxx: "cpp"
      };

      const resolved =
        aliases[language] ||
        language;

      if (
        hljs.getLanguage(
          resolved
        )
      ) {
        block.classList.add(
          `language-${resolved}`
        );
      }
    }

    hljs.highlightElement(
      block
    );
  });
}



function renderMath(container) {
  if (
    !container ||
    typeof katex === "undefined"
  ) {
    return;
  }

  const walker =
    document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT
    );

  const nodes = [];
  let node;

  while (
    (node = walker.nextNode())
  ) {
    const parent =
      node.parentElement;

    if (!parent) {
      continue;
    }

    if (
      parent.closest(
        "pre, code, .katex, .math-inline, .math-display"
      )
    ) {
      continue;
    }

    if (
      !node.nodeValue ||
      !node.nodeValue.trim()
    ) {
      continue;
    }

    nodes.push(node);
  }

  nodes.forEach((textNode) => {
    let text =
      String(textNode.nodeValue);

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE ESCAPED AI LATEX
    |--------------------------------------------------------------------------
    |
    | Some model responses arrive with doubled backslashes:
    |
    | \\[ ... \\]
    |
    | Convert those delimiters back to normal LaTeX delimiters.
    |
    */

    text =
      text.replace(
        /\\\\/g,
        "\\"
      );

    /*
    |--------------------------------------------------------------------------
    | LATEX DELIMITERS
    |--------------------------------------------------------------------------
    */

    const pattern =
      /(\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|(?<!\\)\$([^$\n]+)\$)/g;

    if (!pattern.test(text)) {
      return;
    }

    pattern.lastIndex = 0;

    const fragment =
      document.createDocumentFragment();

    let lastIndex = 0;
    let match;

    while (
      (match = pattern.exec(text))
    ) {
      if (
        match.index > lastIndex
      ) {
        fragment.appendChild(
          document.createTextNode(
            text.slice(
              lastIndex,
              match.index
            )
          )
        );
      }

      const math =
        match[2] ??
        match[3] ??
        match[4] ??
        match[5];

      const isDisplay =
        Boolean(match[2]) ||
        Boolean(match[3]);

      const mathElement =
        document.createElement(
          isDisplay
            ? "div"
            : "span"
        );

      mathElement.className =
        isDisplay
          ? "math-display"
          : "math-inline";

      try {
        katex.render(
          math.trim(),
          mathElement,
          {
            displayMode:
              isDisplay,
            throwOnError:
              false,
            strict:
              "ignore"
          }
        );
      } catch {
        mathElement.textContent =
          match[0];
      }

      fragment.appendChild(
        mathElement
      );

      lastIndex =
        pattern.lastIndex;
    }

    if (
      lastIndex < text.length
    ) {
      fragment.appendChild(
        document.createTextNode(
          text.slice(lastIndex)
        )
      );
    }

    textNode.parentNode.replaceChild(
      fragment,
      textNode
    );
  });
}

function formatMessage(text) {
  const cleaned =
    cleanText(text);

  if (
    typeof markdownit === "undefined"
  ) {
    return escapeHtml(cleaned)
      .replace(/\n/g, "<br>");
  }

  const md =
    window.markdownit({
      html: false,
      linkify: true,
      breaks: true
    });

  if (
    typeof texmath !== "undefined" &&
    typeof katex !== "undefined"
  ) {
    md.use(
      texmath,
      {
        engine: window.katex,
        delimiters: [
          "dollars",
          "brackets"
        ],
        katexOptions: {
          throwOnError: false,
          strict: "ignore"
        }
      }
    );
  }

  return md.render(cleaned);
}

/*
|--------------------------------------------------------------------------
| MESSAGE ACTIONS
|--------------------------------------------------------------------------
*/

function createActionButton(
  className,
  label,
  title
) {
  const button =
    document.createElement("button");

  button.type = "button";
  button.className =
    `message-action ${className}`;

  button.textContent = label;

  button.setAttribute(
    "aria-label",
    title
  );

  button.title = title;

  return button;
}

function addMessageActions(
  message,
  bubble,
  conversationIndex
) {
  const existing =
    message.querySelector(
      ".message-actions"
    );

  if (existing) {
    existing.remove();
  }

  if (
    typeof conversationIndex !== "number" ||
    !conversation[conversationIndex]
  ) {
    return;
  }

  const actions =
    document.createElement("div");

  actions.className =
    "message-actions";

  if (
    conversation[conversationIndex].role ===
    "user"
  ) {
    const editButton =
      createActionButton(
        "edit-message-button",
        "Edit",
        "Edit message"
      );

    editButton.addEventListener(
      "click",
      () => {
        startEditingMessage(
          message,
          bubble,
          conversationIndex
        );
      }
    );

    actions.appendChild(editButton);
  } else {
    const copyButton =
      createActionButton(
        "copy-response-button",
        "Copy",
        "Copy response"
      );

    copyButton.addEventListener(
      "click",
      async () => {
        try {
          await navigator.clipboard.writeText(
            bubble.textContent
          );

          copyButton.textContent =
            "Copied!";

          setTimeout(() => {
            copyButton.textContent =
              "Copy";
          }, 1500);
        } catch {
          copyButton.textContent =
            "Failed";

          setTimeout(() => {
            copyButton.textContent =
              "Copy";
          }, 1500);
        }
      }
    );

    actions.appendChild(copyButton);

    const regenerateButton =
      createActionButton(
        "regenerate-button",
        "Regenerate",
        "Regenerate response"
      );

    regenerateButton.addEventListener(
      "click",
      () => {
        regenerateResponse(
          message,
          conversationIndex
        );
      }
    );

    actions.appendChild(
      regenerateButton
    );
  }

  message.appendChild(actions);
}
/*
|--------------------------------------------------------------------------
| EDIT MESSAGE
|--------------------------------------------------------------------------
*/

function startEditingMessage(
  messageElement,
  bubble,
  messageIndex
) {
  if (
    !conversation[messageIndex] ||
    conversation[messageIndex].role !== "user"
  ) {
    return;
  }

  if (isGenerating) {
    return;
  }

  const originalText =
    conversation[messageIndex].content;

  bubble.innerHTML = "";

  const textarea =
    document.createElement("textarea");

  textarea.className =
    "message-edit-area";

  textarea.value =
    originalText;

  const editActions =
    document.createElement("div");

  editActions.className =
    "message-edit-actions";

  const cancelButton =
    document.createElement("button");

  cancelButton.type =
    "button";

  cancelButton.className =
    "message-edit-cancel";

  cancelButton.textContent =
    "Cancel";

  const saveButton =
    document.createElement("button");

  saveButton.type =
    "button";

  saveButton.className =
    "message-edit-save";

  saveButton.textContent =
    "Save & resend";

  cancelButton.addEventListener(
    "click",
    () => {
      bubble.innerHTML =
        formatMessage(originalText);

      addMessageActions(
        messageElement,
        bubble,
        messageIndex
      );
    }
  );

  saveButton.addEventListener(
    "click",
    async () => {
      const newText =
        textarea.value.trim();

      if (!newText) {
        textarea.focus();
        return;
      }

      conversation =
        conversation.slice(
          0,
          messageIndex
        );

      conversation.push({
        role: "user",
        content: newText
      });

      let nextMessage =
        messageElement.nextElementSibling;

      while (nextMessage) {
        const current =
          nextMessage;

        nextMessage =
          nextMessage.nextElementSibling;

        current.remove();
      }

      bubble.innerHTML =
        formatMessage(newText);

      addMessageActions(
        messageElement,
        bubble,
        messageIndex
      );

      const result =
        addMessage(
          "",
          "assistant"
        );

      setGenerating(true);

      generationStopped =
        false;

      try {
        const reply =
          await streamMessage(
            result.bubble
          );

        if (reply) {
          conversation.push({
            role: "assistant",
            content: reply
          });

          addMessageActions(
            result.message,
            result.bubble,
            conversation.length - 1
          );
        } else {
          result.bubble.innerHTML =
            "<p>I didn't receive a response.</p>";
        }
      } catch (error) {
        if (
          error.name !==
          "AbortError"
        ) {
          result.bubble.innerHTML =
            formatMessage(
              `Sorry — ${
                error.message ||
                "something went wrong."
              }`
            );
        }
      } finally {
        currentController =
          null;

        setGenerating(false);

        input.focus();

        messages.scrollTop =
          messages.scrollHeight;
      }
    }
  );

  editActions.appendChild(
    cancelButton
  );

  editActions.appendChild(
    saveButton
  );

  bubble.appendChild(
    textarea
  );

  bubble.appendChild(
    editActions
  );

  textarea.focus();

  textarea.setSelectionRange(
    textarea.value.length,
    textarea.value.length
  );
}

/*
|--------------------------------------------------------------------------
| ADD MESSAGE
|--------------------------------------------------------------------------
*/

function addMessage(
  text,
  type,
  options = {}
) {
  const message =
    document.createElement("div");

  message.className =
    `message ${type}`;

  const bubble =
    document.createElement("div");

  bubble.className =
    "message-bubble";

  bubble.innerHTML =
    formatMessage(text);

  highlightCodeBlocks(
    bubble
  );

  renderMath(
    bubble
  );

  message.appendChild(bubble);

  messages.appendChild(message);

  welcome.classList.add("hidden");

  requestAnimationFrame(() => {
    messages.scrollTop =
      messages.scrollHeight;
  });

  if (
    type === "assistant" &&
    options.actions
  ) {
    addMessageActions(
      message,
      bubble,
      options.conversationIndex
    );
  }

  if (
    type === "user" &&
    typeof options.conversationIndex === "number"
  ) {
    addMessageActions(
      message,
      bubble,
      options.conversationIndex
    );
  }

  return {
    message,
    bubble
  };
}

/*
|--------------------------------------------------------------------------
| THINKING INDICATOR
|--------------------------------------------------------------------------
*/

function showThinking(bubble) {
  bubble.innerHTML = `
    <div class="thinking-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
}

/*
|--------------------------------------------------------------------------
| COPY CODE
|--------------------------------------------------------------------------
*/

async function copyCode(button) {
  const codeBlock =
    button.closest(".code-block");

  if (!codeBlock) return;

  const code =
    codeBlock.querySelector("code");

  if (!code) return;

  try {
    await navigator.clipboard.writeText(
      code.textContent
    );

    button.textContent =
      "Copied!";

    setTimeout(() => {
      button.textContent =
        "Copy";
    }, 1500);
  } catch {
    button.textContent =
      "Failed";

    setTimeout(() => {
      button.textContent =
        "Copy";
    }, 1500);
  }
}

messages.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest(
        ".copy-code-button"
      );

    if (button) {
      copyCode(button);
    }
  }
);

/*
|--------------------------------------------------------------------------
| SEND / STOP BUTTON
|--------------------------------------------------------------------------
*/

function setGenerating(generating) {
  isGenerating =
    generating;

  input.disabled =
    generating;

  sendButton.disabled =
    false;

  if (generating) {
    sendButton.innerHTML = `
      <svg
        class="stop-icon"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="2"
          width="10"
          height="10"
          rx="2"
          fill="currentColor"
        />
      </svg>
    `;

    sendButton.setAttribute(
      "aria-label",
      "Stop generating"
    );

    sendButton.title =
      "Stop generating";

    sendButton.classList.add(
      "stop-mode"
    );
  } else {
    sendButton.innerHTML = `
      <svg
        class="send-icon"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          d="M10 15V5M6 9L10 5L14 9"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;

    sendButton.setAttribute(
      "aria-label",
      "Send message"
    );

    sendButton.title =
      "Send message";

    sendButton.classList.remove(
      "stop-mode"
    );
  }
}

/*
|--------------------------------------------------------------------------
| STREAM RESPONSE
|--------------------------------------------------------------------------
*/

async function streamMessage(
  assistantBubble
) {
  currentController =
    new AbortController();

  const response =
    await fetch(
      "/api/chat/stream",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          messages: conversation
        }),
        signal:
          currentController.signal
      }
    );

  if (!response.ok) {
    let data = {};

    try {
      data =
        await response.json();
    } catch {
      // Ignore invalid error response.
    }

    throw new Error(
      data.error ||
        "Adnova could not process that request."
    );
  }

  if (!response.body) {
    throw new Error(
      "Streaming is not supported by this browser."
    );
  }

  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder();

  let buffer = "";
  let fullResponse = "";
  let finished = false;
  let receivedFirstChunk =
    false;

  showThinking(
    assistantBubble
  );

  while (!finished) {
    const { value, done } =
      await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(
      value,
      {
        stream: true
      }
    );

    const events =
      buffer.split("\n\n");

    buffer =
      events.pop() || "";

    for (const event of events) {
      const lines =
        event.split("\n");

      for (const eventLine of lines) {
        if (
          !eventLine.startsWith(
            "data:"
          )
        ) {
          continue;
        }

        const data =
          eventLine
            .slice(5)
            .trim();

        if (!data) {
          continue;
        }

        if (
          data === "[DONE]"
        ) {
          finished = true;
          break;
        }

        let parsed;

        try {
          parsed =
            JSON.parse(data);
        } catch {
          continue;
        }

        if (parsed.error) {
          throw new Error(
            parsed.error
          );
        }

        if (
          typeof parsed.content !==
          "string"
        ) {
          continue;
        }

        if (!receivedFirstChunk) {
          receivedFirstChunk =
            true;
        }

        fullResponse +=
          parsed.content;

        assistantBubble.innerHTML =
          formatMessage(
            fullResponse
          );

        messages.scrollTop =
          messages.scrollHeight;
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | FINAL RESPONSE RENDERING
  |--------------------------------------------------------------------------
  |
  | Streaming updates replace the bubble HTML directly, so the final
  | response must be passed through the code and LaTeX renderers here.
  |
  */

  highlightCodeBlocks(
    assistantBubble
  );

  renderMath(
    assistantBubble
  );

  return fullResponse;
}

/*
|--------------------------------------------------------------------------
| STOP
|--------------------------------------------------------------------------
*/

function stopGeneration() {
  if (!currentController) {
    return;
  }

  generationStopped =
    true;

  currentController.abort();
}

/*
|--------------------------------------------------------------------------
| REGENERATE
|--------------------------------------------------------------------------
*/

async function regenerateResponse(
  assistantMessage,
  assistantConversationIndex
) {
  if (isGenerating) {
    return;
  }

  const userIndex =
    assistantConversationIndex - 1;

  if (
    userIndex < 0 ||
    !conversation[userIndex] ||
    conversation[userIndex].role !==
      "user"
  ) {
    return;
  }

  conversation.splice(
    assistantConversationIndex,
    1
  );

  assistantMessage.remove();

  const userMessage =
    conversation[userIndex];

  const result =
    addMessage(
      "",
      "assistant"
    );

  setGenerating(true);

  generationStopped =
    false;

  try {
    const reply =
      await streamMessage(
        result.bubble
      );

    if (reply) {
      conversation.push({
        role: "assistant",
        content: reply
      });

      const newIndex =
        conversation.length - 1;

      addMessageActions(
        result.message,
        result.bubble,
        newIndex
      );
    }
  } catch (error) {
    if (
      error.name !==
      "AbortError"
    ) {
      result.bubble.innerHTML =
        formatMessage(
          `Sorry — ${
            error.message ||
            "something went wrong."
          }`
        );
    }
  } finally {
    currentController =
      null;

    setGenerating(false);

    input.focus();
  }
}

/*
|--------------------------------------------------------------------------
| SEND MESSAGE
|--------------------------------------------------------------------------
*/

async function sendMessage() {
  if (isGenerating) {
    stopGeneration();
    return;
  }

  const text =
    input.value.trim();

  detectAndAttachUrls(
    text
  );

  if (
    !text &&
    !attachments.length
  ) {
    return;
  }

  let attachmentParts = [];

  try {
    attachmentParts =
      await prepareAttachmentsForMessage();
  } catch (error) {
    console.error(
      "Attachment preparation error:",
      error
    );

    return;
  }

  if (
    !text &&
    !attachmentParts.length
  ) {
    return;
  }

  const userContent =
    createUserMessageContent(
      text,
      attachmentParts
    );

  conversation.push({
    role: "user",
    content: userContent,
    mode:
      studyMode
        ? "study"
        : "normal"
  });

  saveCurrentChat();

  const attachmentKinds =
    attachments.map(
      attachment =>
        attachment.kind
    );

  let attachmentLabel = "";

  if (
    attachmentKinds.length === 1
  ) {
    if (
      attachmentKinds[0] === "image"
    ) {
      attachmentLabel =
        "Image attached";
    } else if (
      attachmentKinds[0] === "web"
    ) {
      attachmentLabel =
        "Link attached";
    } else if (
      attachmentKinds[0] === "file"
    ) {
      attachmentLabel =
        "File attached";
    }
  } else if (
    attachmentKinds.length > 1
  ) {
    attachmentLabel =
      `${attachmentKinds.length} attachments`;
  }

  const displayText =
    text || attachmentLabel;

  const result =
    addMessage(
      displayText,
      "user",
      {
        conversationIndex:
          conversation.length - 1
      }
    );

  const sentAttachments =
    attachments.map(
      attachment => ({
        ...attachment
      })
    );

  showSentAttachments(
    result.bubble,
    attachmentParts,
    sentAttachments
  );

  clearAttachments();

  input.value = "";

  resizeInput();

  setGenerating(true);

  generationStopped =
    false;

  const assistantResult =
    addMessage(
      "",
      "assistant"
    );

  let reply = "";

  try {
    reply =
      await streamMessage(
        assistantResult.bubble
      );

    if (reply) {
      conversation.push({
        role: "assistant",
        content: reply
      });

      saveCurrentChat();

      const assistantIndex =
        conversation.length - 1;

      addMessageActions(
        assistantResult.message,
        assistantResult.bubble,
        assistantIndex
      );
    } else {
      assistantResult.bubble.innerHTML =
        "<p>I didn't receive a response.</p>";
    }
  } catch (error) {
    if (
      error.name ===
      "AbortError"
    ) {
      if (reply) {
        conversation.push({
          role: "assistant",
          content: reply
        });

        saveCurrentChat();
      }
    } else {
      assistantResult.bubble.innerHTML =
        formatMessage(
          `Sorry — ${
            error.message ||
            "something went wrong."
          }`
        );
    }
  } finally {
    currentController =
      null;

    setGenerating(false);

    input.focus();

    messages.scrollTop =
      messages.scrollHeight;
  }
}

/*
|--------------------------------------------------------------------------
| STUDY MODE
|--------------------------------------------------------------------------
*/

function updateStudyModeButton() {
  const button =
    document.getElementById("study-mode-button");

  if (!button) {
    return;
  }

  button.classList.toggle(
    "active",
    studyMode
  );

  button.setAttribute(
    "aria-pressed",
    String(studyMode)
  );

  button.title =
    studyMode
      ? "Study Mode is on"
      : "Turn on Study Mode";

  button.innerHTML =
    studyMode
      ? '<span class="study-mode-icon">✦</span><span>Study Mode</span><span class="study-mode-status">ON</span>'
      : '<span class="study-mode-icon">✦</span><span>Study Mode</span>';
}

function createStudyModeButton() {
  if (
    document.getElementById("study-mode-button")
  ) {
    return;
  }

  const button =
    document.createElement("button");

  button.id =
    "study-mode-button";

  button.type =
    "button";

  button.className =
    "study-mode-button";

  button.setAttribute(
    "aria-pressed",
    "false"
  );

  button.addEventListener(
    "click",
    () => {
      if (isGenerating) {
        return;
      }

      studyMode =
        !studyMode;

      updateStudyModeButton();
    }
  );

  if (sendButton?.parentElement) {
    sendButton.parentElement.insertBefore(
      button,
      sendButton
    );
  }

  updateStudyModeButton();
}

createStudyModeButton();

/*
|--------------------------------------------------------------------------
| EVENTS
|--------------------------------------------------------------------------
*/

form.addEventListener(
  "submit",
  event => {
    event.preventDefault();

    sendMessage();
  }
);

input.addEventListener(
  "input",
  resizeInput
);

input.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      form.requestSubmit();
    }
  }
);

resizeInput();
input.focus();
setGenerating(false);


/* =========================================================
   SMART SCROLLING
   ========================================================= */

const scrollBottomButton =
  document.getElementById("scroll-bottom-button");

let userHasScrolledUp = false;

function isNearBottom() {
  const distance =
    document.documentElement.scrollHeight -
    window.scrollY -
    window.innerHeight;

  return distance < 180;
}

function scrollToBottom(force = false) {
  if (!force && userHasScrolledUp) {
    return;
  }

  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: "smooth"
  });
}

function updateScrollState() {
  const nearBottom = isNearBottom();

  if (nearBottom) {
    userHasScrolledUp = false;
  }

  if (scrollBottomButton) {
    const shouldShow =
      !nearBottom &&
      document.documentElement.scrollHeight >
        window.innerHeight + 250;

    scrollBottomButton.classList.toggle(
      "visible",
      shouldShow
    );
  }
}

window.addEventListener(
  "scroll",
  () => {
    const nearBottom = isNearBottom();

    if (!nearBottom) {
      userHasScrolledUp = true;
    } else {
      userHasScrolledUp = false;
    }

    updateScrollState();
  },
  { passive: true }
);

if (scrollBottomButton) {
  scrollBottomButton.addEventListener(
    "click",
    () => {
      userHasScrolledUp = false;
      scrollToBottom(true);
    }
  );
}

function smartScrollDuringGeneration() {
  if (!userHasScrolledUp || isNearBottom()) {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "auto"
    });
  }

  updateScrollState();
}

updateScrollState();

/* =========================================================
   CHAT HISTORY / NEW CHAT
   ========================================================= */

const newChatButton =
  document.getElementById(
    "new-chat-button"
  );

if (newChatButton) {
  newChatButton.addEventListener(
    "click",
    startNewChat
  );
}

/* =========================================================
   MESSAGE TIME HELPERS
   ========================================================= */



function createMessageTime() {
  const time = document.createElement("div");
  time.className = "message-time";

  time.textContent =
    new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date());

  return time;
}

/* =========================================================
   KEYBOARD SHORTCUTS
   ========================================================= */

document.addEventListener("keydown", event => {
  if (
    event.key === "/" &&
    document.activeElement !== messageInput &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  ) {
    event.preventDefault();

    if (messageInput) {
      messageInput.focus();
    }
  }

  if (
    event.key === "Escape" &&
    isGenerating
  ) {
    event.preventDefault();
    stopGeneration();
  }
});

/* =========================================================
   CONNECTION STATUS
   ========================================================= */

const connectionStatus =
  document.getElementById("connection-status");

let connectionStatusTimer = null;

function showConnectionStatus(
  message,
  offline = false
) {
  if (!connectionStatus) {
    return;
  }

  connectionStatus.textContent = message;

  connectionStatus.classList.toggle(
    "offline",
    offline
  );

  connectionStatus.classList.add(
    "visible"
  );

  clearTimeout(connectionStatusTimer);

  if (!offline) {
    connectionStatusTimer = setTimeout(() => {
      connectionStatus.classList.remove(
        "visible"
      );
    }, 2200);
  }
}

window.addEventListener(
  "online",
  () => {
    showConnectionStatus(
      "Connected",
      false
    );
  }
);

window.addEventListener(
  "offline",
  () => {
    showConnectionStatus(
      "Offline",
      true
    );
  }
);
