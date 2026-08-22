// AniList API setup
const CLIENT_ID = 49189; // your AniList client ID
const REDIRECT_URI = "https://5amwithleanna.online/";
const API_URL = "https://graphql.anilist.co";

// Step 1: Handle OAuth login
function loginAniList() {
  const url = `https://anilist.co/api/v2/oauth/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT_URI}`;
  window.location.href = url;
}

// Step 2: Extract access token from URL after redirect
function getAccessToken() {
  const hash = window.location.hash;
  if (hash) {
    const params = new URLSearchParams(hash.replace("#", "?"));
    return params.get("access_token");
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

// Run render on page load
window.onload = () => {
  if (!token) {
    loginAniList();
  } else {
    renderAnime();
  }
};
