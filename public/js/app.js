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
    off: `
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="6.5"></circle>
        <path d="M6.5 13.5L13.5 6.5"></path>
      </svg>
    `,
    normal: `
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="6.5"></circle>
        <circle cx="10" cy="10" r="2"></circle>
      </svg>
    `,
    study: `
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4 5.5h7.5A3.5 3.5 0 0 1 15 9v6.5H7a3 3 0 0 1-3-3z"></path>
        <path d="M15 15.5H7"></path>
      </svg>
    `,
    coding: `
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M7 5L3 10l4 5"></path>
        <path d="M13 5l4 5-4 5"></path>
        <path d="M11.5 3.5L8.5 16.5"></path>
      </svg>
    `,
    research: `
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="4.8"></circle>
        <path d="M12.1 12.1L16.5 16.5"></path>
      </svg>
    `,
    creative: `
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 2.8l1.6 4 4.1 1.6-4.1 1.6L10 14l-1.6-4-4.1-1.6 4.1-1.6z"></path>
        <path d="M15 13l.7 1.7 1.7.7-1.7.7L15 18l-.7-1.9-1.7-.7 1.7-.7z"></path>
      </svg>
    `,
    math: `
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4 6.5h12"></path>
        <path d="M4 13.5h12"></path>
        <path d="M7.5 3.5v6"></path>
        <path d="M12.5 10.5v6"></path>
      </svg>
    `,
    science: `
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M7.5 3.5v4.3l-3 5.3a2.1 2.1 0 0 0 1.8 3.1h7.4a2.1 2.1 0 0 0 1.8-3.1l-3-5.3V3.5"></path>
        <path d="M6.2 3.5h7.6"></path>
        <path d="M6 12h8"></path>
      </svg>
    `
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
}

function updateModeButton() {
  const button = document.getElementById("mode-button");

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

  button.setAttribute(
    "aria-label",
    `AI mode: ${AI_MODES[currentMode].label}`
  );
}

function updateModeOptions() {
  const menu = document.getElementById("mode-menu");

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
  const menu = document.getElementById("mode-menu");
  const button = document.getElementById("mode-button");

  menu?.classList.remove("open");
  button?.classList.remove("open");
  button?.setAttribute("aria-expanded", "false");
}

function openModeMenu() {
  const menu = document.getElementById("mode-menu");
  const button = document.getElementById("mode-button");

  if (!menu || !button || isGenerating) {
    return;
  }

  menu.classList.add("open");
  button.classList.add("open");
  button.setAttribute("aria-expanded", "true");
}

function createModeSelector() {
  if (
    !composer ||
    document.getElementById("mode-button")
  ) {
    return;
  }

  const button = document.createElement("button");

  button.id = "mode-button";
  button.type = "button";
  button.className = "mode-button";
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "false");

  const menu = document.createElement("div");

  menu.id = "mode-menu";
  menu.className = "mode-menu";

  menu.innerHTML = `
    <div class="mode-menu-title">AI MODE</div>

    <div class="mode-menu-options">
      ${Object.entries(AI_MODES).map(([key, mode]) => `
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
            <span class="mode-option-label">${mode.label}</span>
            <span class="mode-option-description">${mode.description}</span>
          </span>

          <span class="mode-option-check">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4.5 10.5l3.2 3.2 7.8-7.8"></path>
            </svg>
          </span>
        </button>
      `).join("")}
    </div>
  `;

  composer.insertBefore(button, sendButton);
  composer.appendChild(menu);

  button.addEventListener("click", event => {
    event.stopPropagation();

    if (menu.classList.contains("open")) {
      closeModeMenu();
    } else {
      openModeMenu();
    }
  });

  menu.addEventListener("click", event => {
    const option =
      event.target.closest(".mode-option");

    if (!option || isGenerating) {
      return;
    }

    setCurrentMode(
      option.dataset.mode || "off"
    );

    closeModeMenu();
    input.focus();
  });

  document.addEventListener("click", event => {
    if (
      !menu.contains(event.target) &&
      !button.contains(event.target)
    ) {
      closeModeMenu();
    }
  });

  setCurrentMode("off");
}


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


function buildFollowUpSuggestions(mode) {
  const suggestions = {
    off: [
      "Explain that another way",
      "Give me an example",
      "What should I do next?"
    ],
    normal: [
      "Explain that another way",
      "Give me an example",
      "What should I do next?"
    ],
    study: [
      "Quiz me on this",
      "Explain the hardest part",
      "Give me a practice question"
    ],
    coding: [
      "Show me the code",
      "Help me improve it",
      "What should I build next?"
    ],
    research: [
      "Go deeper on this",
      "Compare the evidence",
      "What are the main uncertainties?"
    ],
    creative: [
      "Give me 5 more ideas",
      "Make it more original",
      "Take this in a new direction"
    ],
    math: [
      "Show the working",
      "Give me a similar problem",
      "Check the result another way"
    ],
    science: [
      "Explain the mechanism",
      "Give me a real-world example",
      "Go deeper into the science"
    ]
  };

  return suggestions[mode] || suggestions.off;
}

function renderFollowUpSuggestions(messageElement, mode) {
  if (!messageElement) {
    return;
  }

  messageElement
    .querySelector(".follow-up-suggestions")
    ?.remove();

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "follow-up-suggestions";

  const label =
    document.createElement("div");

  label.className =
    "follow-up-label";

  label.textContent =
    "Continue with";

  wrapper.appendChild(label);

  buildFollowUpSuggestions(mode)
    .forEach(text => {
      const button =
        document.createElement("button");

      button.type = "button";
      button.className =
        "follow-up-button";

      button.innerHTML = `
        <span>${text}</span>

        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4 10h11"></path>
          <path d="M10.5 5.5L15 10l-4.5 4.5"></path>
        </svg>
      `;

      button.addEventListener("click", () => {
        input.value = text;
        resizeInput();
        input.focus();
      });

      wrapper.appendChild(button);
    });

  messageElement.appendChild(wrapper);
}

