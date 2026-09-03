const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const sendButton = document.getElementById("send-button");

let conversation = [];

let studyMode = false;

let currentMode = "off";

const AI_MODES = {
  off: {
    label: "Off",
    description: "No special mode"
  },
  normal: {
    label: "Normal",
    description: "Balanced everyday assistance"
  },
  study: {
    label: "Study",
    description: "Learn step-by-step"
  },
  coding: {
    label: "Coding",
    description: "Code, debug and build"
  },
  research: {
    label: "Research",
    description: "Evidence and deeper analysis"
  },
  creative: {
    label: "Creative",
    description: "Ideas, writing and creativity"
  },
  math: {
    label: "Math",
    description: "Careful calculations and reasoning"
  },
  science: {
    label: "Science",
    description: "Scientific explanations"
  }
};

function modeIcon(mode) {
  const icons = {
    off: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"></circle><path d="M6.5 13.5L13.5 6.5"></path></svg>',
    normal: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"></circle><circle cx="10" cy="10" r="2"></circle></svg>',
    study: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5h7.5A3.5 3.5 0 0 1 15 9v6.5H7a3 3 0 0 1-3-3z"></path><path d="M15 15.5H7"></path></svg>',
    coding: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5L3 10l4 5"></path><path d="M13 5l4 5-4 5"></path><path d="M11.5 3.5L8.5 16.5"></path></svg>',
    research: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="4.8"></circle><path d="M12.1 12.1L16.5 16.5"></path></svg>',
    creative: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.8l1.6 4 4.1 1.6-4.1 1.6L10 14l-1.6-4-4.1-1.6 4.1-1.6z"></path><path d="M15 13l.7 1.7 1.7.7-1.7.7L15 18l-.7-1.9-1.7-.7 1.7-.7z"></path></svg>',
    math: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6.5h12"></path><path d="M4 13.5h12"></path><path d="M7.5 3.5v6"></path><path d="M12.5 10.5v6"></path></svg>',
    science: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 3.5v4.3l-3 5.3a2.1 2.1 0 0 0 1.8 3.1h7.4a2.1 2.1 0 0 0 1.8-3.1l-3-5.3V3.5"></path><path d="M6.2 3.5h7.6"></path><path d="M6 12h8"></path></svg>'
  };

  return icons[mode] || icons.off;
}

function setCurrentMode(mode) {
  if (!AI_MODES[mode]) {
    mode = "off";
  }

  currentMode = mode;
  studyMode = mode === "study";

  updateModeButton();
  updateModeOptions();
  updateModeComposerState();
  updateCodingWorkspaceState();
}

function updateModeButton() {
  const button =
    document.getElementById("mode-button");

  if (!button) {
    return;
  }

  button.innerHTML = `
    <span class="mode-button-icon">
      ${modeIcon(currentMode)}
    </span>

    <span class="mode-button-label">
      Mode: ${AI_MODES[currentMode].label}
    </span>

    <span class="mode-button-chevron">
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5.5 7.5L10 12l4.5-4.5"></path>
      </svg>
    </span>
  `;

  button.classList.toggle(
    "active",
    currentMode !== "off"
  );
}

function updateModeOptions() {
  const menu =
    document.getElementById("mode-menu");

  if (!menu) {
    return;
  }

  menu
    .querySelectorAll(".mode-option")
    .forEach(option => {
      option.classList.toggle(
        "selected",
        option.dataset.mode === currentMode
      );
    });
}

function updateModeComposerState() {
  if (!composer) {
    return;
  }

  composer.dataset.mode = currentMode;

  composer.classList.toggle(
    "coding-mode",
    currentMode === "coding"
  );
}

function closeModeMenu() {
  const menu =
    document.getElementById("mode-menu");

  const button =
    document.getElementById("mode-button");

  menu?.classList.remove("open");
  button?.classList.remove("open");
  button?.setAttribute(
    "aria-expanded",
    "false"
  );
}

function openModeMenu() {
  const menu =
    document.getElementById("mode-menu");

  const button =
    document.getElementById("mode-button");

  if (!menu || !button || isGenerating) {
    return;
  }

  menu.classList.add("open");
  button.classList.add("open");

  button.setAttribute(
    "aria-expanded",
    "true"
  );
}

function createModeSelector() {
  if (
    !composer ||
    document.getElementById("mode-button")
  ) {
    return;
  }

  const button =
    document.createElement("button");

  button.id = "mode-button";
  button.type = "button";
  button.className = "mode-button";

  button.setAttribute(
    "aria-haspopup",
    "menu"
  );

  button.setAttribute(
    "aria-expanded",
    "false"
  );

  const menu =
    document.createElement("div");

  menu.id = "mode-menu";
  menu.className = "mode-menu";

  menu.innerHTML = `
    <div class="mode-menu-title">
      AI MODE
    </div>

    <div class="mode-menu-options">
      ${Object.entries(AI_MODES)
        .map(([key, mode]) => `
          <button
            type="button"
            class="mode-option"
            data-mode="${key}"
            role="menuitem"
          >
            <span class="mode-option-icon">
              ${modeIcon(key)}
            </span>

            <span class="mode-option-main">
              <span class="mode-option-label">
                ${mode.label}
              </span>

              <span class="mode-option-description">
                ${mode.description}
              </span>
            </span>

            <span class="mode-option-check">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4.5 10.5l3.2 3.2 7.8-7.8"></path>
              </svg>
            </span>
          </button>
        `)
        .join("")}
    </div>
  `;

  composer.insertBefore(
    button,
    sendButton
  );

  composer.appendChild(menu);

  button.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      if (
        menu.classList.contains("open")
      ) {
        closeModeMenu();
      } else {
        openModeMenu();
      }
    }
  );

  menu.addEventListener(
    "click",
    event => {
      const option =
        event.target.closest(
          ".mode-option"
        );

      if (
        !option ||
        isGenerating
      ) {
        return;
      }

      setCurrentMode(
        option.dataset.mode || "off"
      );

      closeModeMenu();
      input.focus();
    }
  );

  document.addEventListener(
    "click",
    event => {
      if (
        !menu.contains(event.target) &&
        !button.contains(event.target)
      ) {
        closeModeMenu();
      }
    }
  );

  setCurrentMode("off");
}





/* =========================================================
   CODING WORKSPACE
   ========================================================= */

const CODING_HISTORY_KEY =
  "adnova_coding_history_v1";

let codingHistory = [];

let codingWorkspaceBuilt = false;

let codingWorkspaceElements = {
  root: null,
  input: null,
  activity: null,
  output: null,
  history: null,
  status: null
};

function loadCodingHistory() {
  try {
    const stored =
      localStorage.getItem(
        CODING_HISTORY_KEY
      );

    const parsed =
      stored
        ? JSON.parse(stored)
        : [];

    codingHistory =
      Array.isArray(parsed)
        ? parsed
        : [];
  } catch {
    codingHistory = [];
  }
}

function saveCodingHistory() {
  try {
    localStorage.setItem(
      CODING_HISTORY_KEY,
      JSON.stringify(
        codingHistory.slice(0, 50)
      )
    );
  } catch (error) {
    console.error(
      "Could not save coding history:",
      error
    );
  }
}

function addCodingHistory(
  prompt,
  response
) {
  const cleanPrompt =
    String(prompt || "")
      .trim();

  const cleanResponse =
    String(response || "")
      .trim();

  if (!cleanPrompt) {
    return;
  }

  codingHistory.unshift({
    id:
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    title:
      cleanPrompt.length > 48
        ? `${cleanPrompt.slice(0, 48)}…`
        : cleanPrompt,
    prompt:
      cleanPrompt,
    response:
      cleanResponse,
    createdAt:
      Date.now()
  });

  codingHistory =
    codingHistory.slice(
      0,
      50
    );

  saveCodingHistory();

  renderCodingHistory();
}

