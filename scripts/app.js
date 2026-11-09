
"use strict";

// Development accounts ONLY.
// Front-end authentication is not secure.
const TEST_ACCOUNTS = [
  { username: "admin", password: "admin123", role: "ADMIN" },
  { username: "user", password: "user123", role: "USER" }
];

// Print test accounts to console
console.info("[GameLog] Development test accounts:");
console.table(TEST_ACCOUNTS);


// Storage Keys
const STATE_KEY = "gameLogAppState";
const OLD_GAMES_KEY = "gameLogGames";

const VALID_STATUSES = [
  "Not Played",
  "Currently Playing",
  "Completed"
];


// Create initial application state
function newState() {
  return {
    app: {
      name: "GameLog",
      version: "dev-delta",
      environment: "development"
    },
    currentUser: null,
    games: [],
    session: {
      startedAt: new Date().toISOString(),
      lastAction: "initialized"
    },
    dataLoaded: false
  };
}

let appState = newState();


// Restore application state
try {
  const saved = sessionStorage.getItem(STATE_KEY);

  if (saved) {
    const parsed = JSON.parse(saved);

    if (!parsed || !Array.isArray(parsed.games)) {
      throw new Error("Invalid saved app state");
    }

    appState = {
      ...newState(),
      ...parsed
    };
  }

} catch (error) {
  console.error("[STATE] Could not restore app state:", error);
  appState = newState();
}


// Save application state
function saveState(action) {
  const next = {
    ...appState,
    session: {
      ...appState.session,
      lastAction: action,
      updatedAt: new Date().toISOString()
    }
  };

  sessionStorage.setItem(STATE_KEY, JSON.stringify(next));

  appState = next;

  console.log("[STATE]", action, appState);
  console.log("[STATE JSON]", JSON.stringify(appState, null, 2));
}


// Display messages
function showMessage(id, message, type = "danger") {
  const element = document.getElementById(id);

  if (element) {
    element.className = `alert alert-${type}`;
    element.textContent = message;
  }
}


// Clear messages
function clearMessage(id) {
  const element = document.getElementById(id);

  if (element) {
    element.className = "mb-3";
    element.textContent = "";
  }
}


// Check administrator role
function isAdmin() {
  return appState.currentUser?.role === "ADMIN";
}


// Require login
function requireLogin(adminOnly = false) {
  if (!appState.currentUser) {
    window.location.replace("login.html");
    return false;
  }

  if (adminOnly && !isAdmin()) {
    console.warn("[AUTHZ] USER cannot access admin dashboard");
    window.location.replace("library.html");
    return false;
  }

  return true;
}


// Sign Out
function signOut() {
  const previousUser = appState.currentUser?.username;

  const previousState = appState;
  appState = { ...appState, currentUser: null };

  try {
    saveState("sign out");

    console.log("[AUTH] Signed out:", previousUser);

    window.location.assign("login.html");

  } catch (error) {
    appState = previousState;
    console.error("[AUTH] Sign-out error:", error);

    showMessage(
      "library-message",
      "Could not save sign-out. Please try again."
    );

    showMessage(
      "admin-message",
      "Could not save sign-out. Please try again."
    );
  }
}

document.getElementById("sign-out-btn")
  ?.addEventListener("click", signOut);


// LOGIN
const loginForm = document.getElementById("login-form");

if (loginForm) {
  loginForm.addEventListener("submit", function(event) {
    event.preventDefault();

    clearMessage("login-message");

    const username = document
      .getElementById("username")
      .value.trim();

    const password = document
      .getElementById("password")
      .value;

    const account = TEST_ACCOUNTS.find(function(a) {
      return a.username === username &&
             a.password === password;
    });

    if (!account) {
      console.warn("[AUTH] Invalid login:", username);

      showMessage(
        "login-message",
        "Incorrect username or password."
      );

      return;
    }

    const previousUser = appState.currentUser;

    appState.currentUser = {
      username: account.username,
      role: account.role
    };

    try {
      saveState("login: " + account.username);

      console.log("[AUTH] Logged in:", appState.currentUser);

      window.location.assign(
        account.role === "ADMIN"
          ? "admin.html"
          : "library.html"
      );

    } catch (error) {
      appState.currentUser = previousUser;

      console.error("[AUTH] Login error:", error);

      showMessage(
        "login-message",
        "Could not save your session."
      );
    }
  });
}


