import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --------------------------------------------------
// FIREBASE CONFIG
// --------------------------------------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "amwithleanna.firebaseapp.com",
  databaseURL: "https://amwithleanna-default-rtdb.firebaseio.com/",
  projectId: "amwithleanna",
  storageBucket: "amwithleanna.appspot.com",
  messagingSenderId: "YOUR_SENDER",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --------------------------------------------------
// AUDIO (HOWLER)
// --------------------------------------------------
const bgAudio = new Howl({
  src: ["./assets/song.mp3"],
  loop: true,
  volume: 0.7
});

let firstTouch = false;

// Start audio after first tap/click
document.addEventListener("click", () => {
  if (!firstTouch) {
    firstTouch = true;
    bgAudio.play();
  }
});

// --------------------------------------------------
// PASSWORD + UI FIX
// --------------------------------------------------
const pwInput = document.getElementById("pwInput");
const pwBtn = document.getElementById("pwBtn");
const screen1 = document.getElementById("screen1");
const screen2 = document.getElementById("screen2");

const PASSWORD = "i miss you";

pwBtn.addEventListener("click", () => {
  if (pwInput.value.trim().toLowerCase() === PASSWORD) {

    gsap.to(screen1, {
      opacity: 0,
      duration: 1,
      onComplete: () => {
        screen1.classList.add("hidden");
        screen2.classList.remove("hidden");

        gsap.fromTo(screen2, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 });
      }
    });

  } else {
    gsap.fromTo(pwInput, { x: -10 }, { x: 10, duration: 0.1, repeat: 4, yoyo: true });
  }
});

// --------------------------------------------------
// 2-PLAYER REAL-TIME MINI GAME
// --------------------------------------------------
const gameRef = ref(db, "game");

function sendMove(player, x, y) {
  set(ref(db, `game/${player}`), { x, y });
}

// Sync
onValue(gameRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  const p1 = document.getElementById("p1");
  const p2 = document.getElementById("p2");

  if (data.player1)
    p1.style.transform = `translate(${data.player1.x}px, ${data.player1.y}px)`;

  if (data.player2)
    p2.style.transform = `translate(${data.player2.x}px, ${data.player2.y}px)`;
});

// Controls (player1)
let p1x = 50, p1y = 50;

document.addEventListener("keydown", (e) => {
  if (screen2.classList.contains("hidden")) return;

  if (e.key === "w") p1y -= 10;
  if (e.key === "s") p1y += 10;
  if (e.key === "a") p1x -= 10;
  if (e.key === "d") p1x += 10;

  sendMove("player1", p1x, p1y);
});
