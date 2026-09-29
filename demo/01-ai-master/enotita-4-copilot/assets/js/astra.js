/* Original canvas star sculpture. Spotlight interaction adapted from React Bits / David Haz. */
(()=>{'use strict';
const init=()=>{
 const body=document.body, hero=document.querySelector('.hero');if(!hero)return;
 const chapters=[...document.querySelectorAll('.chapter')],first=chapters[0];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches;
 try{paused=paused||localStorage.getItem('astra_motion')==='paused';}catch(e){}
 const bar=document.querySelector('.topbar'),brand=document.createElement('span');brand.className='astra-brand';brand.innerHTML='AI MASTER <small>LEARNING EXPERIENCE</small>';bar.insertBefore(brand,bar.children[1]);
 const toggle=document.createElement('button');toggle.type='button';toggle.className='icon-btn astra-motion';bar.insertBefore(toggle,document.getElementById('themeToggle'));
 const sync=()=>{body.classList.toggle('astra-paused',paused);toggle.textContent=paused?'▷ Κίνηση':'Ⅱ Παύση';toggle.setAttribute('aria-label',paused?'Ενεργοποίηση κίνησης':'Παύση κίνησης');toggle.setAttribute('aria-pressed',String(!paused));};sync();
 let raf=0,last=0,clock=0,ready=false;
 toggle.addEventListener('click',()=>{paused=!paused;sync();try{localStorage.setItem('astra_motion',paused?'paused':'running')}catch(e){}schedule()});
 reduced.addEventListener('change',e=>{paused=e.matches;sync();schedule()});
 const stage=document.createElement('div');stage.className='astra-stage';
 const course=body.dataset.astraCourse||'chatgpt';const labels={chatgpt:['GPT','Astra'],gemini:['Gemini','Google'],notebooklm:['Notebook','LM'],copilot:['Microsoft','Copilot']}[course];
 stage.innerHTML='<canvas class="astra-galaxy" aria-hidden="true"></canvas><span class="astra-word">'+labels[0]+'</span><span class="astra-word">'+labels[1]+'</span><span class="astra-stage-label">'+(course==='chatgpt'?'GPT–6 · Ένας νέος κόσμος δυνατοτήτων':'AI MASTER · Εξερευνήστε τη γνώση')+'</span><span class="astra-stage-tip">Μετακινήστε τον δείκτη · εξερευνήστε τα αστέρια</span>';
 hero.prepend(stage);const meta=document.createElement('div');meta.className='astra-meta';meta.innerHTML='<span>'+chapters.length+' διαφάνειες</span><span>Διαδραστική εξάσκηση</span><span>Με τον δικό σας ρυθμό</span>';hero.append(meta);
 const update=()=>{body.classList.toggle('astra-home',first.classList.contains('visible'));schedule()};new MutationObserver(update).observe(first,{attributes:true,attributeFilter:['class']});update();
 // Keep the existing navigation handlers and SCORM chapter indices intact.
 const menu=document.getElementById('sidebarToggle'),sidebar=document.getElementById('sidebar');
 const menuState=()=>{const open=innerWidth>900?!body.classList.contains('sidebar-collapsed'):body.classList.contains('sidebar-open');menu.setAttribute('aria-expanded',String(open));sidebar.inert=!open;};
 new MutationObserver(menuState).observe(body,{attributes:true,attributeFilter:['class']});menuState();addEventListener('resize',menuState);document.addEventListener('keydown',e=>{if(e.key==='Escape'){body.classList.remove('sidebar-open');if(innerWidth>900)body.classList.add('sidebar-collapsed');}});
 // React Bits SpotlightCard port, without a React runtime dependency.
 document.querySelectorAll('.card,.objectives,.callout,.practice-guide,.enrich-prompt').forEach(card=>{card.classList.add('card-spotlight');card.addEventListener('pointermove',e=>{if(paused)return;const r=card.getBoundingClientRect();card.style.setProperty('--mouse-x',(e.clientX-r.left)+'px');card.style.setProperty('--mouse-y',(e.clientY-r.top)+'px');},{passive:true});});
 const sky=document.createElement('canvas');sky.className='astra-sky';sky.setAttribute('aria-hidden','true');body.prepend(sky);
 const canvas=stage.querySelector('canvas'),ctx=canvas.getContext('2d'),bg=sky.getContext('2d');if(!ctx||!bg)return;
 let seed=314159;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};const noise=()=>((rand()+rand()+rand())/3-.5);
 const stars=Array.from({length:190},()=>({x:rand(),y:rand(),r:rand()*1.1+.25,p:rand()*6.28}));
 const points=[];for(let i=0;i<3600;i++){let t=rand(),x,y;if(course==='chatgpt'&&window.ASTRA_KNOT_POINTS){
  [x,y]=window.ASTRA_KNOT_POINTS[i];x*=.86;y*=.86;
 }else{const a=t*Math.PI*5.5,r=.025+t*.20;x=-.035+Math.cos(a)*r;y=(course==='chatgpt'?.17:0)+Math.sin(a)*r*(course==='chatgpt'?1:1.6);}
 const fuzz=i%6===0?.085:.006;x+=noise()*fuzz;y+=noise()*fuzz;points.push({x,y,z:noise()*.1,r:rand()<.965?rand()*.95+.22:rand()*1.8+1.2,p:rand()*6.28,c:rand()});}
 let width=1,height=1,pointer={x:0,y:0};
 stage.addEventListener('pointermove',e=>{if(paused)return;const r=stage.getBoundingClientRect();pointer.x=(e.clientX-r.left)/r.width-.5;pointer.y=(e.clientY-r.top)/r.height-.5;},{passive:true});stage.addEventListener('pointerleave',()=>{pointer.x=0;pointer.y=0});
 function size(){const dpr=Math.min(devicePixelRatio||1,1.75);width=stage.clientWidth||600;height=stage.clientHeight||500;canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);sky.width=innerWidth*dpr;sky.height=innerHeight*dpr;bg.setTransform(dpr,0,0,dpr,0,0);schedule();}
 function render(){bg.clearRect(0,0,innerWidth,innerHeight);for(const s of stars){bg.fillStyle='rgba(188,214,230,'+(.2+(.5+.5*Math.sin(s.p+clock*.4))*.5)+')';bg.beginPath();bg.arc((s.x*innerWidth+clock*1.3) % innerWidth,s.y*innerHeight,s.r,0,Math.PI*2);bg.fill();}
 if(!first.classList.contains('visible'))return;
 ctx.clearRect(0,0,width,height);const scale=Math.min(height*.96,width*.93),angle=Math.sin(clock*.16)*.13+pointer.x*.38;const cx=width*.5,cy=height*.50;
 const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,scale*.48);glow.addColorStop(0,'rgba(140,191,224,.035)');glow.addColorStop(.65,'rgba(74,122,156,.035)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
 ctx.globalCompositeOperation='lighter';for(const p of points){const x=cx+(p.x*Math.cos(angle)+p.z*Math.sin(angle))*scale,y=cy+(p.y+p.z*pointer.y*.3)*scale;const alpha=.34+(.5+.5*Math.sin(p.p+clock*(.5+p.r*.1)))*.6;const color=p.c>.87?'248,208,174':p.c>.4?'190,222,245':'239,246,251';if(p.r>1.35){const g=ctx.createRadialGradient(x,y,0,x,y,p.r*6);g.addColorStop(0,'rgba('+color+','+alpha*.35+')');g.addColorStop(1,'rgba('+color+',0)');ctx.fillStyle=g;ctx.fillRect(x-p.r*6,y-p.r*6,p.r*12,p.r*12);}ctx.fillStyle='rgba('+color+','+alpha+')';ctx.beginPath();ctx.arc(x,y,p.r*(width<500?.7:1),0,Math.PI*2);ctx.fill();}ctx.globalCompositeOperation='source-over';}
 function frame(now){raf=0;if(document.hidden)return;if(now-last>32||paused){if(!paused)clock+=Math.min((now-last)/1000,.05);last=now;render();}if(!paused)raf=requestAnimationFrame(frame);}
 function schedule(){if(!ready)return;if(!raf&&!document.hidden)raf=requestAnimationFrame(frame);}
 ready=true;new ResizeObserver(size).observe(stage);addEventListener('resize',size);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{last=performance.now();schedule()}});size();
};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();})();
