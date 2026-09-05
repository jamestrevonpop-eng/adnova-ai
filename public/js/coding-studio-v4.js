(() => {
  "use strict";

  const PROJECTS_KEY = "adnova_code_projects_v4";
  const ACTIVE_DRAFT_KEY = "adnova_code_active_draft_v4";
  const ACTIVE_PROJECT_KEY = "adnova_code_active_project_v4";
  const UI_STYLE_ID = "adnova-coding-studio-v4-style";
  const ROOT_ID = "adnova-coding-studio-v4";
  const MAX_PROJECTS = 5;
  const MAX_BACKUPS = 10;

  const WORKSPACE_ALLOWANCE = 10 * 1024 * 1024 * 1024;
  const CACHE_ALLOWANCE = 5 * 1024 * 1024 * 1024;
  const CACHE_RESETS_PER_DAY = 2;
  const CACHE_META_KEY = "adnova_cache_meta_v4";

  let studio = null;
  let terminalPickerIndex = 0;
  let terminalPickerProjects = [];
  let terminalPickerActive = false;

  function safeJsonParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function normalizePath(path) {
    let value = String(path || "").trim();

    if (!value) {
      return "/";
    }

    value = value.replace(/\\/g, "/");

    if (!value.startsWith("/")) {
      value = `/${value}`;
    }

    const parts = [];

    value.split("/").forEach(part => {
      if (!part || part === ".") {
        return;
      }

      if (part === "..") {
        parts.pop();
        return;
      }

      parts.push(part);
    });

    return `/${parts.join("/")}` || "/";
  }

  function parentPath(path) {
    const value = normalizePath(path);
    const slash = value.lastIndexOf("/");

    return slash <= 0
      ? "/"
      : value.slice(0, slash);
  }

  function baseName(path) {
    const value = normalizePath(path);

    if (value === "/") {
      return "/";
    }

    return value.slice(value.lastIndexOf("/") + 1);
  }

  function isSafeProjectPath(path) {
    const value = String(path || "");

    return !value.includes("..") &&
      !value.includes("\\");
  }

  function isFile(path) {
    return !!studio?.project?.files?.[
      normalizePath(path)
    ];
  }

  function defaultFiles() {
    return {
      "/index.html": `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Adnova Project</title>
</head>
<body>
  <main>
    <h1>Welcome</h1>
    <p>Start building with Adnova Coding.</p>
  </main>
</body>
</html>`,

      "/style.css": `body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #f7f8fb;
  color: #16181d;
}

main {
  max-width: 900px;
  margin: 80px auto;
  padding: 32px;
}`,

      "/script.js": `console.log("Adnova project ready");`,

      "/README.md": `# Adnova Project

Built in Adnova Coding Studio.
`
    };
  }

  function blankProject(name = "Untitled") {
    return {
      id: null,
      name,
      updatedAt: Date.now(),
      files: defaultFiles(),
      folders: [],
      currentFile: "/index.html",
      snapshots: [],
      backups: [],
      aiMessages: [],
      cwd: "/"
    };
  }

  function cleanProject(project) {
    const safe =
      project &&
      typeof project === "object"
        ? project
        : {};

    return {
      id: safe.id || null,

      name:
        String(safe.name || "Untitled")
          .slice(0, 80),

      updatedAt:
        Number(safe.updatedAt) ||
        Date.now(),

      files:
        safe.files &&
        typeof safe.files === "object"
          ? safe.files
          : defaultFiles(),

      folders:
        Array.isArray(safe.folders)
          ? safe.folders
              .map(normalizePath)
              .filter(Boolean)
          : [],

      currentFile:
        isSafeProjectPath(safe.currentFile)
          ? normalizePath(safe.currentFile)
          : "/index.html",

      snapshots:
        Array.isArray(safe.snapshots)
          ? safe.snapshots.slice(0, 10)
          : [],

      backups:
        Array.isArray(safe.backups)
          ? safe.backups.slice(0, MAX_BACKUPS)
          : [],

      aiMessages:
        Array.isArray(safe.aiMessages)
          ? safe.aiMessages.slice(-30)
          : [],

      cwd:
        normalizePath(
          safe.cwd || "/"
        )
    };
  }

  function loadProjects() {
    const parsed =
      safeJsonParse(
        localStorage.getItem(PROJECTS_KEY),
        []
      );

    return Array.isArray(parsed)
      ? parsed
          .map(cleanProject)
          .slice(0, MAX_PROJECTS)
      : [];
  }

  function saveProjects(projects) {
    try {
      localStorage.setItem(
        PROJECTS_KEY,
        JSON.stringify(
          projects.slice(0, MAX_PROJECTS)
        )
      );
    } catch (error) {
      console.error(
        "Adnova project save failed:",
        error
      );

      notify(
        "Project storage is full. Download a backup before continuing.",
        "error"
      );
    }
  }

  function loadActiveDraft() {
    const parsed =
      safeJsonParse(
        localStorage.getItem(ACTIVE_DRAFT_KEY),
        null
      );

    return parsed
      ? cleanProject(parsed)
      : blankProject();
  }

  function saveActiveDraft() {
    if (!studio?.project) {
      return;
    }

    studio.project.updatedAt = Date.now();

    try {
      localStorage.setItem(
        ACTIVE_DRAFT_KEY,
        JSON.stringify(studio.project)
      );

      localStorage.setItem(
        ACTIVE_PROJECT_KEY,
        studio.project.id || ""
      );
    } catch (error) {
      console.error(error);

      notify(
        "Draft could not be saved. Browser storage may be full.",
        "error"
      );
    }

    updateLiveStorage();
  }

  function notify(message, type = "info") {
    if (
      typeof window.showAdnovaNotification ===
      "function"
    ) {
      window.showAdnovaNotification(
        message,
        type
      );

      return;
    }

    const node =
      document.createElement("div");

    node.className =
      `adnova-v4-toast ${type}`;

    node.textContent = message;

    document.body.appendChild(node);

    setTimeout(
      () => node.remove(),
      2800
    );
  }

  function escapeText(value) {
    return String(value || "")
      .replace(
        /[&<>"']/g,
        character => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[character])
      );
  }

  function escapeAttr(value) {
    return escapeText(value);
  }

  function installStyles() {
    if (
      document.getElementById(
        UI_STYLE_ID
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id = UI_STYLE_ID;

    style.textContent = `
      body.adnova-v4-coding .new-chat-button,
      body.adnova-v4-coding .adnova-coding-terminal,
      body.adnova-v4-coding .adnova-coding-studio,
      body.adnova-v4-coding #adnova-coding-studio,
      body.adnova-v4-coding #coding-workspace,
      body.adnova-v4-coding .coding-workspace {
        display:none!important;
      }

      #${ROOT_ID} {
        position:fixed;
        inset:0;
        z-index:9000;
        background:#fff;
        color:#16181d;
        font-family:
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;

        display:none;
        flex-direction:column;
      }

      body.adnova-v4-coding #${ROOT_ID} {
        display:flex;
      }

      #${ROOT_ID} * {
        box-sizing:border-box;
      }

      .adnova-v4-top {
        height:58px;
        border-bottom:1px solid #e7e8ec;
        display:flex;
        align-items:center;
        gap:10px;
        padding:0 14px;
        background:#fff;
        flex:none;
      }

      .adnova-v4-brand {
        font-weight:800;
        letter-spacing:-.02em;
        margin-right:8px;
      }

      .adnova-v4-project-name {
        border:1px solid #e1e3e8;
        background:#fafbfc;
        border-radius:9px;
        padding:7px 10px;
        min-width:190px;
        font-weight:600;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      .adnova-v4-spacer {
        flex:1;
      }

      .adnova-v4-btn {
        border:1px solid #dfe2e8;
        background:#fff;
        border-radius:8px;
        padding:8px 11px;
        cursor:pointer;
        font:inherit;
      }

      .adnova-v4-btn:hover {
        background:#f6f7f9;
      }

      .adnova-v4-btn.primary {
        background:#16181d;
        color:#fff;
        border-color:#16181d;
      }

      .adnova-v4-btn:disabled {
        opacity:.55;
        cursor:not-allowed;
      }

      .adnova-v4-body {
        display:grid;
        grid-template-columns:250px minmax(0,1fr);
        min-height:0;
        flex:1;
      }

      .adnova-v4-sidebar {
        border-right:1px solid #e7e8ec;
        display:flex;
        flex-direction:column;
        min-width:0;
        background:#fbfbfc;
      }

      .adnova-v4-explorer-head {
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:11px 12px;
        border-bottom:1px solid #e7e8ec;
        font-size:12px;
        font-weight:800;
        letter-spacing:.06em;
        color:#646a75;
      }

      .adnova-v4-file-actions {
        display:flex;
        gap:5px;
      }

      .adnova-v4-mini {
        width:27px;
        height:27px;
        padding:0;
        display:inline-flex;
        align-items:center;
        justify-content:center;
      }

      .adnova-v4-tree {
        padding:8px;
        overflow:auto;
        min-height:0;
        flex:1;
      }

      .adnova-v4-tree-row {
        display:flex;
        align-items:center;
        gap:7px;
        width:100%;
        border:0;
        background:transparent;
        padding:6px 8px;
        border-radius:6px;
        text-align:left;
        cursor:pointer;
        color:#23262d;
      }

      .adnova-v4-tree-row:hover {
        background:#f0f1f4;
      }

      .adnova-v4-tree-row.active {
        background:#e9edf8;
        font-weight:700;
      }

      .adnova-v4-tree-folder {
        color:#555b66;
        font-weight:700;
      }

      .adnova-v4-editor-wrap {
        display:flex;
        flex-direction:column;
        min-width:0;
        min-height:0;
        background:#fff;
      }

      .adnova-v4-tabs {
        height:45px;
        border-bottom:1px solid #e7e8ec;
        display:flex;
        align-items:center;
        gap:3px;
        padding:0 8px;
      }

      .adnova-v4-tab {
        height:33px;
        border:0;
        background:transparent;
        padding:0 12px;
        border-radius:7px;
        cursor:pointer;
        font-weight:700;
        color:#656b75;
      }

      .adnova-v4-tab.active {
        background:#eef0f5;
        color:#17191e;
      }

      .adnova-v4-pane {
        display:none;
        min-height:0;
        flex:1;
      }

      .adnova-v4-pane.active {
        display:flex;
      }

      .adnova-v4-build {
        flex-direction:column;
      }

      .adnova-v4-editor-head {
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:9px 11px;
        border-bottom:1px solid #e7e8ec;
        background:#fafafa;
      }

      .adnova-v4-path {
        font-family:
          ui-monospace,
          SFMono-Regular,
          Menlo,
          monospace;

        font-size:12px;
        color:#60656f;
      }

      .adnova-v4-editor-area {
        display:grid;
        grid-template-columns:minmax(0,1fr) 360px;
        min-height:0;
        flex:1;
      }

      .adnova-v4-code {
        width:100%;
        height:100%;
        resize:none;
        border:0;
        outline:0;
        padding:18px;

        font:
          13px/1.55
          ui-monospace,
          SFMono-Regular,
          Menlo,
          monospace;

        background:#0f1115;
        color:#f4f4f5;
        tab-size:2;
      }

      .adnova-v4-ai {
        border-left:1px solid #e7e8ec;
        display:flex;
        flex-direction:column;
        min-width:0;
        background:#fafbfc;
      }

      .adnova-v4-ai-head {
        padding:12px;
        border-bottom:1px solid #e7e8ec;
        font-weight:800;
      }

      .adnova-v4-ai-messages {
        padding:12px;
        overflow:auto;
        flex:1;
        min-height:0;
      }

      .adnova-v4-ai-msg {
        padding:10px;
        border:1px solid #e1e4e9;
        border-radius:9px;
        background:#fff;
        margin-bottom:8px;
        font-size:12px;
        line-height:1.45;
        white-space:pre-wrap;
        word-break:break-word;
      }

      .adnova-v4-ai-msg.user {
        background:#f1f3f6;
      }

      .adnova-v4-ai-compose {
        padding:10px;
        border-top:1px solid #e7e8ec;
      }

      .adnova-v4-ai-input {
        width:100%;
        min-height:100px;
        resize:vertical;
        border:1px solid #d9dce2;
        border-radius:8px;
        padding:10px;
        font:13px/1.45 inherit;
        background:#fff;
        outline:none;
      }

      .adnova-v4-ai-actions {
        display:flex;
        justify-content:flex-end;
        margin-top:8px;
      }

      .adnova-v4-preview {
        flex-direction:column;
      }

      .adnova-v4-preview-toolbar {
        height:45px;
        border-bottom:1px solid #e7e8ec;
        display:flex;
        align-items:center;
        gap:7px;
        padding:0 9px;
      }

      .adnova-v4-preview-frame {
        width:100%;
        height:100%;
        border:0;
        background:#fff;
      }

      .adnova-v4-terminal {
        flex-direction:column;
        background:#0c0e11;
        color:#e8e9eb;
      }

      .adnova-v4-terminal-log {
        flex:1;
        overflow:auto;
        padding:14px;

        font:
          13px/1.5
          ui-monospace,
          SFMono-Regular,
          Menlo,
          monospace;

        white-space:pre-wrap;
        word-break:break-word;
      }

      .adnova-v4-terminal-input-row {
        display:flex;
        border-top:1px solid #252932;
        padding:9px;
        gap:8px;
      }

      .adnova-v4-terminal-input {
        flex:1;
        border:0;
        outline:0;
        background:transparent;
        color:#fff;

        font:
          13px
          ui-monospace,
          SFMono-Regular,
          Menlo,
          monospace;
      }

      .adnova-v4-storage {
        border-top:1px solid #e7e8ec;
        padding:10px;
        font-size:11px;
        line-height:1.5;
        color:#626873;
        background:#fafbfc;
      }

      .adnova-v4-storage strong {
        color:#2a2d33;
      }

      .adnova-v4-meter {
        height:5px;
        border-radius:99px;
        background:#e6e8ec;
        overflow:hidden;
        margin:5px 0 7px;
      }

      .adnova-v4-meter > span {
        display:block;
        height:100%;
        background:#3b404a;
        min-width:2px;
      }

      .adnova-v4-toast {
        position:fixed;
        right:16px;
        bottom:16px;
        z-index:10000;
        background:#17191e;
        color:#fff;
        padding:10px 13px;
        border-radius:9px;
        font-size:13px;
        box-shadow:0 10px 30px rgba(0,0,0,.15);
      }

      .adnova-v4-toast.error {
        background:#8f1d2c;
      }

      .adnova-v4-dialog {
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.28);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:10001;
      }

      .adnova-v4-dialog-card {
        width:min(420px,calc(100vw - 32px));
        background:#fff;
        border-radius:12px;
        padding:16px;
        box-shadow:0 20px 60px rgba(0,0,0,.18);
      }

      .adnova-v4-dialog-card h3 {
        margin:0 0 10px;
      }

      .adnova-v4-dialog-card input {
        width:100%;
        border:1px solid #d9dce2;
        border-radius:8px;
        padding:10px;
      }

      .adnova-v4-dialog-actions {
        display:flex;
        justify-content:flex-end;
        gap:8px;
        margin-top:12px;
      }

      @media (max-width:900px) {
        .adnova-v4-body {
          grid-template-columns:200px minmax(0,1fr);
        }

        .adnova-v4-editor-area {
          grid-template-columns:1fr;
        }

        .adnova-v4-ai {
          display:none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function hideLegacyCoding() {
    document
      .querySelectorAll(
        ".adnova-coding-studio," +
        ".adnova-coding-terminal," +
        "#coding-workspace," +
        "#adnova-coding-terminal"
      )
      .forEach(node => node.remove());

    document
      .querySelectorAll(".new-chat-button")
      .forEach(node => {
        node.style.setProperty(
          "display",
          "none",
          "important"
        );
      });
  }

  function restoreNormalChatUi() {
    document
      .querySelectorAll(".new-chat-button")
      .forEach(node => {
        node.style.removeProperty(
          "display"
        );
      });
  }

  function createRoot() {
    let root =
      document.getElementById(ROOT_ID);

    if (root) {
      return root;
    }

    root =
      document.createElement("section");

    root.id = ROOT_ID;

    root.innerHTML = `
      <div class="adnova-v4-top">

        <div class="adnova-v4-brand">
          Adnova Coding
        </div>

        <div
          class="adnova-v4-project-name"
          id="adnova-v4-project-name"
        >
          Untitled
        </div>

        <div class="adnova-v4-spacer"></div>

        <button
          class="adnova-v4-btn"
          id="adnova-v4-new"
        >
          New Chat
        </button>

        <button
          class="adnova-v4-btn"
          id="adnova-v4-save"
        >
          Save Project
        </button>

        <button
          class="adnova-v4-btn"
          id="adnova-v4-back"
        >
          Back to Chat
        </button>

      </div>

      <div class="adnova-v4-body">

        <aside class="adnova-v4-sidebar">

          <div class="adnova-v4-explorer-head">

            <span>
              EXPLORER
            </span>

            <span class="adnova-v4-file-actions">

              <button
                class="adnova-v4-btn adnova-v4-mini"
                id="adnova-v4-add-file"
                title="New file"
              >
                +
              </button>

              <button
                class="adnova-v4-btn adnova-v4-mini"
                id="adnova-v4-add-folder"
                title="New folder"
              >
                □
              </button>

            </span>

          </div>

          <div
            class="adnova-v4-tree"
            id="adnova-v4-tree"
          ></div>

          <div
            class="adnova-v4-storage"
            id="adnova-v4-storage"
          ></div>

        </aside>

        <section class="adnova-v4-editor-wrap">

          <div class="adnova-v4-tabs">

            <button
              class="adnova-v4-tab active"
              data-pane="build"
            >
              Build
            </button>

            <button
              class="adnova-v4-tab"
              data-pane="preview"
            >
              Preview
            </button>

            <button
              class="adnova-v4-tab"
              data-pane="terminal"
            >
              Terminal
            </button>

          </div>

          <div
            class="adnova-v4-pane adnova-v4-build active"
            data-pane-view="build"
          >

            <div class="adnova-v4-editor-head">

              <span
                class="adnova-v4-path"
                id="adnova-v4-path"
              >
                /index.html
              </span>

              <button
                class="adnova-v4-btn adnova-v4-mini"
                id="adnova-v4-save-file"
              >
                Save
              </button>

            </div>

            <div class="adnova-v4-editor-area">

              <textarea
                id="adnova-v4-code"
                class="adnova-v4-code"
                spellcheck="false"
              ></textarea>

              <aside class="adnova-v4-ai">

                <div class="adnova-v4-ai-head">
                  Coding AI
                </div>

                <div
                  class="adnova-v4-ai-messages"
                  id="adnova-v4-ai-messages"
                ></div>

                <div class="adnova-v4-ai-compose">

                  <textarea
                    id="adnova-v4-ai-input"
                    class="adnova-v4-ai-input"
                    placeholder="Build a website, fix this file, add a feature, create files, make folders, or explain the project..."
                  ></textarea>

                  <div class="adnova-v4-ai-actions">

                    <button
                      class="adnova-v4-btn primary"
                      id="adnova-v4-ask"
                    >
                      Ask Coding AI
                    </button>

                  </div>

                </div>

              </aside>

            </div>

          </div>

          <div
            class="adnova-v4-pane adnova-v4-preview"
            data-pane-view="preview"
          >

            <div class="adnova-v4-preview-toolbar">

              <button
                class="adnova-v4-btn"
                id="adnova-v4-preview-refresh"
              >
                Refresh
              </button>

              <button
                class="adnova-v4-btn"
                id="adnova-v4-snapshot"
              >
                Snapshot
              </button>

              <button
                class="adnova-v4-btn"
                id="adnova-v4-restore"
              >
                Restore Snapshot
              </button>

              <button
                class="adnova-v4-btn"
                id="adnova-v4-newtab"
              >
                Open in New Tab
              </button>

              <div class="adnova-v4-spacer"></div>

              <span id="adnova-v4-preview-status">
                Ready
              </span>

            </div>

            <iframe
              id="adnova-v4-preview-frame"
              class="adnova-v4-preview-frame"
              sandbox="allow-scripts allow-forms allow-modals allow-popups"
            ></iframe>

          </div>

          <div
            class="adnova-v4-pane adnova-v4-terminal"
            data-pane-view="terminal"
          >

            <div
              class="adnova-v4-terminal-log"
              id="adnova-v4-terminal-log"
            ></div>

            <div class="adnova-v4-terminal-input-row">

              <span>
                $
              </span>

              <input
                id="adnova-v4-terminal-input"
                class="adnova-v4-terminal-input"
                autocomplete="off"
                spellcheck="false"
              />

            </div>

          </div>

        </section>

      </div>
    `;

    document.body.appendChild(root);

    bindUi(root);

    return root;
  }

  function bindUi(root) {
    root
      .querySelectorAll(".adnova-v4-tab")
      .forEach(tab => {
        tab.addEventListener(
          "click",
          () => {
            switchPane(
              tab.dataset.pane
            );
          }
        );
      });

    root
      .querySelector("#adnova-v4-new")
      .addEventListener(
        "click",
        newCodingChat
      );

    root
      .querySelector("#adnova-v4-save")
      .addEventListener(
        "click",
        saveProjectAsSaved
      );

    root
      .querySelector("#adnova-v4-back")
      .addEventListener(
        "click",
        backToChat
      );

    root
      .querySelector("#adnova-v4-add-file")
      .addEventListener(
        "click",
        createFileDialog
      );

    root
      .querySelector("#adnova-v4-add-folder")
      .addEventListener(
        "click",
        createFolderDialog
      );

    root
      .querySelector("#adnova-v4-save-file")
      .addEventListener(
        "click",
        saveEditor
      );

    root
      .querySelector("#adnova-v4-preview-refresh")
      .addEventListener(
        "click",
        refreshPreview
      );

    root
      .querySelector("#adnova-v4-snapshot")
      .addEventListener(
        "click",
        createSnapshot
      );

    root
      .querySelector("#adnova-v4-restore")
      .addEventListener(
        "click",
        restoreSnapshot
      );

    root
      .querySelector("#adnova-v4-newtab")
      .addEventListener(
        "click",
        openPreviewNewTab
      );

    root
      .querySelector("#adnova-v4-ask")
      .addEventListener(
        "click",
        askCodingAi
      );

    root
      .querySelector("#adnova-v4-ai-input")
      .addEventListener(
        "keydown",
        event => {
          if (
            event.key === "Enter" &&
            (event.ctrlKey || event.metaKey)
          ) {
            event.preventDefault();
            askCodingAi();
          }
        }
      );

    root
      .querySelector("#adnova-v4-code")
      .addEventListener(
        "input",
        () => {
          if (
            !studio?.project?.currentFile
          ) {
            return;
          }

          studio.project.files[
            studio.project.currentFile
          ] =
            root.querySelector(
              "#adnova-v4-code"
            ).value;

          saveActiveDraft();
        }
      );

    root
      .querySelector(
        "#adnova-v4-terminal-input"
      )
      .addEventListener(
        "keydown",
        terminalKeyDown
      );
  }

  function mountStudio() {
    installStyles();
    hideLegacyCoding();

    document.body.classList.add(
      "adnova-v4-coding"
    );

    if (!studio) {
      studio = {
        project:
          loadActiveDraft(),
        previewUrl: null
      };
    }

    studio.project =
      cleanProject(
        studio.project
      );

    const root = createRoot();

    renderAll(root);
  }

  function unmountStudio() {
    document.body.classList.remove(
      "adnova-v4-coding"
    );

    restoreNormalChatUi();
  }

  function isCodingModeActive() {
    const composer =
      document.querySelector(
        ".composer"
      );

    if (
      composer?.dataset?.mode ===
      "coding"
    ) {
      return true;
    }

    const label =
      document.querySelector(
        "#mode-button .mode-button-label"
      )?.textContent || "";

    return /mode:\s*coding/i.test(
      label
    );
  }

  function syncMode() {
    if (
      isCodingModeActive()
    ) {
      mountStudio();
      return;
    }

    if (
      document.getElementById(
        ROOT_ID
      )
    ) {
      unmountStudio();
    }
  }

  function switchPane(name) {
    const root =
      document.getElementById(
        ROOT_ID
      );

    if (!root) {
      return;
    }

    root
      .querySelectorAll(
        ".adnova-v4-tab"
      )
      .forEach(tab => {
        tab.classList.toggle(
          "active",
          tab.dataset.pane === name
        );
      });

    root
      .querySelectorAll(
        ".adnova-v4-pane"
      )
      .forEach(pane => {
        pane.classList.toggle(
          "active",
          pane.dataset.paneView === name
        );
      });

    if (
      name === "preview"
    ) {
      refreshPreview();
    }

    if (
      name === "terminal"
    ) {
      terminalPrint(
        "\n[terminal] Virtual Codespace ready. Type 'help' for commands.\n"
      );
    }
  }

  function renderAll(root) {
    root
      .querySelector(
        "#adnova-v4-project-name"
      )
      .textContent =
      studio.project.name;

    renderTree();

    openFile(
      studio.project.currentFile ||
      "/index.html"
    );

    renderAiMessages();

    updateLiveStorage();

    updateTerminalPrompt();

    refreshPreview();
  }

  function getAllPaths() {
    return Object.keys(
      studio.project.files || {}
    ).sort(
      (a, b) =>
        a.localeCompare(b)
    );
  }

  function renderTree() {
    const root =
      document.getElementById(
        ROOT_ID
      );

    const tree =
      root?.querySelector(
        "#adnova-v4-tree"
      );

    if (!tree) {
      return;
    }

    const files =
      getAllPaths();

    const folders =
      new Set(
        (
          studio.project.folders ||
          []
        ).map(normalizePath)
      );

    files.forEach(file => {
      let dir =
        parentPath(file);

      while (
        dir !== "/"
      ) {
        folders.add(dir);
        dir = parentPath(dir);
      }
    });

    const paths =
      [...folders].sort(
        (a, b) =>
          a.localeCompare(b)
      );

    tree.innerHTML = "";

    paths.forEach(
      folder => {
        const row =
          document.createElement(
            "button"
          );

        row.className =
          "adnova-v4-tree-row adnova-v4-tree-folder";

        row.style.paddingLeft =
          `${
            8 +
            Math.max(
              0,
              folder
                .split("/")
                .filter(Boolean)
                .length - 1
            ) * 14
          }px`;

        row.innerHTML =
          `<span>▸</span><span>${escapeText(
            baseName(folder)
          )}</span>`;

        row.addEventListener(
          "click",
          () =>
            terminalPrint(
              `${folder}\n`
            )
        );

        tree.appendChild(row);
      }
    );

    files.forEach(
      file => {
        const row =
          document.createElement(
            "button"
          );

        row.className =
          `adnova-v4-tree-row ${
            file ===
            studio.project.currentFile
              ? "active"
              : ""
          }`;

        row.style.paddingLeft =
          `${
            22 +
            Math.max(
              0,
              file
                .split("/")
                .filter(Boolean)
                .length - 1
            ) * 14
          }px`;

        row.innerHTML =
          `<span>•</span><span>${escapeText(
            baseName(file)
          )}</span>`;

        row.title = file;

        row.addEventListener(
          "click",
          () => openFile(file)
        );

        tree.appendChild(row);
      }
    );
  }

  function openFile(path) {
    const value =
      normalizePath(path);

    if (!isFile(value)) {
      notify(
        `File not found: ${value}`,
        "error"
      );

      return;
    }

    studio.project.currentFile =
      value;

    const root =
      document.getElementById(
        ROOT_ID
      );

    if (!root) {
      return;
    }

    root.querySelector(
      "#adnova-v4-path"
    ).textContent = value;

    root.querySelector(
      "#adnova-v4-code"
    ).value =
      studio.project.files[
        value
      ] || "";

    renderTree();

    saveActiveDraft();
  }

  function saveEditor() {
    const root =
      document.getElementById(
        ROOT_ID
      );

    const path =
      studio.project.currentFile;

    if (!root || !path) {
      return;
    }

    studio.project.files[path] =
      root.querySelector(
        "#adnova-v4-code"
      ).value;

    saveActiveDraft();

    refreshPreview();

    notify(
      `Saved ${path}`
    );
  }

  function promptValue(
    title,
    placeholder,
    defaultValue = ""
  ) {
    return new Promise(
      resolve => {
        const overlay =
          document.createElement(
            "div"
          );

        overlay.className =
          "adnova-v4-dialog";

        overlay.innerHTML = `
          <div class="adnova-v4-dialog-card">

            <h3>
              ${escapeText(title)}
            </h3>

            <input
              value="${escapeAttr(defaultValue)}"
              placeholder="${escapeAttr(placeholder)}"
              autofocus
            >

            <div class="adnova-v4-dialog-actions">

              <button
                class="adnova-v4-btn"
                data-cancel
              >
                Cancel
              </button>

              <button
                class="adnova-v4-btn primary"
                data-ok
              >
                Continue
              </button>

            </div>

          </div>
        `;

        document.body.appendChild(
          overlay
        );

        const input =
          overlay.querySelector(
            "input"
          );

        const finish =
          value => {
            overlay.remove();
            resolve(value);
          };

        overlay
          .querySelector(
            "[data-cancel]"
          )
          .addEventListener(
            "click",
            () => finish(null)
          );

        overlay
          .querySelector(
            "[data-ok]"
          )
          .addEventListener(
            "click",
            () =>
              finish(
                input.value.trim()
              )
          );

        input.addEventListener(
          "keydown",
          event => {
            if (
              event.key ===
              "Enter"
            ) {
              finish(
                input.value.trim()
              );
            }

            if (
              event.key ===
              "Escape"
            ) {
              finish(null);
            }
          }
        );

        setTimeout(
          () =>
            input.focus(),
          0
        );
      }
    );
  }

  async function createFileDialog() {
    const raw =
      await promptValue(
        "New file",
        "/components/card.js"
      );

    if (!raw) {
      return;
    }

    const path =
      normalizePath(raw);

    if (
      path === "/" ||
      isFile(path)
    ) {
      notify(
        "That file already exists.",
        "error"
      );

      return;
    }

    if (
      !studio.project.folders
    ) {
      studio.project.folders =
        [];
    }

    studio.project.folders.push(
      parentPath(path)
    );

    studio.project.folders =
      [
        ...new Set(
          studio.project.folders
            .map(normalizePath)
        )
      ];

    studio.project.files[path] =
      "";

    saveActiveDraft();

    renderTree();

    openFile(path);
  }

  async function createFolderDialog() {
    const raw =
      await promptValue(
        "New folder",
        "/components"
      );

    if (!raw) {
      return;
    }

    const path =
      normalizePath(raw);

    studio.project.folders =
      [
        ...new Set([
          ...(studio.project.folders || []),
          path
        ])
      ];

    saveActiveDraft();

    renderTree();

    notify(
      `Created ${path}`
    );
  }

  async function saveProjectAsSaved() {
    const projects =
      loadProjects();

    if (
      !studio.project.id
    ) {
      const name =
        await promptValue(
          "Save project",
          "My Website",
          studio.project.name ===
            "Untitled"
            ? ""
            : studio.project.name
        );

      if (!name) {
        return;
      }

      studio.project.name =
        name.slice(0, 80);

      studio.project.id =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
    }

    const clean =
      cleanProject(
        studio.project
      );

    const index =
      projects.findIndex(
        project =>
          project.id ===
          clean.id
      );

    if (index >= 0) {
      projects[index] =
        clean;
    } else {
      if (
        projects.length >=
        MAX_PROJECTS
      ) {
        notify(
          "You can save up to 5 projects. Delete one first.",
          "error"
        );

        return;
      }

      projects.unshift(
        clean
      );
    }

    saveProjects(projects);

    localStorage.setItem(
      ACTIVE_PROJECT_KEY,
      clean.id
    );

    saveActiveDraft();

    const projectName =
      document.querySelector(
        "#adnova-v4-project-name"
      );

    if (projectName) {
      projectName.textContent =
        clean.name;
    }

    notify(
      `Project saved: ${clean.name}`
    );
  }

  function newCodingChat() {
    if (!studio) {
      mountStudio();
    }

    studio.project =
      blankProject();

    saveActiveDraft();

    const root =
      document.getElementById(
        ROOT_ID
      );

    if (root) {
      root.querySelector(
        "#adnova-v4-project-name"
      ).textContent =
        "Untitled";

      root.querySelector(
        "#adnova-v4-ai-input"
      ).value = "";

      root.querySelector(
        "#adnova-v4-ai-messages"
      ).innerHTML = "";

      openFile(
        "/index.html"
      );

      terminalPrint(
        "\n[chat reset] Coding workspace returned to a fresh state.\n"
      );

      switchPane(
        "build"
      );
    }

    notify(
      "Coding chat reset."
    );
  }

  function backToChat() {
    document.body.classList.remove(
      "adnova-v4-coding"
    );

    restoreNormalChatUi();

    if (
      typeof window.setCurrentMode ===
      "function"
    ) {
      window.setCurrentMode(
        "off"
      );
    }
  }

  function renderAiMessages() {
    const node =
      document.querySelector(
        "#adnova-v4-ai-messages"
      );

    if (!node) {
      return;
    }

    node.innerHTML = "";

    (
      studio?.project?.aiMessages ||
      []
    ).forEach(
      message => {
        const item =
          document.createElement(
            "div"
          );

        item.className =
          `adnova-v4-ai-msg ${
            message.role === "user"
              ? "user"
              : "assistant"
          }`;

        item.textContent =
          message.content ||
          "";

        node.appendChild(
          item
        );
      }
    );

    node.scrollTop =
      node.scrollHeight;
  }

  function codingInstruction() {
    return [
      "You are Adnova Coding AI inside a browser Codespace.",
      "Work directly on the user's project request.",
      "When creating or changing files, return every changed file using:",
      "FILE: /path/to/file.ext",
      "```language",
      "file contents",
      "```",
      "You may create multiple files and folders.",
      "Use absolute project paths rooted at /.",
      "For simple websites prefer /index.html, /style.css and /script.js.",
      "Never claim a file changed unless you return that file in a FILE block.",
      "The browser terminal is virtual right now.",
      "Do not claim npm, node, socket, git, or server commands were actually executed.",
      "You may suggest commands that will become executable once the server-side Coding API is connected."
    ].join("\n");
  }

  async function askCodingAi() {
    const root =
      document.getElementById(
        ROOT_ID
      );

    const input =
      root?.querySelector(
        "#adnova-v4-ai-input"
      );

    const prompt =
      input?.value.trim();

    if (
      !prompt ||
      !studio?.project
    ) {
      return;
    }

    input.value = "";

    studio.project.aiMessages =
      [
        ...(studio.project.aiMessages || []),
        {
          role: "user",
          content: prompt
        }
      ].slice(-30);

    renderAiMessages();

    const askButton =
      root.querySelector(
        "#adnova-v4-ask"
      );

    askButton.disabled =
      true;

    askButton.textContent =
      "Building…";

    try {
      const settings =
        safeJsonParse(
          localStorage.getItem(
            "adnova_settings_v1"
          ),
          {}
        );

      const preference =
        String(
          settings?.codeAgentPreference ||
          ""
        ).trim();

      const messages = [
        {
          role: "user",
          content:
            codingInstruction()
        },

        ...(studio.project.aiMessages || [])
          .slice(-18)
          .map(
            message => ({
              role:
                message.role,
              content:
                String(
                  message.content ||
                  ""
                )
            })
          ),

        {
          role: "user",
          mode: "coding",
          content:
            `CURRENT PROJECT FILES:\n${describeFiles()}\n\nUSER REQUEST:\n${prompt}`
        }
      ];

      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                messages,
                aiPreference:
                  preference
              })
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ||
          `HTTP ${response.status}`
        );
      }

      const reply =
        String(
          data?.reply ||
          ""
        ).trim();

      if (!reply) {
        throw new Error(
          "Coding AI returned an empty response."
        );
      }

      studio.project.aiMessages =
        [
          ...(studio.project.aiMessages || []),
          {
            role: "assistant",
            content: reply
          }
        ].slice(-30);

      const changed =
        applyAiFiles(
          reply
        );

      saveActiveDraft();

      renderAiMessages();

      renderTree();

      openFile(
        studio.project.currentFile
      );

      refreshPreview();

      notify(
        changed
          ? `Coding AI updated ${changed} file(s).`
          : "Coding AI replied, but returned no file blocks."
      );

    } catch (error) {
      console.error(
        "Coding AI error:",
        error
      );

      studio.project.aiMessages =
        [
          ...(studio.project.aiMessages || []),
          {
            role: "assistant",
            content:
              `Error: ${error.message}`
          }
        ].slice(-30);

      renderAiMessages();

      notify(
        error.message ||
        "Coding AI request failed.",
        "error"
      );

    } finally {
      askButton.disabled =
        false;

      askButton.textContent =
        "Ask Coding AI";
    }
  }

  function describeFiles() {
    return getAllPaths()
      .map(
        path =>
          `- ${path}\n  ${String(
            studio.project.files[path] ||
            ""
          ).slice(0, 1600)}`
      )
      .join("\n");
  }

  function applyAiFiles(reply) {
    const matches = [];

    const explicit =
      /(FILE|FILENAME|PATH)\s*:\s*([^\n`]+)\s*\n\s*```[^\n]*\n([\s\S]*?)```/gi;

    let match;

    while (
      (match =
        explicit.exec(reply))
    ) {
      matches.push({
        path:
          match[2].trim(),
        code:
          match[3]
      });
    }

    if (!matches.length) {
      const labeled =
        /(?:^|\n)\s*###\s*([^\n`]+)\s*\n\s*```[^\n]*\n([\s\S]*?)```/gi;

      while (
        (match =
          labeled.exec(reply))
      ) {
        matches.push({
          path:
            match[1].trim(),
          code:
            match[2]
        });
      }
    }

    if (!matches.length) {
      const generic =
        /```(html|css|javascript|js|json|md|markdown|text|typescript|ts)?\s*\n([\s\S]*?)```/gi;

      const blocks = [];

      while (
        (match =
          generic.exec(reply))
      ) {
        blocks.push({
          language:
            (
              match[1] || ""
            ).toLowerCase(),

          code:
            match[2]
        });
      }

      blocks.forEach(
        block => {
          const lang =
            block.language;

          let path = "";

          if (
            lang === "html"
          ) {
            path =
              "/index.html";
          } else if (
            lang === "css"
          ) {
            path =
              "/style.css";
          } else if (
            [
              "js",
              "javascript",
              "ts",
              "typescript"
            ].includes(lang)
          ) {
            path =
              "/script.js";
          } else if (
            lang === "json"
          ) {
            path =
              "/data.json";
          } else if (
            [
              "md",
              "markdown"
            ].includes(lang)
          ) {
            path =
              "/README.md";
          }

          if (path) {
            matches.push({
              path,
              code:
                block.code
            });
          }
        }
      );

      if (
        !matches.length &&
        /<!doctype html|<html[\s>]/i.test(
          reply
        )
      ) {
        const start =
          reply.search(
            /<!doctype html|<html[\s>]/i
          );

        matches.push({
          path:
            "/index.html",
          code:
            reply
              .slice(start)
              .trim()
        });
      }
    }

    let changed = 0;

    matches.forEach(
      item => {
        const rawPath =
          item.path
            .replace(
              /^`|`$/g,
              ""
            )
            .trim();

        const path =
          normalizePath(
            rawPath
          );

        if (
          path === "/" ||
          path.includes("..") ||
          !isSafeProjectPath(
            rawPath
          )
        ) {
          return;
        }

        studio.project.files[path] =
          String(
            item.code || ""
          )
            .replace(
              /^\n+|\n+$/g,
              ""
            );

        const folder =
          parentPath(path);

        if (
          folder !== "/"
        ) {
          studio.project.folders.push(
            folder
          );
        }

        changed += 1;
      }
    );

    studio.project.folders =
      [
        ...new Set(
          (
            studio.project.folders ||
            []
          ).map(
            normalizePath
          )
        )
      ];

    if (
      matches.length
    ) {
      const first =
        normalizePath(
          matches[0].path
        );

      if (
        studio.project.files[first]
      ) {
        studio.project.currentFile =
          first;
      }
    }

    return changed;
  }

  function buildPreviewHtml() {
    const htmlFile =
      studio.project.files[
        "/index.html"
      ] ||
      "<html><body><h1>No index.html</h1></body></html>";

    const css =
      studio.project.files[
        "/style.css"
      ] || "";

    const js =
      studio.project.files[
        "/script.js"
      ] || "";

    let html =
      htmlFile;

    html =
      html.replace(
        /<link[^>]+href=["'](?:\.\/|\/)?style\.css["'][^>]*>\s*/gi,
        ""
      );

    html =
      html.replace(
        /<script[^>]+src=["'](?:\.\/|\/)?script\.js["'][^>]*>\s*<\/script>\s*/gi,
        ""
      );

    const styleTag =
      `<style>\n${css}\n</style>`;

    const safeJs =
      js.replace(
        /<\/script/gi,
        "<\\/script"
      );

    const scriptTag =
      `<script>\n${safeJs}\n<\/script>`;

    if (
      /<\/head>/i.test(
        html
      )
    ) {
      html =
        html.replace(
          /<\/head>/i,
          `${styleTag}\n</head>`
        );
    } else {
      html =
        `${styleTag}\n${html}`;
    }

    if (
      /<\/body>/i.test(
        html
      )
    ) {
      html =
        html.replace(
          /<\/body>/i,
          `${scriptTag}\n</body>`
        );
    } else {
      html +=
        `\n${scriptTag}`;
    }

    return html;
  }

  function refreshPreview() {
    const frame =
      document.querySelector(
        "#adnova-v4-preview-frame"
      );

    if (!frame) {
      return;
    }

    if (
      studio?.previewUrl
    ) {
      URL.revokeObjectURL(
        studio.previewUrl
      );

      studio.previewUrl =
        null;
    }

    const blob =
      new Blob(
        [
          buildPreviewHtml()
        ],
        {
          type:
            "text/html"
        }
      );

    studio.previewUrl =
      URL.createObjectURL(
        blob
      );

    frame.src =
      studio.previewUrl;

    const status =
      document.querySelector(
        "#adnova-v4-preview-status"
      );

    if (status) {
      status.textContent =
        `Preview refreshed ${new Date().toLocaleTimeString()}`;
    }
  }

  function openPreviewNewTab() {
    const blob =
      new Blob(
        [
          buildPreviewHtml()
        ],
        {
          type:
            "text/html"
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const tab =
      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

    if (!tab) {
      notify(
        "Your browser blocked the new tab. Allow pop-ups for Adnova.",
        "error"
      );
    }

    setTimeout(
      () =>
        URL.revokeObjectURL(
          url
        ),
      10 * 60 * 1000
    );
  }

  function createSnapshot() {
    const snapshot = {
      createdAt:
        Date.now(),

      files:
        structuredCloneSafe(
          studio.project.files
        ),

      folders:
        [
          ...(studio.project.folders || [])
        ]
    };

    studio.project.snapshots =
      [
        snapshot,
        ...(studio.project.snapshots || [])
      ].slice(
        0,
        10
      );

    saveActiveDraft();

    refreshPreview();

    switchPane(
      "preview"
    );

    notify(
      "Snapshot created and preview refreshed."
    );
  }

  function restoreSnapshot() {
    const snapshot =
      studio.project.snapshots?.[0];

    if (!snapshot) {
      notify(
        "No snapshot exists yet.",
        "error"
      );

      return;
    }

    studio.project.files =
      structuredCloneSafe(
        snapshot.files
      );

    studio.project.folders =
      [
        ...(snapshot.folders || [])
      ];

    saveActiveDraft();

    renderTree();

    openFile(
      studio.project.currentFile ||
      "/index.html"
    );

    refreshPreview();

    notify(
      "Latest snapshot restored."
    );
  }

  function backupProject() {
    const backup = {
      createdAt:
        Date.now(),

      files:
        structuredCloneSafe(
          studio.project.files
        ),

      folders:
        [
          ...(studio.project.folders || [])
        ]
    };

    studio.project.backups =
      [
        backup,
        ...(studio.project.backups || [])
      ].slice(
        0,
        MAX_BACKUPS
      );

    saveActiveDraft();

    notify(
      "Backup saved locally."
    );

    terminalPrint(
      `[backup] ${new Date(
        backup.createdAt
      ).toLocaleString()}\n`
    );
  }

  function restoreBackup(index = 0) {
    const backup =
      studio.project.backups?.[
        index
      ];

    if (!backup) {
      terminalPrint(
        "No backup found.\n"
      );

      return;
    }

    studio.project.files =
      structuredCloneSafe(
        backup.files
      );

    studio.project.folders =
      [
        ...(backup.folders || [])
      ];

    saveActiveDraft();

    renderTree();

    openFile(
      studio.project.currentFile ||
      "/index.html"
    );

    refreshPreview();

    terminalPrint(
      "[restore] latest backup restored\n"
    );
  }

  function structuredCloneSafe(value) {
    try {
      return structuredClone(
        value
      );
    } catch {
      return safeJsonParse(
        JSON.stringify(value),
        {}
      );
    }
  }

  function terminalPrint(text) {
    const log =
      document.querySelector(
        "#adnova-v4-terminal-log"
      );

    if (!log) {
      return;
    }

    log.textContent += text;

    log.scrollTop =
      log.scrollHeight;
  }

  function updateTerminalPrompt() {
    const input =
      document.querySelector(
        "#adnova-v4-terminal-input"
      );

    if (input) {
      input.placeholder =
        `${studio?.project?.cwd || "/"}> command`;
    }
  }

  function terminalKeyDown(event) {
    if (
      event.key ===
        "ArrowUp" &&
      terminalPickerActive
    ) {
      event.preventDefault();

      terminalPickerIndex =
        Math.max(
          0,
          terminalPickerIndex - 1
        );

      renderProjectPicker();

      return;
    }

    if (
      event.key ===
        "ArrowDown" &&
      terminalPickerActive
    ) {
      event.preventDefault();

      terminalPickerIndex =
        Math.min(
          Math.max(
            0,
            terminalPickerProjects.length - 1
          ),
          terminalPickerIndex + 1
        );

      renderProjectPicker();

      return;
    }

    if (
      event.key ===
      "Enter"
    ) {
      const input =
        event.currentTarget;

      const command =
        input.value.trim();

      input.value = "";

      if (
        terminalPickerActive &&
        command === ""
      ) {
        event.preventDefault();

        openSelectedProject();

        return;
      }

      if (command) {
        runTerminalCommand(
          command
        );
      }
    }
  }

  function runTerminalCommand(raw) {
    terminalPrint(
      `${studio.project.cwd}$ ${raw}\n`
    );

    const parts =
      raw.match(
        /(?:[^\s"]+|"[^"]*")+/g
      ) || [];

    const command =
      (
        parts.shift() ||
        ""
      ).toLowerCase();

    const args =
      parts.map(
        part =>
          part.replace(
            /^"|"$/g,
            ""
          )
      );

    if (
      terminalPickerActive &&
      command !== "projects"
    ) {
      terminalPickerActive =
        false;
    }

    switch (command) {

      case "help":
        terminalPrint(
          "Commands:\n" +
          "help  pwd  ls  cd  tree  cat  touch  mkdir  rm  mv  cp\n" +
          "open  edit  write  save  backup  restore  snapshot  preview\n" +
          "projects  new  status  git status  git branch\n" +
          "npm  node  download  clear\n\n" +
          "Arrow Up/Down + Enter inside /projects opens saved projects.\n\n" +
          "npm/node/socket execution is virtual for now. " +
          "A future server-side Coding API can provide real processes and packages.\n"
        );
        break;

      case "pwd":
        terminalPrint(
          `${studio.project.cwd}\n`
        );
        break;

      case "ls":
        terminalList(
          args[0] ||
          studio.project.cwd
        );
        break;

      case "tree":
        terminalTree();
        break;

      case "cd":
        terminalCd(
          args[0] || "/"
        );
        break;

      case "cat":
        terminalCat(
          args[0]
        );
        break;

      case "touch":
        terminalTouch(
          args[0]
        );
        break;

      case "mkdir":
        terminalMkdir(
          args[0]
        );
        break;

      case "rm":
        terminalRm(
          args[0]
        );
        break;

      case "mv":
        terminalMv(
          args[0],
          args[1]
        );
        break;

      case "cp":
        terminalCp(
          args[0],
          args[1]
        );
        break;

      case "open":
      case "edit":
        terminalOpen(
          args[0]
        );
        break;

      case "write":
        terminalWrite(
          args
        );
        break;

      case "save":
        saveEditor();
        terminalPrint(
          "saved\n"
        );
        break;

      case "backup":
        backupProject();
        break;

      case "restore":
        restoreBackup(
          Number.isFinite(
            Number(args[0])
          )
            ? Number(args[0])
            : 0
        );
        break;

      case "snapshot":
        createSnapshot();
        break;

      case "preview":
        switchPane(
          "preview"
        );
        break;

      case "projects":
        showProjectsPicker();
        break;

      case "new":
        newCodingChat();
        break;

      case "status":
        terminalStatus();
        break;

      case "git":
        terminalGit(args);
        break;

      case "npm":
        terminalNpm(args);
        break;

      case "node":
        terminalPrint(
          "node: virtual placeholder — server-side execution is not enabled yet.\n"
        );
        break;

      case "download":
        downloadProject();
        break;

      case "clear": {
        const log =
          document.querySelector(
            "#adnova-v4-terminal-log"
          );

        if (log) {
          log.textContent =
            "";
        }

        break;
      }

      default:
        terminalPrint(
          `command not found: ${command}\n`
        );
    }

    updateTerminalPrompt();
  }

  function resolvePath(path) {
    const raw =
      path
        ? String(path)
        : studio.project.cwd;

    if (
      raw === "-"
    ) {
      return studio.project.cwd;
    }

    if (
      raw.startsWith("/")
    ) {
      return normalizePath(
        raw
      );
    }

    return normalizePath(
      `${
        studio.project.cwd === "/"
          ? ""
          : studio.project.cwd
      }/${raw}`
    );
  }

  function terminalList(dir) {
    const base =
      resolvePath(dir);

    const children =
      new Map();

    (
      studio.project.folders ||
      []
    ).forEach(
      folder => {
        if (
          parentPath(folder) ===
          base
        ) {
          children.set(
            folder,
            "dir"
          );
        }
      }
    );

    Object.keys(
      studio.project.files
    ).forEach(
      file => {
        if (
          parentPath(file) ===
          base
        ) {
          children.set(
            file,
            "file"
          );
        }
      }
    );

    terminalPrint(
      (
        children.size
          ? [...children.entries()]
              .sort()
              .map(
                ([path, type]) =>
                  `${
                    type === "dir"
                      ? "[dir] "
                      : "      "
                  }${baseName(path)}`
              )
              .join("\n")
          : "(empty)"
      ) + "\n"
    );
  }

  function terminalTree() {
    const rows =
      ["/"];

    (
      getAllPaths()
    ).forEach(
      file =>
        rows.push(
          `  ${file}`
        )
    );

    terminalPrint(
      `${rows.join("\n")}\n`
    );
  }

  function terminalCd(target) {
    const next =
      resolvePath(
        target
      );

    if (
      next !== "/" &&
      !(
        studio.project.folders ||
        []
      ).includes(next) &&
      !Object.keys(
        studio.project.files
      ).some(
        file =>
          parentPath(file) ===
          next
      )
    ) {
      terminalPrint(
        `cd: no such directory: ${next}\n`
      );

      return;
    }

    studio.project.cwd =
      next;

    saveActiveDraft();
  }

  function terminalCat(target) {
    const path =
      resolvePath(
        target
      );

    if (
      !isFile(path)
    ) {
      terminalPrint(
        `cat: no such file: ${path}\n`
      );

      return;
    }

    terminalPrint(
      `${
        studio.project.files[path] ||
        ""
      }\n`
    );
  }

  function terminalTouch(target) {
    if (!target) {
      terminalPrint(
        "touch: missing file name\n"
      );

      return;
    }

    const path =
      resolvePath(
        target
      );

    if (
      !isFile(path)
    ) {
      studio.project.files[path] =
        "";
    }

    studio.project.folders.push(
      parentPath(path)
    );

    studio.project.folders =
      [
        ...new Set(
          studio.project.folders.map(
            normalizePath
          )
        )
      ];

    saveActiveDraft();

    renderTree();

    openFile(path);

    terminalPrint(
      `created ${path}\n`
    );
  }

  function terminalMkdir(target) {
    if (!target) {
      terminalPrint(
        "mkdir: missing folder name\n"
      );

      return;
    }

    const path =
      resolvePath(
        target
      );

    studio.project.folders =
      [
        ...new Set([
          ...(studio.project.folders || []),
          path
        ])
      ];

    saveActiveDraft();

    renderTree();

    terminalPrint(
      `created ${path}\n`
    );
  }

  function terminalRm(target) {
    if (!target) {
      terminalPrint(
        "rm: missing path\n"
      );

      return;
    }

    const path =
      resolvePath(
        target
      );

    if (
      isFile(path)
    ) {
      delete studio.project.files[
        path
      ];

      if (
        studio.project.currentFile ===
        path
      ) {
        studio.project.currentFile =
          getAllPaths()[0] ||
          "/index.html";
      }

      saveActiveDraft();

      renderTree();

      openFile(
        studio.project.currentFile
      );

      terminalPrint(
        `removed ${path}\n`
      );

      return;
    }

    studio.project.folders =
      (
        studio.project.folders ||
        []
      ).filter(
        folder =>
          folder !== path &&
          !folder.startsWith(
            `${path}/`
          )
      );

    Object.keys(
      studio.project.files
    ).forEach(
      file => {
        if (
          file.startsWith(
            `${path}/`
          )
        ) {
          delete studio.project.files[
            file
          ];
        }
      }
    );

    saveActiveDraft();

    renderTree();

    openFile(
      getAllPaths()[0] ||
      "/index.html"
    );

    terminalPrint(
      `removed ${path}\n`
    );
  }

  function terminalMv(
    from,
    to
  ) {
    if (
      !from ||
      !to
    ) {
      terminalPrint(
        "mv: usage mv FROM TO\n"
      );

      return;
    }

    const src =
      resolvePath(from);

    const dest =
      resolvePath(to);

    if (
      !isFile(src)
    ) {
      terminalPrint(
        `mv: no such file: ${src}\n`
      );

      return;
    }

    studio.project.files[
      dest
    ] =
      studio.project.files[
        src
      ];

    delete studio.project.files[
      src
    ];

    if (
      studio.project.currentFile ===
      src
    ) {
      studio.project.currentFile =
        dest;
    }

    saveActiveDraft();

    renderTree();

    openFile(
      studio.project.currentFile
    );

    terminalPrint(
      `moved ${src} -> ${dest}\n`
    );
  }

  function terminalCp(
    from,
    to
  ) {
    if (
      !from ||
      !to
    ) {
      terminalPrint(
        "cp: usage cp FROM TO\n"
      );

      return;
    }

    const src =
      resolvePath(from);

    const dest =
      resolvePath(to);

    if (
      !isFile(src)
    ) {
      terminalPrint(
        `cp: no such file: ${src}\n`
      );

      return;
    }

    studio.project.files[
      dest
    ] =
      studio.project.files[
        src
      ];

    saveActiveDraft();

    renderTree();

    terminalPrint(
      `copied ${src} -> ${dest}\n`
    );
  }

  function terminalOpen(target) {
    if (!target) {
      terminalPrint(
        "open: missing file\n"
      );

      return;
    }

    const path =
      resolvePath(
        target
      );

    if (
      !isFile(path)
    ) {
      terminalPrint(
        `open: no such file: ${path}\n`
      );

      return;
    }

    openFile(path);

    switchPane(
      "build"
    );

    terminalPrint(
      `opened ${path}\n`
    );
  }

  function terminalWrite(args) {
    if (
      args.length < 2
    ) {
      terminalPrint(
        "write: usage write /file.txt \"content\"\n"
      );

      return;
    }

    const path =
      resolvePath(
        args.shift()
      );

    studio.project.files[
      path
    ] =
      args.join(" ");

    studio.project.folders.push(
      parentPath(path)
    );

    studio.project.folders =
      [
        ...new Set(
          studio.project.folders.map(
            normalizePath
          )
        )
      ];

    studio.project.currentFile =
      path;

    saveActiveDraft();

    renderTree();

    openFile(path);

    terminalPrint(
      `wrote ${path}\n`
    );
  }

  function terminalStatus() {
    terminalPrint(
      `project: ${studio.project.name}\n` +
      `files: ${Object.keys(
        studio.project.files
      ).length}\n` +
      `backups: ${
        (
          studio.project.backups ||
          []
        ).length
      }\n` +
      `snapshots: ${
        (
          studio.project.snapshots ||
          []
        ).length
      }\n` +
      `updated: ${
        new Date(
          studio.project.updatedAt
        ).toLocaleString()
      }\n`
    );
  }

  function terminalGit(args) {
    const sub =
      (
        args[0] ||
        "status"
      ).toLowerCase();

    if (
      sub === "status"
    ) {
      terminalPrint(
        "On virtual branch main\n" +
        `${getAllPaths().length} tracked files\n` +
        "No real git repository connection is enabled yet.\n"
      );

      return;
    }

    if (
      sub === "branch"
    ) {
      terminalPrint(
        "* main\n"
      );

      return;
    }

    terminalPrint(
      `git ${sub}: virtual placeholder\n`
    );
  }

  function terminalNpm(args) {
    const sub =
      (
        args[0] ||
        ""
      ).toLowerCase();

    if (
      sub === "start"
    ) {
      terminalPrint(
        "npm start: virtual placeholder — connect the Coding API/sandbox later to execute Node processes.\n"
      );

      return;
    }

    if (
      sub === "install"
    ) {
      terminalPrint(
        "npm install: package support is planned for the server-side Coding API.\n"
      );

      return;
    }

    terminalPrint(
      "npm: virtual placeholder. Supported preview commands: npm start, npm install.\n"
    );
  }

  function showProjectsPicker() {
    terminalPickerProjects =
      loadProjects().sort(
        (a, b) =>
          Number(
            b.updatedAt
          ) -
          Number(
            a.updatedAt
          )
      );

    terminalPickerIndex =
      0;

    terminalPickerActive =
      true;

    renderProjectPicker();

    const input =
      document.querySelector(
        "#adnova-v4-terminal-input"
      );

    input?.focus();
  }

  function renderProjectPicker() {
    terminalPrint(
      "\nPROJECTS — ↑/↓ to select, Enter to open\n"
    );

    terminalPickerProjects.forEach(
      (project, index) => {
        terminalPrint(
          `${
            index ===
            terminalPickerIndex
              ? "❯"
              : " "
          } ${
            index + 1
          }. ${
            project.name
          }  (${
            new Date(
              project.updatedAt
            ).toLocaleString()
          })\n`
        );
      }
    );

    if (
      !terminalPickerProjects.length
    ) {
      terminalPrint(
        "No saved projects. Use Save Project first.\n"
      );
    }
  }

  function openSelectedProject() {
    terminalPickerActive =
      false;

    const project =
      terminalPickerProjects[
        terminalPickerIndex
      ];

    if (!project) {
      terminalPrint(
        "No project selected.\n"
      );

      return;
    }

    studio.project =
      cleanProject(
        project
      );

    saveActiveDraft();

    renderAll(
      document.getElementById(
        ROOT_ID
      )
    );

    switchPane(
      "build"
    );

    terminalPrint(
      `[projects] opened ${project.name}\n`
    );
  }

  function downloadProject() {
    const payload = {
      name:
        studio.project.name,

      files:
        studio.project.files,

      folders:
        studio.project.folders,

      exportedAt:
        new Date().toISOString()
    };

    const blob =
      new Blob(
        [
          JSON.stringify(
            payload,
            null,
            2
          )
        ],
        {
          type:
            "application/json"
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const a =
      document.createElement(
        "a"
      );

    a.href = url;

    a.download =
      `${
        studio.project.name.replace(
          /[^a-z0-9-_]+/gi,
          "-"
        ) ||
        "adnova-project"
      }.adnova.json`;

    a.click();

    setTimeout(
      () =>
        URL.revokeObjectURL(
          url
        ),
      5000
    );

    terminalPrint(
      "Downloaded project archive manifest.\n"
    );
  }

  function formatBytes(bytes) {
    const value =
      Number(bytes) || 0;

    if (
      value <
      1024
    ) {
      return `${value} B`;
    }

    if (
      value <
      1024 ** 2
    ) {
      return `${(
        value / 1024
      ).toFixed(1)} KB`;
    }

    if (
      value <
      1024 ** 3
    ) {
      return `${(
        value / 1024 ** 2
      ).toFixed(1)} MB`;
    }

    return `${(
      value / 1024 ** 3
    ).toFixed(2)} GB`;
  }

  function approximateLocalStorageBytes() {
    let total = 0;

    for (
      let index = 0;
      index <
      localStorage.length;
      index += 1
    ) {
      const key =
        localStorage.key(
          index
        ) || "";

      const value =
        localStorage.getItem(
          key
        ) || "";

      if (
        key
          .toLowerCase()
          .includes("adnova")
      ) {
        total +=
          (
            key.length +
            value.length
          ) * 2;
      }
    }

    return total;
  }

  function cacheWindowMeta() {
    const now =
      Date.now();

    const stored =
      safeJsonParse(
        localStorage.getItem(
          CACHE_META_KEY
        ),
        null
      );

    const fresh =
      stored &&
      Number.isFinite(
        stored.windowStart
      ) &&
      now -
        stored.windowStart <
        24 *
          60 *
          60 *
          1000;

    if (fresh) {
      return stored;
    }

    const next = {
      windowStart:
        now,

      resetsUsed:
        0
    };

    localStorage.setItem(
      CACHE_META_KEY,
      JSON.stringify(next)
    );

    return next;
  }

  function updateLiveStorage() {
    const node =
      document.querySelector(
        "#adnova-v4-storage"
      );

    if (!node) {
      return;
    }

    const projectBytes =
      JSON.stringify(
        studio.project || {}
      ).length *
      2;

    const tracked =
      approximateLocalStorageBytes();

    const meta =
      cacheWindowMeta();

    const elapsed =
      Math.max(
        0,
        24 *
          60 *
          60 *
          1000 -
          (
            Date.now() -
            meta.windowStart
          )
      );

    const hours =
      Math.floor(
        elapsed /
          3600000
      );

    const minutes =
      Math.floor(
        (
          elapsed %
          3600000
        ) /
          60000
      );

    const projectPct =
      Math.min(
        100,
        (
          projectBytes /
          WORKSPACE_ALLOWANCE
        ) *
          100
      );

    const cachePct =
      Math.min(
        100,
        (
          tracked /
          CACHE_ALLOWANCE
        ) *
          100
      );

    node.innerHTML = `
      <div>
        <strong>
          Workspace allowance
        </strong>
        10 GB
      </div>

      <div>
        ${formatBytes(
          projectBytes
        )}
        used by this project
      </div>

      <div class="adnova-v4-meter">
        <span
          style="width:${Math.max(
            0.5,
            projectPct
          )}%"
        ></span>
      </div>

      <div>
        <strong>
          Live Adnova tracked data
        </strong>
        ${formatBytes(
          tracked
        )}
        /
        5 GB allowance
      </div>

      <div class="adnova-v4-meter">
        <span
          style="width:${Math.max(
            0.5,
            cachePct
          )}%"
        ></span>
      </div>

      <div>
        Daily cache resets:
        ${
          meta.resetsUsed ||
          0
        }
        /
        ${CACHE_RESETS_PER_DAY}
        · next window in
        ${hours}h ${minutes}m
      </div>

      <div
        style="margin-top:4px"
      >
        Updates live. The 5 GB and 10 GB values are app allowances;
        actual browser quota is controlled by the browser.
      </div>
    `;
  }

  function startLiveUpdates() {
    clearInterval(
      window.__adnovaCodingV4LiveTimer
    );

    window.__adnovaCodingV4LiveTimer =
      setInterval(
        () => {
          syncMode();

          if (
            document.body.classList.contains(
              "adnova-v4-coding"
            )
          ) {
            updateLiveStorage();
          }
        },
        1000
      );
  }

  function boot() {
    installStyles();

    window.adnovaCodingStudioV4Update =
      syncMode;

    window.updateCodingWorkspaceState =
      function () {
        syncMode();
      };

    window.createCodingWorkspace =
      function () {
        mountStudio();
      };

    startLiveUpdates();

    setTimeout(
      syncMode,
      0
    );
  }

  boot();
})();
