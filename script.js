/* ========== professional, single-file app logic ========== */
/* Features:
   - entry with password "i miss you" or click to enter
   - 8 room/sidebar categories
   - smooth typewriter with lock & queue
   - background particle layers (optimized single RAF loop)
   - click interactions spawn hearts with SFX
   - notes saved to localStorage
   - garden (click to grow flowers)
   - mini-game (click hearts to score)
   - 5AM secret auto-open + password-triggered secret room with egg music
*/

(() => {
  // ----- elements -----
  const entry = document.getElementById('entry');
  const passwordInput = document.getElementById('passwordInput');
  const passwordBtn = document.getElementById('passwordBtn');
  const entrySound = document.getElementById('entrySound');

  const world = document.getElementById('world');
  const bgCanvas = document.getElementById('bgCanvas');
  const ctx = bgCanvas.getContext('2d');

  const menuBtns = Array.from(document.querySelectorAll('.menu-btn'));
  const roomTitle = document.getElementById('roomTitle');
  const letterBox = document.getElementById('letterBox');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  const memoriesPanel = document.getElementById('memoriesPanel');
  const gallery = document.getElementById('gallery');

  const surprisesPanel = document.getElementById('surprisesPanel');
  const secretPanel = document.getElementById('secretPanel');
  const secretArea = document.getElementById('secretArea');
  const gardenArea = document.getElementById('gardenArea');
  const minigamePanel = document.getElementById('minigamePanel');
  const gameArea = document.getElementById('gameArea');
  const startGameBtn = document.getElementById('startGameBtn');
  const scoreEl = document.getElementById('score');

  const notesPanel = document.getElementById('notesPanel');
  const noteInput = document.getElementById('noteInput');
  const noteName = document.getElementById('noteName');
  const saveNoteBtn = document.getElementById('saveNoteBtn');
  const notesList = document.getElementById('notesList');

  const bgMusic = document.getElementById('bgMusic');
  const eggMusic = document.getElementById('eggMusic');
  const clickSfx = document.getElementById('clickSfx');

  const MUTE_KEY = '5am_mute_v1';
  let musicStarted = false;
  let muted = (localStorage.getItem(MUTE_KEY) === '1');

  // ----- data -----
  const PASS = 'i miss you';
  let currentCat = 'morning';
  let currentIndex = 0;
  let typing = false;
  let queued = null;

  const lettersDB = {
    morning: [
      "Good morning, baba. The sky looks soft today because of you.",
      "I woke up thinking of your laugh. It warms me even across miles.",
      "When you open this, know I am with you in every sunrise."
    ],
    memories: [
      // replace/add gifs to assets/gifs and update gallery init
      { type: 'gif', src: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', caption: 'Our silly night' },
      { type: 'gif', src: 'https://media.giphy.com/media/l0Exk8EUzSLsrErEQ/giphy.gif', caption: 'We danced in pixels' },
      { type: 'img', src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800', caption: 'This moment' }
    ],
    surprises: [
      "Look — a hidden heart floats when you click the dark sky.",
      "You can plant flowers in our garden and watch them grow.",
      "At 5AM, something special will bloom for both of you."
    ],
    quotes: [
      "Nostalgia, love, and quiet mornings… baba, this is us.",
      "Distance is a test that only makes our story louder.",
      "If you miss me: breathe, and click the sky. 💫"
    ],
    secret: [
      "You opened the secret. Close your eyes and listen.",
      "This moment is just ours — wake up at 5AM, and I will be here with you."
    ],
    notes: [],
    garden: [],
    minigame: []
  };

  // seed some quote variations (emo vibe with "baba")
  const extraQuotes = [
    "baba — you are my favorite notification.",
    "I said your name to the quiet and it felt like singing.",
    "When the world sleeps, I write letters to the space between us."
  ];
  lettersDB.quotes.push(...extraQuotes);

  // ----- responsive canvas init -----
  function resizeCanvas() {
    bgCanvas.width = innerWidth * devicePixelRatio;
    bgCanvas.height = innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ----- particle layers (stars, petals, mist) optimized in one RAF loop -----
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: Math.random() * 1.4 + 0.2,
    a: Math.random() * 0.9 + 0.1,
    tw: Math.random() * 0.02 + 0.005
  }));
  const petals = Array.from({ length: 40 }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: Math.random() * 6 + 3,
    s: Math.random() * 0.4 + 0.2,
    rot: Math.random() * Math.PI * 2,
    a: Math.random() * 0.6 + 0.2
  }));
  const mist = Array.from({ length: 20 }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: Math.random() * 200 + 100,
    a: Math.random() * 0.12 + 0.03
  }));

  // ----- hearts pool for click effects -----
  const hearts = [];

  function spawnHeart(x, y) {
    hearts.push({
      x, y,
      vx: (Math.random() - 0.5) * 0.6,
      vy: - (Math.random() * 1.2 + 0.6),
      r: Math.random() * 8 + 8,
      life: 1
    });
    if (!muted) { clickSfx.currentTime = 0; clickSfx.play(); }
  }

  // ----- animation loop -----
  function draw() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    // subtle radial gradient
    const g = ctx.createLinearGradient(0, 0, 0, innerHeight);
    g.addColorStop(0, '#120012'); g.addColorStop(1, '#040004');
    ctx.fillStyle = g; ctx.fillRect(0, 0, innerWidth, innerHeight);

    // stars
    stars.forEach(s => {
      s.a += (Math.random() - 0.5) * s.tw;
      s.a = Math.max(0.05, Math.min(1, s.a));
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // petals
    petals.forEach(p => {
      p.y += p.s;
      if (p.y > innerHeight + 20) p.y = -20;
      p.rot += 0.01;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,77,109,${p.a})`;
      ctx.ellipse(0, 0, p.r, p.r / 2, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.restore();
    });

    // mist
    mist.forEach(m => {
      m.x += Math.sin(Date.now() / 10000 + m.x) * 0.02;
      m.y += 0.02;
      if (m.y > innerHeight + 50) m.y = -100;
      ctx.beginPath();
      ctx.fillStyle = `rgba(150,100,200,${m.a})`;
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // hearts (click effects)
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      h.vy += 0.02; // gravity inverted (float up less)
      h.x += h.vx; h.y += h.vy;
      h.life -= 0.01;
      const alpha = Math.max(0, h.life);
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(Math.sin(h.x + h.y) * 0.2);
      ctx.fillStyle = `rgba(255,77,109,${alpha})`;
      // heart path
      ctx.beginPath();
      ctx.moveTo(0, -h.r/2);
      ctx.bezierCurveTo(h.r, -h.r*1.2, h.r*1.4, h.r/2, 0, h.r);
      ctx.bezierCurveTo(-h.r*1.4, h.r/2, -h.r, -h.r*1.2, 0, -h.r/2);
      ctx.fill();
      ctx.restore();
      if (h.life <= 0) hearts.splice(i, 1);
    }

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // ----- UX: entry and password -----
  function startExperience() {
    if (!musicStarted && !muted) {
      try { bgMusic.volume = 0.0; bgMusic.play().then(()=> { fadeAudio(bgMusic, 0.0, 0.6, 800); }); }
      catch(e){ /* autoplay blocked until interaction; handled by first click */ }
      musicStarted = true;
    }
    entry.classList.add('hidden');
    world.classList.remove('hidden');
  }

  entry.addEventListener('click', (ev) => {
    // play a short entry sound once
    try { entrySound.currentTime = 0; entrySound.play(); } catch (e) {}
    startExperience();
    spawnHeart(ev.clientX, ev.clientY);
  });

  passwordBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (passwordInput.value.trim().toLowerCase() === PASS) {
      // reveal secret immediately
      openCategory('secret');
      startExperience();
      showSecretMoment(true);
    } else {
      alert('That password is not right, baba. Try again 💛');
    }
  });

  // allow Enter key on password
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') passwordBtn.click();
  });

  // ----- audio helpers -----
  function fadeAudio(el, from, to, ms) {
    const start = performance.now();
    const diff = to - from;
    el.volume = from;
    function step(t) {
      const p = Math.min(1, (t - start) / ms);
      el.volume = from + diff * p;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // mute toggle
  document.getElementById('muteBtn').addEventListener('click', () => {
    muted = !muted; localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    if (muted) { bgMusic.pause(); eggMusic.pause(); } else if (musicStarted) { bgMusic.play(); }
    document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊';
  });
  document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊';

  // ----- category switching -----
  function activateMenuButton(cat) {
    menuBtns.forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  }

  function hideAllPanels() {
    memoriesPanel.classList.add('hidden');
    surprisesPanel.classList.add('hidden');
    document.getElementById('quotesPanel').classList.add('hidden');
    secretPanel.classList.add('hidden');
    gardenArea.parentElement.classList.add('hidden');
    minigamePanel.classList.add('hidden');
    notesPanel.classList.add('hidden');
  }

  function openCategory(cat) {
    currentCat = cat;
    currentIndex = 0;
    roomTitle.textContent = {
      morning: 'Morning Letters',
      memories: 'Memories',
      surprises: 'Surprises',
      quotes: 'Quotes & Vibes',
      secret: 'Secret Moments',
      garden: 'Garden',
      minigame: 'Mini-Games',
      notes: 'Notes'
    }[cat] || cat;
    activateMenuButton(cat);
    hideAllPanels();
    // show main letter view by default (we use letterBox)
    letterBox.style.display = (cat === 'memories' || cat === 'garden' || cat === 'minigame' || cat === 'notes' || cat === 'surprises' || cat === 'quotes' || cat === 'secret') ? 'block' : 'block';
    // show specific panels
    if (cat === 'memories') memoriesPanel.classList.remove('hidden');
    if (cat === 'surprises') surprisesPanel.classList.remove('hidden');
    if (cat === 'quotes') document.getElementById('quotesPanel').classList.remove('hidden');
    if (cat === 'secret') secretPanel.classList.remove('hidden');
    if (cat === 'garden') gardenArea.parentElement.classList.remove('hidden');
    if (cat === 'minigame') minigamePanel.classList.remove('hidden');
    if (cat === 'notes') notesPanel.classList.remove('hidden');

    // render category content
    renderCategory(cat);
  }

  menuBtns.forEach(btn => btn.addEventListener('click', () => {
    openCategory(btn.dataset.cat);
    spawnHeart(innerWidth / 2, innerHeight / 2);
  }));

  // ----- typewriter (smooth, queued) -----
  function typeText(str) {
    if (typing) { queued = () => typeText(str); return; }
    typing = true;
    letterBox.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < str.length; i++) {
      const span = document.createElement('span');
      span.textContent = str[i];
      span.style.opacity = '0';
      span.style.transform = 'translateY(6px)';
      span.style.display = 'inline-block';
      frag.appendChild(span);
    }
    letterBox.appendChild(frag);
    const spans = Array.from(letterBox.querySelectorAll('span'));
    let i = 0;
    const speed = 28; // ms per char
    function tick() {
      if (i < spans.length) {
        spans[i].style.transition = 'opacity .18s ease, transform .18s ease';
        spans[i].style.opacity = '1';
        spans[i].style.transform = 'translateY(0)';
        i++;
        // small sound per chunk
        if (!muted && i % 4 === 0) {
          clickSfx.currentTime = 0; clickSfx.play().catch(()=>{});
        }
        setTimeout(tick, speed);
      } else {
        typing = false;
        if (queued) { const q = queued; queued = null; q(); }
      }
    }
    tick();
  }

  // prev/next navigation through letter lists
  prevBtn.addEventListener('click', () => {
    if (typing) return;
    navigateLetters(-1);
  });
  nextBtn.addEventListener('click', () => {
    if (typing) return;
    navigateLetters(1);
  });

  function navigateLetters(dir) {
    const arr = getCategoryContent(currentCat);
    if (!arr || arr.length === 0) { typeText("Nothing here yet. Add a note or come back later."); return; }
    currentIndex = (currentIndex + dir + arr.length) % arr.length;
    const item = arr[currentIndex];
    typeText(typeof item === 'string' ? item : (item.caption || item.src || JSON.stringify(item)));
  }

  function getCategoryContent(cat) {
    if (cat === 'morning' || cat === 'quotes' || cat === 'surprises' || cat === 'secret') {
      return lettersDB[cat] || [];
    }
    if (cat === 'memories') return lettersDB.memories;
    if (cat === 'notes') return lettersDB.notes;
    return [];
  }

  // ----- render category content -----
  function renderCategory(cat) {
    if (cat === 'memories') {
      gallery.innerHTML = '';
      lettersDB.memories.forEach(item => {
        const el = document.createElement('img');
        el.src = item.src; el.alt = item.caption || '';
        el.title = item.caption || '';
        gallery.appendChild(el);
      });
      // show first memory caption in letter box
      if (lettersDB.memories[0]) typeText(lettersDB.memories[0].caption || 'A memory');
    } else if (cat === 'quotes') {
      document.getElementById('quoteBox').textContent = lettersDB.quotes[Math.floor(Math.random() * lettersDB.quotes.length)];
      typeText(document.getElementById('quoteBox').textContent);
    } else if (cat === 'surprises') {
      // fill surprise grid with clickable tiles
      const grid = document.getElementById('surpriseGrid');
      grid.innerHTML = '';
      for (let i = 0; i < 6; i++) {
        const b = document.createElement('button');
        b.className = 'small';
        b.textContent = ['Look','Peek','Open','Gaze','Find','Bloom'][i];
        b.addEventListener('click', () => {
          typeText(lettersDB.surprises[i % lettersDB.surprises.length]);
          spawnHeart(Math.random() * innerWidth, Math.random() * innerHeight);
        });
        grid.appendChild(b);
      }
      typeText('Find a surprise. Click a tile and see what happens.');
    } else if (cat === 'secret') {
      typeText(lettersDB.secret[0]);
      // secret area: animated gif or special canvas
      secretArea.innerHTML = `<img src="https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif" alt="secret" style="max-width:320px;border-radius:10px;">`;
    } else if (cat === 'garden') {
      initGarden();
      typeText('Our little garden — plant flowers by tapping a plot.');
    } else if (cat === 'minigame') {
      initGame();
      typeText('Catch hearts as they appear. Press Start to play.');
    } else if (cat === 'notes') {
      renderNotesList();
      typeText('Leave a note for each other. Your messages are saved here.');
    } else {
      // default for morning / general text arrays
      typeText(lettersDB.morning[0]);
    }
  }

  // ----- garden logic -----
  function initGarden() {
    gardenArea.innerHTML = '';
    // create 8 plots
    for (let i = 0; i < 8; i++) {
      const plot = document.createElement('div'); plot.className = 'garden-plot';
      plot.dataset.index = i;
      plot.innerHTML = '<small class="muted">soil</small>';
      plot.addEventListener('click', () => {
        plantFlower(plot);
      });
      gardenArea.appendChild(plot);
    }
  }
  function plantFlower(plot) {
    const idx = plot.dataset.index;
    plot.innerHTML = '<img src="https://media.giphy.com/media/26tPoyDhjiJ2g7rEs/giphy.gif" alt="flower" style="width:64px;height:64px" />';
    lettersDB.garden[idx] = { planted: true, time: Date.now() };
    spawnHeart(plot.getBoundingClientRect().left + 20, plot.getBoundingClientRect().top + 10);
  }

  // ----- mini game logic -----
  let gameRunning = false, gameScore = 0, gameInterval = null;
  function initGame() {
    gameArea.innerHTML = '';
    scoreEl.textContent = '0';
    gameScore = 0;
    // ensure previous interval stopped
    if (gameInterval) clearInterval(gameInterval);
    // place a playfield
    const field = document.createElement('div'); field.style.position = 'relative'; field.style.height = '200px';
    gameArea.appendChild(field);
    startGameBtn.onclick = () => {
      if (gameRunning) return;
      gameRunning = true; gameScore = 0; scoreEl.textContent = '0';
      gameInterval = setInterval(() => {
        spawnGameHeart(field);
      }, 900);
      setTimeout(() => stopGame(), 30000); // 30s game
    }
  }
  function spawnGameHeart(field) {
    const h = document.createElement('div'); h.className = 'heart-floating';
    const size = 40 + Math.random() * 30; h.style.width = `${size}px`; h.style.height = `${size}px`;
    h.style.left = `${Math.random() * (field.clientWidth - size)}px`;
    h.style.top = `${Math.random() * (field.clientHeight - size)}px`;
    h.style.background = 'radial-gradient(circle at 30% 25%, #ff6d85,#ff2d55)';
    h.style.borderRadius = '50%'; h.style.position = 'absolute';
    h.style.cursor = 'pointer';
    field.appendChild(h);
    h.addEventListener('click', () => {
      gameScore += 1; scoreEl.textContent = gameScore.toString(); field.removeChild(h);
      spawnHeart(field.getBoundingClientRect().left + parseFloat(h.style.left), field.getBoundingClientRect().top + parseFloat(h.style.top));
    });
    // auto remove after 1200ms
    setTimeout(()=>{ if(h.parentElement) h.remove(); }, 1200);
  }
  function stopGame() {
    gameRunning = false; if (gameInterval) clearInterval(gameInterval); alert(`Game over — score: ${gameScore}`);
  }

  // ----- notes (localStorage-backed) -----
  const NOTES_KEY = '5am_notes_v1';
  function loadNotes() {
    const raw = localStorage.getItem(NOTES_KEY);
    try { lettersDB.notes = raw ? JSON.parse(raw) : []; } catch(e) { lettersDB.notes = []; }
  }
  function saveNotes() {
    localStorage.setItem(NOTES_KEY, JSON.stringify(lettersDB.notes));
  }
  function renderNotesList() {
    notesList.innerHTML = '';
    if (!lettersDB.notes.length) { notesList.innerHTML = `<div class="note-item muted">No notes yet. Leave one!</div>`; return; }
    lettersDB.notes.slice().reverse().forEach(n => {
      const el = document.createElement('div'); el.className = 'note-item';
      el.innerHTML = `<strong>${escapeHtml(n.name || 'Someone')}</strong> <small class="muted">• ${new Date(n.t).toLocaleString()}</small><div>${escapeHtml(n.text)}</div>`;
      notesList.appendChild(el);
    });
  }

  saveNoteBtn.addEventListener('click', () => {
    const txt = noteInput.value.trim(); const name = (noteName.value || 'baba').trim();
    if (!txt) return alert('Write a little message first ❤️');
    lettersDB.notes.push({ text: txt, name, t: Date.now() });
    saveNotes(); renderNotesList();
    noteInput.value = ''; noteName.value = '';
    spawnHeart(innerWidth * 0.6, innerHeight * 0.6);
  });

  function escapeHtml(s) { return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  // ----- click interaction anywhere spawns heart and ensures music starts -----
  document.addEventListener('click', (e) => {
    if (!musicStarted && !muted && world.classList.contains('hidden') === false) {
      // start ambient music after first click in world
      try { bgMusic.play().then(()=>fadeAudio(bgMusic, 0, 0.6, 800)); } catch (err) {}
      musicStarted = true;
    }
    spawnHeart(e.clientX, e.clientY);
  }, { passive: true });

  // ----- 5AM Easter egg check -----
  function showSecretMoment(force = false) {
    // show secret area with egg music
    if (muted) return; // don't auto-play if muted
    try {
      eggMusic.currentTime = 0;
      eggMusic.play();
      fadeAudio(eggMusic, 0, 0.75, 900);
      // fade bgMusic lower
      fadeAudio(bgMusic, bgMusic.volume, 0.1, 900);
    } catch (e) {}
    // special visuals
    secretArea.innerHTML = `<img src="https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif" style="max-width:420px;border-radius:12px"/>`;
    spawnHeart(innerWidth / 2, innerHeight / 2);
  }

  // check every 30s for 5AM local time, open secret if it's 5:00 (or if forced)
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 5 && now.getMinutes() === 0) {
      openCategory('secret');
      startExperience();
      showSecretMoment();
    }
  }, 30000);

  // ----- initial boot -----
  function init() {
    // load notes
    loadNotes();
    // render default
    openCategory('morning');
    // populate memories gallery and quotes etc.
    renderCategory('memories'); // this also sets some visuals
    // after loading, immediately switch to the default category properly
    openCategory('morning');
  }
  init();

  // expose openCategory for password flow
  window.openCategory = openCategory;

})();
