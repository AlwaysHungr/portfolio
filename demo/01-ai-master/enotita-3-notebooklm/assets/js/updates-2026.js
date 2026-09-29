/* Subsection links reuse existing navigation. No slide IDs or storage keys change. */
(function(){
 'use strict';
 function ready(){
  var chapters=Array.prototype.slice.call(document.querySelectorAll('.chapter'));
  var parents=Array.prototype.slice.call(document.querySelectorAll('#navList .nav-item'));
  function go(id,writeHash){
   var target=document.getElementById(id);
   if(!target||!target.classList.contains('ai-update'))return;
   var index=chapters.indexOf(target.closest('.chapter'));
   if(index<0||!parents[index])return;
   parents[index].click();
   if(writeHash){try{history.replaceState(null,'','#'+id);}catch(e){}}
   requestAnimationFrame(function(){
    target.querySelector('h2').focus({preventScroll:true});
    target.scrollIntoView({behavior:'instant',block:'start'});
   });
  }
  document.querySelectorAll('.ai-update').forEach(function(target){
   var index=chapters.indexOf(target.closest('.chapter'));
   if(!parents[index])return;
   var b=document.createElement('button');b.type='button';b.className='nav-update';
   b.textContent='↳ '+target.getAttribute('data-update-title');
   b.setAttribute('aria-label','Νέα υποενότητα: '+target.getAttribute('data-update-title'));
   b.addEventListener('click',function(){go(target.id,true);});
   parents[index].parentElement.appendChild(b);
  });
  document.addEventListener('click',function(e){
   var a=e.target.closest('a[data-update-link]');
   if(!a)return;e.preventDefault();go(a.getAttribute('href').slice(1),true);
  });
  // Arrow keys scroll the new wide tables instead of changing the parent slide.
  document.querySelectorAll('.update-table').forEach(function(t){
   t.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'||e.key==='ArrowRight')e.stopPropagation();});
  });
  window.addEventListener('hashchange',function(){go(location.hash.slice(1),false);});
  if(location.hash)go(location.hash.slice(1),false);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
