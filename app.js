// app.js — Andoru Shinkai Deep Sea Chat Logic

// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: "AIzaSyBVVvi5Xxr-ypjQqV2p8XgcRsYtfsVmfts",
  authDomain: "anime-party-ab793.firebaseapp.com",
  databaseURL: "https://anime-party-ab793-default-rtdb.firebaseio.com",
  projectId: "anime-party-ab793",
  storageBucket: "anime-party-ab793.firebasestorage.app",
  messagingSenderId: "220188656976",
  appId: "1:220188656976:web:a699a028f1e9cd8bcdd855"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- Room Setup ---
const ROOM_ID = "andoru-shinkai-room";
const messagesRef = db.ref(`rooms/${ROOM_ID}/messages`);
const typingRefMe = db.ref(`rooms/${ROOM_ID}/typing/andoru`);
const typingRefPartner = db.ref(`rooms/${ROOM_ID}/typing/partner`);

// --- DOM Elements ---
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const messagesEl = document.getElementById("messages");
const typingIndicator = document.getElementById("typing-indicator");

// --- Notifications ---
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

// --- Companion Dialogue ---
function companionSpeak(text) {
  const bubble = document.createElement("div");
  bubble.className = "companion-dialogue";
  bubble.textContent = text;
  document.body.appendChild(bubble);
  setTimeout(() => bubble.remove(), 4000);
}

// --- Typing Indicator ---
let typingTimeout;
input.addEventListener("input", () => {
  typingRefMe.set(true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => typingRefMe.set(false), 1200);
});

typingRefPartner.on("value", (snap) => {
  const isTyping = !!snap.val();
  typingIndicator.classList.toggle("show", isTyping);
});

// --- Send Message ---
function sendMessage(payload) {
  const base = {
    sender: "Andoru Shinkai",
    timestamp: Date.now(),
    read: false
  };

  const msgObj = payload?.type
    ? { ...base, ...payload }
    : { ...base, type: "text", text: input.value.trim() };

  if (msgObj.type === "text" && !msgObj.text) return;

  messagesRef.push(msgObj).then(() => {
    input.value = "";
    typingRefMe.set(false);
    if (Notification.permission === "granted") {
      new Notification("Message sent", {
        body: msgObj.type === "text" ? msgObj.text : msgObj.type.toUpperCase()
      });
    }
  }).catch(() => {
    companionSpeak("Message got tangled in the kelp—try again.");
  });
}

sendBtn.addEventListener("click", () => sendMessage());
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

// --- Render Messages ---
function renderMessage(key, msg) {
  const wrap = document.createElement("div");
  wrap.className = "msg" + (msg.sender === "Andoru Shinkai" ? " me" : "");

  // Content
  if (msg.type === "text") {
    wrap.textContent = msg.text;
  } else if (msg.type === "gif") {
    const img = document.createElement("img");
    img.src = msg.url; img.alt = "GIF";
    img.style.maxWidth = "100%"; img.style.borderRadius = "8px";
    wrap.appendChild(img);
  } else if (msg.type === "sticker") {
    const img = document.createElement("img");
    img.src = msg.url; img.alt = msg.alt || "Sticker";
    img.style.maxWidth = "120px"; img.style.borderRadius = "8px";
    wrap.appendChild(img);
  }

  // Meta (timestamp + read status)
  const meta = document.createElement("div");
  meta.className = "meta";
  const time = document.createElement("span");
  time.textContent = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const status = document.createElement("span");
  status.className = msg.read ? "status-read" : "status-unread";
  status.textContent = msg.read ? "Read" : "Sent";
  meta.appendChild(time);
  meta.appendChild(status);
  wrap.appendChild(meta);

  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  // Companion reacts to partner messages
  if (msg.sender !== "Andoru Shinkai") {
    companionSpeak("She replied! Ganbatte, Andoru!");
    if (Notification.permission === "granted") {
      new Notification(`New message from ${msg.sender}`, {
        body: msg.type === "text" ? msg.text : msg.type.toUpperCase()
      });
    }
  }
}

// --- Listen for Messages ---
messagesRef.on("child_added", (snap) => {
  const key = snap.key;
  const msg = snap.val();
  renderMessage(key, msg);

  // Auto-mark partner messages as read
  if (msg.sender !== "Andoru Shinkai" && !msg.read) {
    db.ref(`rooms/${ROOM_ID}/messages/${key}/read`).set(true);
  }
});

// --- Emoji Picker Integration ---
document.addEventListener("DOMContentLoaded", () => {
  if (window.emojiMart) {
    const { Picker } = window.emojiMart;
    const picker = new Picker({
      onEmojiSelect: (emoji) => {
        input.value += emoji.native || emoji.shortcodes || "";
        input.focus();
      },
      theme: "dark"
    });
    document.getElementById("emoji-picker").appendChild(picker);
  }
});

// --- GIF Search ---
const gifQuery = document.getElementById("gif-query");
const gifSearch = document.getElementById("gif-search");
const gifResults = document.getElementById("gif-results");
const GIPHY_KEY = "YOUR_GIPHY_API_KEY"; // Replace with your Giphy key

gifSearch.addEventListener("click", async () => {
  const q = gifQuery.value.trim();
  gifResults.innerHTML = "";
  if (!q) return;
  try {
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=pg`);
    const data = await res.json();
    for (const g of data.data) {
      const url = g.images.fixed_height_small.url;
      const img = document.createElement("img");
      img.src = url; img.alt = g.title;
      img.style.width = "100%"; img.style.height = "100%"; img.style.objectFit = "cover";
      const wrap = document.createElement("div");
      wrap.style.borderRadius = "10px";
      wrap.style.overflow = "hidden";
      wrap.style.cursor = "pointer";
      wrap.appendChild(img);
      wrap.onclick = () => sendMessage({ type: "gif", url });
      gifResults.appendChild(wrap);
    }
  } catch (e) {
    companionSpeak("GIF sea currents are rough—try again.");
  }
});

// --- Stickers ---
document.getElementById("stickers-grid").addEventListener("click", (e) => {
  const img = e.target.closest(".sticker")?.querySelector("img");
  if (!img) return;
  sendMessage({ type: "sticker", url: img.src, alt: img.alt || "Sticker" });
});