/* Competition 2.0 production UI — uses the existing WC2 API and state. */
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
  const filled=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
  const num=v=>filled(v)&&Number.isFinite(Number(v))?Number(v):null;
  const average=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  const fmt=(n,d=1)=>n===null?'—':n.toFixed(d);
  const parameters=['Region','Distillery','Age','ABV'];
  const parameterCards=parameters.map((p,i)=>{
   const pairs=revealed.filter(r=>filled(r['Guess '+p])&&filled(r['Actual '+p]));
   const exact=pairs.filter(r=>String(r['Guess '+p]).trim().toLowerCase()===String(r['Actual '+p]).trim().toLowerCase()).length;
   const numeric=p==='Age'||p==='ABV';
   const deviations=numeric?pairs.map(r=>{const a=num(r['Guess '+p]),b=num(r['Actual '+p]);return a===null||b===null?null:Math.abs(a-b)}).filter(v=>v!==null):[];
   const points=revealed.map(r=>{const key=[p+' Score','Score '+p,p+' Points','Points '+p].find(k=>num(r[k])!==null);return key?num(r[key]):null}).filter(v=>v!==null);
   const deviation=numeric?fmt(average(deviations),p==='ABV'?2:1)+(p==='ABV'?' pp':' years'):pairs.length?fmt(100*(pairs.length-exact)/pairs.length)+'%':'—';
   const accuracy=pairs.length?100*exact/pairs.length:null;
   const icons=['🌍','🥃','⌛','%'];
   const total=points.reduce((sum,n)=>sum+n,0);
   const stat=(label,value)=>'<div style="min-width:0;text-align:center"><div class="meta" style="font-size:11px;white-space:nowrap">'+label+'</div><div style="font-weight:700;font-size:16px;margin-top:5px">'+esc(value)+'</div></div>';
   return '<div style="border:1px solid var(--border,#d9dce2);border-radius:12px;padding:13px;min-width:0;background:var(--card,#fff)"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><strong>'+esc(p)+'</strong><span style="font-size:17px">'+icons[i]+'</span></div><div class="meta" style="margin-top:10px">Average deviation</div><div style="font-size:21px;font-weight:700;margin:3px 0 9px">'+esc(deviation)+'</div><div class="meta" style="margin-bottom:12px">Exact matches - '+(accuracy===null?'—':fmt(accuracy)+'%')+'</div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;border-top:1px solid var(--border,#eee);padding-top:12px">'+stat('Scored drams',points.length)+stat('Avg points',fmt(average(points)))+stat('Total points',points.length?fmt(total):'—')+'</div></div>';
  }).join('');
  const kpi=(label,value,icon)=>'<div style="border:1px solid var(--border,#d9dce2);border-radius:12px;padding:11px 12px;background:var(--card,#fff);min-width:0"><div style="display:flex;align-items:center;gap:7px"><span style="font-size:15px">'+icon+'</span><span class="meta">'+label+'</span></div><div style="font-size:clamp(18px,3vw,24px);font-weight:700;margin-top:5px;line-height:1.2">'+esc(value)+'</div></div>';
  const ordered=[...rounds].sort((a,b)=>Number(b.Round||0)-Number(a.Round||0)||String(b.Date||'').localeCompare(String(a.Date||'')));
  const roundCards=ordered.map(r=>{const isBlind=String(r.Status).toLowerCase()==='blind';const score=num(r['Competition Score']);return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 2px;border-bottom:1px solid var(--border,#ddd)"><div style="min-width:0"><strong>'+esc(r['Round ID']||('Round '+(r.Round||'—')))+'</strong><div class="meta">'+esc(day(r.Date))+' · '+(isBlind?'Blind':'Revealed')+'</div></div><div style="text-align:right;flex-shrink:0"><strong>'+(isBlind?'🔒 Blind':score===null?'—':esc(fmt(score))+' pts')+'</strong>'+(isBlind?'<div style="display:flex;gap:5px;margin-top:5px"><button type="button" class="filterBtn" data-wc2-edit-round="'+esc(r['Round ID'])+'">Edit</button><button type="button" class="filterBtn" data-wc2-reveal-round="'+esc(r['Round ID'])+'">Reveal</button></div>':'')+'</div></div>'}).join('');
  return '<div id="wc2CompetitionPanel"><section class="card setup" style="margin-bottom:22px"><h3>Competition controls</h3><p class="meta">Create, edit and reveal blind rounds</p>'+
   '<button type="button" class="filterBtn" data-wc2-toggle="wc2CompCreate" aria-expanded="false">+ New blind round</button><form id="wc2CompCreate" hidden><h4>New blind round</h4>'+field('Date',new Date().toISOString().slice(0,10),'date')+guesses()+'<button type="submit" class="primary">Create round</button></form>'+
   '<button type="button" class="filterBtn" data-wc2-toggle="wc2CompEdit" aria-expanded="false">Edit blind round</button><form id="wc2CompEdit" hidden><h4>Edit blind guesses</h4><label>Round<select name="roundId" required>'+roundOptions(blind)+'</select></label>'+guesses()+'<button type="submit" class="primary">Update guesses</button></form>'+
   '<button type="button" class="filterBtn" data-wc2-toggle="wc2CompReveal" aria-expanded="false">Reveal round</button><form id="wc2CompReveal" hidden><h4>Reveal round</h4><label>Round<select name="roundId" required>'+roundOptions(blind)+'</select></label>'+
   '<label>Search existing whisky<input name="whiskySearch" type="search" list="wc2WhiskyChoices" placeholder="Type distillery, expression or ID" required autocomplete="off"><datalist id="wc2WhiskyChoices">'+whiskies.map(w=>opt(whiskyLabel(w),whiskyLabel(w))).join('')+'</datalist></label>'+
   field('Actual Region')+field('Actual Distillery')+field('Actual Age','','number')+field('Actual ABV','','number')+
   '<button type="submit" class="primary">Preview and reveal</button></form>'+
   '<p class="meta">Reveal uses an existing whisky; no Competition Dram is required.</p></section>'+ 
   '<section class="card setup" style="margin-top:20px"><h3>Competition performance</h3><p class="meta">Your results across revealed competition rounds</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:8px;margin:12px 0 18px">'+kpi('Total rounds',rounds.length,'🏁')+kpi('Revealed',revealed.length,'✓')+kpi('Blind',blind.length,'◈')+kpi('Average score',avg,'◎')+kpi('Best score',best,'★')+'</div>'+ 
   '<h4 style="margin-top:14px">Parameter analysis</h4><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px;margin:12px 0 16px">'+parameterCards+'</div>'+ 
   '<p class="meta">Age deviation in years; ABV in percentage points. Region and Distillery show mismatch rate. Scores are shown when recorded. Revealed rounds only.</p></section>'+ 
   '<section class="card setup" style="margin-top:20px"><h3>Competition rounds</h3><p class="meta">'+rounds.length+' recorded rounds</p><div>'+ (roundCards||'<p class="meta">No rounds recorded.</p>')+'</div>'+ 
   '</section></div>';
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
  if(edit){const select=edit.elements.namedItem('roundId');const fill=()=>{const round=(window.WC2.getState().competition||[]).find(r=>String(r['Round ID'])===select.value);for(const k of ['Guess Region','Guess Distillery','Guess Age','Guess ABV'])edit.elements.namedItem(k).value=round?.[k]??'';};select.addEventListener('change',fill);root.querySelectorAll('[data-wc2-edit-round]').forEach(b=>b.onclick=()=>{select.value=b.dataset.wc2EditRound;root.querySelectorAll('#wc2CompCreate,#wc2CompEdit,#wc2CompReveal').forEach(f=>f.hidden=true);edit.hidden=false;root.querySelectorAll('[data-wc2-toggle]').forEach(x=>x.setAttribute('aria-expanded',String(x.dataset.wc2Toggle==='wc2CompEdit')));fill();edit.scrollIntoView({behavior:'smooth',block:'start'});});}
  if(reveal){const select=reveal.elements.namedItem('roundId');root.querySelectorAll('[data-wc2-reveal-round]').forEach(b=>b.onclick=()=>{select.value=b.dataset.wc2RevealRound;root.querySelectorAll('#wc2CompCreate,#wc2CompEdit,#wc2CompReveal').forEach(f=>f.hidden=true);reveal.hidden=false;root.querySelectorAll('[data-wc2-toggle]').forEach(x=>x.setAttribute('aria-expanded',String(x.dataset.wc2Toggle==='wc2CompReveal')));reveal.scrollIntoView({behavior:'smooth',block:'start'});});}
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