(()=>{'use strict';const chapters=[...document.querySelectorAll('.chapter')],buttons=[...document.querySelectorAll('#navList .nav-item')];let routing=false;
chapters.forEach((ch,i)=>{const counter=ch.querySelector('.ch-indicator');if(counter?.firstChild?.nodeType===Node.TEXT_NODE)counter.firstChild.textContent=`Διαφάνεια ${i+1} από ${chapters.length} · `;const number=buttons[i]?.querySelector('.nav-num');if(number)number.textContent=String(i+1)});
function navigate(key,practice=false){let target=document.getElementById(key);if(target&&!target.classList.contains('chapter'))target=target.closest('.chapter');if(practice){const alias=target?.dataset.update||key;target=chapters.find(ch=>ch.dataset.update===alias&&ch.dataset.practice==='true')||target}if(!target)return;const index=chapters.indexOf(target);if(index<0)return;routing=true;buttons[index].click();routing=false;window.scrollTo(0,0)}
document.addEventListener('click',e=>{const link=e.target.closest('a[data-update-link]');if(link){e.preventDefault();navigate(link.hash.slice(1))}});
function sync(){if(routing)return;const current=document.querySelector('.chapter.visible');if(!current)return;const url=new URL(location.href);url.hash=current.id;url.searchParams.delete('view');history.replaceState(null,'',url);}
new MutationObserver(sync).observe(document.getElementById('content'),{attributes:true,subtree:true,attributeFilter:['class']});
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
// Keep native form/video controls from triggering the document-level slide arrows.
document.querySelectorAll('.slide-unit').forEach(root=>root.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,button,summary,video')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',' '].includes(e.key))e.stopPropagation()}));
if(location.hash)navigate(location.hash.slice(1),new URLSearchParams(location.search).get('view')==='practice');else if(Number.isInteger(window.__pagedResume)&&chapters[window.__pagedResume])navigate(chapters[window.__pagedResume].id);
})();
