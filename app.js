// AniList API setup
const CLIENT_ID = 49189;
const REDIRECT_URI = "https://5amwithleanna.online/";
const API_URL = "https://graphql.anilist.co";

// OAuth login (implicit flow)
function loginAniList() {
  const url = `https://anilist.co/api/v2/oauth/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT_URI}`;
  window.location.href = url;
}

// Extract token
function getAccessToken() {
  const storedToken = localStorage.getItem("anilist_token");
  if (storedToken) return storedToken;

  const hash = window.location.hash;
  if (hash) {
    const params = new URLSearchParams(hash.replace("#", "?"));
    const token = params.get("access_token");
    if (token) {
      localStorage.setItem("anilist_token", token);
      window.location.hash = "";
      return token;
    }
  }
  return null;
}

const token = getAccessToken();

// Fetch AniList metadata
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

// Render AniList metadata
async function renderAnime() {
  const anime = await fetchAnime(49189); // Example ID
  document.getElementById("anime-title").innerText = anime.title.romaji;
  document.getElementById("anime-description").innerHTML = anime.description;
  document.getElementById("anime-poster").src = anime.coverImage.large;
  document.getElementById("anime-episodes").innerText = `Episodes: ${anime.episodes}`;
}

// Manual add to Continue Watching
function addAnime() {
  const name = document.getElementById("anime-name").value;
  const episode = document.getElementById("episode-number").value;
  const timestamp = document.getElementById("timestamp").value;

  let continueList = JSON.parse(localStorage.getItem("continueWatching")) || [];
  continueList.push({ name, episode, timestamp });
  localStorage.setItem("continueWatching", JSON.stringify(continueList));

  renderContinueWatching();
}

// Render Continue Watching list
function renderContinueWatching() {
  const list = JSON.parse(localStorage.getItem("continueWatching")) || [];
  const container = document.getElementById("continue-list");
  container.innerHTML = "";
  list.forEach((anime, index) => {
    container.innerHTML += `
      <div>
        <strong>${anime.name}</strong> - Episode ${anime.episode} at ${anime.timestamp}s
        <button onclick="editAnime(${index})">Edit</button>
        <button onclick="deleteAnime(${index})">Delete</button>
      </div>
    `;
  });
}

// Edit entry
function editAnime(index) {
  let list = JSON.parse(localStorage.getItem("continueWatching")) || [];
  const anime = list[index];
  const newEpisode = prompt("Update episode number:", anime.episode);
  const newTimestamp = prompt("Update timestamp (seconds):", anime.timestamp);
  list[index] = { ...anime, episode: newEpisode, timestamp: newTimestamp };
  localStorage.setItem("continueWatching", JSON.stringify(list));
  renderContinueWatching();
}

// Delete entry
function deleteAnime(index) {
  let list = JSON.parse(localStorage.getItem("continueWatching")) || [];
  list.splice(index, 1);
  localStorage.setItem("continueWatching", JSON.stringify(list));
  renderContinueWatching();
}

// On page load
window.onload = () => {
  if (token) {
    renderAnime();
  }
  renderContinueWatching();
};
