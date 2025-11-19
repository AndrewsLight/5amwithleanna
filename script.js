/* Final Phase (client-side) - All features local first
   - Password gate (correct = "i miss you")
   - Sidebar + pages: home, letters, notes, wheel, game, sleep, photos
   - Love letters with smooth typewriter + next/prev
   - Notes saved to localStorage
   - Spin wheel (visual rotate) random movie selection + add movies modal
   - Mini-game (catch hearts)
   - Schedule nightly goodnight popup (user-set)
   - Troll popup after 90s (one-time)
   - Background canvas (stars & petals) that doesn't block clicks
*/

/* ---------- CONFIG ---------- */
const CORRECT_PW = "i miss you";
const TROLL_DELAY_MS = 90_000; // 90s
const WHEEL_SEGMENTS = [
  "Romantic Comedy", "Drama", "Animation", "Horror (light)", "Action", "Surprise"
];
const DEFAULT_MOVIES = ["About Time","Midnight in Paris","The Time Traveler's Wife","Big","Groundhog Day","Eternal Sunshine"];

/* ---------- DOM ---------- */
const entry = document.getElementById('entry');
const pwInput = document.getElementById('pw');
const enterBtn = document.getElementById('enterBtn');
const demoBtn = document.getElementById('demoBtn');
const pwMsg = document.getElementById('pwMsg');

const app = document.getElementById('app');
const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
const pages = Array.from(document.querySelectorAll('.page'));

const homeBtn = document.querySelector("[data-page='home']");
const openLettersBtn = document.getElementById('openLetters');
const openNotesBtn = document.getElementById('openNotes');

const letterBox = document.getElementById('letterBox');
const prevLetterBtn = document.getElementById('prevLetter');
const nextLetterBtn = document.getElementById('nextLetter');

const noteText = document.getElementById('noteText');
const noteName = document.getElementById('noteName');
const saveNoteBtn = document.getElementById('saveNote');
const notesList = document.getElementById('notesList');

const spinBtn = document.getElementById('spinBtn');
const wheelEl = document.getElementById('wheelCanvas');
const movieResult = document.getElementById('movieResult');

const startGameBtn = document.getElementById('startGame');
const gameArea = document.getElementById('gameArea');
const gameScoreEl = document.getElementById('gameScore');

const setSleepBtn = document.getElementById('setSleepBtn');
const sleepTimeInput = document.getElementById('sleepTime');
const goodnightMsgInput = document.getElementById('goodnightMsg');

const popup = document.getElementById('popup');

const musicBtn = document.getElementById('musicBtn');

/* ---------- AUDIO (play only after user interaction) ---------- */
let audioAllowed = false;
let bgAudio = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_1f6c3b3a7b.mp3?filename=romantic-dreams-117397.mp3');
bgAudio.loop = true;
bgAudio.volume = 0.55;

/* one-time allow audio after any click */
function allowAudio() {
  if (audioAllowed) return;
  audioAllowed = true;
  try { bgAudio.play().catch(()=>{}); } catch(e){}
}
document.addEventListener('click', allowAudio, { once: true });

musicBtn.addEventListener('click', () => {
  if (!audioAllowed) allowAudio();
  if (bgAudio.paused) { bgAudio.play().catch(()=>{}); musicBtn.textContent = '🔊'; } else { bgAudio.pause(); musicBtn.textContent = '🔇'; }
});

/* ---------- BACKGROUND CANVAS (non-blocking) ---------- */
const bgCanvas = document.getElementById('bg');
const ctx = bgCanvas.getContext && bgCanvas.getContext('2d');
let W = innerWidth, H = innerHeight, dpr = Math.max(1, devicePixelRatio || 1);
function resizeCanvas() {
  W = innerWidth; H = innerHeight;
  if (!ctx) return;
  bgCanvas.width = W*dpr; bgCanvas.height = H*dpr;
  bgCanvas.style.width = W+'px'; bgCanvas.style.height = H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const stars = Array.from({length:110}, ()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.4+0.2,a:Math.random()*0.9+0.05}));