// LOAD GAMES
async function loadGames() {
  if (appState.dataLoaded) {
    return;
  }

  // Migrate games from earlier GameLog version
  const oldGames = sessionStorage.getItem(OLD_GAMES_KEY);

  if (oldGames !== null) {
    try {
      const parsed = JSON.parse(oldGames);

      if (!Array.isArray(parsed)) {
        throw new Error("Invalid legacy games");
      }

      const migrated = parsed.map(function(game) {
        return {
          ...game,
          owner: game.owner || "user"
        };
      });

      const previous = appState.games;

      appState.games = migrated;
      appState.dataLoaded = true;

      try {
        saveState("migrated existing games");

        sessionStorage.removeItem(OLD_GAMES_KEY);

      } catch (error) {
        appState.games = previous;
        appState.dataLoaded = false;
        throw error;
      }

      return;

    } catch (error) {
      console.error("[DATA] Migration error:", error);
      throw error;
    }
  }

  // Fetch starting games from JSON
  const response = await fetch("../data/games.json");

  if (!response.ok) {
    throw new Error(
      "Could not fetch games.json (HTTP " +
      response.status + ")"
    );
  }

  const records = await response.json();

  if (!Array.isArray(records)) {
    throw new Error("games.json must contain an array");
  }

  appState.games = records.map(function(game) {
    return {
      ...game,
      owner: game.owner || "user"
    };
  });

  appState.dataLoaded = true;

  saveState("loaded games.json");
}


// Check edit permissions
function canEdit(game) {
  return isAdmin() ||
    game.owner === appState.currentUser?.username;
}


// LIBRARY ELEMENTS
const gameLibrary = document.getElementById("game-library");
const searchBox = document.getElementById("search-box");
const gameForm = document.getElementById("game-form");
const imageInput = document.getElementById("game-image");
const imagePreview = document.getElementById("image-preview");
const removeImageCheckbox = document.getElementById("remove-image");
const saveGameButton = document.getElementById("save-game-btn");
const modalElement = document.getElementById("gameModal");

let currentFilter = "All";
let editingGameId = null;
let previewObjectUrl = null;


// Clear image preview URL
function clearObjectUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
  }

  previewObjectUrl = null;
}


// Preview image
function previewImage(src) {
  if (!imagePreview) {
    return;
  }

  if (src) {
    imagePreview.src = src;
    imagePreview.classList.remove("d-none");

  } else {
    imagePreview.removeAttribute("src");
    imagePreview.classList.add("d-none");
  }
}


// READ - Display Games
function displayGames() {
  if (!gameLibrary) {
    return;
  }

  gameLibrary.replaceChildren();
  clearMessage("library-message");

  const search = searchBox.value.trim().toLowerCase();

  const matches = appState.games.filter(function(game) {
    return game.title.toLowerCase().includes(search) &&
      (currentFilter === "All" ||
       game.status === currentFilter);
  });

  if (matches.length === 0) {
    showMessage(
      "library-message",
      "No games found.",
      "info"
    );
    return;
  }

  for (const game of matches) {
    const col = document.createElement("div");
    col.className = "col-md-3";

    const card = document.createElement("div");
    card.className = "card h-100";

    // Game Cover
    if (game.image) {
      const img = document.createElement("img");

      img.src = game.image;
      img.alt = game.title + " cover";
      img.className = "card-img-top";

      // Consistent image proportions
      img.style.width = "100%";
      img.style.aspectRatio = "3 / 4";
      img.style.objectFit = "cover";
      img.style.objectPosition = "center";

      card.appendChild(img);
    }

    // Card Body
    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h5");
    title.className = "card-title";
    title.textContent = game.title;

    const platform = document.createElement("p");
    platform.className = "card-text";
    platform.textContent = "Platform: " + game.platform;

    const status = document.createElement("p");
    status.className = "card-text";
    status.textContent = "Status: " + game.status;

    body.append(title, platform, status);

    // Edit Button
    if (canEdit(game)) {
      const edit = document.createElement("button");

      edit.className = "btn btn-primary btn-sm me-2";
      edit.textContent = "Edit";

      edit.addEventListener("click", function() {
        editGame(game.id);
      });

      body.appendChild(edit);
    }

    // Admin Delete Button
    if (isAdmin()) {
      const remove = document.createElement("button");

      remove.className = "btn btn-danger btn-sm";
      remove.textContent = "Delete";

      remove.addEventListener("click", function() {
        deleteGame(game.id);
      });

      body.appendChild(remove);
    }

    card.appendChild(body);
    col.appendChild(card);
    gameLibrary.appendChild(col);
  }
}


// Reset Game Form
function resetGameForm() {
  editingGameId = null;

  gameForm.reset();

  clearObjectUrl();
  previewImage("");

  document.getElementById("modal-title").textContent =
    "Add Game";

  document.getElementById("form-message").textContent = "";
}


// Add Game Button
document.getElementById("add-game-btn")
  ?.addEventListener("click", resetGameForm);


