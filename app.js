const CLIENT_ID = "49189";
const REDIRECT_URI = "https://5amwithleanna.online/anime/";
const API_URL = "https://graphql.anilist.co";

const TOKEN_KEY = "fiveam_anilist_access_token";

const state = {
  token: null,
  user: null,
  lists: [],
  currentView: "continue"
};

const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const account = document.getElementById("account");
const animeGrid = document.getElementById("animeGrid");
const stats = document.getElementById("stats");
const pageTitle = document.getElementById("pageTitle");
const pageDescription = document.getElementById("pageDescription");
const refreshButton = document.getElementById("refreshButton");

const VIEW_INFO = {
  continue: {
    title: "Continue Watching",
    description: "Pick up where you left off."
  },
  watching: {
    title: "Watching",
    description: "Anime you're currently watching."
  },
  completed: {
    title: "Completed",
    description: "Anime you've finished."
  },
  paused: {
    title: "Paused",
    description: "Anime you've temporarily stopped."
  },
  dropped: {
    title: "Dropped",
    description: "Anime you've stopped watching."
  },
  planning: {
    title: "Planning",
    description: "Anime you want to watch."
  }
};

function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function getSavedToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function parseOAuthToken() {
  const hash = window.location.hash;

  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash.slice(1));
  const token = params.get("access_token");

  if (token) {
    window.history.replaceState({}, document.title, REDIRECT_URI);
  }

  return token;
}

function login() {
  const url =
    "https://anilist.co/api/v2/oauth/authorize" +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    "&response_type=token";

  window.location.href = url;
}

async function graphql(query, variables = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${state.token}`
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body?.message || `Request failed (${response.status})`);
  }

  if (body.errors?.length) {
    throw new Error(body.errors[0].message || "AniList returned an error.");
  }

  return body.data;
}

async function fetchViewer() {
  const query = `
    query {
      Viewer {
        id
        name
        avatar {
          large
        }
      }
    }
  `;

  return graphql(query);
}

async function fetchLists() {
  const query = `
    query {
      MediaListCollection(type: ANIME) {
        lists {
          name
          status
          entries {
            id
            status
            progress
            score
            updatedAt
            media {
              id
              title {
                romaji
                english
                native
              }
              description(asHtml: false)
              episodes
              duration
              averageScore
              coverImage {
                large
                extraLarge
              }
              siteUrl
            }
          }
        }
      }
    }
  `;

  const data = await graphql(query);

  return (data.MediaListCollection?.lists || [])
    .flatMap(list => list.entries || []);
}

function normalizeStatus(status) {
  switch (status) {
    case "CURRENT":
      return "watching";
    case "COMPLETED":
      return "completed";
    case "PAUSED":
      return "paused";
    case "DROPPED":
      return "dropped";
    case "PLANNING":
      return "planning";
    case "REPEATING":
      return "watching";
    default:
      return null;
  }
}

function uniqueEntries(entries) {
  const map = new Map();

  for (const entry of entries) {
    map.set(entry.id, entry);
  }

  return [...map.values()];
}

function getTitle(media) {
  return (
    media?.title?.english ||
    media?.title?.romaji ||
    media?.title?.native ||
    "Unknown Anime"
  );
}

function getContinueEntries() {
  return uniqueEntries(
    state.lists
      .filter(entry => {
        const status = normalizeStatus(entry.status);
        return status === "watching" && Number(entry.progress || 0) > 0;
      })
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  );
}

function getEntriesForView(view) {
  if (view === "continue") {
    return getContinueEntries();
  }

  return uniqueEntries(
    state.lists.filter(entry => normalizeStatus(entry.status) === view)
  ).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function formatProgress(entry) {
  const current = Number(entry.progress || 0);
  const total = entry.media?.episodes;

  if (total) {
    return `${current} / ${total}`;
  }

  return current > 0 ? `${current} watched` : "Not started";
}

function calculatePercent(entry) {
  const current = Number(entry.progress || 0);
  const total = Number(entry.media?.episodes || 0);

  if (!total) {
    return 0;
  }

  return Math.max(0, Math.min(100, (current / total) * 100));
}

function renderStats() {
  const counts = {
    watching: 0,
    completed: 0,
    paused: 0,
    dropped: 0,
    planning: 0
  };

  for (const entry of state.lists) {
    const status = normalizeStatus(entry.status);

    if (status && status in counts) {
      counts[status] += 1;
    }
  }

  stats.innerHTML = `
    <div class="stat">
      <div class="stat-value">${counts.watching}</div>
      <div class="stat-label">Watching</div>
    </div>

    <div class="stat">
      <div class="stat-value">${counts.completed}</div>
      <div class="stat-label">Completed</div>
    </div>

    <div class="stat">
      <div class="stat-value">${counts.paused}</div>
      <div class="stat-label">Paused</div>
    </div>

    <div class="stat">
      <div class="stat-value">${counts.dropped}</div>
      <div class="stat-label">Dropped</div>
    </div>

    <div class="stat">
      <div class="stat-value">${counts.planning}</div>
      <div class="stat-label">Planning</div>
    </div>
  `;
}

function renderCards(entries) {
  if (!entries.length) {
    animeGrid.innerHTML = `
      <div class="empty">
        There isn't anything here yet.
      </div>
    `;
    return;
  }

  animeGrid.innerHTML = entries
    .map(entry => {
      const media = entry.media;
      const title = getTitle(media);
      const poster = media?.coverImage?.extraLarge || media?.coverImage?.large || "";
      const progress = calculatePercent(entry);

      return `
        <article class="anime-card">
          <div class="poster-wrap">
            ${
              poster
                ? `<img class="poster" src="${escapeHtml(poster)}" alt="${escapeHtml(title)} poster" loading="lazy">`
                : ""
            }
          </div>

          <div class="card-body">
            <h2 class="title">${escapeHtml(title)}</h2>

            <div class="meta">
              <span>Episode ${Number(entry.progress || 0)}</span>
              <span>${escapeHtml(formatProgress(entry))}</span>
            </div>

            <div class="progress-track">
              <div
                class="progress-bar"
                style="width: ${progress}%"
              ></div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  const info = VIEW_INFO[state.currentView];

  pageTitle.textContent = info.title;
  pageDescription.textContent = info.description;

  renderStats();
  renderCards(getEntriesForView(state.currentView));
}

async function loadApp() {
  try {
    animeGrid.innerHTML = `<div class="loading">Loading your AniList library…</div>`;

    const viewerData = await fetchViewer();

    if (!viewerData?.Viewer) {
      throw new Error("Could not load your AniList profile.");
    }

    state.user = viewerData.Viewer;
    state.lists = await fetchLists();

    account.textContent = `@${state.user.name}`;

    loginView.hidden = true;
    appView.hidden = false;

    render();
  } catch (error) {
    console.error(error);

    clearToken();
    state.token = null;

    loginView.hidden = false;
    appView.hidden = true;

    loginError.textContent =
      error.message ||
      "We couldn't connect to AniList. Please try again.";
  }
}

loginButton.addEventListener("click", login);

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;

  try {
    state.lists = await fetchLists();
    render();
  } catch (error) {
    alert(error.message || "Failed to refresh.");
  } finally {
    refreshButton.disabled = false;
  }
});

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    state.currentView = button.dataset.view;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

(async function init() {
  const oauthToken = parseOAuthToken();

  if (oauthToken) {
    saveToken(oauthToken);
  }

  state.token = oauthToken || getSavedToken();

  if (!state.token) {
    loginView.hidden = false;
    appView.hidden = true;
    return;
  }

  await loadApp();
})();
