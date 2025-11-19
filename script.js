/* ========= PASSWORD ========= */
const PASSWORD = "i miss you";

const passwordScreen = document.getElementById("passwordScreen");
const world = document.getElementById("world");
const passwordBtn = document.getElementById("passwordBtn");
const passwordInput = document.getElementById("passwordInput");
const passwordMsg = document.getElementById("passwordMsg");

passwordBtn.addEventListener("click", () => {
  const input = passwordInput.value.trim().toLowerCase();

  if (input === PASSWORD) {
    passwordScreen.classList.add("hidden");
    world.classList.remove("hidden");
  } else {
    passwordMsg.textContent = "you entered it wrong dummy baba 😭";
  }
});


/* ========= SIDEBAR TABS ========= */
const tabs = document.querySelectorAll(".tab");
const tabBtns = document.querySelectorAll(".tabBtn");

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    tabs.forEach(t => t.classList.remove("active"));
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});


/* ========= NOTES ========= */
const noteInput = document.getElementById("noteInput");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const notesList = document.getElementById("notesList");

function loadNotes() {
  notesList.innerHTML = "";
  const notes = JSON.parse(localStorage.getItem("baba_notes") || "[]");

  notes.forEach(text => {
    let div = document.createElement("div");
    div.className = "savedNote";
    div.textContent = text;
    notesList.appendChild(div);
  });
}

loadNotes();

saveNoteBtn.addEventListener("click", () => {
  let text = noteInput.value.trim();
  if (!text) return;

  const notes = JSON.parse(localStorage.getItem("baba_notes") || "[]");
  notes.push(text);
  localStorage.setItem("baba_notes", JSON.stringify(notes));

  noteInput.value = "";
  loadNotes();
});


/* ========= MINI GAME ========= */
let playing = false;
let score = 0;

const gameArea = document.getElementById("gameArea");
const startGameBtn = document.getElementById("startGameBtn");
const scoreEl = document.getElementById("score");

function spawnHeart() {
  if (!playing) return;

  const heart = document.createElement("div");
  heart.classList.add("heart");
  heart.textContent = "💗";

  heart.style.left = Math.random() * (gameArea.clientWidth - 30) + "px";
  heart.style.top = Math.random() * (gameArea.clientHeight - 30) + "px";

  heart.onclick = () => {
    score++;
    scoreEl.textContent = score;
    heart.remove();
  };

  gameArea.appendChild(heart);

  setTimeout(() => heart.remove(), 900);
}

startGameBtn.addEventListener("click", () => {
  score = 0;
  scoreEl.textContent = 0;
  playing = true;

  const interval = setInterval(() => {
    if (!playing) {
      clearInterval(interval);
      return;
    }
    spawnHeart();
  }, 700);

  setTimeout(() => { playing = false; }, 10000);
});


/* ========= TROLL TIMER ========= */
setTimeout(() => {
  alert("baby… you miss me that much? 😭💗");
}, 120000);
