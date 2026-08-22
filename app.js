// AniList API setup
const CLIENT_ID = 49189; // your AniList client ID
const REDIRECT_URI = "https://5amwithleanna.online/";
const API_URL = "https://graphql.anilist.co";

// Step 1: Handle OAuth login (implicit flow)
function loginAniList() {
  const url = `https://anilist.co/api/v2/oauth/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT_URI}`;
  window.location.href = url;
}

// Step 2: Extract access token from URL hash after redirect
function getAccessToken() {
  // Check if token is already stored
  const storedToken = localStorage.getItem("anilist_token");
  if (storedToken) return storedToken;

  // Parse from URL hash
  const hash = window.location.hash;
  if (hash) {
    const params = new URLSearchParams(hash.replace("#", "?"));
    const token = params.get("access_token");
    if (token) {
      localStorage.setItem("anilist_token", token); // save for reuse
      window.location.hash = ""; // clean up URL
      return token;
    }
  }
  return null;
}

const token = getAccessToken();

// Step 3: Example GraphQL query (fetch anime by ID)
async function fetchAnime(id) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        title { romaji }
        description
        episodes
        coverImage { large }
      }
    }
  `;
  const variables = { id };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    },
    body: JSON.stringify({ query, variables })
  });

  const data = await response.json();
  return data.data.Media;
}

// Step 4: Render anime data into HTML
async function renderAnime() {
  const anime = await fetchAnime(49189); // test with your ID
  document.getElementById("anime-title").innerText = anime.title.romaji;
  document.getElementById("anime-description").innerHTML = anime.description;
  document.getElementById("anime-poster").src = anime.coverImage.large;
  document.getElementById("anime-episodes").innerText = `Episodes: ${anime.episodes}`;
}

// Step 5: Progress tracking (localStorage)
function saveProgress() {
  const progress = {
    animeId: 49189,
    currentEpisode: document.getElementById("current-episode").innerText,
    timestamp: document.getElementById("current-timestamp").innerText
  };
  localStorage.setItem("progress", JSON.stringify(progress));
  alert("Progress saved!");
}

function updateStatus() {
  const status = document.getElementById("anime-status").value;
  document.getElementById("status-display").innerText = status;
  localStorage.setItem("status", status);
}

// Run render on page load
window.onload = () => {
  if (!token) {
    loginAniList();
  } else {
    renderAnime();

    // Load saved progress/status if available
    const savedProgress = JSON.parse(localStorage.getItem("progress"));
    if (savedProgress) {
      document.getElementById("current-episode").innerText = savedProgress.currentEpisode;
      document.getElementById("current-timestamp").innerText = savedProgress.timestamp;
    }
    const savedStatus = localStorage.getItem("status");
    if (savedStatus) {
      document.getElementById("anime-status").value = savedStatus;
      document.getElementById("status-display").innerText = savedStatus;
    }
  }
};
