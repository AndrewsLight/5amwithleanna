window.onload = () => {

  // ---------- VARIABLES ----------
  const entry = document.getElementById('entry');
  const passwordInput = document.getElementById('passwordInput');
  const passwordBtn = document.getElementById('passwordBtn');
  const entrySound = document.getElementById('entrySound');

  const world = document.getElementById('world');
  const letterText = document.getElementById('letterText');
  const nextBtn = document.getElementById('nextLetter');
  const bgMusic = document.getElementById('bgMusic');
  const catBtns = document.querySelectorAll('.catBtn');

  let musicStarted = false;
  let currentCategory = "morning";
  let currentLetter = 0;

  // Letters Database
  const lettersDB = {
    morning: [
      "Good morning, my love 🌅",
      "Every sunrise reminds me of you 💛",
      "Coffee tastes better thinking of you ☕❤️"
    ],
    memories: [
      "Remember our first movie night? 🎬",
      "Walking together in the rain... ☔",
      "That cute ice cream fight 🍦"
    ],
    surprises: [
      "Look behind the stars 💫",
      "A hidden heart appears just for you 💖",
      "Your smile is my favorite animation 😘"
    ],
    quotes: [
      "Nostalgia, love, and quiet mornings… 🌌",
      "Even the darkest night shines with your love 💛",
      "Our love story is my favorite poem ✨"
    ],
    secret: [
      "✨ You unlocked the secret world! ✨",
      "Here, only you can enter at 5AM 💖",
      "Magic is real when you're here 💛"
    ],
    notes: [
      "I can't wait to see you again 😍",
      "Little messages to remind you of us 💛",
      "Every word is just for you ❤️"
    ]
  };

  // ---------- ENTRY PAGE ----------
  const startWorld = () => {
    entry.style.display = "none";
    world.style.display = "block";
    if(!musicStarted){
      bgMusic.play();
      musicStarted = true;
    }
  }

  // Start world on click anywhere
  entry.addEventListener('click', () => {
    entrySound.play();
    startWorld();
  });

  // Password input for Easter egg
  passwordBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    if(passwordInput.value.toLowerCase() === "i miss you"){
      showEasterEgg();
      startWorld();
    } else {
      alert("Wrong password 💛");
    }
  });

  // ---------- CATEGORY SWITCH ----------
  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.cat;
      currentLetter = 0;
      typeLetter(lettersDB[currentCategory][currentLetter]);
    });
  });

  // ---------- TYPEWRITER EFFECT ----------
  const typeLetter = (text) => {
    letterText.textContent = '';
    let i = 0;
    const interval = setInterval(()=>{
      letterText.textContent += text[i];
      i++;
      if(i >= text.length) clearInterval(interval);
    },40);
  }

  // ---------- NEXT LETTER ----------
  nextBtn.addEventListener('click', () => {
    const letters = lettersDB[currentCategory];
    currentLetter = (currentLetter + 1) % letters.length;
    typeLetter(letters[currentLetter]);
    spawnClickEffect();
  });

  // Start first letter
  typeLetter(lettersDB[currentCategory][currentLetter]);

  // ---------- CLICK EFFECT ----------
  const spawnClickEffect = () => {
    const heart = document.createElement('div');
    heart.className = 'heart';
    heart.style.left = Math.random()*window.innerWidth + 'px';
    heart.style.top = Math.random()*window.innerHeight + 'px';
    document.body.appendChild(heart);
    setTimeout(()=>heart.remove(),2000);
  }

  // ---------- EASTER EGG ----------
  const showEasterEgg = () => {
    alert("💖 Magic unlocked! Check the secret particles at 5AM or with password!");
    // Optional: can trigger special animations here
  }

  // ---------- BACKGROUND ANIMATIONS ----------
  const starsCanvas = document.getElementById('starsCanvas');
  const starsCtx = starsCanvas.getContext('2d');
  starsCanvas.width = window.innerWidth;
  starsCanvas.height = window.innerHeight;

  const stars = Array.from({length:200}, ()=>({
    x: Math.random()*starsCanvas.width,
    y: Math.random()*starsCanvas.height,
    radius: Math.random()*1.5,
    alpha: Math.random()
  }));

  const animateStars = () => {
    starsCtx.clearRect(0,0,starsCanvas.width, starsCanvas.height);
    stars.forEach(star => {
      starsCtx.beginPath();
      starsCtx.arc(star.x, star.y, star.radius,0,Math.PI*2);
      starsCtx.fillStyle = `rgba(255,255,255,${star.alpha})`;
      starsCtx.fill();
      star.alpha += (Math.random()-0.5)*0.05;
      star.alpha = Math.max(0, Math.min(1, star.alpha));
    });
    requestAnimationFrame(animateStars);
  }
  animateStars();

  // Petals Layer
  const petalsCanvas = document.getElementById('petalsCanvas');
  const pCtx = petalsCanvas.getContext('2d');
  petalsCanvas.width = window.innerWidth;
  petalsCanvas.height = window.innerHeight;

  const petals = Array.from({length:80}, ()=>({
    x: Math.random()*petalsCanvas.width,
    y: Math.random()*petalsCanvas.height,
    radius: Math.random()*5+5,
    speed: Math.random()*0.5+0.2
  }));

  const animatePetals = () => {
    pCtx.clearRect(0,0,petalsCanvas.width,petalsCanvas.height);
    petals.forEach(p=>{
      p.y += p.speed;
      if(p.y>petalsCanvas.height)p.y=0;
      pCtx.beginPath();
      pCtx.arc(p.x,p.y,p.radius,0,Math.PI*2);
      pCtx.fillStyle = `rgba(255,182,193,0.5)`;
      pCtx.fill();
    });
    requestAnimationFrame(animatePetals);
  }
  animatePetals();

  // Mist Layer
  const mistCanvas = document.getElementById('mistCanvas');
  const mCtx = mistCanvas.getContext('2d');
  mistCanvas.width = window.innerWidth;
  mistCanvas.height = window.innerHeight;

  const mist = Array.from({length:30}, ()=>({
    x: Math.random()*mistCanvas.width,
    y: Math.random()*mistCanvas.height,
    radius: Math.random()*100+50,
    alpha: Math.random()*0.2
  }));

  const animateMist = () => {
    mCtx.clearRect(0,0,mistCanvas.width,mistCanvas.height);
    mist.forEach(m=>{
      m.y += 0.1;
      if(m.y>mistCanvas.height)m.y=0;
      mCtx.beginPath();
      mCtx.arc(m.x,m.y,m.radius,0,Math.PI*2);
      mCtx.fillStyle = `rgba(200,182,255,${m.alpha})`;
      mCtx.fill();
    });
    requestAnimationFrame(animateMist);
  }
  animateMist();

}
