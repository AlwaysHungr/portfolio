(function(){
  const KEY='aim_lesson_2';
  const slides=[...document.querySelectorAll('.slide')];
  const tocItems=[...document.querySelectorAll('.toc-item')];
  const prev=document.getElementById('prevBtn'), next=document.getElementById('nextBtn');
  const counter=document.getElementById('counter'), fill=document.getElementById('progressFill');
  const spFill=document.getElementById('spFill'), spPct=document.getElementById('spPct');
  const sidebar=document.getElementById('sidebar'), menuBtn=document.getElementById('menuBtn');
  const dotsBox=document.getElementById('dots');
  const seen=new Set(JSON.parse(localStorage.getItem(KEY+'_seen')||'[]'));
  let cur=Math.min(parseInt(localStorage.getItem(KEY+'_pos')||'0',10)||0, slides.length-1);
  let celebrated=localStorage.getItem(KEY+'_done')==='1';

  const groups={};
  slides.forEach((s,i)=>{const g=s.dataset.group; if(!(g in groups)) groups[g]=i;});
  Object.keys(groups).sort((a,b)=>a-b).forEach(g=>{
    const d=document.createElement('div'); d.className='dot'; d.dataset.group=g;
    d.onclick=()=>go(groups[g]); dotsBox.appendChild(d);
  });

  function refreshProgress(){
    const pct=Math.round(seen.size/slides.length*100);
    spFill.style.width=pct+'%'; spPct.textContent=pct+'% ολοκληρωμένο';
    tocItems.forEach(t=>{
      const g=t.dataset.group;
      const idxs=slides.map((s,j)=>s.dataset.group===g?j:-1).filter(j=>j>=0);
      if(idxs.every(j=>seen.has(j))) t.classList.add('done');
    });
    if(pct===100 && !celebrated){ celebrated=true; localStorage.setItem(KEY+'_done','1'); confettiBurst(); }
  }
  function markSeen(i){
    seen.add(i);
    localStorage.setItem(KEY+'_seen', JSON.stringify([...seen]));
    refreshProgress();
  }
  function go(i){
    if(i<0||i>=slides.length) return;
    slides[cur].classList.remove('active');
    cur=i;
    slides[cur].classList.add('active');
    counter.textContent=(cur+1)+' / '+slides.length;
    fill.style.width=((cur+1)/slides.length*100)+'%';
    prev.disabled=cur===0;
    next.textContent=cur===slides.length-1?'Ολοκλήρωση ✓':'Επόμενο ›';
    const g=slides[cur].dataset.group;
    tocItems.forEach(t=>t.classList.toggle('active',t.dataset.group===g));
    [...dotsBox.children].forEach(d=>d.classList.toggle('on',d.dataset.group===g));
    const act=document.querySelector('.toc-item.active');
    if(act) act.scrollIntoView({block:'nearest'});
    document.getElementById('stage').scrollTop=0;
    // force-load images of current and next slide (lazy images in hidden slides stay pending)
    [slides[cur], slides[cur+1]].forEach(s=>{ if(s) s.querySelectorAll('img[loading="lazy"]').forEach(im=>{ im.loading='eager'; if(!im.complete) im.src=im.src; }); });
    document.querySelectorAll('video').forEach(v=>{ if(!slides[cur].contains(v)) v.pause(); });
    localStorage.setItem(KEY+'_pos', cur);
    markSeen(cur);
  }
  prev.onclick=()=>go(cur-1);
  next.onclick=()=>{ if(cur<slides.length-1) go(cur+1); else confettiBurst(); };
  document.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'||e.key==='PageDown') go(cur+1);
    if(e.key==='ArrowLeft'||e.key==='PageUp') go(cur-1);
  });
  tocItems.forEach(t=>t.onclick=()=>{ go(parseInt(t.dataset.first,10)); if(window.innerWidth<920) sidebar.classList.add('hidden'); });
  menuBtn.onclick=()=>sidebar.classList.toggle('hidden');
  if(window.innerWidth<920) sidebar.classList.add('hidden');

  // ---- v2 features: home / night mode / fullscreen ----
  const homeBtn=document.getElementById('homeBtn');
  if(homeBtn) homeBtn.onclick=()=>go(0);

  const nightBtn=document.getElementById('nightBtn');
  function applyNight(on){
    document.body.classList.toggle('dark', on);
    if(nightBtn) nightBtn.textContent=on?'☀️':'🌙';
    localStorage.setItem('aim_dark', on?'1':'0');
  }
  if(nightBtn) nightBtn.onclick=()=>applyNight(!document.body.classList.contains('dark'));
  applyNight(localStorage.getItem('aim_dark')==='1');

  const fsBtn=document.getElementById('fsBtn');
  function fsIcon(){ if(fsBtn) fsBtn.textContent=document.fullscreenElement?'🗗':'⛶'; }
  if(fsBtn) fsBtn.onclick=()=>{
    if(document.fullscreenElement){ document.exitFullscreen(); }
    else{ document.documentElement.requestFullscreen().catch(()=>{}); }
  };
  document.addEventListener('fullscreenchange', fsIcon);
  fsIcon();

  document.querySelectorAll('.term-head').forEach(h=>h.addEventListener('click',()=>{
    const c=h.closest('.term-card'); c.dataset.open=c.dataset.open==='1'?'0':'1';
  }));
  const checks=new Set(JSON.parse(localStorage.getItem(KEY+'_checks')||'[]'));
  [...document.querySelectorAll('.check-item')].forEach((it,ci)=>{
    if(checks.has(ci)) it.classList.add('checked');
    it.addEventListener('click',()=>{
      it.classList.toggle('checked');
      it.classList.contains('checked')?checks.add(ci):checks.delete(ci);
      localStorage.setItem(KEY+'_checks', JSON.stringify([...checks]));
    });
  });
  let fs=parseFloat(localStorage.getItem(KEY+'_fs')||'17');
  function applyFs(){ document.documentElement.style.setProperty('--fs', fs+'px'); localStorage.setItem(KEY+'_fs', fs); }
  document.getElementById('fontPlus').onclick=()=>{ fs=Math.min(22, fs+1); applyFs(); };
  document.getElementById('fontMinus').onclick=()=>{ fs=Math.max(14, fs-1); applyFs(); };
  applyFs();
  function confettiBurst(){
    const cv=document.getElementById('confetti'); const ctx=cv.getContext('2d');
    cv.width=innerWidth; cv.height=innerHeight;
    const cols=['#0ea5e9','#6366f1','#c026d3','#f59e0b','#10b981','#ec4899'];
    const ps=Array.from({length:160},()=>({x:Math.random()*cv.width,y:-20-Math.random()*cv.height*.5,r:4+Math.random()*6,c:cols[Math.floor(Math.random()*cols.length)],vy:2+Math.random()*3.5,vx:-1.5+Math.random()*3,rot:Math.random()*6.28,vr:-.1+Math.random()*.2}));
    let t=0;
    (function tick(){
      ctx.clearRect(0,0,cv.width,cv.height); t++;
      ps.forEach(p=>{ p.y+=p.vy; p.x+=p.vx; p.rot+=p.vr;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.c; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.4); ctx.restore(); });
      if(t<260) requestAnimationFrame(tick); else ctx.clearRect(0,0,cv.width,cv.height);
    })();
  }
  slides[cur].classList.add('active'); go(cur);
  refreshProgress();
})();
