// 5AM special display
function showSpecial() {
  let now = new Date();
  let hours = now.getHours();
  let special = document.getElementById('specialMessage');

  if(hours === 5) {
    special.style.display = 'block';
    special.classList.add('fade-in');
    document.body.style.background = "linear-gradient(to top, #9b59b6, #f1c40f)"; // sunrise colors
  } else {
    special.style.display = 'none';
    document.body.style.background = "linear-gradient(to top, #0b0c2c, #1a1c4f)"; // night sky
  }
}

showSpecial();
setInterval(showSpecial, 60000);

// Stars
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const stars = [];
for(let i=0;i<150;i++){
  stars.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*1.5, d: Math.random()*0.5 });
}

function drawStars(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = 'white';
  ctx.beginPath();
  stars.forEach(star => {
    ctx.moveTo(star.x, star.y);
    ctx.arc(star.x, star.y, star.r, 0, Math.PI*2);
  });
  ctx.fill();
  updateStars();
  requestAnimationFrame(drawStars);
}

function updateStars(){
  stars.forEach(star=>{
    star.y += star.d;
    if(star.y > canvas.height){
      star.y = 0;
      star.x = Math.random()*canvas.width;
    }
  });
}

drawStars();

// Floating candies
const candiesContainer = document.getElementById('candies');
const candyEmojis = ['🍬','🍭','🍫','🍡'];
for(let i=0;i<20;i++){
  let span = document.createElement('span');
  span.className = 'candy';
  span.style.left = Math.random()*window.innerWidth + 'px';
  span.style.top = Math.random()*window.innerHeight + 'px';
  span.innerText = candyEmojis[Math.floor(Math.random()*candyEmojis.length)];
  span.style.animationDuration = (3 + Math.random()*3) + 's';
  candiesContainer.appendChild(span);
}

// Floating cats
const catsContainer = document.getElementById('cats');
const catEmojis = ['🐱','😺','😸','😻'];
for(let i=0;i<10;i++){
  let span = document.createElement('span');
  span.className = 'cat';
  span.style.left = Math.random()*window.innerWidth + 'px';
  span.style.top = Math.random()*window.innerHeight + 'px';
  span.innerText = catEmojis[Math.floor(Math.random()*catEmojis.length)];
  span.style.animationDuration = (4 + Math.random()*4) + 's';
  catsContainer.appendChild(span);
}
