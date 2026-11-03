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
 function render(){
  const s=window.WC2.getState(), rounds=s.competition||[], blind=rounds.filter(r=>String(r.Status).toLowerCase()==='blind');
  const used=new Set(rounds.map(r=>String(r['Tasting ID']||'')));
  const drams=(s.drams||[]).filter(d=>d['Tasting Context']==='Competition'&&!used.has(String(d['Tasting ID'])));
  const whiskies=s.whiskies||[];
  return '<section class="card setup" id="wc2CompetitionPanel"><h3>Competition 2.0 · Staging</h3><p class="meta">'+rounds.length+' rounds · '+blind.length+' blind</p>'+
   '<form id="wc2CompCreate"><h4>New blind round</h4>'+field('Date',new Date().toISOString().slice(0,10),'date')+guesses()+'<button type="submit" class="primary">Create round</button></form>'+
   '<form id="wc2CompEdit"><h4>Edit blind guesses</h4><label>Round<select name="roundId" required>'+roundOptions(blind)+'</select></label>'+guesses()+'<button type="submit" class="primary">Update guesses</button></form>'+
   '<form id="wc2CompReveal"><h4>Reveal round</h4><label>Round<select name="roundId" required>'+roundOptions(blind)+'</select></label>'+
   '<label>Existing whisky<select name="whiskyId" required><option value="">Select whisky</option>'+whiskies.map(w=>opt(w['Whisky ID'],(w.Distillery||w.Brand||'Whisky')+' · '+(w.Expression||'')+' · '+w['Whisky ID'])).join('')+'</select></label>'+
   '<label>Competition dram<select name="tastingId" required><option value="">Select dram</option>'+drams.map(d=>opt(d['Tasting ID'],d['Tasting ID']+' · '+day(d['Tasting Date'])+' · '+d['Whisky ID'])).join('')+'</select></label>'+
   field('Actual Region')+field('Actual Distillery')+field('Actual Expression')+field('Actual Age','','number')+field('Actual ABV','','number')+
   '<button type="submit" class="primary">Preview and reveal</button></form>'+
   '<h4>Recent rounds</h4>'+[...rounds].sort((a,b)=>Number(b.Round)-Number(a.Round)).slice(0,12).map(r=>'<div class="detailList"><div><span>'+esc(r['Round ID'])+' · '+esc(day(r.Date))+' · '+esc(r.Status)+'</span><b>'+esc(String(r.Status).toLowerCase()==='revealed'?(r['Competition Score']??'—')+' pts':'Blind')+'</b></div></div>').join('')+
   '<p class="meta">Reveal requires an existing Whisky and matching Competition Dram dated the same day as the round.</p></section>';
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
  if(create)create.onsubmit=e=>{e.preventDefault();submit(create,notify,async()=>{const record={Date:val(create,'Date'),...readGuesses(create)};await request('CREATE_COMPETITION_ROUND',{record,dryRun:true});await request('CREATE_COMPETITION_ROUND',{record,dryRun:false});});};
  if(edit)edit.onsubmit=e=>{e.preventDefault();submit(edit,notify,async()=>{const roundId=val(edit,'roundId'),changes=readGuesses(edit);await request('UPDATE_COMPETITION_ROUND',{roundId,changes,dryRun:true});await request('UPDATE_COMPETITION_ROUND',{roundId,changes,dryRun:false});});};
  if(reveal)reveal.onsubmit=e=>{e.preventDefault();submit(reveal,notify,async()=>{
    const roundId=val(reveal,'roundId'),whiskyId=val(reveal,'whiskyId'),tastingId=val(reveal,'tastingId'),s=window.WC2.getState();
    const round=s.competition.find(r=>r['Round ID']===roundId),dram=s.drams.find(d=>d['Tasting ID']===tastingId);
    if(!round||!dram||day(round.Date)!==day(dram['Tasting Date'])||String(dram['Whisky ID'])!==whiskyId||dram['Tasting Context']!=='Competition')throw Error('Select a Competition Dram matching the whisky and round date');
    const actual={'Actual Region':val(reveal,'Actual Region'),'Actual Distillery':val(reveal,'Actual Distillery'),'Actual Expression':val(reveal,'Actual Expression'),'Actual Age':val(reveal,'Actual Age'),'Actual ABV':Number(val(reveal,'Actual ABV')),'Whisky ID':whiskyId,'Tasting ID':tastingId};
    const preview=await request('REVEAL_COMPETITION_ROUND',{roundId,actual,dryRun:true});
    const score=preview?.proposedRecord?.['Competition Score']??preview?.record?.['Competition Score']??'preview available';
    if(!confirm('Reveal '+roundId+'?\\nScore: '+score+'\\nThis action is final.'))return;
    await request('REVEAL_COMPETITION_ROUND',{roundId,actual,dryRun:false});
  });};
 }
 window.WC2CompetitionIntegration=Object.freeze({render,bind});
})();