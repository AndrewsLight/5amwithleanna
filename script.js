// script.js — Updated robust version with animations, sounds, wheel labels, photo uploads, sidebar toggle
(() => {
  'use strict';

  // ------- Config -------
  const CORRECT_PW = 'i miss you';
  const TROLL_DELAY_MS = 90_000;
  const DEFAULT_MOVIES = ["About Time","Midnight in Paris","The Time Traveler's Wife","Big","Groundhog Day","Eternal Sunshine"];

  // ------- Utility helpers -------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const safe = fn => { try { fn(); } catch (e) { console.error(e); } };
  function escapeHtml(s){ return (s||'').toString().replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
  function showTemp(el, text, ms=1800){ if (!el) return; const prev = el.textContent; el.textContent = text; setTimeout(()=> el.textContent = prev, ms); }
  function shake(el){ if (!el) return; el.animate([{ transform:'translateX(-6px)' },{ transform:'translateX(6px)' },{ transform:'translateX(0)' }], { duration:350 }); }

  // ------- DOM ready -------
  document.addEventListener('DOMContentLoaded', () => {
    // Get elements safely
    const entry = $('#entry');
    const app = $('#app');
    const pwInput = $('#pw');
    const enterBtn = $('#enterBtn');
    const demoBtn = $('#demoBtn');
    const pwMsg = $('#pwMsg');

    const navBtns = $$('.nav-btn');
    const pages = $$('.page');

    const openLettersBtn = $('#openLetters');
    const openNotesBtn = $('#openNotes');

    const letterBoxEl = $('#letterBox');
    const prevLetterBtn = $('#prevLetter');
    const nextLetterBtn = $('#nextLetter');

    const noteText = $('#noteText');
    const noteName = $('#noteName');
    const saveNoteBtn = $('#saveNote');
    const notesList = $('#notesList');

    const spinBtn = $('#spinBtn');
    const addMovieBtn = $('#addMovieBtn');
    const wheelEl = $('#wheelCanvas');
    const movieResult = $('#movieResult');

    const startGameBtn = $('#startGame');
    const gameArea = $('#gameArea');
    const gameScoreEl = $('#gameScore');

    const setSleepBtn = $('#setSleepBtn');
    const sleepTimeInput = $('#sleepTime');
    const goodnightMsgInput = $('#goodnightMsg');

    const popup = $('#popup');
    const musicBtn = $('#musicBtn');

    const sidebar = $('.sidebar');
    const logo = $('.logo');

    // Defensive checks
    if (!entry || !app) {
      console.error('Missing core DOM elements (entry/app). Check index.html');
      return;
    }

    // ------- Audio setup (robust) -------
    let audioAllowed = false;
    let bgAudio = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_1f6c3b3a7b.mp3?filename=romantic-dreams-117397.mp3');
    bgAudio.loop = true;
    bgAudio.volume = 0.55;

    // small SFX
    let clickSfx = new Audio('https://freesound.org/data/previews/66/66717_931655-lq.mp3'); // click
    clickSfx.volume = 0.6;

    function allowAudioOnce() {
      if (audioAllowed) return;
      audioAllowed = true;
      // try play (may be blocked until user gesture; this fn is called on a user click)
      bgAudio.play().catch(()=>{ /* ignore */ });
    }
    document.addEventListener('click', allowAudioOnce, { once: true });

    if (musicBtn) {
      musicBtn.addEventListener('click', () => {
        if (!audioAllowed) allowAudioOnce();
        if (bgAudio.paused) { bgAudio.play().catch(()=>{}); musicBtn.textContent = '🔊'; }
        else { bgAudio.pause(); musicBtn.textContent = '🔇'; }
        // click sound
        try { clickSfx.currentTime = 0; clickSfx.play().catch(()=>{}); } catch(e){}
      });
    }

    // helper to play click
    function playClick() { try { clickSfx.currentTime = 0; clickSfx.play().catch(()=>{}); } catch(e){} }

    // ------- Background canvas (already in your code, keep it) -------
    const bgCanvas = $('#bg');
    const ctx = bgCanvas && bgCanvas.getContext ? bgCanvas.getContext('2d') : null;
    let W = innerWidth, H = innerHeight, dpr = Math.max(1, devicePixelRatio || 1);
    function resizeCanvas() {
      W = innerWidth; H = innerHeight;
      if (!ctx) return;
      bgCanvas.width = W*dpr; bgCanvas.height = H*dpr;
      bgCanvas.style.width = W + 'px'; bgCanvas.style.height = H + 'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const stars = Array.from({length:110}, ()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.4+0.2,a:Math.random()*0.9+0.05}));
    const petals = Array.from({length:36}, ()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*5+3,s:Math.random()*0.4+0.2,rot:Math.random()*Math.PI*2,a:Math.random()*0.6+0.2}));
    const heartsRender = [];
    function spawnVisualHeart(x,y){ heartsRender.push({x,y,vx:(Math.random()-0.5)*0.6,vy:-(Math.random()*1.2+0.6),r:Math.random()*8+8,life:1}); playClick(); }
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
        p.y += p.s; if (p.y>H+20) p.y=-20; p.rot += 0.01;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.fillStyle = `rgba(255,111,163,${p.a})`; ctx.ellipse(0,0,p.r,p.r/2,0,0,Math.PI*2); ctx.fill(); ctx.restore();
      });

      for (let i=heartsRender.length-1;i>=0;i--){
        const h=heartsRender[i]; h.vy += 0.02; h.x += h.vx; h.y += h.vy; h.life -= 0.01;
        ctx.save(); ctx.translate(h.x,h.y); ctx.rotate(Math.sin(h.x+h.y)*0.2);
        ctx.fillStyle = `rgba(255,111,163,${Math.max(0,h.life)})`;
        ctx.beginPath(); ctx.moveTo(0,-h.r/2); ctx.bezierCurveTo(h.r,-h.r*1.2,h.r*1.4,h.r/2,0,h.r); ctx.bezierCurveTo(-h.r*1.4,h.r/2,-h.r,-h.r*1.2,0,-h.r/2); ctx.fill();
        ctx.restore();
        if (h.life <= 0) heartsRender.splice(i,1);
      }

      requestAnimationFrame(drawBg);
    }
    requestAnimationFrame(drawBg);

    // ------- Entry / password -------
    function openApp() {
      entry.classList.add('hidden');
      app.classList.remove('hidden');
      spawnVisualHeart(window.innerWidth/2, window.innerHeight/2);
      allowAudioOnce();
      scheduleTroll();
    }

    function tryPassword() {
      const v = (pwInput.value||'').trim().toLowerCase();
      if (v === CORRECT_PW) {
        playClick();
        openApp();
      } else {
        showTemp(pwMsg, 'you entered it wrong dummy baba 😭', 2200);
        shake(pwInput);
        playClick();
      }
    }

    if (enterBtn) enterBtn.addEventListener('click', tryPassword);
    if (demoBtn) demoBtn.addEventListener('click', () => { pwInput.value = CORRECT_PW; tryPassword(); });
    if (pwInput) pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryPassword(); });

    // ------- Nav -------
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const page = btn.dataset.page;
        pages.forEach(p => p.classList.add('hidden'));
        const target = document.getElementById(page);
        if (target) {
          target.classList.remove('hidden');
          spawnVisualHeart(window.innerWidth/2, window.innerHeight/2);
        }
      });
    });

    // quick openers
    if (openLettersBtn) openLettersBtn.addEventListener('click', () => { document.querySelector("[data-page='letters']").click(); });
    if (openNotesBtn) openNotesBtn.addEventListener('click', () => { document.querySelector("[data-page='notes']").click(); });

    // ------- Letters (typewriter) -------
    const letters = [
      "hi baba,\nI made this place for you.\nWhenever you miss me, come back here.\n— always, me",
      "baba,\nYou are my favourite feeling.\nI think about you in the quiet.\n— km",
      "We may be apart but we're close in here.\nSmall things: a silly gif, a quick note, a song.\nCome here when you're lonely."
    ];
    let letterIndex = 0;

    function typeWriter(text, el, speed = 22) {
      if (!el) return;
      el.innerHTML = '';
      let i = 0;
      const frag = document.createDocumentFragment();
      for (let c of text) {
        const span = document.createElement('span');
        span.textContent = c;
        span.style.opacity = 0;
        span.style.display = 'inline-block';
        span.style.transform = 'translateY(6px)';
        frag.appendChild(span);
      }
      el.appendChild(frag);
      const spans = Array.from(el.querySelectorAll('span'));
      (function step(){
        if (i < spans.length) {
          spans[i].style.transition = 'opacity .12s, transform .12s';
          spans[i].style.opacity = 1;
          spans[i].style.transform = 'translateY(0)';
          if (i % 4 === 0) playClick();
          i++;
          setTimeout(step, speed);
        }
      }());
    }

    function showLetter(i) {
      letterIndex = (i + letters.length) % letters.length;
      typeWriter(letters[letterIndex], letterBoxEl);
    }

    if (nextLetterBtn) nextLetterBtn.addEventListener('click', () => showLetter(letterIndex + 1));
    if (prevLetterBtn) prevLetterBtn.addEventListener('click', () => showLetter(letterIndex - 1));
    showLetter(0);

    // ------- Notes (localStorage) -------
    function loadNotes(){
      if (!notesList) return;
      notesList.innerHTML = '';
      const notes = JSON.parse(localStorage.getItem('am_notes') || '[]');
      notes.slice().reverse().forEach(n => {
        const div = document.createElement('div'); div.className = 'note-item';
        div.innerHTML = `<strong>${escapeHtml(n.name)}</strong> <small class="muted"> • ${new Date(n.t).toLocaleString()}</small><div>${escapeHtml(n.text)}</div>`;
        notesList.appendChild(div);
      });
    }
    if (saveNoteBtn) saveNoteBtn.addEventListener('click', () => {
      const text = (noteText.value||'').trim();
      if (!text) { showTemp(notesList, 'write something first ❤️'); return; }
      const name = (noteName.value||'baba').trim() || 'baba';
      const notes = JSON.parse(localStorage.getItem('am_notes') || '[]');
      notes.push({ text, name, t: Date.now() });
      localStorage.setItem('am_notes', JSON.stringify(notes));
      noteText.value = ''; noteName.value = '';
      loadNotes();
      playClick();
    });
    loadNotes();

    // ------- Wheel (labels on wheel, rotation logic) -------
    let movies = JSON.parse(localStorage.getItem('am_movies') || 'null') || DEFAULT_MOVIES.slice();
    localStorage.setItem('am_movies', JSON.stringify(movies));

    function refreshWheelVisual() {
      if (!wheelEl) return;
      const segCount = Math.max(1, movies.length);
      const colors = ['#ffb0cf','#ffdfe9','#ffcfe0','#ffeef6','#ffd0ea','#ffdfe9'];
      const stops = [];
      for (let i=0;i<segCount;i++){
        const a = (i/segCount)*360;
        const b = ((i+1)/segCount)*360;
        stops.push(`${colors[i%colors.length]} ${a}deg ${b}deg`);
      }
      wheelEl.style.background = `conic-gradient(${stops.join(',')})`;

      // Remove old labels
      wheelEl.innerHTML = '';
      const radius = wheelEl.clientWidth/2 || 130;
      const center = radius;
      // create labels around wheel
      for (let i=0;i<segCount;i++){
        const angle = (i + 0.5) * (360 / segCount); // middle of segment
        const rad = (angle - 90) * Math.PI / 180;
        const label = document.createElement('div');
        label.className = 'wheel-label';
        label.style.position = 'absolute';
        label.style.left = `${center + Math.cos(rad) * (radius*0.65)}px`;
        label.style.top  = `${center + Math.sin(rad) * (radius*0.65)}px`;
        label.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
        label.style.width = '90px';
        label.style.textAlign = 'center';
        label.style.fontSize = '12px';
        label.style.pointerEvents = 'none';
        label.style.color = '#1a0012';
        label.style.fontWeight = '700';
        label.innerText = movies[i] ? movies[i].slice(0,20) : `Option ${i+1}`;
        wheelEl.appendChild(label);
      }
    }
    refreshWheelVisual();

    function pickFromWheelAnimation(){
      if (!spinBtn || !wheelEl) return;
      if (movies.length === 0) { showTemp(movieResult, 'add movies first'); return; }
      spinBtn.disabled = true;
      const spins = 6;
      const randomAngle = Math.floor(Math.random()*360);
      const deg = spins*360 + randomAngle;
      wheelEl.style.transition = 'transform 4s cubic-bezier(.22,.9,.2,1)';
      wheelEl.style.transform = `rotate(${deg}deg)`;
      setTimeout(()=>{
        const final = deg % 360;
        const seg = Math.floor(final / (360 / movies.length));
        const chosen = movies[(movies.length - 1 - seg + movies.length) % movies.length] || movies[0];
        movieResult.textContent = `Tonight: ${chosen}`;
        spinBtn.disabled = false;
        // Reset transform after short delay so further spins are smooth
        setTimeout(()=> { wheelEl.style.transition='none'; wheelEl.style.transform='none'; }, 50);
      }, 4200);
      playClick();
    }

    if (spinBtn) spinBtn.addEventListener('click', pickFromWheelAnimation);
    if (addMovieBtn) addMovieBtn.addEventListener('click', () => {
      const t = prompt('Add a movie title (cancel to stop):');
      if (t) {
        movies.push(t);
        localStorage.setItem('am_movies', JSON.stringify(movies));
        refreshWheelVisual();
        showTemp(movieResult, `${t} added`);
        playClick();
      }
    });

    // ------- mini game (animated hearts & reward flow) -------
    let gameRunning = false, gameScore = 0, gameInterval = null;
    function spawnGameHeartAnimated() {
      if (!gameArea) return;
      const el = document.createElement('div');
      el.className = 'heart';
      el.textContent = '💗';
      const w = gameArea.clientWidth, h = gameArea.clientHeight;
      const size = 36;
      const left = Math.random()*(w - size);
      const top  = Math.random()*(h - size);
      el.style.left = `${left}px`; el.style.top = `${top}px`;
      el.style.opacity = '0';
      el.style.transform = 'scale(0.6) translateY(8px)';
      gameArea.appendChild(el);
      // animate in (CSS transitions help)
      requestAnimationFrame(()=> {
        el.style.transition = 'opacity .18s ease, transform .6s cubic-bezier(.2,.8,.2,1)';
        el.style.opacity = '1'; el.style.transform = 'scale(1) translateY(0)';
      });
      const remove = ()=> el.remove();
      el.addEventListener('click', ()=>{
        gameScore++; gameScoreEl.textContent = gameScore;
        spawnVisualHeart(window.innerWidth/2, window.innerHeight/2);
        // click pop - scale quickly
        el.animate([{ transform: 'scale(1.2)' }, { transform: 'scale(0.4)' }], { duration: 220 });
        setTimeout(remove, 80);
      });
      // auto-remove with fade
      setTimeout(()=> {
        el.style.transition = 'opacity .3s ease, transform .3s ease';
        el.style.opacity = '0'; el.style.transform = 'translateY(-20px) scale(.8)';
        setTimeout(()=> { try { el.remove(); } catch(e){} }, 350);
      }, 900);
    }

    if (startGameBtn) startGameBtn.addEventListener('click', () => {
      if (!gameArea) return;
      if (gameRunning) return;
      gameRunning = true; gameScore = 0; gameScoreEl.textContent = '0';
      const duration = 15_000;
      const spawnRate = 700;
      gameInterval = setInterval(() => { spawnGameHeartAnimated(); }, spawnRate);
      setTimeout(() => {
        clearInterval(gameInterval);
        gameRunning = false;
        // reward flow: allow chooser if score >= some threshold
        if (gameScore >= 7) {
          const reward = prompt(`you won! choose a reward for tonight (movie/playlist/message):`, 'movie');
          if (reward) showTemp(popup, `Reward noted: ${reward}`, 2600);
        } else {
          showTemp(popup, `nice! final score ${gameScore}`, 2000);
        }
      }, duration);
      playClick();
    });

    // ------- Photos (upload + persist base64) -------
    const gallery = $('#gallery');
    function renderGallery() {
      if (!gallery) return;
      gallery.innerHTML = '';
      const photos = JSON.parse(localStorage.getItem('am_photos') || '[]');
      // upload control
      const uploadBtn = document.createElement('button'); uploadBtn.className = 'btn ghost'; uploadBtn.textContent = 'Upload photo/gif';
      uploadBtn.addEventListener('click', () => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,image/gif';
        inp.onchange = e => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            photos.push({ src: reader.result, t: Date.now() });
            localStorage.setItem('am_photos', JSON.stringify(photos));
            renderGallery();
            playClick();
          };
          reader.readAsDataURL(file);
        };
        inp.click();
      });
      gallery.appendChild(uploadBtn);

      photos.forEach(p => {
        const img = document.createElement('img'); img.src = p.src; img.style.width='140px'; img.style.height='90px'; img.style.objectFit='cover'; img.style.borderRadius='8px'; img.style.cursor='pointer';
        img.addEventListener('click', () => {
          const overlay = document.createElement('div'); overlay.style.position='fixed'; overlay.style.left=0; overlay.style.top=0; overlay.style.width='100%'; overlay.style.height='100%'; overlay.style.background='rgba(0,0,0,0.9)'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center'; overlay.style.zIndex=9999;
          const im = document.createElement('img'); im.src = p.src; im.style.maxWidth='92%'; im.style.maxHeight='92%'; im.style.borderRadius='12px';
          overlay.appendChild(im);
          overlay.addEventListener('click', ()=> overlay.remove());
          document.body.appendChild(overlay);
        });
        gallery.appendChild(img);
      });
    }
    renderGallery();

    // ------- Sleep schedule (goodnight popup) -------
    let sleepTimerId = null;
    if (setSleepBtn) setSleepBtn.addEventListener('click', () => {
      const time = sleepTimeInput.value;
      const msg = (goodnightMsgInput.value||'').trim() || 'goodnight baba, i love you';
      if (!time) { showTemp(popup, 'choose a time first', 1800); return; }
      scheduleGoodnight(time, msg);
      showTemp(popup, `Goodnight set for ${time}`, 1600);
      playClick();
    });

    function scheduleGoodnight(timeStr, message) {
      if (!timeStr) return;
      if (sleepTimerId) { clearTimeout(sleepTimerId); sleepTimerId = null; }
      const [hh, mm] = timeStr.split(':').map(s => parseInt(s,10));
      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const delta = target - now;
      sleepTimerId = setTimeout(()=> {
        showGoodnightPopup(message);
        scheduleGoodnight(timeStr, message);
      }, delta);
    }
    function showGoodnightPopup(message){
      const p = document.createElement('div'); p.className='popup';
      p.innerHTML = `<div style="font-size:1rem">${escapeHtml(message)}</div><div style="margin-top:12px;text-align:center"><button id="closeGood" class="btn primary">ok</button></div>`;
      document.body.appendChild(p);
      document.getElementById('closeGood').addEventListener('click', ()=> p.remove());
    }

    // ------- Troll (one-time) -------
    let trollShown = false;
    function scheduleTroll() {
      setTimeout(()=> {
        if (trollShown) return;
        trollShown = true;
        const p = document.createElement('div'); p.className = 'popup';
        p.innerHTML = `<div style="font-weight:700">you’re still here?</div><div class="muted" style="margin-top:8px">baby… you miss me that much?</div><div style="margin-top:12px;text-align:center"><button id="okT" class="btn ghost">ok</button></div>`;
        document.body.appendChild(p);
        $('#okT')?.addEventListener('click', ()=> p.remove());
      }, TROLL_DELAY_MS);
    }

    // ------- Sidebar collapse (tap logo to toggle) -------
    if (logo) {
      logo.style.cursor = 'pointer';
      logo.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        playClick();
      });
    }

    // small initial UI activation
    const homeNav = document.querySelector("[data-page='home']");
    if (homeNav) homeNav.click();

    // make sure wheel and gallery are fresh
    refreshWheelVisual();
    renderGallery();

    // expose some functions for debug (optional)
    window._am_debug = { spawnVisualHeart, refreshWheelVisual, openApp };

  }); // DOMContentLoaded end

  // ------- Functions that need to be available top-level (defined after DOM ready closure for clarity) -------
  // refreshWheelVisual defined inside DOMContentLoaded where wheelEl exists — create stub here to prevent console errors if called earlier
  function refreshWheelVisual(){ safe(()=> document.getElementById('wheelCanvas') && document.getElementById('wheelCanvas').style && null); }
})();
