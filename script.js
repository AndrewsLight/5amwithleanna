const name = "Leanna";
const letters = [
  `Every time I see you, my heart finds a new reason to smile, ${name}.`,
  `${name}, you're the first thought in my morning and the last before I sleep.`,
  `Even when we're apart, ${name}, I feel you with me always.`,
  `Your laugh is my favorite melody, ${name}.`,
  `Every day with you feels like a new adventure, ${name}.`,
  `You make ordinary moments extraordinary, ${name}.`,
  `With you, every sunrise feels like magic, ${name}.`
];

const letterText = document.getElementById('letterText');
const nextButton = document.getElementById('nextLetter');
let current = 0;

function typeLetter(text, callback) {
  letterText.textContent = '';
  let i = 0;
  const interval = setInterval(() => {
    letterText.textContent += text[i];
    i++;
    if (i >= text.length) {
      clearInterval(interval);
      if (callback) callback();
    }
  }, 40);
}

typeLetter(letters[current]);

const clickSound = new Audio('https://freesound.org/data/previews/146/146725_2615114-lq.mp3');

nextButton.addEventListener('click', () => {
  clickSound.currentTime = 0;
  clickSound.play();

  const heart = document.createElement('div');
  heart.className = 'heart';
  heart.style.left = Math.random() * window.innerWidth + 'px';
  heart.style.bottom = '0px';
  document.body.appendChild(heart);
  setTimeout(() => heart.remove(), 2000);

  letterText.style.opacity = 0;
  letterText.style.transform = 'translateY(-10px)';
  setTimeout(() => {
    current = (current + 1) % letters.length;
    typeLetter(letters[current]);
    letterText.style.opacity = 1;
    letterText.style.transform = 'translateY(0)';
  }, 600);
});

// Surprise logic
const surprise = document.getElementById('surprise');
function checkTime() {
  const now = new Date();
  if (now.getHours