// UPDATE - Edit Game
function editGame(id) {
  const game = appState.games.find(function(g) {
    return g.id === id;
  });

  if (!game || !canEdit(game)) {
    showMessage(
      "library-message",
      "You cannot edit this game."
    );
    return;
  }

  resetGameForm();

  editingGameId = id;

  document.getElementById("modal-title").textContent =
    "Edit Game";

  document.getElementById("game-title").value =
    game.title;

  document.getElementById("game-platform").value =
    game.platform;

  document.getElementById("game-status").value =
    game.status;

  previewImage(game.image || "");

  bootstrap.Modal.getOrCreateInstance(
    modalElement
  ).show();
}


// Image Upload Preview
imageInput?.addEventListener("change", function() {
  clearObjectUrl();

  const file = imageInput.files[0];
  const message = document.getElementById("form-message");

  message.textContent = "";

  if (file) {
    if (!file.type.startsWith("image/")) {
      imageInput.value = "";

      message.textContent =
        "Please select an image file.";

      return;
    }

    previewObjectUrl = URL.createObjectURL(file);
    previewImage(previewObjectUrl);

    removeImageCheckbox.checked = false;

  } else {
    const existing = appState.games.find(function(g) {
      return g.id === editingGameId;
    });

    previewImage(existing?.image || "");
  }
});


// Remove Image Checkbox
removeImageCheckbox?.addEventListener("change", function() {
  if (removeImageCheckbox.checked) {
    imageInput.value = "";

    clearObjectUrl();
    previewImage("");

  } else {
    const existing = appState.games.find(function(g) {
      return g.id === editingGameId;
    });

    previewImage(existing?.image || "");
  }
});


