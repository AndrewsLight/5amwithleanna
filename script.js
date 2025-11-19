/* ------------------------------------------------------------------
   script.js - main logic for AMwithLeanna
   - Firebase compat (auth + realtime)
   - Howler audio
   - GSAP transitions
   - typewriter (queued)
   - sidebar navigation & panels
   - one-time troll popup after 90s (attitude)
------------------------------------------------------------------ */

/* ---------------- FIREBASE CONFIG ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyAtFL1HSIRy0I4Fh-sqPBENEhJhUmoaTGI",
  authDomain: "amwithleanna.firebaseapp.com",
  databaseURL: "https://amwithleanna-default-rtdb.firebaseio.com",
  projectId: "amwithleanna",
  storageBucket: "amwithleanna.firebasestorage.app",
  messagingSenderId: "334460134718",
  appId: "1:334460134718:web:f552c5077f6d0675e8386f"
};

try { firebase.initializeApp(firebaseConfig); } catch(e){ /* already inited */ }
const db = firebase.database ? firebase.database() : null;
const auth = firebase.auth ? firebase.auth() : null;

/* ---------------- DOM ---------------- */
const entry = document.getElementById('entry');
const passwordInput = document.getElementById('passwordInput');
const passwordBtn = document.getElementById('passwordBtn');
const app = document.getElementById('app');
const bgCanvas = document.getElementById('bgCanvas');
const ctx = bgCanvas.getContext ? bgCanvas.getContext('2d') : null;

const menuBtns = Array.from(document.querySelectorAll('.menu-btn'));
const roomTitle = document.getElementById('roomTitle');
const homeMessageEl = document.getElementById('homeMessage');
const notesPanel = document.getElementById('notesPanel');
const photosPanel = document.getElementById('photosPanel');
const minigamePanel = document.getElementById('minigamePanel');
const playlistPanel = document.getElementById('playlistPanel');
const messagesPanel = document.getElementById('messagesPanel');
const homePanel = document.getElementById('homePanel');

const openNotesBtn = document.getElementById('openNotes');
const openGameBtn = document.getElementById('openGame');

const muteBtn = document.getElementById('muteBtn');
const presenceEl = document.getElementById('presence');

const entryClickAudio = document.getElementById('entryClick');
const bgAudioEl = document.getElementById('bgAudio');
const trollSfx = document.getElementById('trollSfx');

/* ---------------- APP STATE ---------------- */
const PASSWORD = 'i miss you';
let musicStarted = false;
let muted = false;
const MUTE_KEY = '5am_muted_v1';
if (localStorage.getItem(MUTE_KEY) === '1') { muted = true; }

/* ---------------- HOWLER (better crossfade) ---------------- */
const bgSound = new Howl({
  src: ['assets/audio/bg.mp3'],
  loop: true,
  volume: 0.65
});
const clickSound = new Howl({ src: ['assets/audio/click.mp3'], volume: 0.6 });
const trollSound = new Howl({ src: ['assets/audio/troll.mp3'], volume: 0.9 });

if (muted) Howler.mute(true);

