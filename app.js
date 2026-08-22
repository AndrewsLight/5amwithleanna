// ============================================
// 5amwithleanna Anime Tracker
// AniList Authentication + Anime List
// ============================================

const CLIENT_ID = "49199";
const REDIRECT_URI = "https://5amwithleanna.online/";
const API_URL = "https://graphql.anilist.co";
const TOKEN_KEY = "anilist_token";

// ============================================
// AUTHENTICATION
// ============================================

function loginAniList() {
    // IMPORTANT:
    // For AniList's Implicit Grant, use response_type=token.
    // We intentionally do NOT add redirect_uri here.
    const authURL =
        `https://anilist.co/api/v2/oauth/authorize` +
        `?client_id=${encodeURIComponent(CLIENT_ID)}` +
        `&response_type=token`;

    window.location.href = authURL;
}


// Read token returned in URL fragment
function getAccessTokenFromURL() {
    const hash = window.location.hash;

    if (!hash) {
        return null;
    }

    const params = new URLSearchParams(hash.substring(1));
    const token = params.get("access_token");

    if (token) {
        localStorage.setItem(TOKEN_KEY, token);

        // Remove token from browser URL
        window.history.replaceState(
            {},
            document.title,
            window.location.pathname + window.location.search
        );

        return token;
    }

    return null;
}


// Get stored token
function getStoredToken() {
    return localStorage.getItem(TOKEN_KEY);
}


// Get current token
function getAccessToken() {
    const urlToken = getAccessTokenFromURL();

    if (urlToken) {
        return urlToken;
    }

    return getStoredToken();
}


// Logout
function logoutAniList() {
    localStorage.removeItem(TOKEN_KEY);

    document.getElementById("user-info").innerHTML = "";
    document.getElementById("anime-list").innerHTML = "";

    updateAuthButton();

    alert("Logged out of AniList.");
}


// ============================================
// GRAPHQL REQUEST
// ============================================

async function anilistRequest(query, variables = {}) {
    const token = getAccessToken();

    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
            query,
            variables
        })
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result?.errors?.[0]?.message ||
            `AniList API error: ${response.status}`
        );
    }

    if (result.errors) {
        throw new Error(result.errors[0].message);
    }

    return result.data;
}


// ============================================
// GET LOGGED-IN USER
// ============================================

async function getViewer() {
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

    return await anilistRequest(query);
}


// ============================================
// GET USER'S ANIME LIST
// ============================================