const petals = Array.from({length:36}, ()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*5+3,s:Math.random()*0.4+0.2,rot:Math.random()*Math.PI*2,a:Math.random()*0.6+0.2}));
const heartsRender = [];
function spawnVisualHeart(x,y){heartsRender.push({x,y,vx:(Math.random()-0.5)*0.6,vy:-(Math.random()*1.2+0.6),r:Math.random()*8+8,life:1});}
function drawBg(){
  if (!ctx) return;
  ctx.clearRect(0,0,W,H);
  const g = ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#120012'); g.addColorStop(1,'#040004');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

  stars.forEach(s=>{
    s.a += (Math.random()-0.5)*0.02; s.a = Math.max(0.02,Math.min(1,s.a));
    ctx.beginPath(); ctx.fillStyle = `rgba(255,255,255,${s.a})`; ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
  });
  petals.forEach(p=>{
    p.y += p.s; if (p.y>H+20) p.y=-20; p.rot+=0.01;
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
    ctx.beginPath(); ctx.fillStyle = `rgba(255,111,163,${p.a})`; ctx.ellipse(0,0,p.r,p.r/2,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  });

  for (let i=heartsRender.length-1;i>=0;i--){
    const h=heartsRender[i]; h.vy+=0.02; h.x+=h.vx; h.y+=h.vy; h.life-=0.01;
    ctx.save(); ctx.translate(h.x,h.y); ctx.rotate(Math.sin(h.x+h.y)*0.2);
    ctx.fillStyle = `rgba(255,111,163,${Math.max(0,h.life)})`;
    ctx.beginPath(); ctx.moveTo(0,-h.r/2); ctx.bezierCurveTo(h.r,-h.r*1.2,h.r*1.4,h.r/2,0,h.r); ctx.bezierCurveTo(-h.r*1.4,h.r/2,-h.r,-h.r*1.2,0,-h.r/2); ctx.fill();
    ctx.restore();
    if (h.life<=0) heartsRender.splice(i,1);
  }

  requestAnimationFrame(drawBg);
}
requestAnimationFrame(drawBg);

/* ---------- ENTRY / PASSWORD ---------- */
enterBtn.addEventListener('click', tryPassword);
demoBtn.addEventListener('click', openDemo);

pwInput.addEventListener('keydown', (e)=>{ if (e.key==='Enter') tryPassword(); });

function tryPassword(){
  const v = (pwInput.value||'').trim().toLowerCase();
  if (v === CORRECT_PW){
    openApp();
  } else {
    showTemporaryMessage(pwMsg, "you entered it wrong dummy baba 😭", 2500);
    shakeElement(pwInput);
  }
}
function openDemo(){ pwInput.value = CORRECT_PW; tryPassword(); }

/* ---------- SHOW APP ---------- */
function openApp(){
  entry.classList.add('hidden');
  app.classList.remove('hidden');
  spawnVisualHeart(window.innerWidth/2, window.innerHeight/2);
  allowAudio(); // start music allowed after entry
  scheduleTroll(); // schedule troll once
}

/* ---------- NAVIGATION ---------- */
navBtns.forEach(btn=>{
  btn.addEventListener('click', ()=> {
    navBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const page = btn.dataset.page;
    pages.forEach(p=>p.classList.add('hidden'));
    document.getElementById(page).classList.remove('hidden');
    // small visual
    spawnVisualHeart(window.innerWidth/2, window.innerHeight/2);
  });
});
openLettersBtn && openLettersBtn.addEventListener('click', ()=> {
  document.querySelector("[data-page='letters']").click();
});

/* ---------- LOVE LETTERS ---------- */
const letters = [
  "hi baba,\nI made this place for you.\nWhenever you miss me, come back here.\n— always, me",
  "baba,\nYou are my favorite feeling.\nI think about you in the quiet.\n— km",
  "We may be apart but we're close in here.\nSmall things: a silly gif, a quick note, a song.\nCome here when you're lonely."
];
let letterIndex = 0;
const letterBoxEl = document.getElementById('letterBox');

function typeWriter(text, el, speed=28){
  // queue-safe simple typewriter
  el.innerHTML = '';
  let i=0;
  const frag = document.createDocumentFragment();
  for (let c of text){ const span = document.createElement('span'); span.textContent = c; span.style.opacity=0; span.style.display='inline-block'; span.style.transform='translateY(6px)'; frag.appendChild(span); }
  el.appendChild(frag);
  const spans = Array.from(el.querySelectorAll('span'));
  function step(){ if (i<spans.length){ spans[i].style.transition='opacity .15s, transform .15s'; spans[i].style.opacity=1; spans[i].style.transform='translateY(0)'; i++; setTimeout(step, speed);} }
  step();
}

function showLetter(i){
  letterIndex = (i+letters.length)%letters.length;
  typeWriter(letters[letterIndex], letterBoxEl);
}
document.getElementById('nextLetter')?.addEventListener('click', ()=> showLetter(letterIndex+1));
document.getElementById('prevLetter')?.addEventListener('click', ()=> showLetter(letterIndex-1));
showLetter(0);

/* ---------- NOTES (local only) ---------- */
function loadNotes(){
  notesList.innerHTML = '';
  const notes = JSON.parse(localStorage.getItem('am_notes') || '[]');
  notes.slice().reverse().forEach(n=>{
    const div = document.createElement('div'); div.className='note-item';
    div.innerHTML = `<strong>${escapeHtml(n.name)}</strong> <small class="muted"> • ${new Date(n.t).toLocaleString()}</small><div>${escapeHtml(n.text)}</div>`;
    notesList.appendChild(div);
  });
}
saveNoteBtn && saveNoteBtn.addEventListener('click', ()=>{
  const text = (noteText.value||'').trim();
  if (!text) return showTemporaryMessage(notesList, "write something first ❤️", 2000);
  const name = (noteName.value||'baba').trim()||'baba';
  const notes = JSON.parse(localStorage.getItem('am_notes') || '[]');
  notes.push({text,name,t:Date.now()});
  localStorage.setItem('am_notes', JSON.stringify(notes));
  noteText.value=''; noteName.value='';
  loadNotes();
});
loadNotes();

/* ---------- SPIN WHEEL (simple rotation) ---------- */
let movies = JSON.parse(localStorage.getItem('am_movies') || 'null') || DEFAULT_MOVIES.slice();
localStorage.setItem('am_movies', JSON.stringify(movies));

function animateWheelAndPick(){
  spinBtn.disabled = true;
  const deg = 360 * 6 + Math.floor(Math.random()*360); // 6 full spins + random
  wheelEl.style.transition = 'transform 4s cubic-bezier(.22,.9,.2,1)';
  wheelEl.style.transform = `rotate(${deg}deg)`;
  setTimeout(()=>{
    // pick index by angle
    const final = deg % 360;
    const segment = Math.floor(final / (360 / movies.length));
    const chosen = movies[(movies.length - 1 - segment + movies.length) % movies.length] || movies[0];
    movieResult.textContent = `Tonight: ${chosen}`;
    spinBtn.disabled = false;
  }, 4200);
}

// fill wheel with number of segments equal to movies length using inline style (simple visual)
function refreshWheelVisual(){
  const segCount = movies.length;
  const colors = ['#ffb0cf','#ffdfe9','#ffcfe0','#ffeef6','#ffd0ea','#ffdfe9'];
  const stops = [];
  for (let i=0;i<segCount;i++){
    const a = (i/segCount)*360;
    const b = ((i+1)/segCount)*360;
    stops.push(`${colors[i%colors.length]} ${a}deg ${b}deg`);
  }
  wheelEl.style.background = `conic-gradient(${stops.join(',')})`;
}
refreshWheelVisual();

spinBtn && spinBtn.addEventListener('click', ()=>{
  // if no movies, fallback
  if (movies.length===0) return showTemporaryMessage(movieResult, "add some movies first", 1800);
  animateWheelAndPick();
});
document.getElementById('addMovieBtn')?.addEventListener('click', ()=>{
  const add = prompt("Add a movie title (or cancel):");
  if (add) { movies.push(add); localStorage.setItem('am_movies', JSON.stringify(movies)); refreshWheelVisual(); showTemporaryMessage(movieResult, `${add} added`, 1800); }
});

/* ---------- MINI GAME (catch hearts) ---------- */
let gameRunning=false, gameScore=0, gameInterval=null;
startGameBtn && startGameBtn.addEventListener('click', ()=>{
  if (gameRunning) return;
  gameRunning = true; gameScore = 0; gameScoreEl.textContent = '0';
  const duration = 15_000; // 15s
  const spawnRate = 700;
  gameInterval = setInterval(()=> spawnGameHeart(), spawnRate);
  setTimeout(()=> { clearInterval(gameInterval); gameRunning=false; }, duration);
});
function spawnGameHeart(){
  const h = document.createElement('div'); h.className='heart'; h.textContent='💗';
  const w = gameArea.clientWidth, hH = gameArea.clientHeight;
  const size = 36;
  h.style.left = Math.random()*(w-size)+'px';
  h.style.top = Math.random()*(hH-size)+'px';
  gameArea.appendChild(h);
  const remove = ()=> { try{ h.remove(); }catch(e){} };
  h.addEventListener('click', ()=>{ gameScore++; gameScoreEl.textContent = gameScore; spawnVisualHeart(window.innerWidth/2, window.innerHeight/2); remove(); });
  setTimeout(remove, 900);
}

/* ---------- SLEEP & GOODNIGHT ---------- */
let sleepTimerId = null;
setSleepBtn && setSleepBtn.addEventListener('click', ()=>{
  const time = sleepTimeInput.value;
  const msg = (goodnightMsgInput.value||'').trim() || 'goodnight baba, i love you';
  if (!time) return showTemporaryMessage(popup, 'choose a time first', 1800);
  scheduleGoodnight(time, msg);
  showTemporaryMessage(popup, `Goodnight set for ${time}`, 1800);
});

function scheduleGoodnight(timeStr, message){
  // timeStr "HH:MM" local
  if (!timeStr) return;
  // clear existing
  if (sleepTimerId) { clearTimeout(sleepTimerId); sleepTimerId = null; }
  const [hh,mm] = timeStr.split(':').map(s=>parseInt(s,10));
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
  if (target <= now) target.setDate(target.getDate()+1);
  const delta = target - now;
  sleepTimerId = setTimeout(()=> {
    showGoodnightPopup(message);
    // reschedule the next day automatically
    scheduleGoodnight(timeStr, message);
  }, delta);
}

function showGoodnightPopup(message){
  const p = document.createElement('div'); p.className='popup';
  p.innerHTML = `<div style="font-size:1rem">${escapeHtml(message)}</div><div style="margin-top:12px;text-align:center"><button id="closeGood" class="btn primary">ok</button></div>`;
  document.body.appendChild(p);
  document.getElementById('closeGood').addEventListener('click', ()=> p.remove());
}

/* ---------- TROLL popup (one time) ---------- */
let trollShown=false;
function scheduleTroll(){
  setTimeout(()=>{
    if (trollShown) return;
    trollShown=true;
    const p = document.createElement('div'); p.className='popup';
    p.innerHTML = `<div style="font-weight:700">you’re still here?</div><div class="muted" style="margin-top:8px">baby… you miss me that much?</div><div style="margin-top:12px;text-align:center"><button id="okT" class="btn ghost">ok</button></div>`;
    document.body.appendChild(p);
    document.getElementById('okT').addEventListener('click', ()=> p.remove());
  }, TROLL_DELAY_MS);
}

/* ---------- HELPERS ---------- */
function escapeHtml(s){ if (!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function showTemporaryMessage(el, text, ms=2000){
  if (!el) return; const prev = el.textContent; el.textContent = text; setTimeout(()=>{ el.textContent = prev; }, ms);
}
function shakeElement(el){
  el.animate([{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:350,iterations:1});
}

/* ---------- INITIALIZE ---------- */
// ensure basic nav state
document.querySelector("[data-page='home']").click();
refreshWheelVisual();
scheduleTroll();