function getLatestCodingResponse() {
  for (
    let i =
      conversation.length - 1;
    i >= 0;
    i--
  ) {
    const message =
      conversation[i];

    if (
      message &&
      message.role === "assistant" &&
      typeof message.content === "string"
    ) {
      return message.content;
    }
  }

  return "";
}

function escapeCodingHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setCodingActivity(
  step,
  detail,
  state = "active"
) {
  const activity =
    codingWorkspaceElements.activity;

  if (!activity) {
    return;
  }

  const states = [
    "prepare",
    "generate",
    "review",
    "ready"
  ];

  states.forEach(name => {
    const item =
      activity.querySelector(
        `[data-coding-step="${name}"]`
      );

    if (!item) {
      return;
    }

    item.classList.remove(
      "active",
      "complete"
    );

    const index =
      states.indexOf(name);

    const currentIndex =
      states.indexOf(step);

    if (
      index <
      currentIndex
    ) {
      item.classList.add(
        "complete"
      );
    }

    if (
      index ===
      currentIndex
    ) {
      item.classList.add(
        state === "complete"
          ? "complete"
          : "active"
      );
    }
  });

  const status =
    codingWorkspaceElements.status;

  if (status) {
    status.textContent =
      detail;
  }
}

function renderCodingOutput(
  prompt,
  response
) {
  const output =
    codingWorkspaceElements.output;

  if (!output) {
    return;
  }

  if (!prompt) {
    output.innerHTML = `
      <div class="coding-empty-state">
        <div class="coding-empty-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 6l-6 6 6 6"></path>
            <path d="M16 6l6 6-6 6"></path>
            <path d="M14 3l-4 18"></path>
          </svg>
        </div>

        <h2>Ready to build</h2>

        <p>
          Describe what you want to build, fix, or understand.
        </p>
      </div>
    `;

    return;
  }

  output.innerHTML = `
    <div class="coding-request">
      <div class="coding-section-label">
        REQUEST
      </div>

      <div class="coding-request-text">
        ${escapeCodingHtml(prompt)}
      </div>
    </div>

    <div class="coding-response">
      <div class="coding-section-label">
        AI RESPONSE
      </div>

      <div class="coding-response-body">
        ${formatMessage(response || "Working...")}
      </div>
    </div>
  `;
}

function renderCodingHistory() {
  const history =
    codingWorkspaceElements.history;

  if (!history) {
    return;
  }

  history.innerHTML = "";

  if (!codingHistory.length) {
    history.innerHTML = `
      <div class="coding-history-empty">
        No coding sessions yet.
      </div>
    `;

    return;
  }

  codingHistory.forEach(session => {
    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "coding-history-item";

    button.innerHTML = `
      <span class="coding-history-item-icon">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M6 4.5h8"></path>
          <path d="M6 9h8"></path>
          <path d="M6 13.5h5"></path>
        </svg>
      </span>

      <span class="coding-history-item-text">
        ${escapeCodingHtml(session.title)}
      </span>
    `;

    button.addEventListener(
      "click",
      () => {
        renderCodingOutput(
          session.prompt,
          session.response
        );

        setCodingActivity(
          "ready",
          "Session loaded",
          "complete"
        );
      }
    );

    history.appendChild(
      button
    );
  });
}

function createCodingWorkspace() {
  if (
    codingWorkspaceBuilt ||
    document.getElementById(
      "coding-workspace"
    )
  ) {
    codingWorkspaceBuilt = true;
    return;
  }

  loadCodingHistory();

  const root =
    document.createElement("section");

  root.id =
    "coding-workspace";

  root.className =
    "coding-workspace";

  root.innerHTML = `
    <header class="coding-workspace-header">

      <div class="coding-header-left">

        <button
          type="button"
          class="coding-back-button"
          id="coding-back-button"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M12.5 4L6.5 10l6 6"></path>
          </svg>

          <span>Back to chat</span>
        </button>

        <div class="coding-workspace-title">
          <div class="coding-workspace-title-icon">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7 5L3 10l4 5"></path>
              <path d="M13 5l4 5-4 5"></path>
            </svg>
          </div>

          <div>
            <strong>Coding</strong>
            <span>Focused workspace</span>
          </div>
        </div>

      </div>

      <div
        class="coding-workspace-status"
        id="coding-workspace-status"
      >
        Ready
      </div>

    </header>

    <div class="coding-workspace-body">

      <aside class="coding-history-panel">
        <div class="coding-panel-heading">
          <span>CODE SESSIONS</span>
        </div>

        <div
          class="coding-history-list"
          id="coding-history-list"
        ></div>
      </aside>

      <main class="coding-main-panel">

        <div class="coding-activity-panel">

          <div class="coding-activity-heading">
            <span>WORKFLOW</span>
            <span>AI</span>
          </div>

          <div
            class="coding-activity"
            id="coding-activity"
          >
            <div
              class="coding-step"
              data-coding-step="prepare"
            >
              <span class="coding-step-indicator"></span>

              <div>
                <strong>Prepare</strong>
                <span>Understand the request</span>
              </div>
            </div>

            <div
              class="coding-step"
              data-coding-step="generate"
            >
              <span class="coding-step-indicator"></span>

              <div>
                <strong>Build</strong>
                <span>Generate the solution</span>
              </div>
            </div>

            <div
              class="coding-step"
              data-coding-step="review"
            >
              <span class="coding-step-indicator"></span>

              <div>
                <strong>Review</strong>
                <span>Check the response</span>
              </div>
            </div>

            <div
              class="coding-step"
              data-coding-step="ready"
            >
              <span class="coding-step-indicator"></span>

              <div>
                <strong>Ready</strong>
                <span>Solution available</span>
              </div>
            </div>
          </div>

        </div>

        <div
          class="coding-output"
          id="coding-output"
        ></div>

        <form
          class="coding-composer"
          id="coding-composer"
        >
          <textarea
            id="coding-input"
            placeholder="Describe the code you want to build or fix..."
            rows="2"
            autocomplete="off"
            spellcheck="false"
          ></textarea>

          <button
            type="submit"
            class="coding-send-button"
            aria-label="Run coding request"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 10h11"></path>
              <path d="M10.5 5.5L15 10l-4.5 4.5"></path>
            </svg>
          </button>
        </form>

      </main>

    </div>
  `;

  document.body.appendChild(
    root
  );

  codingWorkspaceElements = {
    root,
    input:
      document.getElementById(
        "coding-input"
      ),
    activity:
      document.getElementById(
        "coding-activity"
      ),
    output:
      document.getElementById(
        "coding-output"
      ),
    history:
      document.getElementById(
        "coding-history-list"
      ),
    status:
      document.getElementById(
        "coding-workspace-status"
      )
  };

  document
    .getElementById(
      "coding-back-button"
    )
    ?.addEventListener(
      "click",
      () => {
        setCurrentMode("off");
      }
    );

  document
    .getElementById(
      "coding-composer"
    )
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const field =
          codingWorkspaceElements.input;

        const prompt =
          String(field?.value || "")
            .trim();

        if (
          !prompt ||
          isGenerating
        ) {
          return;
        }

        field.value = "";

        setCodingActivity(
          "prepare",
          "Preparing request"
        );

        renderCodingOutput(
          prompt,
          "Generating..."
        );

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              180
            )
        );

        setCodingActivity(
          "generate",
          "Building response"
        );

        input.value =
          prompt;

        resizeInput();

        await sendMessage();

        const response =
          getLatestCodingResponse();

        setCodingActivity(
          "review",
          "Reviewing response"
        );

        renderCodingOutput(
          prompt,
          response
        );

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              220
            )
        );

        setCodingActivity(
          "ready",
          "Ready"
        );

        if (response) {
          addCodingHistory(
            prompt,
            response
          );
        }

        renderCodingHistory();

        field.focus();
      }
    );

  codingWorkspaceBuilt = true;

  renderCodingHistory();
  renderCodingOutput("", "");
}