/* ---------------- CANVAS: gentle particles ---------------- */
let W = innerWidth, H = innerHeight;
const dpr = Math.max(1, devicePixelRatio || 1);
function resizeCanvas(){
  W = innerWidth; H = innerHeight;
  bgCanvas.width = W * dpr; bgCanvas.height = H * dpr;
  bgCanvas.style.width = W + 'px'; bgCanvas.style.height = H + 'px';
  if (ctx) ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const stars = Array.from({length:110}, ()=>{
  return { x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.4+0.3, a: Math.random()*0.9+0.05, tw: Math.random()*0.02+0.004 };
});
const petals = Array.from({length:36}, ()=>{
  return { x: Math.random()*W, y: Math.random()*H, r: Math.random()*5+3, s: Math.random()*0.5+0.2, rot: Math.random()*Math.PI*2, a: Math.random()*0.6+0.2 };
});
const hearts = [];

function spawnHeart(x,y){
  hearts.push({ x, y, vx:(Math.random()-0.5)*0.6, vy:- (Math.random()*1.2+0.6), r:Math.random()*8+8, life:1 });
  if (!muted) clickSound.play();
}
function draw(){
  if (!ctx) return;
  ctx.clearRect(0,0,W,H);
  const grad = ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,'#0c0710'); grad.addColorStop(1,'#040406');
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

  stars.forEach(s=>{
    s.a += (Math.random()-0.5)*s.tw; s.a = Math.max(0.02, Math.min(1, s.a));
    ctx.beginPath(); ctx.fillStyle = `rgba(255,255,255,${s.a})`; ctx.arc(s.x, s.y, s.r,0,Math.PI*2); ctx.fill();
  });

  petals.forEach(p=>{
    p.y += p.s; if (p.y > H + 20) p.y = -20; p.rot += 0.01;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.beginPath(); ctx.fillStyle = `rgba(255,111,163,${p.a})`; ctx.ellipse(0,0,p.r,p.r/2,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });

  for (let i = hearts.length -1; i >= 0; i--){
    const h = hearts[i];
    h.vy += 0.02; h.x += h.vx; h.y += h.vy; h.life -= 0.01;
    const alpha = Math.max(0, h.life);
    ctx.save(); ctx.translate(h.x,h.y); ctx.rotate(Math.sin(h.x+h.y)*0.2);
    ctx.fillStyle = `rgba(255,111,163,${alpha})`;
    ctx.beginPath(); ctx.moveTo(0,-h.r/2);
    ctx.bezierCurveTo(h.r,-h.r*1.2,h.r*1.4,h.r/2,0,h.r);
    ctx.bezierCurveTo(-h.r*1.4,h.r/2,-h.r,-h.r*1.2,0,-h.r/2);
    ctx.fill(); ctx.restore();
    if (h.life <= 0) hearts.splice(i,1);
  }

  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

/* ---------------- TYPEWRITER (non-scribble) ---------------- */
let typing = false, queued = null;
function typeText(el, text, speed = 28){
  if (typing) { queued = ()=> typeText(el, text, speed); return; }
  typing = true; el.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i=0;i<text.length;i++){
    const span = document.createElement('span'); span.textContent = text[i];
    span.style.opacity = 0; span.style.display='inline-block'; span.style.transform='translateY(6px)';
    frag.appendChild(span);
  }
  el.appendChild(frag);
  const spans = Array.from(el.querySelectorAll('span')); let i = 0;
  function tick(){
    if (i < spans.length){
      spans[i].style.transition = 'opacity .18s ease, transform .18s ease';
      spans[i].style.opacity = '1';
      spans[i].style.transform = 'translateY(0)';
      i++;
      if (!muted && i % 4 === 0) clickSound.play();
      setTimeout(tick, speed);
    } else {
      typing = false;
      if (queued){ const q = queued; queued = null; q(); }
    }
  }
  tick();
}

/* ---------------- PRESENCE & FIREBASE (anonymous) ---------------- */
let clientId = localStorage.getItem('am_client');
if (!clientId) clientId = 'c_' + Math.random().toString(36).slice(2,10);
localStorage.setItem('am_client', clientId);

if (auth && typeof auth.signInAnonymously === 'function') {
  auth.signInAnonymously().then(cred=>{
    clientId = cred.user.uid;
    localStorage.setItem('am_client', clientId);
    setPresence('baba');
  }).catch(err=>{
    console.warn('anon auth fail', err);
    setPresence('baba');
  });
} else {
  setPresence('baba');
}

function setPresence(name='baba'){
  if (!db) return;
  const pr = db.ref('presence/' + clientId);
  pr.set({ online:true, name: name });
  pr.onDisconnect().remove();
  // listen
  db.ref('presence').on('value', snap=>{
    const val = snap.val() || {};
    const others = Object.keys(val).length - (val[clientId] ? 1 : 0);
    presenceEl.textContent = others > 0 ? `${others} online` : 'alone';
  });
}

/* ---------------- NAVIGATION & PANELS ---------------- */
function activateMenu(key){
  menuBtns.forEach(b => b.classList.toggle('active', b.dataset.cat === key));
  roomTitle.textContent = key.charAt(0).toUpperCase() + key.slice(1);
}
function hideAllPanels(){
  [homePanel, notesPanel, photosPanel, minigamePanel, playlistPanel, messagesPanel].forEach(p => p.classList.add('hidden'));
}
function openCategory(key){
  activateMenu(key); hideAllPanels();
  if (key === 'home') { homePanel.classList.remove('hidden'); typeText(homeMessageEl, homeMessageText); }
  if (key === 'notes') { notesPanel.classList.remove('hidden'); loadNotes(); }
  if (key === 'photos') { photosPanel.classList.remove('hidden'); renderPhotos(); }
  if (key === 'minigame') { minigamePanel.classList.remove('hidden'); setupMiniGame(); }
  if (key === 'playlist') { playlistPanel.classList.remove('hidden'); renderPlaylist(); }
  if (key === 'messages') { messagesPanel.classList.remove('hidden'); renderMessages(); }
}

/* attach menu buttons */
menuBtns.forEach(b => b.addEventListener('click', ()=> {
  openCategory(b.dataset.cat);
  spawnHeart(W/2, H/2);
}));

/* quick open buttons */
openNotesBtn.addEventListener('click', ()=> {
  openCategory('notes');
  spawnHeart(W*0.6, H*0.5);
});
openGameBtn.addEventListener('click', ()=> {
  openCategory('minigame');
  spawnHeart(W*0.4, H*0.5);
});

/* ---------------- HOME MESSAGE (your voice) ---------------- */
const homeMessageText = `hi baba,
I made this place for you.
Whenever you miss me or feel lonely, you can come here and chill with me.
It's still a work in progress, but... it's ours.
Click around, see what I added for you.`;
homeMessageEl && typeText(homeMessageEl, homeMessageText);

/* ---------------- NOTES (simple realtime) ---------------- */
function loadNotes(){
  notesPanel.innerHTML = `<div class="muted">Loading notes...</div>`;
  if (!db) { notesPanel.innerHTML = `<div class="muted">No database. Notes work locally.</div>`; return; }
  notesPanel.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <textarea id="noteText" placeholder="Write a note for baba..." style="min-height:80px;padding:10px;border-radius:8px;background:rgba(255,255,255,0.02);color:var(--soft-white);border:none"></textarea>
      <div style="display:flex;gap:8px"><input id="noteName" placeholder="your name (baba)" style="padding:8px;border-radius:8px;border:none;background:rgba(255,255,255,0.02)"><button id="saveNote" class="btn primary">Save</button></div>
      <div id="notesList" style="margin-top:10px;display:flex;flex-direction:column;gap:8px;max-height:180px;overflow:auto"></div>
    </div>`;
  // load existing
  db.ref('notes').on('child_added', snap=>{
    const val = snap.val();
    addNoteItem(val);
  });
  document.getElementById('saveNote').onclick = ()=>{
    const t = document.getElementById('noteText').value.trim();
    const n = document.getElementById('noteName').value.trim() || 'baba';
    if (!t) return alert('Write something first ❤️');
    const r = db.ref('notes').push();
    r.set({ text: t, name: n, t: Date.now(), by: clientId });
    document.getElementById('noteText').value = '';
  };
}
function addNoteItem(n){
  const list = document.getElementById('notesList');
  if (!list) return;
  const el = document.createElement('div'); el.className = 'note-item';
  el.style.background = 'rgba(255,255,255,0.02)'; el.style.padding='10px'; el.style.borderRadius='8px';
  el.innerHTML = `<strong>${escapeHtml(n.name||'baba')}</strong> <small class="muted">• ${new Date(n.t).toLocaleString()}</small><div style="margin-top:6px">${escapeHtml(n.text)}</div>`;
  list.prepend(el);
}

/* ---------------- PHOTOS (simple gallery) ---------------- */
function renderPhotos(){
  photosPanel.innerHTML = `<div class="muted">Photos</div><div id="gallery" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>`;
  const gallery = document.getElementById('gallery');
  const demo = ['assets/images/demo.jpg','assets/gifs/demo1.gif','assets/gifs/demo2.gif'];
  demo.forEach(src=>{
    const img = document.createElement('img'); img.src = src; img.style.width='140px'; img.style.height='90px'; img.style.objectFit='cover'; img.style.borderRadius='8px';
    img.onclick = ()=> { openLightbox(src); };
    gallery.appendChild(img);
  });
}
function openLightbox(src){
  const overlay = document.createElement('div'); overlay.style.position='fixed'; overlay.style.left=0;overlay.style.top=0;overlay.style.width='100%';overlay.style.height='100%';overlay.style.background='rgba(0,0,0,0.85)';overlay.style.display='flex';overlay.style.alignItems='center';overlay.style.justifyContent='center';overlay.style.zIndex=9999;
  const img = document.createElement('img'); img.src = src; img.style.maxWidth='90%'; img.style.maxHeight='90%'; img.style.borderRadius='12px';
  overlay.appendChild(img);
  overlay.onclick = ()=> overlay.remove();
  document.body.appendChild(overlay);
}

/* ---------------- PLAYLIST (simple) ---------------- */
function renderPlaylist(){
  playlistPanel.innerHTML = `<div class="muted">Playlist</div><div style="margin-top:10px;display:flex;flex-direction:column;gap:8px"><button class="btn" onclick="playTrack('assets/audio/bg.mp3')">Play ambient</button></div>`;
}
window.playTrack = function(src){ try { bgSound.stop(); bgSound.unload && bgSound.unload(); bgSound._src = [src]; bgSound.play(); } catch(e){ console.warn('play error', e); } }

/* ---------------- MESSAGES (placeholder) ---------------- */
function renderMessages(){
  messagesPanel.innerHTML = `<div class="muted">Messages</div><div style="margin-top:10px">Send a message later — coming soon.</div>`;
}

/* ---------------- MINI GAME (local + realtime) ---------------- */
let gameInited = false;
function setupMiniGame(){
  if (gameInited) return;
  gameInited = true;
  minigamePanel.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px">
    <div class="muted">Mini-Game: Click Hearts</div>
    <div id="gameField" style="height:220px;border-radius:8px;background:rgba(255,255,255,0.02);position:relative;overflow:hidden"></div>
    <div style="display:flex;gap:8px;margin-top:8px"><button id="hostBtn" class="btn">Host</button><button id="joinBtn" class="btn">Join</button></div>
    </div>`;
  const field = document.getElementById('gameField');
  document.getElementById('hostBtn').onclick = ()=>{
    // host: push hearts into DB every 900ms for 30s
    if (!db) return localHostGame(field);
    db.ref('game/meta').set({ host: clientId, started: true, t: Date.now() });
    const idInterval = setInterval(()=> {
      const id = db.ref('game/hearts').push().key;
      const x = Math.random()*(field.clientWidth-60)+20;
      const y = Math.random()*(field.clientHeight-60)+20;
      db.ref(`game/hearts/${id}`).set({x,y,t:Date.now()});
      setTimeout(()=> db.ref(`game/hearts/${id}`).remove(), 1600);
    },900);
    setTimeout(()=> clearInterval(idInterval),30000);
  };
  document.getElementById('joinBtn').onclick = ()=> {
    if (!db) return alert('Realtime not available.');
    db.ref(`game/score/${clientId}`).set(0);
    // spawn hearts from db
    db.ref('game/hearts').on('child_added', snap=>{
      const data = snap.val(); spawnGameHeart(field, snap.key, data);
    });
    db.ref('game/score').on('value', s=>{
      const v = s.val() || {}; const total = Object.values(v).reduce((a,b)=>a+(b||0),0);
      // show score in footer maybe
    });
  };
}

function localHostGame(field){
  let score = 0;
  const interval = setInterval(()=>{
    const h = document.createElement('div'); h.style.position='absolute'; h.style.width='48px'; h.style.height='48px'; h.style.left = Math.random()*(field.clientWidth-48)+'px'; h.style.top = Math.random()*(field.clientHeight-48)+'px';
    h.style.background = 'radial-gradient(circle at 30% 25%, #ff7aa3,#ff3d73)'; h.style.borderRadius='50%'; field.appendChild(h);
    h.onclick = ()=> { score++; h.remove(); spawnHeart(W/2,H/2); };
    setTimeout(()=> h.remove(),1200);
  },900);
  setTimeout(()=> clearInterval(interval),30000);
}

function spawnGameHeart(field, id, data){
  const el = document.createElement('div'); el.style.position='absolute'; el.style.width='48px'; el.style.height='48px'; el.style.left = data.x + 'px'; el.style.top = data.y + 'px';
  el.style.background = 'radial-gradient(circle at 30% 25%, #ff7aa3,#ff3d73)'; el.style.borderRadius='50%';
  el.onclick = ()=> {
    db.ref(`game/score/${clientId}`).transaction(c=> (c||0)+1);
    el.remove();
  };
  // append to first gameField found
  const field = document.querySelector('#gameField');
  if (field) field.appendChild(el);
  setTimeout(()=> el.remove(),1700);
}

/* ---------------- TROLL (one-time after 90s) ---------------- */
let trollShown = false;
function scheduleTroll(){
  // show once after 90 seconds of being in app
  setTimeout(()=>{
    if (trollShown) return;
    trollShown = true;
    showTrollPopup();
  }, 90000);
}

function showTrollPopup(){
  // gentle popup using GSAP
  const popup = document.createElement('div');
  popup.style.position='fixed'; popup.style.left='50%'; popup.style.top='50%'; popup.style.transform='translate(-50%,-50%) scale(0.96)';
  popup.style.background='linear-gradient(180deg,rgba(0,0,0,0.9),rgba(0,0,0,0.95))'; popup.style.padding='18px'; popup.style.borderRadius='12px';
  popup.style.zIndex = 9999; popup.style.textAlign='center'; popup.style.boxShadow='0 12px 40px rgba(0,0,0,0.6)';
  popup.innerHTML = `<div style="font-size:1rem;color:var(--soft-white)">baby.. you miss me that much?</div><div style="margin-top:12px"><button id="okT" class="btn primary">ok</button></div>`;
  document.body.appendChild(popup);
  gsap.fromTo(popup, {scale:0.8, opacity:0}, {scale:1, opacity:1, duration:0.5, ease:'back.out(1.2)'});
  // sound
  if (!muted) trollSound.play();
  document.getElementById('okT').onclick = ()=>{
    gsap.to(popup, {opacity:0, scale:0.9, duration:0.3, onComplete: ()=> popup.remove()});
  };
}

/* ---------------- PASSWORD & ENTRY ---------------- */
passwordBtn.addEventListener('click', (e)=>{
  e.stopPropagation();
  if ((passwordInput.value||'').trim().toLowerCase() === PASSWORD) {
    // play click
    try { entryClickAudio.currentTime = 0; entryClickAudio.play(); } catch(e){}
    // open app
    gsap.to(entry, {opacity:0, duration:0.6, onComplete: ()=>{
      entry.classList.add('hidden'); app.classList.remove('hidden');
      gsap.fromTo(app, {opacity:0}, {opacity:1, duration:0.6});
      // start audio when they enter
      if (!musicStarted && !muted) { bgSound.play(); musicStarted = true; }
      // initial UI load
      openCategory('home');
      scheduleTroll();
    }});
  } else {
    // little shake
    gsap.fromTo(passwordInput, {x:-6}, {x:6, duration:0.08, repeat:3, yoyo:true, onComplete:()=> gsap.set(passwordInput,{x:0})});
  }
});
passwordInput.addEventListener('keydown', e=> { if (e.key === 'Enter') passwordBtn.click(); });

/* ---------------- MUTE TOGGLE ---------------- */
muteBtn.addEventListener('click', ()=>{
  muted = !muted; Howler.mute(muted);
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  muteBtn.textContent = muted ? '🔇' : '🔊';
});
muteBtn.textContent = muted ? '🔇' : '🔊';

/* ---------------- UTIL ---------------- */
function escapeHtml(s){ if (!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

/* ---------------- INIT ---------------- */
openCategory('home');
scheduleTroll();
