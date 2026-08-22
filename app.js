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

// Step 3: Fetch AniList metadata (example query)
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

// Step 4: Render AniList metadata into HTML
async function renderAnime() {
  const anime = await fetchAnime(49189); // Example ID
  document.getElementById("anime-title").innerText = anime.title.romaji;
  document.getElementById("anime-description").innerHTML = anime.description;
  document.getElementById("anime-poster").src = anime.coverImage.large;
  document.getElementById("anime-episodes").innerText = `Episodes: ${anime.episodes}`;
}

// Step 5: Manual Continue Watching management
function addAnime() {
  const name = document.getElementById("anime-name").value;
  const episode = document.getElementById("episode-number").value;
  const timestamp = document.getElementById("timestamp").value;

  let continueList = JSON.parse(localStorage.getItem("continueWatching")) || [];
  continueList.push({ name, episode, timestamp, status: "Watching" });
  localStorage.setItem("continueWatching", JSON.stringify(continueList));

  renderContinueWatching();
}

function renderContinueWatching() {
  const list = JSON.parse(localStorage.getItem("continueWatching")) || [];
  const container = document.getElementById("continue-list");
  container.innerHTML = "";
  list.forEach((anime, index) => {
    container.innerHTML += `
      <div>
        <strong>${anime.name}</strong> - Episode ${anime.episode} at ${anime.timestamp}s
        <select onchange="updateStatus(${index}, this.value)">
          <option value="Watching" ${anime.status === "Watching" ? "selected" : ""}>Watching</option>
          <option value="Completed" ${anime.status === "Completed" ? "selected" : ""}>Completed</option>
          <option value="Dropped" ${anime.status === "Dropped" ? "selected" : ""}>Dropped</option>
          <option value="Paused" ${anime.status === "Paused" ? "selected" : ""}>Paused</option>
          <option value="Planning" ${anime.status === "Planning" ? "selected" : ""}>Planning</option>
          <option value="Favorite" ${anime.status === "Favorite" ? "selected" : ""}>Favorite</option>
        </select>
        <button onclick="editAnime(${index})">Edit</button>
        <button onclick="deleteAnime(${index})">Delete</button>
      </div>
    `;
  });
}

function updateStatus(index, newStatus) {
  let list = JSON.parse(localStorage.getItem("continueWatching")) || [];
  list[index].status = newStatus;
  localStorage.setItem("continueWatching", JSON.stringify(list));
  renderContinueWatching();
}

function editAnime(index) {
  let list = JSON.parse(localStorage.getItem("continueWatching")) || [];
  const anime = list[index];
  const newEpisode = prompt("Update episode number:", anime.episode);
  const newTimestamp = prompt("Update timestamp (seconds):", anime.timestamp);
  list[index] = { ...anime, episode: newEpisode, timestamp: newTimestamp };
  localStorage.setItem("continueWatching", JSON.stringify(list));
  renderContinueWatching();
}

function deleteAnime(index) {
  let list = JSON.parse(localStorage.getItem("continueWatching")) || [];
  list.splice(index, 1);
  localStorage.setItem("continueWatching", JSON.stringify(list));
  renderContinueWatching();
}

// Run on page load
window.onload = () => {
  if (token) {
    renderAnime();
  } else {
    loginAniList();
  }
  renderContinueWatching();
};