function updateCodingWorkspaceState() {
  createCodingWorkspace();

  const root =
    codingWorkspaceElements.root;

  if (!root) {
    return;
  }

  const coding =
    currentMode === "coding";

  root.classList.toggle(
    "active",
    coding
  );

  document.body.classList.toggle(
    "coding-workspace-active",
    coding
  );

  if (coding) {
    requestAnimationFrame(
      () => {
        codingWorkspaceElements.input?.focus();
      }
    );
  }
}

loadCodingHistory();


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

  const restoredUserMessage =
    [...conversation]
      .reverse()
      .find(
        message =>
          message &&
          message.role === "user" &&
          AI_MODES[message.mode]
      );

  setCurrentMode(
    restoredUserMessage?.mode || "off"
  );

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

  setCurrentMode("off");

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
    mode: currentMode
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

/* =========================================================
   INITIAL UI BOOT
   ========================================================= */

createModeSelector();
createCodingWorkspace();
updateCodingWorkspaceState();


/* =========================================================
   CODING WORKSPACE ENHANCEMENTS
   ========================================================= */

const CODING_DRAFT_KEY = "adnova_coding_draft_v1";

let codingEnhancementsReady = false;
let codingActivityTimer = null;
let codingReviewTimer = null;
let codingWasGenerating = false;

function getCodingInput() {
  return (
    document.querySelector("#coding-message-input") ||
    document.querySelector("#coding-input") ||
    document.querySelector(".coding-composer textarea") ||
    document.querySelector("#coding-workspace textarea")
  );
}

function getCodingSendButton() {
  return (
    document.querySelector("#coding-send-button") ||
    document.querySelector("[data-coding-send]") ||
    document.querySelector(".coding-send-button") ||
    document.querySelector(".coding-composer button[type='submit']") ||
    document.querySelector(".coding-composer button[aria-label*='Send' i]")
  );
}

function isCodingInput(element) {
  if (!element) {
    return false;
  }

  return (
    element === getCodingInput() ||
    element.matches(
      "#coding-message-input, #coding-input, .coding-composer textarea, #coding-workspace textarea"
    )
  );
}

function submitCodingInput() {
  const codingInput = getCodingInput();

  if (!codingInput) {
    return;
  }

  const value = String(codingInput.value || "").trim();

  if (!value && !codingInput.closest("form")) {
    return;
  }

  const form = codingInput.closest("form");

  if (form) {
    form.requestSubmit();
    return;
  }

  const send = getCodingSendButton();

  if (send && !send.disabled) {
    send.click();
  }
}

function saveCodingDraft() {
  const codingInput = getCodingInput();

  if (!codingInput) {
    return;
  }

  try {
    localStorage.setItem(
      CODING_DRAFT_KEY,
      String(codingInput.value || "")
    );
  } catch (error) {
    console.warn("Could not save coding draft:", error);
  }
}

function restoreCodingDraft() {
  const codingInput = getCodingInput();

  if (!codingInput || codingInput.value.trim()) {
    return;
  }

  try {
    const draft =
      localStorage.getItem(CODING_DRAFT_KEY) || "";

    if (draft) {
      codingInput.value = draft;
      codingInput.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }
  } catch (error) {
    console.warn("Could not restore coding draft:", error);
  }
}

function clearCodingDraft() {
  try {
    localStorage.removeItem(CODING_DRAFT_KEY);
  } catch (error) {
    console.warn("Could not clear coding draft:", error);
  }
}

function ensureCodingActivityPanel() {
  const workspace =
    document.getElementById("coding-workspace");

  if (!workspace) {
    return null;
  }

  let panel =
    workspace.querySelector(".coding-activity-panel");

  if (panel) {
    return panel;
  }

  panel =
    document.createElement("section");

  panel.className =
    "coding-activity-panel";

  panel.innerHTML = `
    <div class="coding-activity-header">
      <div>
        <div class="coding-activity-eyebrow">
          WORKFLOW
        </div>
        <div class="coding-activity-title">
          Coding activity
        </div>
      </div>

      <div class="coding-activity-live">
        <span class="coding-activity-live-dot"></span>
        LIVE
      </div>
    </div>

    <div class="coding-activity-steps">
      <div class="coding-activity-step" data-stage="prepare">
        <span class="coding-activity-step-icon">1</span>
        <div>
          <strong>Preparing</strong>
          <span>Reading the request and context</span>
        </div>
      </div>

      <div class="coding-activity-step" data-stage="build">
        <span class="coding-activity-step-icon">2</span>
        <div>
          <strong>Building</strong>
          <span>Working through the coding task</span>
        </div>
      </div>

      <div class="coding-activity-step" data-stage="review">
        <span class="coding-activity-step-icon">3</span>
        <div>
          <strong>Reviewing</strong>
          <span>Checking the generated result</span>
        </div>
      </div>

      <div class="coding-activity-step" data-stage="ready">
        <span class="coding-activity-step-icon">✓</span>
        <div>
          <strong>Ready</strong>
          <span>Response completed</span>
        </div>
      </div>
    </div>
  `;

  workspace.appendChild(panel);

  return panel;
}

function setCodingActivityStage(stage) {
  const panel =
    ensureCodingActivityPanel();

  if (!panel) {
    return;
  }

  panel.dataset.stage = stage;

  const order = [
    "prepare",
    "build",
    "review",
    "ready"
  ];

  const activeIndex =
    order.indexOf(stage);

  panel
    .querySelectorAll(".coding-activity-step")
    .forEach(step => {
      const stepStage =
        step.dataset.stage;

      const stepIndex =
        order.indexOf(stepStage);

      step.classList.toggle(
        "active",
        stepIndex === activeIndex
      );

      step.classList.toggle(
        "complete",
        stepIndex < activeIndex ||
        stage === "ready" &&
        stepStage === "ready"
      );
    });
}

function startCodingActivityLoop() {
  if (codingActivityTimer) {
    return;
  }

  codingActivityTimer =
    setInterval(() => {
      const codingIsActive =
        currentMode === "coding";

      if (!codingIsActive) {
        codingWasGenerating = false;

        clearTimeout(codingReviewTimer);
        codingReviewTimer = null;

        return;
      }

      if (isGenerating && !codingWasGenerating) {
        codingWasGenerating = true;

        setCodingActivityStage("build");

        clearTimeout(codingReviewTimer);

        codingReviewTimer =
          setTimeout(() => {
            if (
              currentMode === "coding" &&
              isGenerating
            ) {
              setCodingActivityStage("review");
            }
          }, 1400);
      }

      if (!isGenerating && codingWasGenerating) {
        codingWasGenerating = false;

        clearTimeout(codingReviewTimer);
        codingReviewTimer = null;

        setCodingActivityStage("ready");

        clearCodingDraft();
      }

      if (
        codingIsActive &&
        !isGenerating &&
        !codingWasGenerating
      ) {
        setCodingActivityStage("ready");
      }
    }, 220);
}

