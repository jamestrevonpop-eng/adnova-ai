(() => {
  "use strict";

  const MODELS = {
    "adnova-1-1": {
      name: "Adnova 1.1",
      welcome: "What can we work on?"
    },

    "adnova-2-0": {
      name: "Adnova 2.0",
      welcome: "What do you need solved?"
    },

    "adnova-3-0": {
      name: "Adnova 3.0",
      welcome: "What should we figure out?"
    },

    "adnova-4-0": {
      name: "Adnova 4.0",
      welcome: "Let's work through something difficult."
    },

    "adnova-5-sol": {
      name: "Adnova 5.0 Sol",
      welcome: "What challenge are we taking on?"
    }
  };

  const state = {
    model: localStorage.getItem("adnova-model") || "adnova-1-1",
    pluginOpen: false
  };

  function findComposerForm() {
    return document.querySelector("#chat-form");
  }

  function getMainApp() {
    return document.querySelector("main.app");
  }

  function createModelSelector() {
    const form = findComposerForm();

    if (!form) return;

    if (document.querySelector("#adnova-model-selector")) {
      return;
    }

    const wrapper = document.createElement("div");

    wrapper.id = "adnova-model-selector";

    wrapper.style.cssText = `
      position: relative;
      width: fit-content;
      margin: 0 auto 8px;
    `;

    const select = document.createElement("select");

    select.id = "adnova-model";

    select.style.cssText = `
      appearance: none;
      border: 1px solid #dedede;
      background: #fff;
      border-radius: 999px;
      padding: 8px 34px 8px 13px;
      font-size: 13px;
      cursor: pointer;
      outline: none;
    `;

    for (const [id, model] of Object.entries(MODELS)) {
      const option = document.createElement("option");

      option.value = id;
      option.textContent = model.name;

      if (id === state.model) {
        option.selected = true;
      }

      select.appendChild(option);
    }

    select.addEventListener("change", () => {
      state.model = select.value;

      localStorage.setItem(
        "adnova-model",
        state.model
      );

      updateWelcome();
    });

    wrapper.appendChild(select);

    form.parentElement?.insertBefore(
      wrapper,
      form
    );
  }

  function updateWelcome() {
    const model = MODELS[state.model];

    const welcome = document.querySelector("#welcome");

    if (!welcome || !model) return;

    const title = welcome.querySelector("h1");

    if (title) {
      title.textContent = model.welcome;
    }

    const paragraph = welcome.querySelector("p");

    if (paragraph) {
      paragraph.textContent =
        `${model.name} is ready.`;
    }
  }

  function createPluginControls() {
    if (document.querySelector("#adnova-plugin-controls")) {
      return;
    }

    const button = document.createElement("button");

    button.id = "adnova-plugin-controls";
    button.type = "button";
    button.textContent = "Plugins";

    button.style.cssText = `
      position: fixed;
      top: 58px;
      left: 14px;
      z-index: 999;
      border: 1px solid #dedede;
      background: #fff;
      border-radius: 8px;
      padding: 8px 12px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,.05);
    `;

    button.addEventListener("click", openPlugins);

    document.body.appendChild(button);
  }

  function openPlugins() {
    if (document.querySelector("#adnova-plugins-panel")) {
      return;
    }

    const panel = document.createElement("div");

    panel.id = "adnova-plugins-panel";

    panel.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2000;
      background: rgba(0,0,0,.12);
      display: flex;
      justify-content: flex-start;
      align-items: stretch;
    `;

    panel.innerHTML = `
      <section style="
        width:min(460px,100vw);
        height:100%;
        background:#fff;
        border-right:1px solid #ddd;
        padding:24px;
        overflow:auto;
      ">
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:24px;
        ">
          <div>
            <div style="font-size:12px;color:#777;">
              PLUGINS
            </div>
            <h2 style="margin:5px 0 0;">
              Adnova Plugins
            </h2>
          </div>

          <button
            id="adnova-plugin-close"
            style="
              border:0;
              background:transparent;
              font-size:24px;
              cursor:pointer;
            "
          >
            ×
          </button>
        </div>

        <div style="
          border:1px solid #e0e0e0;
          border-radius:12px;
          padding:16px;
        ">
          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
          ">
            <div>
              <strong>Adnova Coding</strong>
              <div style="
                margin-top:4px;
                color:#777;
                font-size:13px;
              ">
                Connect Adnova AI with Adnova Code.
              </div>
            </div>

            <span
              id="adnova-coding-status"
              style="
                font-size:12px;
                padding:5px 8px;
                border-radius:999px;
                background:#f1f1f1;
              "
            >
              Checking…
            </span>
          </div>
        </div>
      </section>
    `;

    document.body.appendChild(panel);

    panel
      .querySelector("#adnova-plugin-close")
      .addEventListener("click", () => {
        panel.remove();
      });

    checkCodingPlugin(
      panel.querySelector("#adnova-coding-status")
    );
  }

  async function checkCodingPlugin(statusElement) {
    const codeUrl =
      localStorage.getItem("adnova-code-url") ||
      "http://localhost:3001";

    try {
      const response = await fetch(
        `${codeUrl}/api/plugin/health`,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        }
      );

      const data = await response.json();

      if (response.ok && data.plugin === "Adnova Coding") {
        statusElement.textContent = "Connected";
        statusElement.style.background = "#eaf7ed";
      } else {
        throw new Error("Invalid plugin response");
      }
    } catch {
      statusElement.textContent = "Offline";
      statusElement.style.background = "#f4f4f4";
    }
  }

  function exposePluginApi() {
    window.AdnovaCoding = {
      name: "Adnova Coding",

      async health() {
        const codeUrl =
          localStorage.getItem("adnova-code-url") ||
          "http://localhost:3001";

        const response = await fetch(
          `${codeUrl}/api/plugin/health`
        );

        return response.json();
      },

      async sendPrompt({
        prompt,
        context = {},
        attachments = []
      }) {
        const codeUrl =
          localStorage.getItem("adnova-code-url") ||
          "http://localhost:3001";

        const response = await fetch(
          `${codeUrl}/api/plugin/prompt`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              prompt,
              model: state.model,
              context,
              attachments
            })
          }
        );

        return response.json();
      }
    };
  }

  function installModelIntoExistingChat() {
    const form = findComposerForm();

    if (!form) return;

    const originalSubmit = form.getAttribute(
      "data-adnova-v2-hooked"
    );

    if (originalSubmit) return;

    form.setAttribute(
      "data-adnova-v2-hooked",
      "true"
    );

    form.addEventListener("submit", () => {
      window.AdnovaSelectedModel =
        state.model;
    });
  }

  function boot() {
    createModelSelector();
    createPluginControls();
    updateWelcome();
    exposePluginApi();
    installModelIntoExistingChat();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      { once: true }
    );
  } else {
    boot();
  }
})();