// Resize Uploaded Image
function resizeImage(file) {
  return new Promise(function(resolve, reject) {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please select an image file."));
      return;
    }

    const reader = new FileReader();

    reader.onerror = function() {
      reject(new Error("Could not read image file."));
    };

    reader.onload = function() {
      const img = new Image();

      img.onerror = function() {
        reject(new Error("Could not decode image file."));
      };

      img.onload = function() {
        const scale = Math.min(
          400 / img.width,
          500 / img.height,
          1
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.max(
          1,
          Math.round(img.width * scale)
        );

        canvas.height = Math.max(
          1,
          Math.round(img.height * scale)
        );

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Image processing unavailable."));
          return;
        }

        ctx.fillStyle = "#ffffff";

        ctx.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        ctx.drawImage(
          img,
          0,
          0,
          canvas.width,
          canvas.height
        );

        resolve(
          canvas.toDataURL("image/jpeg", 0.7)
        );
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}


// CREATE / UPDATE - Save Game
gameForm?.addEventListener("submit", async function(event) {
  event.preventDefault();

  const title = document
    .getElementById("game-title")
    .value.trim();

  const platform = document
    .getElementById("game-platform")
    .value.trim();

  const status = document
    .getElementById("game-status")
    .value;

  const formMessage = document.getElementById("form-message");

  if (!title || !platform || !VALID_STATUSES.includes(status)) {
    formMessage.textContent =
      "Please complete all fields correctly.";
    return;
  }

  saveGameButton.disabled = true;
  saveGameButton.textContent = "Saving...";
  formMessage.textContent = "";

  try {
    const old = appState.games.find(function(g) {
      return g.id === editingGameId;
    });

    if (editingGameId !== null && (!old || !canEdit(old))) {
      throw new Error("You cannot edit this game.");
    }

    // Keep existing image unless removed or replaced
    let image = removeImageCheckbox.checked
      ? ""
      : (old?.image || "");

    if (imageInput.files[0]) {
      image = await resizeImage(imageInput.files[0]);
    }

    const updated = appState.games.map(function(g) {
      return { ...g };
    });

    if (editingGameId === null) {

      // CREATE
      updated.push({
        id: Math.max(
          0,
          ...updated.map(g => Number(g.id) || 0)
        ) + 1,
        title: title,
        platform: platform,
        status: status,
        image: image,
        owner: appState.currentUser.username
      });

      console.log("[CREATE] Added:", title);

    } else {

      // UPDATE
      const game = updated.find(function(g) {
        return g.id === editingGameId;
      });

      Object.assign(game, {
        title: title,
        platform: platform,
        status: status,
        image: image
      });

      console.log("[UPDATE] Edited:", title);
    }

    // Save changes to sessionStorage
    const previous = appState.games;

    appState.games = updated;

    try {
      saveState(
        editingGameId === null
          ? "created game"
          : "updated game"
      );

    } catch (error) {
      appState.games = previous;
      throw error;
    }

    currentFilter = "All";
    searchBox.value = "";

    displayGames();

    bootstrap.Modal.getOrCreateInstance(
      modalElement
    ).hide();

    resetGameForm();

    showMessage(
      "library-message",
      "Game saved successfully!",
      "success"
    );

  } catch (error) {
    console.error("[GAME] Save failed:", error);

    formMessage.textContent =
      error.name === "QuotaExceededError"
        ? "Browser storage is full. Try a smaller image."
        : error.message || "Could not save game.";

  } finally {
    saveGameButton.disabled = false;
    saveGameButton.textContent = "Save Game";
  }
});


// DELETE - Admin Only
let pendingDeleteId = null;

function deleteGame(id) {
  if (!isAdmin()) {
    console.warn("[AUTHZ] Non-admin deletion blocked");

    showMessage(
      "library-message",
      "Only admins can delete games."
    );

    return;
  }

  const game = appState.games.find(function(g) {
    return g.id === id;
  });

  if (!game) {
    return;
  }

  pendingDeleteId = id;

  const box = document.getElementById("library-message");

  box.className = "alert alert-warning";
  box.replaceChildren();

  const label = document.createElement("span");
  label.textContent =
    `Delete ${game.title}? This cannot be undone. `;

  // Confirm Delete
  const yes = document.createElement("button");
  yes.type = "button";
  yes.className = "btn btn-danger btn-sm me-2";
  yes.textContent = "Delete Game";

  yes.addEventListener("click", function() {
    if (!isAdmin() || pendingDeleteId !== id) {
      return;
    }

    const previous = appState.games;

    appState.games = previous.filter(function(g) {
      return g.id !== id;
    });

    try {
      saveState("deleted game " + id);

      console.log("[DELETE] Removed:", game.title);

      pendingDeleteId = null;

      displayGames();

      showMessage(
        "library-message",
        "Game deleted.",
        "success"
      );

    } catch (error) {
      appState.games = previous;

      showMessage(
        "library-message",
        "Could not delete game: " + error.message
      );
    }
  });

  // Cancel Delete
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn btn-secondary btn-sm";
  cancel.textContent = "Cancel";

  cancel.addEventListener("click", function() {
    pendingDeleteId = null;
    clearMessage("library-message");
  });

  box.append(label, yes, cancel);
}


// Search Button
document.getElementById("search-btn")
  ?.addEventListener("click", displayGames);


// Search While Typing
searchBox?.addEventListener("input", displayGames);


// Game Filters
document.querySelectorAll(".game-filter").forEach(function(button) {
  button.addEventListener("click", function() {
    currentFilter = button.dataset.status;

    console.log("[FILTER]", currentFilter);

    displayGames();
  });
});


// Initialize Library
async function initLibrary() {
  if (!requireLogin()) {
    return;
  }

  document.getElementById("current-user").textContent =
    appState.currentUser.username +
    " (" + appState.currentUser.role + ")";

  if (isAdmin()) {
    document.getElementById("admin-link")
      .classList.remove("d-none");
  }

  try {
    await loadGames();
    displayGames();

  } catch (error) {
    console.error("[DATA] Library error:", error);

    showMessage(
      "library-message",
      "Could not load games: " + error.message
    );
  }
}


// ADMIN DASHBOARD
async function initAdmin() {
  if (!requireLogin(true)) {
    return;
  }

  try {
    await loadGames();

    // Current User
    document.getElementById("admin-user").textContent =
      appState.currentUser.username +
      " (" + appState.currentUser.role + ")";

    // Game Records
    const tbody = document.getElementById("admin-games");
    tbody.replaceChildren();

    for (const game of appState.games) {
      const row = document.createElement("tr");

      const values = [
        game.id,
        game.title,
        game.platform,
        game.status,
        game.owner
      ];

      for (const value of values) {
        const cell = document.createElement("td");

        cell.textContent = String(value ?? "");

        row.appendChild(cell);
      }

      tbody.appendChild(row);
    }

    // Display Application State
    document.getElementById("admin-state").textContent =
      JSON.stringify(appState, null, 2);

    // Browser / Session Details
    const browserInfo = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      language: navigator.language,
      sessionStorageKeys: Object.keys(sessionStorage),
      sessionStorageCharacters:
        sessionStorage.getItem(STATE_KEY)?.length || 0,
      loadedAt: new Date().toISOString()
    };

    document.getElementById("admin-browser").textContent =
      JSON.stringify(browserInfo, null, 2);

    console.log("[ADMIN] Dashboard loaded", appState);

  } catch (error) {
    console.error("[ADMIN] Dashboard failed:", error);

    showMessage(
      "admin-message",
      "Could not load dashboard: " + error.message
    );
  }
}


// Start the appropriate page
if (gameLibrary) {
  initLibrary();
}

if (document.getElementById("admin-state")) {
  initAdmin();
}