function installCodingWorkspaceKeyboard() {
  document.addEventListener(
    "keydown",
    event => {
      const active =
        document.activeElement;

      if (
        isCodingInput(active) &&
        currentMode === "coding"
      ) {
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          event.preventDefault();
          event.stopPropagation();

          submitCodingInput();

          return;
        }
      }

      if (
        event.key === "Escape" &&
        currentMode === "coding" &&
        isGenerating
      ) {
        event.preventDefault();
        stopGeneration();
      }
    },
    true
  );
}

function installCodingDraftSaving() {
  document.addEventListener(
    "input",
    event => {
      if (
        currentMode !== "coding" ||
        !isCodingInput(event.target)
      ) {
        return;
      }

      saveCodingDraft();
    }
  );

  document.addEventListener(
    "click",
    () => {
      if (currentMode === "coding") {
        setTimeout(() => {
          restoreCodingDraft();
        }, 80);
      }
    }
  );
}

function watchCodingWorkspace() {
  if (codingEnhancementsReady) {
    return;
  }

  codingEnhancementsReady = true;

  installCodingWorkspaceKeyboard();
  installCodingDraftSaving();
  startCodingActivityLoop();

  const observer =
    new MutationObserver(() => {
      if (currentMode === "coding") {
        ensureCodingActivityPanel();

        setTimeout(() => {
          restoreCodingDraft();
        }, 50);
      }
    });

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  if (currentMode === "coding") {
    ensureCodingActivityPanel();
    restoreCodingDraft();
    setCodingActivityStage(
      isGenerating ? "build" : "ready"
    );
  }
}

watchCodingWorkspace();


/* =========================================================
   CODING NEXT BATCH
   ========================================================= */

(function installCodingNextBatch() {
  const CODING_HISTORY_KEY =
    "adnova_coding_history_v1";

  const CODING_DRAFT_KEY =
    "adnova_coding_draft_v1";

  let codingSessionCounter = 0;

  function codingWorkspace() {
    return document.getElementById("coding-workspace");
  }

  function codingInput() {
    const workspace = codingWorkspace();

    if (!workspace) {
      return null;
    }

    return (
      workspace.querySelector("#coding-message-input") ||
      workspace.querySelector("#coding-input") ||
      workspace.querySelector("textarea")
    );
  }

  function codingSendButton() {
    const workspace = codingWorkspace();

    if (!workspace) {
      return null;
    }

    return (
      workspace.querySelector("#coding-send-button") ||
      workspace.querySelector("[data-coding-send]") ||
      workspace.querySelector(".coding-send-button") ||
      workspace.querySelector(".coding-composer button[type='submit']") ||
      workspace.querySelector("button[aria-label*='send' i]")
    );
  }

  function codingOutput() {
    const workspace = codingWorkspace();

    if (!workspace) {
      return null;
    }

    return (
      workspace.querySelector("#coding-output") ||
      workspace.querySelector(".coding-output") ||
      workspace.querySelector(".coding-workspace-output") ||
      workspace.querySelector(".coding-response") ||
      workspace.querySelector(".coding-workspace-main")
    );
  }

  function startNewCodingChat() {
    const input = codingInput();

    if (isGenerating && typeof stopGeneration === "function") {
      stopGeneration();
    }

    try {
      localStorage.removeItem(CODING_DRAFT_KEY);
    } catch {
      // Ignore localStorage errors.
    }

    codingSessionCounter += 1;

    const workspace = codingWorkspace();

    if (workspace) {
      workspace.dataset.codingSessionId =
        `coding-${Date.now()}-${codingSessionCounter}`;
    }

    if (input) {
      input.value = "";

      input.dispatchEvent(
        new Event("input", {
          bubbles: true
        })
      );

      input.focus();
    }

    const output = codingOutput();

    if (output) {
      const children = Array.from(output.children);

      children.forEach(child => {
        child.remove();
      });

      output.innerHTML = `
        <div class="coding-empty-state">
          <div class="coding-empty-state-title">
            New coding session
          </div>

          <div class="coding-empty-state-text">
            Start a new task and your coding work will stay in this session.
          </div>
        </div>
      `;
    }

    const workspaceSessionList =
      workspace?.querySelector(
        ".coding-session-list, .coding-history-list, [data-coding-history]"
      );

    if (
      workspaceSessionList &&
      typeof renderCodingHistory === "function"
    ) {
      try {
        renderCodingHistory();
      } catch {
        // Keep UI usable if an older history renderer has a different signature.
      }
    }
  }

  function ensureCodingNewChatButton() {
    const workspace = codingWorkspace();

    if (!workspace) {
      return;
    }

    if (
      workspace.querySelector(
        "#coding-new-chat-button"
      )
    ) {
      return;
    }

    const header =
      workspace.querySelector(
        ".coding-workspace-header"
      ) ||
      workspace.querySelector(
        ".coding-header"
      ) ||
      workspace.firstElementChild;

    if (!header) {
      return;
    }

    const button =
      document.createElement("button");

    button.id =
      "coding-new-chat-button";

    button.type =
      "button";

    button.className =
      "coding-new-chat-button";

    button.setAttribute(
      "aria-label",
      "New coding chat"
    );

    button.title =
      "New coding chat";

    button.innerHTML = `
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path d="M10 4v12"></path>
        <path d="M4 10h12"></path>
      </svg>

      <span>New chat</span>
    `;

    button.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        startNewCodingChat();
      }
    );

    header.appendChild(button);
  }

  function submitCodingComposer() {
    const input = codingInput();

    if (!input) {
      return;
    }

    const text =
      String(input.value || "").trim();

    if (!text) {
      return;
    }

    const form =
      input.closest("form");

    if (form) {
      form.requestSubmit();
      return;
    }

    const button =
      codingSendButton();

    if (
      button &&
      !button.disabled
    ) {
      button.click();
    }
  }

  /*
   * Capture phase is intentional.
   *
   * This runs before any textarea/default form handlers,
   * which makes Enter reliable even if another listener exists.
   */
  document.addEventListener(
    "keydown",
    event => {
      const target =
        event.target;

      if (
        !(target instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      const workspace =
        target.closest("#coding-workspace");

      if (!workspace) {
        return;
      }

      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      submitCodingComposer();
    },
    true
  );

  /*
   * Visual code preview
   */

  function getCodeLanguage(codeBlock) {
    const language =
      codeBlock.querySelector(
        ".code-language"
      );

    return String(
      language?.textContent || ""
    )
      .trim()
      .toLowerCase();
  }

  function getCodeText(codeBlock) {
    return (
      codeBlock.querySelector("pre code")?.textContent ||
      ""
    ).trim();
  }

  function canPreview(language) {
    return [
      "html",
      "htm",
      "css",
      "javascript",
      "js",
      "svg"
    ].includes(language);
  }

  function buildPreviewDocument(
    code,
    language
  ) {
    if (
      language === "svg"
    ) {
      return `
<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<style>
html,body{
  margin:0;
  width:100%;
  height:100%;
  background:#fff;
}
body{
  display:grid;
  place-items:center;
  overflow:auto;
}
svg{
  max-width:90%;
  max-height:90%;
}
</style>
</head>
<body>
${code}
</body>
</html>`;
    }

    if (
      language === "css"
    ) {
      return `
<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<style>
${code}
</style>
</head>
<body>
<main class="preview-page">
  <h1>Adnova Preview</h1>
  <p>This page is using the CSS from the generated code.</p>
  <button>Example button</button>
  <div class="preview-card">
    Preview content
  </div>
</main>
</body>
</html>`;
    }

    if (
      language === "javascript" ||
      language === "js"
    ) {
      return `
<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{
  margin:0;
  padding:24px;
  font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  background:#fff;
  color:#0f172a;
}
#preview-root{
  min-height:120px;
  padding:20px;
  border:1px solid #e2e8f0;
  border-radius:14px;
}
#preview-console{
  margin-top:14px;
  padding:12px;
  border-radius:10px;
  background:#f8fafc;
  border:1px solid #e2e8f0;
  white-space:pre-wrap;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:12px;
}
</style>
</head>
<body>
<div id="preview-root"></div>
<div id="preview-console">Console output will appear here.</div>

<script>
(() => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const output = document.getElementById("preview-console");

  function write(type, values) {
    const line =
      "[" +
      type.toUpperCase() +
      "] " +
      values
        .map(value => {
          try {
            return typeof value === "string"
              ? value
              : JSON.stringify(value);
          } catch {
            return String(value);
          }
        })
        .join(" ");

    output.textContent += "\\n" + line;
  }

  console.log = (...values) => {
    write("log", values);
    originalLog(...values);
  };

  console.warn = (...values) => {
    write("warn", values);
    originalWarn(...values);
  };

  console.error = (...values) => {
    write("error", values);
    originalError(...values);
  };

  window.addEventListener(
    "error",
    event => {
      write(
        "error",
        [event.message || "Runtime error"]
      );
    }
  );

  try {
    ${code}
  } catch (error) {
    write(
      "error",
      [error?.message || String(error)]
    );
  }
})();
</script>
</body>
</html>`;
    }

    return code;
  }

  function openCodePreview(code, language) {
    let overlay =
      document.getElementById(
        "code-preview-overlay"
      );

    if (!overlay) {
      overlay =
        document.createElement("div");

      overlay.id =
        "code-preview-overlay";

      overlay.className =
        "code-preview-overlay";

      overlay.innerHTML = `
        <div class="code-preview-backdrop"></div>

        <section
          class="code-preview-window"
          role="dialog"
          aria-modal="true"
          aria-label="Code preview"
        >
          <div class="code-preview-header">
            <div>
              <div class="code-preview-eyebrow">
                LIVE PREVIEW
              </div>

              <div class="code-preview-title">
                Code in action
              </div>
            </div>

            <button
              type="button"
              class="code-preview-close"
              aria-label="Close preview"
            >
              ×
            </button>
          </div>

          <div class="code-preview-frame-wrap">
            <iframe
              class="code-preview-frame"
              sandbox="allow-scripts"
              title="Code preview"
            ></iframe>
          </div>
        </section>
      `;

      document.body.appendChild(
        overlay
      );

      const close = () => {
        overlay.classList.remove("open");

        const frame =
          overlay.querySelector(
            ".code-preview-frame"
          );

        if (frame) {
          frame.srcdoc =
            "<!doctype html><html><body></body></html>";
        }
      };

      overlay
        .querySelector(
          ".code-preview-backdrop"
        )
        .addEventListener(
          "click",
          close
        );

      overlay
        .querySelector(
          ".code-preview-close"
        )
        .addEventListener(
          "click",
          close
        );
    }

    const frame =
      overlay.querySelector(
        ".code-preview-frame"
      );

    if (!frame) {
      return;
    }

    frame.srcdoc =
      buildPreviewDocument(
        code,
        language
      );

    overlay.classList.add("open");
  }

  function addPreviewButton(codeBlock) {
    if (!codeBlock) {
      return;
    }

    if (
      codeBlock.querySelector(
        ".preview-code-button"
      )
    ) {
      return;
    }

    const language =
      getCodeLanguage(codeBlock);

    if (!canPreview(language)) {
      return;
    }

    const header =
      codeBlock.querySelector(
        ".code-header"
      );

    if (!header) {
      return;
    }

    const button =
      document.createElement("button");

    button.type =
      "button";

    button.className =
      "preview-code-button";

    button.textContent =
      "Preview";

    button.setAttribute(
      "aria-label",
      "Preview code"
    );

    button.title =
      "Preview code";

    button.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        openCodePreview(
          getCodeText(codeBlock),
          getCodeLanguage(codeBlock)
        );
      }
    );

    header.appendChild(button);
  }

  function scanPreviewButtons(root = document) {
    root
      .querySelectorAll(
        ".code-block"
      )
      .forEach(
        addPreviewButton
      );
  }

  document.addEventListener(
    "click",
    event => {
      if (
        currentMode === "coding"
      ) {
        setTimeout(() => {
          scanPreviewButtons();
        }, 0);
      }
    }
  );

  const observer =
    new MutationObserver(
      mutations => {
        let shouldScan =
          false;

        mutations.forEach(
          mutation => {
            if (
              mutation.type === "childList" &&
              mutation.addedNodes.length
            ) {
              shouldScan = true;
            }
          }
        );

        if (shouldScan) {
          scanPreviewButtons();
          ensureCodingNewChatButton();
        }
      }
    );

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  function initialize() {
    ensureCodingNewChatButton();
    scanPreviewButtons();
  }

  initialize();

  setInterval(() => {
    ensureCodingNewChatButton();
    scanPreviewButtons();
  }, 1000);
})();


