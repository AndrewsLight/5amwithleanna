/* script.js — final polished client-side app
   - Local-first: uses localStorage for persistence
   - Features: password, sidebar (collapse), GIF backgrounds, letters, notes, gallery, wheel with labels, mini-game, playlist, voice notes, anniversary tracker, settings
   - No external back-end required. Hooks available for Firebase later.
*/
(() => {
  'use strict';

  /* ====== CONFIG / DEFAULTS ====== */
  const PW = 'i miss you';
  const DEFAULT_MOVIES = ["About Time","Midnight in Paris","The Time Traveler's Wife","Big","Groundhog Day","Eternal Sunshine"];
  const DEFAULT_BG_GIFS = {
    none: '',
    gif1: 'https://media.giphy.com/media/l0Exk8EUzSLsrErEQ/giphy.gif',
    gif2: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif'
  };

  /* ====== HELPERS ====== */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const safe = fn => { try { fn(); } catch(e) { console.error(e); } };
  const now = () => new Date();
  function setLS(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
  function getLS(k, fallback=null){ try { const v = JSON.parse(localStorage.getItem(k)); return v===null?fallback:v||fallback; } catch(e){ return fallback; } }
  function escapeHtml(s){ return (s||'').toString().replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
  function showTemp(el, txt, ms=1800){ if(!el) return; const prev = el.textContent; el.textContent = txt; setTimeout(()=> el.textContent = prev, ms); }
  function shake(el){ if(!el) return el; el.animate([{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:360}); }

  /* ====== DOM ELEMENTS (lazy) ====== */
  function el(id){ return document.getElementById(id); }

  /* ====== AUDIO SETUP ====== */
  let audioAllowed = false;
  const bgAudio = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_1f6c3b3a7b.mp3?filename=romantic-dreams-117397.mp3');
  bgAudio.loop = true; bgAudio.volume = 0.55;
  const clickSfx = new Audio('https://freesound.org/data/previews/66/66717_931655-lq.mp3');
  clickSfx.volume = 0.55;

  function allowAudioOnce(){
    if(audioAllowed) return;
    audioAllowed = true;
    bgAudio.play().catch(()=>{});
  }
  document.addEventListener('click', allowAudioOnce, { once: true });

  function playClick(){
    if(!getLS('settings')?.soundEnabled) return;
    try{ clickSfx.currentTime = 0; clickSfx.play().catch(()=>{}); } catch(e){}
  }

  /* ====== BOOT (wait for DOM) ====== */
  document.addEventListener('DOMContentLoaded', () => {
    // core nodes
    const entry = $('#entry'), app = $('#app');
    const pwInput = $('#pw'), enterBtn = $('#enterBtn'), demoBtn = $('#demoBtn'), pwMsg = $('#pwMsg');
    const sidebar = $('.sidebar'), collapseBtn = $('#collapseBtn'), logo = $('.logo');
    const navBtns = $$('.nav-btn'), pages = $$('.page');
    const bgLayer = $('#bgLayer'), musicBtn = $('#musicBtn');
    const openLetters = $('#openLetters'), openMemories = $('#openMemories');

    /* Defensive: ensure elements exist */
    if(!entry || !app){ console.error('Core DOM missing.'); return; }

    /* ====== SETTINGS LOAD ====== */
    const storedSettings = getLS('settings', {
      vibe:'soft',
      bg:'gif1',
      customBg:null,
      animations:true,
      soundEnabled:true
    });
    // apply UI checkboxes (will be saved when user changes)
    function applySettingsToUI(){
      // vibe affects CSS variables — simplified mapping
      if(storedSettings.vibe === 'soft'){
        document.documentElement.style.setProperty('--accent', '#ff88b3');
        document.documentElement.style.setProperty('--bg','#08060a');
      } else if(storedSettings.vibe === 'dark'){
        document.documentElement.style.setProperty('--accent', '#9b7cff');
        document.documentElement.style.setProperty('--bg','#050012');
      } else {
        document.documentElement.style.setProperty('--accent','#00ffd1');
        document.documentElement.style.setProperty('--bg','#060811');
      }
      // background GIF
      if(storedSettings.bg === 'custom' && storedSettings.customBg){
        bgLayer.style.backgroundImage = `url('${storedSettings.customBg}')`;
      } else if(storedSettings.bg && DEFAULT_BG_GIFS[storedSettings.bg]){
        bgLayer.style.backgroundImage = `url('${DEFAULT_BG_GIFS[storedSettings.bg]}')`;
      } else {
        bgLayer.style.backgroundImage = '';
      }
      // sound toggle
      if(storedSettings.soundEnabled) musicBtn.textContent = '🔊'; else musicBtn.textContent = '🔇';
    }
    applySettingsToUI();

    /* ====== Password / Entry logic ====== */
    function openApp(){
      entry.classList.add('hidden');
      app.classList.remove('hidden');
      applySettingsToUI();
      playClick();
      // ensure first page home active
      document.querySelector("[data-page='home']")?.click();
      // enable audio if desired
      if(storedSettings.soundEnabled) { allowAudioOnce(); bgAudio.play().catch(()=>{}); }
    }
    function tryPassword(){
      const v = (pwInput.value||'').trim().toLowerCase();
      if(v === PW){
        openApp();
      } else {
        pwMsg.textContent = 'you entered it wrong dummy baba 😭';
        shake(pwInput);
        playClick();
        setTimeout(()=> pwMsg.textContent = 'tip: password is i miss you', 2500);
      }
    }
    enterBtn?.addEventListener('click', tryPassword);
    demoBtn?.addEventListener('click', ()=> { pwInput.value = PW; tryPassword(); });
    pwInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') tryPassword(); });

    /* ====== Sidebar collapse & navigation ====== */
    collapseBtn?.addEventListener('click', ()=> {
      sidebar.classList.toggle('collapsed');
      playClick();
    });
    logo?.addEventListener('click', ()=> {
      sidebar.classList.toggle('collapsed');
      playClick();
    });

    navBtns.forEach(btn => {
      btn.addEventListener('click', ()=> {
        navBtns.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const page = btn.dataset.page;
        pages.forEach(p=>p.classList.add('hidden'));
        document.getElementById(page)?.classList.remove('hidden');
        playClick();
      });
    });

    /* ====== Letters (CRUD) ====== */
    let letters = getLS('letters', [
      "hi baba,\nI made this place for you.\nWhenever you miss me, come back here.\n— always, me"
    ]);
    const letterBox = $('#letterBox');
    let letterIdx = 0;
    function renderLetter(i){
      letterIdx = (i+letters.length)%letters.length;
      typeWriter(letters[letterIdx], letterBox);
    }
    function typeWriter(text, el, speed=20){
      if(!el) return;
      el.innerHTML = '';
      let i=0;
      for(const ch of text){ const s = document.createElement('span'); s.textContent = ch; s.style.opacity=0; s.style.display='inline-block'; s.style.transform='translateY(6px)'; el.appendChild(s); }
      const spans = Array.from(el.querySelectorAll('span'));
      (function step(){
        if(i < spans.length){
          spans[i].style.transition='opacity .12s, transform .12s';
          spans[i].style.opacity=1; spans[i].style.transform='translateY(0)';
          if(i % 4 === 0) playClick();
          i++; setTimeout(step, speed);
        }
      }());
    }
    $('#nextLetter')?.addEventListener('click', ()=> renderLetter(letterIdx+1));
    $('#prevLetter')?.addEventListener('click', ()=> renderLetter(letterIdx-1));
    $('#newLetter')?.addEventListener('click', ()=> {
      const text = prompt('Write a new letter for baba (keep it short):');
      if(text){ letters.push(text); setLS('letters', letters); renderLetter(letters.length-1); playClick(); }
    });
    renderLetter(0);

    /* ====== Notes ====== */
    function loadNotes(){
      const notes = getLS('notes', []);
      const list = $('#notesList'); if(!list) return;
      list.innerHTML = '';
      notes.slice().reverse().forEach(n => {
        const d = document.createElement('div'); d.className='note-item';
        d.innerHTML = `<strong>${escapeHtml(n.name)}</strong> <small class="muted">• ${new Date(n.t).toLocaleString()}</small><div>${escapeHtml(n.text)}</div><div style="margin-top:6px"><button class="btn ghost small del-note">delete</button></div>`;
        list.appendChild(d);
        d.querySelector('.del-note').addEventListener('click', ()=>{
          const idx = notes.findIndex(x=>x.t===n.t && x.text===n.text);
          if(idx>=0){ notes.splice(idx,1); setLS('notes', notes); loadNotes(); playClick(); }
        });
      });
    }
    $('#saveNote')?.addEventListener('click', ()=> {
      const text = ($('#noteText')?.value||'').trim(); if(!text) return showTemp($('#notesList'),'write something first');
      const name = ($('#noteName')?.value||'').trim() || 'baba';
      const notes = getLS('notes', []); notes.push({text,name,t:Date.now()}); setLS('notes', notes); $('#noteText').value=''; $('#noteName').value=''; loadNotes(); playClick();
    });
    loadNotes();

    /* ====== Memories (gallery) ====== */
    function renderGallery(){
      const gallery = $('#gallery'); if(!gallery) return;
      gallery.innerHTML = '';
      const photos = getLS('photos', []);
      const uploadBtn = document.createElement('button'); uploadBtn.className='btn ghost'; uploadBtn.textContent='Upload photo/gif';
      uploadBtn.addEventListener('click', ()=> {
        const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*,image/gif';
        inp.onchange = e => {
          const f = e.target.files[0]; if(!f) return;
          const r = new FileReader();
          r.onload = ()=> {
            photos.push({src:r.result,t:Date.now()});
            setLS('photos', photos); renderGallery(); playClick();
          };
          r.readAsDataURL(f);
        };
        inp.click();
      });
      const clearBtn = document.createElement('button'); clearBtn.className='btn ghost'; clearBtn.textContent='Clear All';
      clearBtn.addEventListener('click', ()=> {
        if(confirm('Clear all memories?')){ setLS('photos', []); renderGallery(); playClick(); }
      });
      gallery.appendChild(uploadBtn);
      gallery.appendChild(clearBtn);
      photos.slice().reverse().forEach((p,idx)=>{
        const img = document.createElement('img'); img.src = p.src; img.alt = 'mem';
        img.addEventListener('click', ()=> {
          const overlay = document.createElement('div'); overlay.style.position='fixed'; overlay.style.left=0; overlay.style.top=0; overlay.style.width='100%'; overlay.style.height='100%'; overlay.style.background='rgba(0,0,0,0.9)'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center'; overlay.style.zIndex=9999;
          const im = document.createElement('img'); im.src = p.src; im.style.maxWidth='92%'; im.style.maxHeight='92%'; im.style.borderRadius='12px';
          const del = document.createElement('button'); del.className='btn ghost'; del.textContent='delete'; del.style.position='absolute'; del.style.right='20px'; del.style.top='20px';
          del.addEventListener('click', ()=> { const arr = getLS('photos',[]); arr.splice(arr.length-1-idx,1); setLS('photos',arr); overlay.remove(); renderGallery(); playClick(); });
          overlay.appendChild(im); overlay.appendChild(del);
          overlay.addEventListener('click', ()=> overlay.remove());
          document.body.appendChild(overlay);
        });
        gallery.appendChild(img);
      });
    }
    $('#uploadPhoto')?.addEventListener('click', ()=> { document.querySelector('#gallery .btn')?.click(); });
    $('#clearPhotos')?.addEventListener('click', ()=> { if(confirm('Clear all memories?')){ setLS('photos',[]); renderGallery(); }});
    renderGallery();

    /* ====== Wheel (labels + spin) ====== */
    let movies = getLS('movies', DEFAULT_MOVIES.slice());
    function refreshWheel(){
      const wheel = $('#wheel'); if(!wheel) return;
      wheel.innerHTML = ''; // clear
      const seg = Math.max(1, movies.length);
      const colors = ['#ffb0cf','#ffdfe9','#ffcfe0','#ffeef6','#ffd0ea','#ffdfe9'];
      // background gradient
      const stops = [];
      for(let i=0;i<seg;i++){
        const a = (i/seg)*360; const b = ((i+1)/seg)*360; stops.push(`${colors[i%colors.length]} ${a}deg ${b}deg`);
      }
      wheel.style.background = `conic-gradient(${stops.join(',')})`;
      const radius = wheel.clientWidth/2 || 130;
      const center = radius;
      for(let i=0;i<seg;i++){
        const angle = (i + 0.5) * (360/seg);
        const rad = (angle - 90) * Math.PI / 180;
        const label = document.createElement('div'); label.className='wheel-label';
        label.style.left = `${center + Math.cos(rad)*(radius*0.62)}px`;
        label.style.top  = `${center + Math.sin(rad)*(radius*0.62)}px`;
        label.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
        label.innerText = movies[i] ? movies[i].slice(0,22) : `Option ${i+1}`;
        wheel.appendChild(label);
      }
    }
    refreshWheel();
    $('#spinBtn')?.addEventListener('click', ()=> {
      if(movies.length===0) return showTemp($('#movieResult'),'add movies first');
      $('#spinBtn').disabled = true;
      const spins = 6; const randomAngle = Math.floor(Math.random()*360); const deg = spins*360 + randomAngle;
      $('#wheel').style.transition = 'transform 4s cubic-bezier(.22,.9,.2,1)'; $('#wheel').style.transform = `rotate(${deg}deg)`;
      setTimeout(()=> {
        const final = deg % 360; const seg = Math.floor(final / (360/movies.length));
        const chosen = movies[(movies.length-1-seg + movies.length)%movies.length] || movies[0];
        $('#movieResult').textContent = `Tonight: ${chosen}`;
        $('#spinBtn').disabled = false;
        $('#wheel').style.transition = 'none'; $('#wheel').style.transform = 'none';
        playClick();
      }, 4200);
    });
    $('#addMovieBtn')?.addEventListener('click', ()=> {
      const t = prompt('Add movie title:'); if(t){ movies.push(t); setLS('movies', movies); refreshWheel(); playClick(); }
    });

    /* ====== Mini-game (improved) ====== */
    let gameRunning=false, gameScore=0, gameInterval=null;
    function spawnGameHeart(){
      const area = $('#gameArea'); if(!area) return;
      const el = document.createElement('div'); el.className='heart'; el.textContent='💗';
      const w = area.clientWidth, h = area.clientHeight, size=36;
      el.style.left = Math.random()*(w-size)+'px'; el.style.top = Math.random()*(h-size)+'px'; el.style.opacity='0'; el.style.transform='scale(.6) translateY(6px)';
      area.appendChild(el);
      requestAnimationFrame(()=> { el.style.transition='opacity .18s, transform .5s cubic-bezier(.2,.8,.2,1)'; el.style.opacity='1'; el.style.transform='scale(1) translateY(0)'; });
      const remove = ()=> { try{ el.remove(); }catch(e){} };
      el.addEventListener('click', ()=> { gameScore++; $('#gameScore').textContent = gameScore; spawnVisualHeart(window.innerWidth/2, window.innerHeight/2); el.animate([{transform:'scale(1.2)'},{transform:'scale(.4)'}],{duration:220}); setTimeout(remove,80); });
      setTimeout(()=> { el.style.opacity='0'; el.style.transform='translateY(-20px) scale(.8)'; setTimeout(remove,320); }, 900);
    }
    function spawnVisualHeart(x,y){ /* quick canvas-free particle: just a visual DOM heart */ const container = document.createElement('div'); container.style.position='fixed'; container.style.left=x+'px'; container.style.top=y+'px'; container.style.zIndex=9999; const h = document.createElement('div'); h.textContent='💗'; h.style.fontSize='28px'; container.appendChild(h); document.body.appendChild(container); setTimeout(()=> container.remove(),800); }
    $('#startGame')?.addEventListener('click', ()=> {
      if(gameRunning) return;
      gameRunning=true; gameScore=0; $('#gameScore').textContent='0';
      const duration = 15_000; const rate = 650;
      gameInterval = setInterval(spawnGameHeart, rate);
      setTimeout(()=> {
        clearInterval(gameInterval); gameRunning=false;
        if(gameScore >= 10){ $('#rewardChoice').classList.remove('hidden'); showTemp($('#rewardChoice'),'You can choose a reward!'); } else { showTemp($('#gameArea',),'Nice try! final: '+gameScore); }
        playClick();
      }, duration);
      playClick();
    });
    $('#saveReward')?.addEventListener('click', ()=> {
      const r = $('#rewardSelect')?.value||'movie'; setLS('lastReward', r); $('#rewardChoice').classList.add('hidden'); showTemp($('#gameArea'), 'Reward saved: '+r); playClick();
    });

    /* ====== Playlist (add/play) ====== */
    function renderPlaylist(){
      const list = $('#playlistList'); if(!list) return;
      list.innerHTML = '';
      const songs = getLS('songs', []);
      songs.forEach((s,idx)=>{
        const div = document.createElement('div'); div.className='note-item';
        div.innerHTML = `${escapeHtml(s.title||s)} <div style="margin-top:6px"><button class="btn small play" data-idx="${idx}">Play</button> <button class="btn ghost small del" data-idx="${idx}">Delete</button></div>`;
        list.appendChild(div);
      });
      // attach handlers
      list.querySelectorAll('.play').forEach(b => b.addEventListener('click', (e)=> {
        const i = parseInt(e.currentTarget.dataset.idx,10); const songs = getLS('songs',[]); const src = songs[i].url||songs[i].title||''; $('#player').src = src; $('#player').play().catch(()=>{}); playClick();
      }));
      list.querySelectorAll('.del').forEach(b => b.addEventListener('click', (e)=> {
        const i = parseInt(e.currentTarget.dataset.idx,10); const songs = getLS('songs',[]); songs.splice(i,1); setLS('songs',songs); renderPlaylist(); playClick();
      }));
    }
    $('#addSongBtn')?.addEventListener('click', ()=> {
      const t = $('#songInput')?.value?.trim(); if(!t) return showTemp($('#playlistList'),'Enter a song title or URL');
      const songs = getLS('songs',[]); songs.push({title:t,url:t}); setLS('songs',songs); $('#songInput').value=''; renderPlaylist(); playClick();
    });
    renderPlaylist();

    /* ====== Voice notes (MediaRecorder) ====== */
    let mediaRecorder = null, chunks = [];
    async function startRecording(){
      if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return alert('Recording not supported on this device.');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' }); chunks = [];
          const reader = new FileReader();
          reader.onload = ()=> {
            const data = reader.result;
            const arr = getLS('voices',[]); arr.push({src:data,t:Date.now()}); setLS('voices',arr); renderVoices(); playClick();
          };
          reader.readAsDataURL(blob);
        };
        mediaRecorder.start(); $('#recBtn').disabled=true; $('#stopRecBtn').disabled=false; showTemp($('#voicesList'),'Recording...');
      } catch(e){ alert('Microphone access denied or not available.'); }
    }
    function stopRecording(){ if(mediaRecorder) mediaRecorder.stop(); $('#recBtn').disabled=false; $('#stopRecBtn').disabled=true; }
    $('#recBtn')?.addEventListener('click', startRecording); $('#stopRecBtn')?.addEventListener('click', stopRecording);
    function renderVoices(){
      const list = $('#voicesList'); if(!list) return; list.innerHTML=''; const voices = getLS('voices',[]);
      voices.slice().reverse().forEach((v,idx)=>{
        const d = document.createElement('div'); d.className='note-item';
        d.innerHTML = `<audio controls src="${v.src}"></audio><div style="margin-top:6px"><button class="btn ghost small del-voice">delete</button></div>`;
        d.querySelector('.del-voice').addEventListener('click', ()=> { const arr=getLS('voices',[]); arr.splice(arr.length-1-idx,1); setLS('voices',arr); renderVoices(); });
        list.appendChild(d);
      });
    }
    renderVoices();

    /* ====== Sleep & Anniversary ====== */
    function scheduleGoodnight(timeStr, message){
      if(!timeStr) return;
      const [hh,mm] = timeStr.split(':').map(s=>parseInt(s,10));
      const nowDt = new Date(); let target = new Date(nowDt.getFullYear(), nowDt.getMonth(), nowDt.getDate(), hh, mm, 0);
      if(target <= nowDt) target.setDate(target.getDate()+1);
      const delta = target - nowDt;
      setTimeout(()=> {
        const p = document.createElement('div'); p.className='popup'; p.innerHTML = `<div>${escapeHtml(message)}</div><div style="margin-top:10px;text-align:center"><button class="btn primary ok">ok</button></div>`;
        document.body.appendChild(p); p.querySelector('.ok').addEventListener('click', ()=> p.remove());
      }, delta);
      setLS('goodnight', {time:timeStr,msg:message});
      showTemp($('#annivBox'),`Goodnight set for ${timeStr}`);
    }
    $('#setSleepBtn')?.addEventListener('click', ()=> {
      const t = $('#sleepTime')?.value; const m = ($('#goodnightMsg')?.value||'goodnight baba, i love you').trim();
      if(!t) return showTemp($('#annivBox'),'Choose a time first');
      scheduleGoodnight(t,m); playClick();
    });

    $('#saveAnniv')?.addEventListener('click', ()=> {
      const d = ($('#annivDate')?.value||'').trim(); if(!d) return showTemp($('#annivBox'),'Pick a date');
      setLS('anniv', {date:d});
      showTemp($('#annivBox'),'Anniversary saved'); updateAnnivSummary(); playClick();
    });
    function updateAnnivSummary(){
      const box = $('#annivSummary'); if(!box) return;
      const ann = getLS('anniv', null);
      if(!ann || !ann.date){ box.textContent = "No anniversary set."; return; }
      const nowDt = new Date(); const [y,m,d] = ann.date.split('-').map(n=>parseInt(n,10));
      let target = new Date(nowDt.getFullYear(), m-1, d);
      if(target < nowDt) target.setFullYear(nowDt.getFullYear()+1);
      const diff = Math.ceil((target - nowDt)/(1000*60*60*24));
      box.textContent = `Anniversary in ${diff} days (${ann.date})`;
      // celebration on day
      if(Math.abs((target-nowDt)) < 1000*60*60*24){
        const p = document.createElement('div'); p.className='popup'; p.innerHTML = `<div style="font-weight:700">Happy Anniversary 🎉</div><div style="margin-top:8px">Celebrate today ❤️</div><div style="margin-top:10px;text-align:center"><button class="btn primary ok">ok</button></div>`;
        document.body.appendChild(p); p.querySelector('.ok').addEventListener('click', ()=> p.remove());
      }
    }
    updateAnnivSummary();

    /* ====== Settings UI & Save ====== */
    function loadUISettings(){
      $('#vibeSelect')?.value = storedSettings.vibe || 'soft';
      $('#bgSelect')?.value = storedSettings.bg || 'gif1';
      $('#animToggle')?.checked = storedSettings.animations;
      $('#soundToggle')?.checked = storedSettings.soundEnabled;
    }
    loadUISettings();
    $('#saveSettings')?.addEventListener('click', ()=> {
      const s = {
        vibe: $('#vibeSelect')?.value || 'soft',
        bg: $('#bgSelect')?.value || 'gif1',
        customBg: storedSettings.customBg || null,
        animations: !!$('#animToggle')?.checked,
        soundEnabled: !!$('#soundToggle')?.checked
      };
      setLS('settings', s); Object.assign(storedSettings, s); applySettingsToUI(); showTemp($('#settings'),'Settings saved'); playClick();
    });
    $('#bgSelect')?.addEventListener('change', ()=> {
      const v = $('#bgSelect')?.value;
      if(v === 'custom'){ const f = prompt('Paste a GIF/image URL to use as background (or cancel):'); if(f){ storedSettings.customBg = f; setLS('settings', storedSettings); applySettingsToUI(); renderGallery(); } }
    });
    $('#resetBtn')?.addEventListener('click', ()=> {
      if(confirm('Reset all local data (notes, photos, songs, settings)?')){ localStorage.clear(); location.reload(); }
    });

    function applySettingsToUI(){
      const s = getLS('settings', storedSettings);
      // vibe
      if(s.vibe==='soft'){ document.documentElement.style.setProperty('--accent','#ff88b3'); document.documentElement.style.setProperty('--bg','#08060a'); }
      else if(s.vibe==='dark'){ document.documentElement.style.setProperty('--accent','#9b7cff'); document.documentElement.style.setProperty('--bg','#050012'); }
      else { document.documentElement.style.setProperty('--accent','#00ffd1'); document.documentElement.style.setProperty('--bg','#060811'); }
      // background
      if(s.bg === 'custom' && s.customBg){ $('#bgLayer').style.backgroundImage = `url('${s.customBg}')`; } 
      else if(DEFAULT_BG_GIFS[s.bg]){ $('#bgLayer').style.backgroundImage = `url('${DEFAULT_BG_GIFS[s.bg]}')`; }
      else $('#bgLayer').style.backgroundImage = '';
      // sound
      if(s.soundEnabled){ musicBtn.textContent='🔊'; } else { musicBtn.textContent='🔇'; bgAudio.pause(); }
      // persist
      setLS('settings', s);
    }
    function refreshEverything(){
      renderGallery(); renderPlaylist(); renderVoices(); renderWheel(); loadNotes(); updateAnnivSummary();
    }

    /* ====== Misc render helpers ====== */
    function renderPlaylist(){ const list = $('#playlistList'); if(!list) return; list.innerHTML=''; const songs = getLS('songs',[]); songs.forEach((s,idx)=>{ const d=document.createElement('div'); d.className='note-item'; d.innerHTML = `${escapeHtml(s.title||s)} <div style="margin-top:6px"><button class="btn small play" data-idx="${idx}">Play</button> <button class="btn ghost small del" data-idx="${idx}">Delete</button></div>`; list.appendChild(d); }); list.querySelectorAll('.play').forEach(b=>b.addEventListener('click', e=>{ const i=parseInt(e.currentTarget.dataset.idx,10); const songs=getLS('songs',[]); $('#player').src = songs[i].url||songs[i].title||''; $('#player').play().catch(()=>{}); })); list.querySelectorAll('.del').forEach(b=>b.addEventListener('click', e=>{ const i=parseInt(e.currentTarget.dataset.idx,10); const songs=getLS('songs',[]); songs.splice(i,1); setLS('songs',songs); renderPlaylist(); }));
    }
    function renderVoices(){ const list=$('#voicesList'); if(!list) return; list.innerHTML=''; const voices=getLS('voices',[]); voices.slice().reverse().forEach((v,idx)=>{ const d=document.createElement('div'); d.className='note-item'; d.innerHTML = `<audio controls src="${v.src}"></audio><div style="margin-top:6px"><button class="btn ghost small del-voice">delete</button></div>`; d.querySelector('.del-voice').addEventListener('click', ()=> { const arr=getLS('voices',[]); arr.splice(arr.length-1-idx,1); setLS('voices',arr); renderVoices(); }); list.appendChild(d); }); }
    function renderWheel(){ refreshWheel(); } // alias

    // renderPlaylist Items on load
    renderPlaylist(); renderVoices();

    /* ====== utility: refreshWheel (external wrapper for earlier function) ====== */
    function refreshWheel(){
      const wheel = $('#wheel'); if(!wheel) return;
      movies = getLS('movies', DEFAULT_MOVIES.slice());
      wheel.innerHTML = '';
      const seg = Math.max(1, movies.length);
      const colors = ['#ffb0cf','#ffdfe9','#ffcfe0','#ffeef6','#ffd0ea','#ffdfe9'];
      const stops = [];
      for(let i=0;i<seg;i++){ const a=(i/seg)*360, b=((i+1)/seg)*360; stops.push(`${colors[i%colors.length]} ${a}deg ${b}deg`); }
      wheel.style.background = `conic-gradient(${stops.join(',')})`;
      const radius = wheel.clientWidth/2 || 130; const center = radius;
      for(let i=0;i<seg;i++){
        const angle = (i+0.5)*(360/seg); const rad=(angle-90)*Math.PI/180;
        const label = document.createElement('div'); label.className='wheel-label';
        label.style.left = `${center + Math.cos(rad)*(radius*0.62)}px`;
        label.style.top  = `${center + Math.sin(rad)*(radius*0.62)}px`;
        label.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
        label.innerText = movies[i] ? movies[i].slice(0,22) : `Option ${i+1}`;
        wheel.appendChild(label);
      }
    }

    /* ====== init call ====== */
    applySettingsToUI();
    refreshWheel();
    renderGallery();
    renderPlaylist();
    renderVoices();
    loadNotes();
    updateAnnivSummary();

    // music button behavior
    musicBtn?.addEventListener('click', ()=> {
      const s = getLS('settings', storedSettings);
      s.soundEnabled = !s.soundEnabled; setLS('settings', s); applySettingsToUI();
      if(s.soundEnabled){ allowAudioOnce(); bgAudio.play().catch(()=>{}); } else { bgAudio.pause(); }
      playClick();
    });

    // quick action shortcuts
    openMemories?.addEventListener('click', ()=> document.querySelector("[data-page='memories']").click());
    openLetters?.addEventListener('click', ()=> document.querySelector("[data-page='letters']").click());

  }); // DOMContentLoaded end

})(); // IIFE end
