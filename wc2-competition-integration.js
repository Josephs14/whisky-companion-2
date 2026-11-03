/* Competition 2.0 staging UI — uses the existing WC2 API and state. */
(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const val=(f,k)=>String(f.elements.namedItem(k)?.value??'').trim();
 const field=(k,v='',type='text')=>'<label>'+esc(k)+'<input name="'+esc(k)+'" type="'+type+'" value="'+esc(v)+'" '+(type==='number'?'step="any"':'')+' required></label>';
 const opt=(id,label)=>'<option value="'+esc(id)+'">'+esc(label)+'</option>';
 const day=x=>String(x||'').slice(0,10);
 const guesses=()=>['Guess Region','Guess Distillery','Guess Age','Guess ABV'].map(k=>field(k,'',k.includes('Age')||k.includes('ABV')?'number':'text')).join('');
 const readGuesses=f=>Object.fromEntries(['Guess Region','Guess Distillery','Guess Age','Guess ABV'].map(k=>[k,val(f,k)]));
 const roundOptions=rounds=>'<option value="">Select blind round</option>'+rounds.map(r=>opt(r['Round ID'],r['Round ID']+' · '+day(r.Date))).join('');
 const whiskyLabel=w=>[w.Distillery||w['Brand / Producer']||'Whisky',w.Expression,w.Age?String(w.Age)+'y':'',w['ABV %']?String(w['ABV %'])+'%':'',w['Whisky ID']].filter(Boolean).join(' · ');
 function render(){
  const s=window.WC2.getState(), rounds=s.competition||[], blind=rounds.filter(r=>String(r.Status).toLowerCase()==='blind');
  const whiskies=s.whiskies||[];
  const revealed=rounds.filter(r=>String(r.Status).toLowerCase()==='revealed');
  const scores=revealed.map(r=>Number(r['Competition Score'])).filter(Number.isFinite);
  const avg=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):'—';
  const best=scores.length?Math.max(...scores).toFixed(1):'—';
  const kpi=(label,value)=>'<div class="card" style="padding:14px;min-width:130px;flex:1"><div class="meta">'+label+'</div><div style="font-size:1.5rem;font-weight:700">'+esc(value)+'</div></div>';
  return '<section class="card setup" id="wc2CompetitionPanel"><h3>Competition 2.0</h3><p class="meta">Manage blind rounds and reveals</p>'+
   '<button type="button" class="filterBtn" data-wc2-toggle="wc2CompCreate" aria-expanded="false">+ New blind round</button><form id="wc2CompCreate" hidden><h4>New blind round</h4>'+field('Date',new Date().toISOString().slice(0,10),'date')+guesses()+'<button type="submit" class="primary">Create round</button></form>'+
   '<button type="button" class="filterBtn" data-wc2-toggle="wc2CompEdit" aria-expanded="false">Edit blind round</button><form id="wc2CompEdit" hidden><h4>Edit blind guesses</h4><label>Round<select name="roundId" required>'+roundOptions(blind)+'</select></label>'+guesses()+'<button type="submit" class="primary">Update guesses</button></form>'+
   '<button type="button" class="filterBtn" data-wc2-toggle="wc2CompReveal" aria-expanded="false">Reveal round</button><form id="wc2CompReveal" hidden><h4>Reveal round</h4><label>Round<select name="roundId" required>'+roundOptions(blind)+'</select></label>'+
   '<label>Search existing whisky<input name="whiskySearch" type="search" list="wc2WhiskyChoices" placeholder="Type distillery, expression or ID" required autocomplete="off"><datalist id="wc2WhiskyChoices">'+whiskies.map(w=>opt(whiskyLabel(w),whiskyLabel(w))).join('')+'</datalist></label>'+
   field('Actual Region')+field('Actual Distillery')+field('Actual Age','','number')+field('Actual ABV','','number')+
   '<button type="submit" class="primary">Preview and reveal</button></form>'+
   '<h4>Competition KPIs</h4><div style="display:flex;flex-wrap:wrap;gap:10px">'+kpi('Total rounds',rounds.length)+kpi('Revealed',revealed.length)+kpi('Blind',blind.length)+kpi('Average score',avg)+kpi('Best score',best)+'</div>'+ 
   '<p class="meta">Reveal uses an existing whisky; no Competition Dram is required.</p></section>';
 }
 async function request(action,payload){const r=await window.WC2.api(action,payload);return r;}
 async function submit(form,notify,work){
  const btn=form.querySelector('button[type=submit]');btn.disabled=true;
  try {await work();await window.WC2.refresh();notify('Competition saved');}
  catch(e){notify('Competition: '+(e.message||e));}
  finally{btn.disabled=false;}
 }
 function bind(root,notify){
  const create=root.querySelector('#wc2CompCreate'),edit=root.querySelector('#wc2CompEdit'),reveal=root.querySelector('#wc2CompReveal');
  root.querySelectorAll('[data-wc2-toggle]').forEach(button=>{button.onclick=()=>{const target=root.querySelector('#'+button.dataset.wc2Toggle);const opening=target.hidden;root.querySelectorAll('#wc2CompCreate,#wc2CompEdit,#wc2CompReveal').forEach(form=>form.hidden=true);root.querySelectorAll('[data-wc2-toggle]').forEach(b=>b.setAttribute('aria-expanded','false'));target.hidden=!opening;button.setAttribute('aria-expanded',String(opening));};});
  if(edit){const select=edit.elements.namedItem('roundId');const fill=()=>{const round=(window.WC2.getState().competition||[]).find(r=>String(r['Round ID'])===select.value);for(const k of ['Guess Region','Guess Distillery','Guess Age','Guess ABV'])edit.elements.namedItem(k).value=round?.[k]??'';};select.addEventListener('change',fill);root.querySelectorAll('[data-wc2-edit-round]').forEach(b=>b.onclick=()=>{select.value=b.dataset.wc2EditRound;fill();edit.scrollIntoView({behavior:'smooth',block:'start'});});}
  if(reveal){const select=reveal.elements.namedItem('roundId');root.querySelectorAll('[data-wc2-reveal-round]').forEach(b=>b.onclick=()=>{select.value=b.dataset.wc2RevealRound;reveal.scrollIntoView({behavior:'smooth',block:'start'});});}
  if(create)create.onsubmit=e=>{e.preventDefault();submit(create,notify,async()=>{const record={Date:val(create,'Date'),...readGuesses(create)};await request('CREATE_COMPETITION_ROUND',{record,dryRun:true});await request('CREATE_COMPETITION_ROUND',{record,dryRun:false});});};
  if(edit)edit.onsubmit=e=>{e.preventDefault();submit(edit,notify,async()=>{const roundId=val(edit,'roundId'),changes=readGuesses(edit);await request('UPDATE_COMPETITION_ROUND',{roundId,changes,dryRun:true});await request('UPDATE_COMPETITION_ROUND',{roundId,changes,dryRun:false});});};
  if(reveal)reveal.onsubmit=e=>{e.preventDefault();submit(reveal,notify,async()=>{
    const roundId=val(reveal,'roundId'),current=window.WC2.getState(),selectedWhisky=(current.whiskies||[]).find(w=>whiskyLabel(w)===val(reveal,'whiskySearch'));
    if(!selectedWhisky)throw Error('Choose a whisky from the search suggestions');
    const round=(current.competition||[]).find(r=>String(r['Round ID'])===roundId);
    if(!round||String(round.Status).toLowerCase()!=='blind')throw Error('Choose a blind round to reveal');
    const actual={'Actual Region':val(reveal,'Actual Region'),'Actual Distillery':val(reveal,'Actual Distillery'),'Actual Expression':String(selectedWhisky.Expression||''),'Actual Age':val(reveal,'Actual Age'),'Actual ABV':Number(val(reveal,'Actual ABV')),'Whisky ID':String(selectedWhisky['Whisky ID'])};
    const preview=await request('REVEAL_COMPETITION_ROUND',{roundId,actual,dryRun:true});
    const score=preview?.proposedRecord?.['Competition Score']??preview?.record?.['Competition Score']??'preview available';
    if(!confirm('Reveal '+roundId+'?\\nScore: '+score+'\\nThis action is final.'))return;
    await request('REVEAL_COMPETITION_ROUND',{roundId,actual,dryRun:false});
  });};
 }
 window.WC2CompetitionIntegration=Object.freeze({render,bind});
})();