/* =========================================================
   CODING FIX + NEXT BATCH
   ========================================================= */

(function installCodingFixAndNextBatch() {
  const CODING_ACTIVE_KEY =
    "adnova_coding_active_session_v1";

  const CODING_DRAFT_KEY =
    "adnova_coding_draft_v1";

  let clearingCodingComposer = false;

  function getWorkspace() {
    return document.getElementById("coding-workspace");
  }

  function getCodingTextarea() {
    const workspace = getWorkspace();

    if (!workspace) {
      return null;
    }

    return workspace.querySelector(
      "#coding-message-input, #coding-input, textarea"
    );
  }

  function clearCodingComposer() {
    const textarea =
      getCodingTextarea();

    if (!textarea) {
      return;
    }

    if (clearingCodingComposer) {
      return;
    }

    clearingCodingComposer = true;

    textarea.value = "";

    textarea.dispatchEvent(
      new Event("input", {
        bubbles: true
      })
    );

    textarea.dispatchEvent(
      new Event("change", {
        bubbles: true
      })
    );

    try {
      localStorage.removeItem(
        CODING_DRAFT_KEY
      );
    } catch {
      // Ignore storage failure.
    }

    requestAnimationFrame(() => {
      clearingCodingComposer = false;

      if (
        currentMode === "coding" &&
        !isGenerating
      ) {
        textarea.focus();
      }
    });
  }

  /*
   * FIX THE DOUBLE-SEND / STUCK TEXT BUG
   *
   * The coding composer can have its own submit handler.
   * We let that handler send first, then clear the visible
   * coding composer immediately afterward.
   */

  document.addEventListener(
    "submit",
    event => {
      const form =
        event.target;

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const workspace =
        form.closest("#coding-workspace");

      if (!workspace) {
        return;
      }

      const textarea =
        getCodingTextarea();

      if (!textarea) {
        return;
      }

      setTimeout(() => {
        if (
          currentMode === "coding"
        ) {
          clearCodingComposer();
        }
      }, 0);
    },
    false
  );

  /*
   * Also cover coding buttons that send without a form.
   */

  document.addEventListener(
    "click",
    event => {
      const target =
        event.target;

      const workspace =
        target.closest?.(
          "#coding-workspace"
        );

      if (!workspace) {
        return;
      }

      const button =
        target.closest(
          "#coding-send-button, [data-coding-send], .coding-send-button"
        );

      if (!button) {
        return;
      }

      setTimeout(() => {
        if (
          currentMode === "coding"
        ) {
          clearCodingComposer();
        }
      }, 0);
    },
    false
  );

  /*
   * Hard keyboard guarantee.
   *
   * Enter:
   *   SEND
   *
   * Shift + Enter:
   *   NEW LINE
   */

  document.addEventListener(
    "keydown",
    event => {
      const target =
        event.target;

      if (
        !(target instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      const workspace =
        target.closest("#coding-workspace");

      if (!workspace) {
        return;
      }

      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const text =
        String(target.value || "").trim();

      if (!text || isGenerating) {
        return;
      }

      /*
       * Prefer the coding form if one exists.
       */

      const form =
        target.closest("form");

      if (form) {
        form.requestSubmit();
      } else {
        const button =
          workspace.querySelector(
            "#coding-send-button, [data-coding-send], .coding-send-button"
          );

        if (
          button &&
          !button.disabled
        ) {
          button.click();
        }
      }

      setTimeout(() => {
        clearCodingComposer();
      }, 0);
    },
    true
  );

  /*
   * =======================================================
   * ACTIVE CODING SESSION
   * =======================================================
   */

  function getCodingHistory() {
    try {
      const raw =
        localStorage.getItem(
          "adnova_coding_history_v1"
        );

      const parsed =
        raw
          ? JSON.parse(raw)
          : [];

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  function saveCodingHistory(history) {
    try {
      localStorage.setItem(
        "adnova_coding_history_v1",
        JSON.stringify(history.slice(0, 50))
      );
    } catch {
      // Ignore storage failure.
    }
  }

  function getActiveCodingSessionId() {
    try {
      return localStorage.getItem(
        CODING_ACTIVE_KEY
      );
    } catch {
      return null;
    }
  }

  function setActiveCodingSessionId(id) {
    if (!id) {
      return;
    }

    try {
      localStorage.setItem(
        CODING_ACTIVE_KEY,
        id
      );
    } catch {
      // Ignore storage failure.
    }
  }

  function findCodingSession(id) {
    return getCodingHistory().find(
      session =>
        session &&
        session.id === id
    );
  }

  function ensureActiveCodingSession() {
    const history =
      getCodingHistory();

    const activeId =
      getActiveCodingSessionId();

    if (
      activeId &&
      history.some(
        session =>
          session &&
          session.id === activeId
      )
    ) {
      return activeId;
    }

    if (history.length) {
      setActiveCodingSessionId(
        history[0].id
      );

      return history[0].id;
    }

    return null;
  }

  function renameCodingSession(
    sessionId,
    newTitle
  ) {
    const title =
      String(newTitle || "")
        .replace(/\s+/g, " ")
        .trim();

    if (!title) {
      return;
    }

    const history =
      getCodingHistory();

    const session =
      history.find(
        item =>
          item &&
          item.id === sessionId
      );

    if (!session) {
      return;
    }

    session.title =
      title.slice(0, 70);

    session.updatedAt =
      Date.now();

    saveCodingHistory(history);

    try {
      if (
        typeof renderCodingHistory ===
        "function"
      ) {
        renderCodingHistory();
      }
    } catch {
      // Keep current UI working if old renderer differs.
    }

    refreshCodingSessionControls();
  }

  function deleteCodingSession(
    sessionId
  ) {
    const history =
      getCodingHistory();

    const next =
      history.filter(
        session =>
          !session ||
          session.id !== sessionId
      );

    saveCodingHistory(next);

    const activeId =
      getActiveCodingSessionId();

    if (activeId === sessionId) {
      const nextActive =
        next[0]?.id || null;

      if (nextActive) {
        setActiveCodingSessionId(
          nextActive
        );
      } else {
        try {
          localStorage.removeItem(
            CODING_ACTIVE_KEY
          );
        } catch {
          // Ignore storage failure.
        }
      }
    }

    try {
      if (
        typeof renderCodingHistory ===
        "function"
      ) {
        renderCodingHistory();
      }
    } catch {
      // Ignore renderer mismatch.
    }

    refreshCodingSessionControls();
  }

  function refreshCodingSessionControls() {
    const workspace =
      getWorkspace();

    if (!workspace) {
      return;
    }

    const history =
      getCodingHistory();

    const activeId =
      getActiveCodingSessionId();

    workspace
      .querySelectorAll(
        "[data-coding-session-id]"
      )
      .forEach(item => {
        const id =
          item.dataset.codingSessionId;

        item.classList.toggle(
          "active",
          id === activeId
        );
      });

    workspace
      .querySelectorAll(
        ".coding-session-rename"
      )
      .forEach(button => {
        const id =
          button.dataset.sessionId;

        button.onclick =
          event => {
            event.preventDefault();
            event.stopPropagation();

            const session =
              history.find(
                item =>
                  item &&
                  item.id === id
              );

            if (!session) {
              return;
            }

            const title =
              window.prompt(
                "Rename coding session",
                session.title ||
                "Coding session"
              );

            if (
              title !== null
            ) {
              renameCodingSession(
                id,
                title
              );
            }
          };
      });

    workspace
      .querySelectorAll(
        ".coding-session-delete"
      )
      .forEach(button => {
        const id =
          button.dataset.sessionId;

        button.onclick =
          event => {
            event.preventDefault();
            event.stopPropagation();

            const session =
              history.find(
                item =>
                  item &&
                  item.id === id
              );

            if (!session) {
              return;
            }

            const confirmed =
              window.confirm(
                `Delete "${session.title || "Coding session"}"?`
              );

            if (confirmed) {
              deleteCodingSession(id);
            }
          };
      });
  }

  /*
   * Track whichever coding session the user most recently clicked.
   */

  document.addEventListener(
    "click",
    event => {
      const item =
        event.target.closest?.(
          "[data-coding-session-id]"
        );

      if (!item) {
        return;
      }

      const id =
        item.dataset.codingSessionId;

      if (id) {
        setActiveCodingSessionId(id);
      }
    }
  );

  /*
   * =======================================================
   * CODE -> WORKSPACE
   * =======================================================
   */

  function getCodeBlock(eventTarget) {
    return eventTarget.closest?.(
      ".code-block"
    );
  }

  function getBlockLanguage(block) {
    return String(
      block?.querySelector(
        ".code-language"
      )?.textContent || ""
    )
      .trim()
      .toLowerCase();
  }

  function getBlockCode(block) {
    return (
      block?.querySelector(
        "pre code"
      )?.textContent || ""
    ).trim();
  }

  function supportedWorkspaceLanguage(
    language
  ) {
    return [
      "js",
      "javascript",
      "jsx",
      "ts",
      "typescript",
      "tsx",
      "html",
      "css",
      "json",
      "python",
      "py",
      "bash",
      "sh"
    ].includes(language);
  }

  function openCodeInCodingWorkspace(
    code,
    language
  ) {
    if (!code) {
      return;
    }

    setCurrentMode("coding");

    const textarea =
      getCodingTextarea();

    if (textarea) {
      const prompt =
        [
          "Work with this code.",
          `Language: ${language || "code"}`,
          "",
          "```" +
          (language || "") +
          "\n" +
          code +
          "\n```"
        ].join("\n");

      textarea.value =
        prompt;

      textarea.dispatchEvent(
        new Event("input", {
          bubbles: true
        })
      );

      textarea.focus();
    }

    try {
      localStorage.setItem(
        CODING_DRAFT_KEY,
        String(
          textarea?.value || ""
        )
      );
    } catch {
      // Ignore storage failure.
    }

    requestAnimationFrame(() => {
      const input =
        getCodingTextarea();

      input?.focus();
    });
  }

  function addOpenWorkspaceButton(
    codeBlock
  ) {
    if (!codeBlock) {
      return;
    }

    if (
      codeBlock.querySelector(
        ".open-coding-workspace-button"
      )
    ) {
      return;
    }

    const language =
      getBlockLanguage(
        codeBlock
      );

    if (
      !supportedWorkspaceLanguage(
        language
      )
    ) {
      return;
    }

    const header =
      codeBlock.querySelector(
        ".code-header"
      );

    if (!header) {
      return;
    }

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "open-coding-workspace-button";

    button.textContent =
      "Open in coding";

    button.title =
      "Open this code in Coding mode";

    button.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        openCodeInCodingWorkspace(
          getBlockCode(codeBlock),
          language
        );
      }
    );

    header.appendChild(
      button
    );
  }

  function scanCodeBlocks() {
    document
      .querySelectorAll(
        ".code-block"
      )
      .forEach(
        addOpenWorkspaceButton
      );

    refreshCodingSessionControls();
  }

  /*
   * Re-scan whenever streamed AI output creates code.
   */

  const observer =
    new MutationObserver(
      mutations => {
        let changed = false;

        mutations.forEach(
          mutation => {
            if (
              mutation.type ===
                "childList" &&
              mutation.addedNodes.length
            ) {
              changed = true;
            }
          }
        );

        if (changed) {
          scanCodeBlocks();
        }
      }
    );

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  /*
   * Restore active session after Coding mode opens.
   */

  document.addEventListener(
    "click",
    () => {
      if (
        currentMode !== "coding"
      ) {
        return;
      }

      const activeId =
        ensureActiveCodingSession();

      if (activeId) {
        setActiveCodingSessionId(
          activeId
        );
      }

      setTimeout(() => {
        refreshCodingSessionControls();
      }, 50);
    }
  );

  scanCodeBlocks();
})();



/* =========================================================
   CODING WORKSPACE FINAL PATCH
   ========================================================= */

(function () {
  const CODING_HISTORY_KEY =
    "adnova_coding_history_v1";

  const CODING_ACTIVE_KEY =
    "adnova_coding_active_session_v1";

  const CODING_DRAFT_KEY =
    "adnova_coding_draft_v1";

  let lastCodingSubmitAt = 0;

  function getWorkspace() {
    return document.getElementById("coding-workspace");
  }

  function getCodingInput() {
    const workspace = getWorkspace();

    if (!workspace) {
      return null;
    }

    return workspace.querySelector(
      "#coding-message-input, #coding-input, textarea"
    );
  }

  function getCodingSendButton() {
    const workspace = getWorkspace();

    if (!workspace) {
      return null;
    }

    return workspace.querySelector(
      "#coding-send-button, [data-coding-send], .coding-send-button, button[aria-label*='send' i]"
    );
  }

  function clearCodingInput() {
    const input = getCodingInput();

    if (!input) {
      return;
    }

    input.value = "";

    input.dispatchEvent(
      new Event("input", {
        bubbles: true
      })
    );

    input.dispatchEvent(
      new Event("change", {
        bubbles: true
      })
    );

    try {
      localStorage.removeItem(
        CODING_DRAFT_KEY
      );
    } catch {}

    input.focus();
  }

  /*
   * ---------------------------------------------------------
   * CODING ENTER
   * ---------------------------------------------------------
   *
   * Capture phase deliberately runs before every normal
   * textarea listener so Enter cannot fall through and
   * become a newline or trigger a second submission.
   */

  document.addEventListener(
    "keydown",
    event => {
      const target =
        event.target;

      if (
        !(target instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      if (
        !target.closest("#coding-workspace")
      ) {
        return;
      }

      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const value =
        String(target.value || "").trim();

      if (!value) {
        return;
      }

      const now =
        Date.now();

      if (
        now - lastCodingSubmitAt < 500
      ) {
        return;
      }

      lastCodingSubmitAt =
        now;

      const form =
        target.closest("form");

      if (form) {
        form.requestSubmit();
      } else {
        const button =
          getCodingSendButton();

        if (
          button &&
          !button.disabled
        ) {
          button.click();
        }
      }

      /*
       * Clear after the existing coding submit handler has
       * consumed the message.
       */
      setTimeout(() => {
        clearCodingInput();
      }, 30);
    },
    true
  );

  /*
   * Also clear when the coding form/button sends normally.
   * This handles mouse clicks and existing custom handlers.
   */

  document.addEventListener(
    "submit",
    event => {
      const form =
        event.target;

      if (
        !(form instanceof HTMLFormElement)
      ) {
        return;
      }

      if (
        !form.closest("#coding-workspace")
      ) {
        return;
      }

      setTimeout(() => {
        clearCodingInput();
      }, 30);
    },
    false
  );

  document.addEventListener(
    "click",
    event => {
      const button =
        event.target.closest?.(
          "#coding-send-button, [data-coding-send], .coding-send-button"
        );

      if (!button) {
        return;
      }

      if (
        !button.closest("#coding-workspace")
      ) {
        return;
      }

      setTimeout(() => {
        clearCodingInput();
      }, 30);
    },
    false
  );

  /*
   * ---------------------------------------------------------
   * NEW CODING CHAT
   * ---------------------------------------------------------
   */

  function createCodingNewChat() {
    const workspace =
      getWorkspace();

    if (!workspace) {
      return;
    }

    if (
      workspace.querySelector(
        "#coding-new-chat"
      )
    ) {
      return;
    }

    const header =
      workspace.querySelector(
        ".coding-workspace-header, .coding-header"
      );

    if (!header) {
      return;
    }

    const button =
      document.createElement("button");

    button.id =
      "coding-new-chat";

    button.type =
      "button";

    button.className =
      "coding-new-chat";

    button.innerHTML = `
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path d="M10 4v12"></path>
        <path d="M4 10h12"></path>
      </svg>

      <span>New chat</span>
    `;

    button.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        if (
          isGenerating &&
          typeof stopGeneration === "function"
        ) {
          stopGeneration();
        }

        clearCodingInput();

        try {
          localStorage.removeItem(
            CODING_DRAFT_KEY
          );
        } catch {}

        const sessionId =
          `coding-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 9)}`;

        try {
          localStorage.setItem(
            CODING_ACTIVE_KEY,
            sessionId
          );
        } catch {}

        const output =
          workspace.querySelector(
            "#coding-output, .coding-output, .coding-response"
          );

        if (output) {
          output.innerHTML = `
            <div class="coding-empty-state">
              <div class="coding-empty-state-title">
                New coding session
              </div>

              <div class="coding-empty-state-text">
                Your new coding conversation is ready.
              </div>
            </div>
          `;
        }

        workspace.dataset.codingSessionId =
          sessionId;

        const steps =
          workspace.querySelectorAll(
            ".coding-workflow-step, .coding-activity-step"
          );

        steps.forEach(step => {
          step.classList.remove(
            "active",
            "complete"
          );
        });

        const prepare =
          workspace.querySelector(
            "[data-stage='prepare'], [data-workflow='prepare']"
          );

        prepare?.classList.add(
          "active"
        );

        setTimeout(() => {
          clearCodingInput();
        }, 50);
      }
    );

    header.appendChild(
      button
    );
  }

  /*
   * ---------------------------------------------------------
   * CODE PREVIEW / RUN
   * ---------------------------------------------------------
   */

  function languageForBlock(block) {
    return String(
      block.querySelector(
        ".code-language"
      )?.textContent || ""
    )
      .trim()
      .toLowerCase();
  }

  function codeForBlock(block) {
    return (
      block.querySelector(
        "pre code"
      )?.textContent || ""
    ).trim();
  }

  function canRun(language) {
    return [
      "html",
      "htm",
      "css",
      "javascript",
      "js",
      "svg"
    ].includes(language);
  }

  function makePreview(code, language) {
    if (
      language === "html" ||
      language === "htm"
    ) {
      return code;
    }

    if (language === "css") {
      return `
<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<style>
${code}
</style>
</head>
<body>
<div class="preview-root">
  <h1>Adnova Preview</h1>
  <p>Live CSS preview.</p>
  <button>Test button</button>
</div>
</body>
</html>`;
    }

    if (language === "svg") {
      return `
<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<style>
html,body{
  margin:0;
  width:100%;
  height:100%;
}
body{
  display:grid;
  place-items:center;
}
svg{
  max-width:90%;
  max-height:90%;
}
</style>
</head>
<body>
${code}
</body>
</html>`;
    }

    if (
      language === "javascript" ||
      language === "js"
    ) {
      return `
<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{
  margin:0;
  padding:24px;
  font-family:system-ui,sans-serif;
  color:#0f172a;
  background:#fff;
}
#root{
  padding:20px;
  border:1px solid #e2e8f0;
  border-radius:14px;
}
#console{
  margin-top:14px;
  padding:12px;
  white-space:pre-wrap;
  border:1px solid #e2e8f0;
  border-radius:10px;
  background:#f8fafc;
  font-family:monospace;
  font-size:12px;
}
</style>
</head>
<body>
<div id="root"></div>
<div id="console">Console output:</div>

<script>
(() => {
  const consoleBox =
    document.getElementById("console");

  const originalLog =
    console.log;

  console.log = (...args) => {
    consoleBox.textContent +=
      "\\n" +
      args
        .map(value => {
          try {
            return typeof value === "string"
              ? value
              : JSON.stringify(value);
          } catch {
            return String(value);
          }
        })
        .join(" ");

    originalLog(...args);
  };

  window.addEventListener(
    "error",
    event => {
      consoleBox.textContent +=
        "\\n[ERROR] " +
        (
          event.message ||
          "Runtime error"
        );
    }
  );

  try {
    ${code}
  } catch (error) {
    consoleBox.textContent +=
      "\\n[ERROR] " +
      (
        error?.message ||
        String(error)
      );
  }
})();
</script>
</body>
</html>`;
    }

    return code;
  }

  function showPreview(code, language) {
    let overlay =
      document.getElementById(
        "coding-preview-overlay"
      );

    if (!overlay) {
      overlay =
        document.createElement("div");

      overlay.id =
        "coding-preview-overlay";

      overlay.className =
        "coding-preview-overlay";

      overlay.innerHTML = `
        <div class="coding-preview-backdrop"></div>

        <div class="coding-preview-window">
          <div class="coding-preview-header">
            <div>
              <div class="coding-preview-eyebrow">
                LIVE CODE
              </div>

              <div class="coding-preview-title">
                Running preview
              </div>
            </div>

            <button
              type="button"
              class="coding-preview-close"
            >
              ×
            </button>
          </div>

          <div class="coding-preview-body">
            <iframe
              class="coding-preview-frame"
              sandbox="allow-scripts"
              title="Live code preview"
            ></iframe>
          </div>
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

          const frame =
            overlay.querySelector(
              ".coding-preview-frame"
            );

          if (frame) {
            frame.srcdoc =
              "<!doctype html><html><body></body></html>";
          }
        };

      overlay
        .querySelector(
          ".coding-preview-backdrop"
        )
        .addEventListener(
          "click",
          close
        );

      overlay
        .querySelector(
          ".coding-preview-close"
        )
        .addEventListener(
          "click",
          close
        );
    }

    const frame =
      overlay.querySelector(
        ".coding-preview-frame"
      );

    if (!frame) {
      return;
    }

    frame.srcdoc =
      makePreview(
        code,
        language
      );

    overlay.classList.add(
      "open"
    );
  }

  function addCodeControls(block) {
    if (!block) {
      return;
    }

    const header =
      block.querySelector(
        ".code-header"
      );

    if (!header) {
      return;
    }

    const language =
      languageForBlock(block);

    if (
      !canRun(language)
    ) {
      return;
    }

    if (
      !header.querySelector(
        ".coding-run-button"
      )
    ) {
      const runButton =
        document.createElement(
          "button"
        );

      runButton.type =
        "button";

      runButton.className =
        "coding-run-button";

      runButton.textContent =
        "Run";

      runButton.title =
        "Run this code";

      runButton.addEventListener(
        "click",
        event => {
          event.preventDefault();
          event.stopPropagation();

          showPreview(
            codeForBlock(block),
            languageForBlock(block)
          );
        }
      );

      header.appendChild(
        runButton
      );
    }

    if (
      !header.querySelector(
        ".coding-open-button"
      )
    ) {
      const openButton =
        document.createElement(
          "button"
        );

      openButton.type =
        "button";

      openButton.className =
        "coding-open-button";

      openButton.textContent =
        "Open in coding";

      openButton.title =
        "Open this code in Coding mode";

      openButton.addEventListener(
        "click",
        event => {
          event.preventDefault();
          event.stopPropagation();

          setCurrentMode(
            "coding"
          );

          const input =
            getCodingInput();

          if (!input) {
            return;
          }

          input.value =
            [
              "Work with this code:",
              "",
              "```" +
              language +
              "\n" +
              codeForBlock(block) +
              "\n```"
            ].join("\n");

          input.dispatchEvent(
            new Event("input", {
              bubbles: true
            })
          );

          input.focus();

          try {
            localStorage.setItem(
              CODING_DRAFT_KEY,
              input.value
            );
          } catch {}
        }
      );

      header.appendChild(
        openButton
      );
    }
  }

  function scanCode() {
    document
      .querySelectorAll(
        ".code-block"
      )
      .forEach(
        addCodeControls
      );
  }

  /*
   * ---------------------------------------------------------
   * KEEP EVERYTHING WORKING AFTER STREAMING
   * ---------------------------------------------------------
   */

  const observer =
    new MutationObserver(() => {
      createCodingNewChat();
      scanCode();
    });

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  /*
   * Restore draft whenever Coding mode exists.
   */

  function restoreDraft() {
    if (
      currentMode !== "coding"
    ) {
      return;
    }

    const input =
      getCodingInput();

    if (!input) {
      return;
    }

    if (
      input.value.trim()
    ) {
      return;
    }

    try {
      const draft =
        localStorage.getItem(
          CODING_DRAFT_KEY
        );

      if (draft) {
        input.value =
          draft;

        input.dispatchEvent(
          new Event("input", {
            bubbles: true
          })
        );
      }
    } catch {}
  }

  document.addEventListener(
    "input",
    event => {
      const input =
        event.target;

      if (
        !(input instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      if (
        !input.closest(
          "#coding-workspace"
        )
      ) {
        return;
      }

      try {
        localStorage.setItem(
          CODING_DRAFT_KEY,
          input.value
        );
      } catch {}
    }
  );

  setInterval(() => {
    if (
      currentMode === "coding"
    ) {
      createCodingNewChat();
      scanCode();
      restoreDraft();
    }
  }, 700);

  createCodingNewChat();
  scanCode();
})();