async function getAnimeList() {
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
                                userPreferred
                            }

                            episodes

                            coverImage {
                                large
                                medium
                            }

                            description(asHtml: false)

                            nextAiringEpisode {
                                episode
                                airingAt
                            }
                        }
                    }
                }
            }
        }
    `;

    return await anilistRequest(query);
}


// ============================================
// DISPLAY USER
// ============================================

async function renderUser() {
    const userInfo = document.getElementById("user-info");

    if (!userInfo) {
        return;
    }

    try {
        const data = await getViewer();
        const user = data.Viewer;

        userInfo.innerHTML = `
            <div class="user-card">
                ${
                    user.avatar?.large
                        ? `<img src="${user.avatar.large}" alt="AniList Avatar">`
                        : ""
                }

                <div>
                    <strong>${escapeHTML(user.name)}</strong>
                    <p>AniList ID: ${user.id}</p>
                </div>

                <button onclick="logoutAniList()">Logout</button>
            </div>
        `;
    } catch (error) {
        console.error("Could not load AniList user:", error);

        // Token may be invalid/expired.
        localStorage.removeItem(TOKEN_KEY);

        userInfo.innerHTML = `
            <p class="error">
                AniList login expired. Please log in again.
            </p>
            <button onclick="loginAniList()">Login with AniList</button>
        `;
    }
}


// ============================================
// DISPLAY ANIME LIST
// ============================================

async function renderAnimeList() {
    const container = document.getElementById("anime-list");

    if (!container) {
        return;
    }

    container.innerHTML = "<p>Loading your AniList anime...</p>";

    try {
        const data = await getAnimeList();

        const lists = data.MediaListCollection?.lists || [];

        const entries = [];

        lists.forEach(list => {
            list.entries.forEach(entry => {
                entries.push({
                    ...entry,
                    listName: list.name
                });
            });
        });

        if (entries.length === 0) {
            container.innerHTML = `
                <p>Your AniList anime list is empty.</p>
            `;
            return;
        }

        container.innerHTML = "";

        entries.forEach(entry => {
            const anime = entry.media;

            const title =
                anime.title?.userPreferred ||
                anime.title?.english ||
                anime.title?.romaji ||
                "Unknown Anime";

            const poster =
                anime.coverImage?.large ||
                anime.coverImage?.medium ||
                "";

            const episodes =
                anime.episodes ?? "?";

            const progress =
                entry.progress ?? 0;

            const status =
                formatStatus(entry.status);

            const card = document.createElement("div");

            card.className = "anime-card";

            card.innerHTML = `
                ${
                    poster
                        ? `<img
                            src="${poster}"
                            alt="${escapeHTML(title)}"
                            class="anime-poster"
                           >`
                        : ""
                }

                <div class="anime-card-info">

                    <h3>${escapeHTML(title)}</h3>

                    <p>
                        Episode:
                        <strong>${progress}</strong>
                        /
                        <strong>${episodes}</strong>
                    </p>

                    <p>
                        Status:
                        <strong>${escapeHTML(status)}</strong>
                    </p>

                    ${
                        anime.nextAiringEpisode
                            ? `
                                <p>
                                    Next episode:
                                    ${anime.nextAiringEpisode.episode}
                                </p>
                              `
                            : ""
                    }

                    <button
                        onclick="showAnime(${anime.id})"
                    >
                        View Anime
                    </button>

                </div>
            `;

            container.appendChild(card);
        });

    } catch (error) {
        console.error("Could not load anime list:", error);

        container.innerHTML = `
            <div class="error">
                <p>Could not load your AniList anime.</p>
                <p>${escapeHTML(error.message)}</p>

                <button onclick="renderAnimeList()">
                    Try Again
                </button>
            </div>
        `;
    }
}


// ============================================
// SHOW SINGLE ANIME
// ============================================

async function showAnime(id) {
    try {
        const query = `
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    id

                    title {
                        romaji
                        english
                        native
                        userPreferred
                    }

                    description(asHtml: false)

                    episodes

                    duration

                    status

                    coverImage {
                        large
                    }

                    genres

                    averageScore

                    siteUrl
                }
            }
        `;

        const data = await anilistRequest(query, { id });

        const anime = data.Media;

        if (!anime) {
            alert("Anime could not be found.");
            return;
        }

        const title =
            anime.title?.userPreferred ||
            anime.title?.english ||
            anime.title?.romaji ||
            "Unknown Anime";

        document.getElementById("anime-title").textContent = title;

        document.getElementById("anime-description").textContent =
            anime.description || "No description available.";

        document.getElementById("anime-episodes").textContent =
            `Episodes: ${anime.episodes ?? "Unknown"}`;

        document.getElementById("anime-status").textContent =
            `Status: ${formatStatus(anime.status)}`;

        document.getElementById("anime-score").textContent =
            `Score: ${anime.averageScore ?? "N/A"}`;

        const poster = document.getElementById("anime-poster");

        if (poster && anime.coverImage?.large) {
            poster.src = anime.coverImage.large;
            poster.alt = title;
        }

    } catch (error) {
        console.error("Failed to load anime:", error);
        alert("Failed to load anime information.");
    }
}


// ============================================
// MANUAL CONTINUE WATCHING
// ============================================

function addAnime() {
    const nameInput = document.getElementById("anime-name");
    const episodeInput = document.getElementById("episode-number");
    const timestampInput = document.getElementById("timestamp");

    const name = nameInput.value.trim();
    const episode = Number(episodeInput.value);
    const timestamp = Number(timestampInput.value);

    if (!name) {
        alert("Enter an anime name.");
        return;
    }

    if (!Number.isFinite(episode) || episode < 0) {
        alert("Enter a valid episode number.");
        return;
    }

    if (!Number.isFinite(timestamp) || timestamp < 0) {
        alert("Enter a valid timestamp.");
        return;
    }

    let continueList =
        JSON.parse(localStorage.getItem("continueWatching")) || [];

    continueList.push({
        name,
        episode,
        timestamp,
        status: "Watching",
        createdAt: Date.now()
    });

    localStorage.setItem(
        "continueWatching",
        JSON.stringify(continueList)
    );

    nameInput.value = "";
    episodeInput.value = "";
    timestampInput.value = "";

    renderContinueWatching();
}


// ============================================
// CONTINUE WATCHING
// ============================================

function renderContinueWatching() {
    const container =
        document.getElementById("continue-list");

    if (!container) {
        return;
    }

    const list =
        JSON.parse(localStorage.getItem("continueWatching")) || [];

    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = `
            <p>Nothing here yet.</p>
        `;
        return;
    }

    list.forEach((anime, index) => {

        const item = document.createElement("div");

        item.className = "continue-item";

        item.innerHTML = `
            <div>
                <strong>
                    ${escapeHTML(anime.name)}
                </strong>

                <p>
                    Episode ${anime.episode}
                    • ${anime.timestamp}s
                </p>

                <p>
                    Status:
                    ${escapeHTML(anime.status)}
                </p>
            </div>

            <div>

                <select
                    onchange="updateStatus(${index}, this.value)"
                >
                    ${createStatusOptions(anime.status)}
                </select>

                <button onclick="editAnime(${index})">
                    Edit
                </button>

                <button onclick="deleteAnime(${index})">
                    Delete
                </button>

            </div>
        `;

        container.appendChild(item);
    });
}


// ============================================
// STATUS
// ============================================

function createStatusOptions(current) {
    const statuses = [
        "Watching",
        "Completed",
        "Dropped",
        "Paused",
        "Planning",
        "Favorite"
    ];

    return statuses.map(status => `
        <option
            value="${status}"
            ${current === status ? "selected" : ""}
        >
            ${status}
        </option>
    `).join("");
}


function updateStatus(index, newStatus) {
    let list =
        JSON.parse(localStorage.getItem("continueWatching")) || [];

    if (!list[index]) {
        return;
    }

    list[index].status = newStatus;

    localStorage.setItem(
        "continueWatching",
        JSON.stringify(list)
    );

    renderContinueWatching();
}


// ============================================
// EDIT
// ============================================

function editAnime(index) {
    let list =
        JSON.parse(localStorage.getItem("continueWatching")) || [];

    if (!list[index]) {
        return;
    }

    const anime = list[index];

    const newEpisode = prompt(
        "Update episode number:",
        anime.episode
    );

    if (newEpisode === null) {
        return;
    }

    const episode = Number(newEpisode);

    if (!Number.isFinite(episode) || episode < 0) {
        alert("Invalid episode number.");
        return;
    }

    const newTimestamp = prompt(
        "Update timestamp in seconds:",
        anime.timestamp
    );

    if (newTimestamp === null) {
        return;
    }

    const timestamp = Number(newTimestamp);

    if (!Number.isFinite(timestamp) || timestamp < 0) {
        alert("Invalid timestamp.");
        return;
    }

    list[index] = {
        ...anime,
        episode,
        timestamp
    };

    localStorage.setItem(
        "continueWatching",
        JSON.stringify(list)
    );

    renderContinueWatching();
}


// ============================================
// DELETE
// ============================================

function deleteAnime(index) {
    let list =
        JSON.parse(localStorage.getItem("continueWatching")) || [];

    if (!list[index]) {
        return;
    }

    const confirmed = confirm(
        `Delete "${list[index].name}" from Continue Watching?`
    );

    if (!confirmed) {
        return;
    }

    list.splice(index, 1);

    localStorage.setItem(
        "continueWatching",
        JSON.stringify(list)
    );

    renderContinueWatching();
}


// ============================================
// HELPERS
// ============================================

function formatStatus(status) {
    if (!status) {
        return "Unknown";
    }

    return status
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());
}


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================
// AUTH BUTTON
// ============================================

function updateAuthButton() {
    const button =
        document.getElementById("login-button");

    if (!button) {
        return;
    }

    const token = getAccessToken();

    if (token) {
        button.textContent = "Logged in to AniList";
        button.onclick = () => logoutAniList();
    } else {
        button.textContent = "Login with AniList";
        button.onclick = () => loginAniList();
    }
}


// ============================================
// PAGE LOAD
// ============================================

window.addEventListener("DOMContentLoaded", async () => {

    const token = getAccessToken();

    updateAuthButton();
    renderContinueWatching();

    // IMPORTANT:
    // Do NOT automatically redirect to AniList.
    //
    // If login fails, the user stays on our website
    // instead of getting stuck in an infinite redirect.

    if (!token) {
        console.log("Not logged into AniList.");

        const userInfo =
            document.getElementById("user-info");

        if (userInfo) {
            userInfo.innerHTML = `
                <p>You're not logged into AniList.</p>
                <button onclick="loginAniList()">
                    Login with AniList
                </button>
            `;
        }

        return;
    }

    await renderUser();
    await renderAnimeList();
});
