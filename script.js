window.onload = () => {
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

    // Floating heart
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
  const romanticTrack = document.getElementById('romanticTrack');
  function checkTime() {
    const now = new Date();
    const showSurprise = now.getHours() === 5;
    
    document.getElementById('regular').style.display = showSurprise ? 'none' : 'flex';
    surprise.style.display = showSurprise ? 'flex' : 'none';
    surprise.style.opacity = showSurprise ? 1 : 0;

    if(showSurprise && romanticTrack.paused){
      romanticTrack.play();
    } else if(!showSurprise){
      romanticTrack.pause();
      romanticTrack.currentTime = 0;
    }
  }
  setInterval(checkTime, 1000);
  checkTime();

  // Secret Letter
  const secret = document.getElementById('secretLetter');
  secret.style.display = 'block';
  secret.addEventListener('click', () => {
    alert("💌 Surprise! You are my whole world, Leanna 💖");
  });

  // Stars animation
  const canvas = document.getElementById('starsCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const stars = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1.5,
    alpha: Math.random()
  }));

  function animateStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
      ctx.fill();
      star.alpha += (Math.random() - 0.5) * 0.05;
      star.alpha = Math.max(0, Math.min(1, star.alpha));
    });
    requestAnimationFrame(animateStars);
  }
  animateStars();

  // Petals animation
  const petalsCanvas = document.getElementById('petalsCanvas');
  const pctx = petalsCanvas.getContext('2d');
  petalsCanvas.width = window.innerWidth;
  petalsCanvas.height = window.innerHeight;
  const petals = Array.from({ length: 50 }, () => ({
    x: Math.random() * petalsCanvas.width,
    y: Math.random() * petalsCanvas.height,
    radius: Math.random() * 5 + 5,
    speed: Math.random() * 1 + 0.5
  }));

  function animatePetals() {
    pctx.clearRect(0, 0, petalsCanvas.width, petalsCanvas.height);
    petals.forEach(p => {
      p.y += p.speed;
      if(p.y > petalsCanvas.height) p.y = -10;
      pctx.beginPath();
      pctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      pctx.fillStyle = 'rgba(255,182,193,0.7)';
      pctx.fill();
    });
    requestAnimationFrame(animatePetals);
  }
  animatePetals();
};
