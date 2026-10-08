(() => {
'use strict';
const root=document.getElementById('app');
let tab='Home', noticeTimer=null, collectionFilter='Current', collectionQuery='', selectedBottleId=null, collectionFilters={distillery:'',region:'',country:'',age:'',abv:'',peated:'',bottler:'',cask:'',fill:'',finishedYear:''}, filtersOpen=false, bottleView='detail', editSection='bottle', addMode='existing';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const dateInput=v=>{if(v===null||v===undefined||v==='')return '';if(typeof v==='number'){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.toISOString().slice(0,10)}const s=String(v);return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):s};
const dateValue=v=>{if(v===null||v===undefined||v==='')return 0;if(typeof v==='number'){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.getTime()}const s=String(v).trim();let d=new Date(s);if(!isNaN(d))return d.getTime();const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime():0};
function toast(msg){let n=document.querySelector('.notice');if(!n){n=document.createElement('div');n.className='notice';document.body.appendChild(n)}n.textContent=msg;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.remove(),2800)}
function state(){return window.WC2?WC2.getState():{whiskies:[],bottles:[],sessions:[],drams:[]}}
function scored(){return state().drams.map(d=>num(d['Score'])).filter(v=>v!==null&&v>=0&&v<=100)}
function average(a){return a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):'—'}
function openCount(){return state().bottles.filter(b=>String(b['Status']).toLowerCase()==='open').length}
function topField(field){
 const wi=new Map(state().whiskies.map(w=>[String(w['Whisky ID']),w])),m=new Map();
 state().drams.forEach(d=>{const w=wi.get(String(d['Whisky ID']));const k=w&&String(w[field]||'').trim();if(k)m.set(k,(m.get(k)||0)+1)});
 return [...m].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0])))[0]||['—',0];
}
function topDistillery(){return topField('Distillery')}
function topRegion(){return topField('Region')}
function uniqueWhiskies(){return new Set(state().drams.map(d=>d['Whisky ID']).filter(Boolean)).size}
function lastRefresh(){const v=WC2.getLastRefresh();if(!v)return 'Not refreshed';const d=new Date(v);return isNaN(d)?'Updated':('Updated '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}))}
function home(){
 const s=state(),scores=scored(),top=topDistillery(),region=topRegion();
 const sessions=new Map(s.sessions.map(x=>[String(x['Session ID']),x]));
 const recent=[...s.drams].sort((a,b)=>dateValue(b['Tasting Date']||sessions.get(String(b['Session ID']))?.['Date'])-dateValue(a['Tasting Date']||sessions.get(String(a['Session ID']))?.['Date'])).slice(0,3);
 const wi=new Map(s.whiskies.map(w=>[String(w['Whisky ID']),w]));
 return `<div class="topbar"><div class="brand"><div class="logo">🥃</div><div><div class="title">Whisky Companion</div><div class="sync"><span class="dot" style="display:inline-block;margin-right:5px"></span>${esc(lastRefresh())}</div></div></div><button class="iconBtn" id="settings">⚙️</button></div>
 <section class="hero"><h1>Good evening</h1><p>What shall we explore today?</p></section>
 <div class="sectionHead"><h2>Key Stats</h2></div>
 <section class="kpis">
  <div class="card kpi"><div class="value">${s.bottles.length||'—'}</div><div class="label">Bottles</div><div class="sub">${openCount()} open</div></div>
  <div class="card kpi"><div class="value">${uniqueWhiskies()||'—'}</div><div class="label">Whiskies tasted</div><div class="sub">${s.drams.length} drams</div></div>
  <div class="card kpi"><div class="value">${average(scores)}</div><div class="label">Avg. score</div><div class="sub">all scored drams</div></div>
  <div class="card kpi"><div class="value">${s.sessions.length||'—'}</div><div class="label">Tasting sessions</div></div>
  <div class="card kpi"><div class="value" style="font-size:16px">${esc(top[0])}</div><div class="label">Top distillery</div><div class="sub">${top[1]} drams</div></div>
  <div class="card kpi"><div class="value" style="font-size:16px">${esc(region[0])}</div><div class="label">Top region</div><div class="sub">${region[1]} drams</div></div>
 </section>
 <div class="sectionHead"><h2>Recent Activity</h2></div>
 <section class="card list">${recent.length?recent.map(d=>{const w=wi.get(String(d['Whisky ID']))||{};return `<div class="row"><div class="thumb">🥃</div><div class="grow"><div class="name">${esc(w['Distillery']||w['Brand / Producer']||'Whisky')}</div><div class="meta">${esc(w['Expression']||d['Tasting Context']||'Tasting')}</div></div>${d['Score']!==''&&d['Score']!=null?`<div class="score">${esc(d['Score'])}</div>`:''}</div>`}).join(''):'<div class="placeholder">Refresh to load recent activity.</div>'}</section>
 <div class="sectionHead"><h2>Trip</h2></div>
 <section class="card trip" id="tripCard"><div class="tripIcon">✈️</div><div class="grow"><div class="name">Scotland Trip 2026</div><div class="meta">7 days · distilleries · tastings · buying targets</div></div><div>›</div></section>
 <div class="sectionHead"><h2>Quick Actions</h2></div>
 <section class="quick"><button id="addBottleHome"><span>🍾</span>Add Bottle</button><button><span>🥃</span>New Tasting</button><button data-go="Live"><span>📷</span>Live Mode</button><button id="refresh"><span>↻</span>Refresh</button></section>`;
}

function collection(){
 const s=state(),wi=new Map(s.whiskies.map(w=>[String(w['Whisky ID']),w]));
 const statuses=['Current','Open','Sealed','Finished'];
 const isStatus=(b,x)=>String(b['Status']||'').toLowerCase()===x.toLowerCase();
 const counts={Current:s.bottles.filter(b=>isStatus(b,'Open')||isStatus(b,'Sealed')).length,Open:s.bottles.filter(b=>isStatus(b,'Open')).length,Sealed:s.bottles.filter(b=>isStatus(b,'Sealed')).length,Finished:s.bottles.filter(b=>isStatus(b,'Finished')).length};
 const base=s.bottles.filter(b=>collectionFilter==='Current'?(isStatus(b,'Open')||isStatus(b,'Sealed')):isStatus(b,collectionFilter));
 const values=field=>[...new Set(base.map(b=>String((wi.get(String(b['Whisky ID']))||{})[field]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const peatClass=v=>{const x=String(v||'').trim().toLowerCase();if(!x)return 'Unknown';if(['no','n','false','unpeated','not peated','non-peated','non peated','0'].includes(x)||x.startsWith('unpeated'))return 'Unpeated';if(['yes','y','true','peated','peat','smoky','smoked','1'].includes(x))return 'Peated';return 'Unknown'};
 const q=collectionQuery.trim().toLowerCase(),f=collectionFilters;
 const filtered=base.filter(b=>{
   const w=wi.get(String(b['Whisky ID']))||{}, age=num(w['Age Years']||w['Age Statement']), abv=num(w['ABV %']), fill=num(b['Current Fill %']);
   if(q&&![b['Bottle ID'],w['Distillery'],w['Brand / Producer'],w['Expression'],w['Region'],w['Country'],w['Age Statement'],w['ABV %']].some(v=>String(v||'').toLowerCase().includes(q)))return false;
   if(f.distillery&&String(w['Distillery']||'')!==f.distillery)return false;
   if(f.region&&String(w['Region']||'')!==f.region)return false;
   if(f.country&&String(w['Country']||'')!==f.country)return false;
   if(f.bottler&&String(w['Bottler']||'')!==f.bottler)return false;
   if(f.cask&&!String(w['Cask Type / Maturation']||'').toLowerCase().includes(f.cask.toLowerCase()))return false;
   if(f.peated&&peatClass(w['Peated'])!==f.peated)return false;
   if(f.age==='NAS'&&age!==null)return false;if(f.age==='0-9'&&(age===null||age>9))return false;if(f.age==='10-17'&&(age===null||age<10||age>17))return false;if(f.age==='18+'&&(age===null||age<18))return false;
   if(f.abv==='under46'&&(abv===null||abv>=46))return false;if(f.abv==='46-50'&&(abv===null||abv<46||abv>50))return false;if(f.abv==='over50'&&(abv===null||abv<=50))return false;
   if(f.fill==='low'&&(fill===null||fill>25))return false;if(f.fill==='mid'&&(fill===null||fill<26||fill>60))return false;if(f.fill==='high'&&(fill===null||fill<61))return false;
   if(f.finishedYear&&String(b['Finished Date']||'').indexOf(f.finishedYear)<0)return false;
   return true;
 }).sort((a,b)=>{const wa=wi.get(String(a['Whisky ID']))||{},wb=wi.get(String(b['Whisky ID']))||{};return String(wa['Distillery']||wa['Brand / Producer']||'').localeCompare(String(wb['Distillery']||wb['Brand / Producer']||''))||String(wa['Expression']||'').localeCompare(String(wb['Expression']||''))});
 if(selectedBottleId){const b=s.bottles.find(x=>String(x['Bottle ID'])===String(selectedBottleId));if(b)return bottleDetail(b,wi.get(String(b['Whisky ID']))||{});selectedBottleId=null}
 const current=counts.Current;
 const dist=new Map(),reg=new Map();let abvs=[];
 base.forEach(b=>{const w=wi.get(String(b['Whisky ID']))||{};const d=String(w['Distillery']||w['Brand / Producer']||'').trim(),r=String(w['Region']||'').trim(),a=num(w['ABV %']);if(d)dist.set(d,(dist.get(d)||0)+1);if(r)reg.set(r,(reg.get(r)||0)+1);if(a!==null)abvs.push(a)});
 const top=m=>[...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]||['—',0],td=top(dist),tr=top(reg),avg=abvs.length?(abvs.reduce((a,b)=>a+b,0)/abvs.length).toFixed(1):'—';
 const active=Object.entries(f).filter(([,v])=>v);
 const opts=(arr,val)=>'<option value="">All</option>'+arr.map(x=>`<option ${x===val?'selected':''}>${esc(x)}</option>`).join('');
 const years=[...new Set(base.map(b=>{const m=String(b['Finished Date']||'').match(/(20\\d{2})/);return m&&m[1]}).filter(Boolean))].sort().reverse();
 return `<div class="topbar"><div><div class="title">Collection</div><div class="sync">${s.bottles.length} bottles · ${current} current</div></div><div><button class="iconBtn" id="addBottleCollection" aria-label="Add bottle">＋</button><button class="iconBtn" id="collectionRefresh">↻</button></div></div>
 <section class="collectionSummary"><div><strong>${base.length}</strong><span>${collectionFilter} bottles</span></div><div><strong>${esc(td[0])}</strong><span>Top distillery · ${td[1]}</span></div><div><strong>${esc(tr[0])}</strong><span>Top region · ${tr[1]}</span></div><div><strong>${avg==='—'?'—':avg+'%'}</strong><span>Average ABV</span></div></section>
 <div class="segmented">${statuses.map(x=>`<button data-collection-filter="${x}" class="${collectionFilter===x?'active':''}">${x}<small>${counts[x]||0}</small></button>`).join('')}</div>
 <div class="searchFilterRow"><div class="searchbox">⌕<input id="collectionSearch" value="${esc(collectionQuery)}" placeholder="Search distillery, expression, region…"><button id="clearSearch">${collectionQuery?'×':''}</button></div><button class="filterBtn ${active.length?'active':''}" id="filterToggle">☷ Filters${active.length?' · '+active.length:''}</button></div>
 ${filtersOpen?`<section class="card filterPanel"><div class="filterGrid">
 <label>Distillery<select data-filter="distillery">${opts(values('Distillery'),f.distillery)}</select></label><label>Region<select data-filter="region">${opts(values('Region'),f.region)}</select></label>
 <label>Country<select data-filter="country">${opts(values('Country'),f.country)}</select></label><label>Age<select data-filter="age"><option value="">All</option><option value="NAS" ${f.age==='NAS'?'selected':''}>NAS</option><option value="0-9" ${f.age==='0-9'?'selected':''}>Under 10</option><option value="10-17" ${f.age==='10-17'?'selected':''}>10–17</option><option value="18+" ${f.age==='18+'?'selected':''}>18+</option></select></label>
 <label>ABV<select data-filter="abv"><option value="">All</option><option value="under46" ${f.abv==='under46'?'selected':''}>Under 46%</option><option value="46-50" ${f.abv==='46-50'?'selected':''}>46–50%</option><option value="over50" ${f.abv==='over50'?'selected':''}>Over 50%</option></select></label><label>Peat<select data-filter="peated"><option value="">All</option><option value="Peated" ${f.peated==='Peated'?'selected':''}>Peated</option><option value="Unpeated" ${f.peated==='Unpeated'?'selected':''}>Unpeated</option><option value="Unknown" ${f.peated==='Unknown'?'selected':''}>Unknown / not recorded</option></select></label>
 <label>Bottler<select data-filter="bottler">${opts(values('Bottler'),f.bottler)}</select></label><label>Cask<input data-filter="cask" value="${esc(f.cask)}" placeholder="e.g. Sherry"></label>
 ${collectionFilter==='Open'?'<label>Fill level<select data-filter="fill"><option value="">All</option><option value="low" '+(f.fill==='low'?'selected':'')+'>≤25%</option><option value="mid" '+(f.fill==='mid'?'selected':'')+'>26–60%</option><option value="high" '+(f.fill==='high'?'selected':'')+'>61–100%</option></select></label>':''}
 ${collectionFilter==='Finished'?'<label>Finished year<select data-filter="finishedYear">'+opts(years,f.finishedYear)+'</select></label>':''}
 </div><button class="clearFilters" id="clearFilters">Clear filters</button></section>`:''}
 ${active.length?`<div class="filterChips">${active.map(([k,v])=>`<button data-clear-filter="${k}">${esc(v)} ×</button>`).join('')}</div>`:''}
 <div class="sectionHead"><h2>${collectionFilter} Bottles</h2><span class="meta">${filtered.length} shown</span></div>
 <section class="bottleGrid">${filtered.length?filtered.map(b=>bottleCard(b,wi.get(String(b['Whisky ID']))||{})).join(''):'<div class="card placeholder">No bottles match this view.</div>'}</section>`;
}
function bottlePhoto(id){
 const matches=(state().photos||[]).filter(p=>String(p['Entity Type']||'').toLowerCase()==='bottle'&&String(p['Entity ID'])===String(id)&&!['yes','true','1'].includes(String(p['Voided']||'').toLowerCase()));
 const p=matches.find(x=>['yes','true','1'].includes(String(x['Primary']||'').toLowerCase()))||matches[0];
 const raw=String(p?.['Photo Reference']||'').trim();
 if(!raw.startsWith('https://'))return '';
 try{return new URL(raw).href}catch(e){return ''}
}
function bottleImage(id,cls){
 const src=bottlePhoto(id);
 return src?`<img class="${cls}" src="${esc(src)}" alt="Bottle photo" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode('🍾'))">`:'🍾';
}
function bottleCard(b,w){
 const status=String(b['Status']||'Unknown'),fill=num(b['Current Fill %']);
 const maker=w['Distillery']||w['Brand / Producer']||'Unknown whisky';
 const expression=w['Expression']||w['Series / Collection']||'';
 const bits=[w['Age Statement']||'',w['ABV %']!==''&&w['ABV %']!=null?(w['ABV %']+'% ABV'):'',w['Region']||''].filter(Boolean);
 return `<article class="card bottleCard" data-bottle-id="${esc(b['Bottle ID'])}">
   <div class="bottleArt">${bottleImage(b['Bottle ID'],'bottleThumb')}</div><div class="grow"><div class="bottleTop"><div><div class="name">${esc(maker)}</div><div class="expression">${esc(expression)}</div></div><span class="pill ${status.toLowerCase()}">${esc(status)}</span></div>
   <div class="meta">${esc(bits.join(' · '))}</div>
   ${status.toLowerCase()==='open'&&fill!==null?`<div class="fillLine"><div><span>Fill</span><b>${fill}%</b></div><div class="fillTrack"><i style="width:${Math.max(0,Math.min(100,fill))}%"></i></div></div>`:''}
   <div class="bottleFoot"><span>${esc(b['Bottle ID'])}</span><span>View ›</span></div></div></article>`;
}
function bottleDetail(b,w){
 const id=String(b['Bottle ID']),s=state();
 if(bottleView==='history'){
  const life=s.bottleLifecycle.filter(x=>String(x['Bottle ID'])===id),fills=s.fillHistory.filter(x=>String(x['Bottle ID'])===id),cons=s.consumptionEvents.filter(x=>String(x['Bottle ID'])===id),drams=s.drams.filter(x=>String(x['Bottle ID'])===id);
  const events=[...life.map(x=>({date:x['Event Date'],type:x['Event Type']||'Lifecycle',note:x['Source / Note']||((x['From Status']||'')+' → '+(x['To Status']||''))})),...fills.map(x=>({date:x['Event Date'],type:'Fill '+x['Fill %']+'%',note:x['Source / Note']||''})),...cons.map(x=>({date:x['Event Date'],type:x['Event Type']||'Consumption',note:x['Note']||''})),...drams.map(x=>({date:x['Tasting Date'],type:'Tasting'+(x['Score']!==''?' · '+x['Score']:'') ,note:x['Free Notes']||''}))].sort((a,b)=>dateValue(b.date)-dateValue(a.date));
  return `<div class="topbar"><button class="backBtn" id="backBottleDetail">‹ Bottle</button><div class="title">History</div><span></span></div><section class="card list">${events.length?events.map(x=>`<div class="row"><div class="grow"><div class="name">${esc(x.type)}</div><div class="meta">${esc(x.date||'Date unknown')}${x.note?' · '+esc(x.note):''}</div></div></div>`).join(''):'<div class="placeholder">No history recorded for this bottle.</div>'}</section>`;
 }
 if(bottleView==='edit'){
  const bottleFields=['Bottle Number','Collection Role','Acquisition Date','Acquisition Date Precision','Acquisition Type','Shop / Source','Purchase Price','Currency','Status','Open Date','Open Date Precision','Finished Date','Finished Date Precision','Current Fill %','Replace When Empty','Notes','Verification Status'];
  const whiskyFields=['Whisky Type','Distillery','Bottler','Brand / Producer','Expression','Series / Collection','Release Type','Country','Region','Bottling Year','Age Years','Age Statement','ABV %','Bottle Size ml','Cask Type / Maturation','Cask Number','Outturn','Peated','Whiskybase ID','Whiskybase URL','Verification Status','Last Verified'];
  const fields=editSection==='bottle'?bottleFields:whiskyFields, source=editSection==='bottle'?b:w;
  const form=fields.map(key=>{
   const dateField=['Acquisition Date','Open Date','Finished Date','Last Verified'].includes(key);
   const val=dateField?dateInput(source[key]):(source[key]??''),label=esc(key),inputId=esc(key);
   if(key==='Status')return `<label>${label}<select data-edit-field="${inputId}" data-edit-entity="bottle">${['Sealed','Open','Finished'].map(v=>`<option value="${v}" ${String(val)===v?'selected':''}>${v}</option>`).join('')}</select></label>`;
   if(key==='Notes')return `<label>${label}<textarea data-edit-field="${inputId}" data-edit-entity="bottle" rows="4">${esc(val)}</textarea></label>`;
   const type=dateField?'date':(['Purchase Price','Current Fill %','Age Years','ABV %','Bottle Size ml','Bottling Year','Outturn'].includes(key)?'number':'text');
   return `<label>${label}<input type="${type}" data-edit-field="${inputId}" data-edit-entity="${editSection}" value="${esc(val)}"></label>`;
  }).join('');
  return `<div class="topbar"><button class="backBtn" id="backBottleDetail">‹ Bottle</button><div class="title">Edit Bottle</div><span></span></div>
  <div class="segmented editTabs"><button data-edit-section="bottle" class="${editSection==='bottle'?'active':''}">Bottle Details</button><button data-edit-section="whisky" class="${editSection==='whisky'?'active':''}">Whisky Details</button></div>
  <section class="card setup"><div class="meta">${editSection==='whisky'?'Shared release information — edits will affect every linked bottle and tasting.':'Details of this specific physical bottle.'}</div>
  <div class="editFields">${form}</div><button class="primary" id="saveBottleEdit">Save Changes</button>
  <div class="meta" style="margin-top:12px">Save updates this tab only. Status, fill and lifecycle dates require their dedicated workflow and cannot be edited here. Whisky changes affect all linked bottles and tastings.</div></section>`;
 }
 if(bottleView==='taste'){
  return `<div class="topbar"><button class="backBtn" id="backBottleDetail">‹ Bottle</button><div class="title">Taste Bottle</div><span></span></div><section class="detailHero card"><div class="detailBottle">🥃</div><div><div class="eyebrow">${esc(w['Distillery']||w['Brand / Producer']||'Whisky')}</div><h1>${esc(w['Expression']||'Bottle')}</h1><div class="meta">Linked to ${esc(id)}</div></div></section><section class="card setup"><label>Score<input id="tasteScore" type="number" min="0" max="100" step="0.5" placeholder="Optional"></label><label>Nose<textarea id="tasteNose" rows="2"></textarea></label><label>Palate<textarea id="tastePalate" rows="2"></textarea></label><label>Finish<textarea id="tasteFinish" rows="2"></textarea></label><label>Notes<textarea id="tasteNotes" rows="3"></textarea></label><button class="primary" id="saveBottleTaste">Save Tasting</button></section>`;
 }
 const fields=[['Status',b['Status']],['Current fill',b['Current Fill %']!==''&&b['Current Fill %']!=null?b['Current Fill %']+'%':'—'],['Age',w['Age Statement']||w['Age Years']],['ABV',w['ABV %']!==''&&w['ABV %']!=null?w['ABV %']+'%':'—'],['Region',w['Region']],['Cask / Maturation',w['Cask Type / Maturation']],['Acquired',b['Acquisition Date']],['Source',b['Shop / Source']],['Bottle ID',b['Bottle ID']],['Whisky ID',b['Whisky ID']]];
 return `<div class="topbar"><button class="backBtn" id="backCollection">‹ Collection</button><button class="iconBtn" id="detailRefresh">↻</button></div>
 <section class="detailHero card"><div class="detailBottle">${bottleImage(b['Bottle ID'],'bottleHeroImage')}</div><div><div class="eyebrow">${esc(w['Distillery']||w['Brand / Producer']||'Whisky')}</div><h1>${esc(w['Expression']||w['Series / Collection']||'Bottle')}</h1><span class="pill ${String(b['Status']||'').toLowerCase()}">${esc(b['Status']||'Unknown')}</span></div></section>
 <div class="detailActions four"><button id="editBottle">✎<span>Edit</span></button><button id="tasteBottle">🥃<span>Taste</span></button><button id="historyBottle">▥<span>History</span></button><button id="deleteBottle" class="dangerAction">⌫<span>Delete</span></button></div>
 <div class="sectionHead"><h2>Bottle Details</h2></div><section class="card detailList">${fields.filter(x=>x[1]!==''&&x[1]!=null).map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</section>
 ${b['Notes']?`<div class="sectionHead"><h2>Notes</h2></div><section class="card notes">${esc(b['Notes'])}</section>`:''}`;
}

function generic(title,text){return `<div class="topbar"><div class="title">${title}</div></div><div class="card placeholder"><b>${title}</b><br><br>${text}</div>`}
function setup(){return `<div class="topbar"><div class="brand"><div class="logo">🥃</div><div class="title">Whisky Companion</div></div></div><div class="card setup"><div class="name">Connect this device</div><div class="meta">Enter the private API token for this development device. It is stored only for this browser session and is not committed to GitHub.</div><input id="tokenInput" type="password" autocomplete="off" placeholder="API token"><button class="primary" id="saveToken">Connect & Refresh</button></div>`}
function bottom(){return `<nav class="bottom"><div class="bottomInner">${[['Home','⌂'],['Collection','🍾'],['Tastings','🥃'],['Live','📷'],['Insights','▥']].map(([x,i])=>`<button data-tab="${x}" class="${tab===x?'active':''}"><span>${i}</span>${x}</button>`).join('')}</div></nav>`}
function addBottlePage(){
 const whiskies=[...state().whiskies].sort((a,b)=>String(a['Distillery']||'').localeCompare(String(b['Distillery']||''))||String(a['Expression']||'').localeCompare(String(b['Expression']||'')));
 const option=whiskies.map(w=>`<option value="${esc(w['Whisky ID'])}">${esc([w['Distillery'],w['Expression'],w['Age Years']?w['Age Years']+'y':''].filter(Boolean).join(' · '))} (${esc(w['Whisky ID'])})</option>`).join('');
 const whiskyFields=['Distillery','Expression','Whisky Type','Bottler','Brand / Producer','Country','Region','Age Years','ABV %','Bottle Size ml','Cask Type / Maturation','Peated','Whiskybase ID','Whiskybase URL'];
 const bottleFields=['Collection Role','Acquisition Date','Acquisition Date Precision','Acquisition Type','Shop / Source','Purchase Price','Currency','Status','Replace When Empty','Notes'];
 const input=(key,entity)=>{
  if(key==='Notes')return `<label>${esc(key)}<textarea data-add-entity="${entity}" data-add-field="${esc(key)}"></textarea></label>`;
  if(key==='Status')return `<label>Status<select data-add-entity="bottle" data-add-field="Status"><option>Sealed</option><option>Open</option></select></label>`;
  const type=/Date$/.test(key)?'date':(['Age Years','ABV %','Bottle Size ml','Purchase Price'].includes(key)?'number':'text');
  return `<label>${esc(key)}<input type="${type}" data-add-entity="${entity}" data-add-field="${esc(key)}" ${key==='Distillery'||key==='Expression'?'required':''}></label>`;
 };
 return `<div class="topbar"><button id="backAddBottle" class="backBtn">‹ Collection</button><div class="title">Add Bottle</div><span></span></div>
 <section class="card setup"><div class="meta">Choose whether this bottle belongs to an existing whisky release or a new one.</div>
 <div class="segmented editTabs"><button data-add-mode="existing" class="${addMode==='existing'?'active':''}">Existing Whisky</button><button data-add-mode="new" class="${addMode==='new'?'active':''}">New Whisky</button></div>
 ${addMode==='existing'?`<label>Whisky release<select id="addWhiskyId"><option value="">Select whisky…</option>${option}</select></label>`:`<div class="editFields">${whiskyFields.map(k=>input(k,'whisky')).join('')}</div><div class="meta">A new Whisky ID will be created before the bottle. If bottle creation fails, the whisky may remain in the database.</div>`}
 <h3>Bottle information</h3><div class="editFields">${bottleFields.map(k=>input(k,'bottle')).join('')}</div>
 <button id="saveNewBottle" class="primary">Create Bottle</button><div class="meta">The database generates IDs. Missing optional details can be added later using Edit Bottle.</div></section>`;
}
function render(){
 const hasToken=!!sessionStorage.getItem('wc2ApiToken');
 let body=!hasToken?setup():tab==='AddBottle'?addBottlePage():tab==='Home'?home():tab==='Collection'?collection():tab==='Tastings'?generic('Tastings','Sessions and drams will use the unified Whisky / Session / Dram relationships.'):tab==='Live'?generic('Live Tasting','Fast dram entry, photo recognition and session workflow will be built here.'):tab==='Trip'?generic('Scotland Trip 2026','Itinerary, distilleries, tastings, buying targets, purchases and trip notes will live here.'):generic('Insights','Dynamic collection and tasting analytics will be built from the canonical database.');
 root.innerHTML=`<main class="shell">${body}</main>${hasToken?bottom():''}`;
 bind();
}
function bind(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{tab=b.dataset.go;render()});
 document.querySelectorAll('#addBottleHome,#addBottleCollection').forEach(el=>el.onclick=()=>{tab='AddBottle';render();window.scrollTo(0,0)});
 document.querySelectorAll('[data-add-mode]').forEach(el=>el.onclick=()=>{addMode=el.dataset.addMode;render()});
 const backAdd=document.getElementById('backAddBottle');if(backAdd)backAdd.onclick=()=>{tab='Collection';render()};
 const saveNew=document.getElementById('saveNewBottle');if(saveNew)saveNew.onclick=createNewBottle;
 const save=document.getElementById('saveToken');if(save)save.onclick=async()=>{const v=document.getElementById('tokenInput').value.trim();if(!v)return;WC2.setToken(v);await doRefresh()};
 const refresh=document.getElementById('refresh');if(refresh)refresh.onclick=doRefresh;
 const cr=document.getElementById('collectionRefresh');if(cr)cr.onclick=doRefresh;
 const dr=document.getElementById('detailRefresh');if(dr)dr.onclick=doRefresh;
 document.querySelectorAll('[data-collection-filter]').forEach(b=>b.onclick=()=>{collectionFilter=b.dataset.collectionFilter;collectionFilters.fill='';collectionFilters.finishedYear='';render()});
 const ft=document.getElementById('filterToggle');if(ft)ft.onclick=()=>{filtersOpen=!filtersOpen;render()};
 document.querySelectorAll('[data-filter]').forEach(el=>el.onchange=e=>{collectionFilters[e.target.dataset.filter]=e.target.value;render()});
 document.querySelectorAll('[data-clear-filter]').forEach(el=>el.onclick=()=>{collectionFilters[el.dataset.clearFilter]='';render()});
 const cf=document.getElementById('clearFilters');if(cf)cf.onclick=()=>{Object.keys(collectionFilters).forEach(k=>collectionFilters[k]='');render()};
 const cs=document.getElementById('collectionSearch');if(cs)cs.oninput=e=>{collectionQuery=e.target.value;render();const n=document.getElementById('collectionSearch');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}};
 const clear=document.getElementById('clearSearch');if(clear)clear.onclick=()=>{collectionQuery='';render()};
 document.querySelectorAll('[data-bottle-id]').forEach(b=>b.onclick=()=>{selectedBottleId=b.dataset.bottleId;bottleView='detail';render();window.scrollTo(0,0)});
 const back=document.getElementById('backCollection');if(back)back.onclick=()=>{selectedBottleId=null;bottleView='detail';render()};
 const backDetail=document.getElementById('backBottleDetail');if(backDetail)backDetail.onclick=()=>{bottleView='detail';render()};
 const editBottle=document.getElementById('editBottle');if(editBottle)editBottle.onclick=()=>{bottleView='edit';render()};
 const tasteBottle=document.getElementById('tasteBottle');if(tasteBottle)tasteBottle.onclick=()=>{bottleView='taste';render()};
 const historyBottle=document.getElementById('historyBottle');if(historyBottle)historyBottle.onclick=()=>{bottleView='history';render()};
 const delBottle=document.getElementById('deleteBottle');if(delBottle)delBottle.onclick=()=>{if(confirm('Delete is not enabled yet because the API has no controlled DELETE_BOTTLE operation. No data has been changed.')){}};
 document.querySelectorAll('[data-edit-section]').forEach(el=>el.onclick=()=>{editSection=el.dataset.editSection;render()});
 const saveEdit=document.getElementById('saveBottleEdit');if(saveEdit)saveEdit.onclick=saveBottleChanges;
 const saveTaste=document.getElementById('saveBottleTaste');if(saveTaste)saveTaste.onclick=saveBottleTasting;
 const settings=document.getElementById('settings');if(settings)settings.onclick=()=>{WC2.setToken('');render()};
 const trip=document.getElementById('tripCard');if(trip)trip.onclick=()=>{tab='Trip';render()};
}
async function createNewBottle(){
 const btn=document.getElementById('saveNewBottle');
 const collect=entity=>{const obj={};document.querySelectorAll('[data-add-entity="'+entity+'"]').forEach(el=>{const v=el.value.trim();if(v!=='')obj[el.dataset.addField]=el.type==='number'?Number(v):v});return obj};
 const bottle=collect('bottle');
 const whisky=collect('whisky');
 let whiskyId=addMode==='existing'?document.getElementById('addWhiskyId')?.value:'';
 if(addMode==='existing'&&!whiskyId){toast('Select a whisky first.');return}
 if(addMode==='new'&&(!whisky['Distillery']||!whisky['Expression'])){toast('Distillery and Expression are required.');return}
 if(bottle['Status']==='Open'){toast('Create the bottle as Sealed, then use Open Bottle to record lifecycle history.');return}
 if(bottle['Purchase Price']!==undefined&&bottle['Purchase Price']<0){toast('Purchase price cannot be negative.');return}
 if(addMode==='new'&&!confirm('Create a new whisky release and a bottle? This performs two separate database operations.'))return;
 btn.disabled=true;btn.textContent='Creating…';
 try{
  if(addMode==='new'){
   const created=await WC2.api('CREATE_WHISKY',{record:whisky});
   whiskyId=created.record?.['Whisky ID'];
   if(!whiskyId)throw new Error('Whisky created but no ID returned. Refresh before retrying.');
  }
  const createdBottle=await WC2.api('CREATE_BOTTLE',{record:{...bottle,'Whisky ID':whiskyId,'Status':'Sealed','Current Fill %':100}});
  await WC2.refresh();
  const id=createdBottle.record?.['Bottle ID'];
  if(id){selectedBottleId=id;bottleView='detail';tab='Collection'}else{tab='Collection';selectedBottleId=null}
  render();toast('Bottle created');
 }catch(e){toast('Creation failed: '+e.message);btn.disabled=false;btn.textContent='Create Bottle'}
}
async function saveBottleChanges(){
 const b=state().bottles.find(x=>String(x['Bottle ID'])===String(selectedBottleId));if(!b)return;
 const w=state().whiskies.find(x=>String(x['Whisky ID'])===String(b['Whisky ID']))||{};
 const source=editSection==='bottle'?b:w;
 const protectedBottle=new Set(['Status','Current Fill %','Open Date','Open Date Precision','Finished Date','Finished Date Precision','Whisky ID','Bottle ID','Created At','Last Modified']);
 const protectedWhisky=new Set(['Whisky ID','Created At','Last Modified']);
 const dates=new Set(['Acquisition Date','Last Verified']);
 const changes={};
 for(const el of document.querySelectorAll('[data-edit-field]')){
  const key=el.dataset.editField;
  const old=dates.has(key)?dateInput(source[key]):String(source[key]??'');
  const value=el.value;
  if(String(value)===String(old))continue;
  if(editSection==='bottle'&&protectedBottle.has(key)){toast('Status, fill and lifecycle dates use dedicated actions. No changes saved.');return}
  if(editSection==='whisky'&&protectedWhisky.has(key)){toast('This field cannot be edited.');return}
  if(el.type==='number'&&value!==''&&!Number.isFinite(Number(value))){toast('Invalid number: '+key);return}
  changes[key]=el.type==='number'&&value!==''?Number(value):value;
 }
 if(!Object.keys(changes).length){toast('No changes to save.');return}
 if(editSection==='whisky'&&!confirm('These whisky details are shared by all linked bottles and tastings. Save changes?'))return;
 const btn=document.getElementById('saveBottleEdit');if(btn){btn.disabled=true;btn.textContent='Saving…'}
 try{
  const action=editSection==='bottle'?'UPDATE_BOTTLE':'UPDATE_WHISKY';
  const id=editSection==='bottle'?{bottleId:b['Bottle ID']}:{whiskyId:b['Whisky ID']};
  await WC2.api(action,{...id,changes});
  await WC2.refresh();bottleView='detail';render();toast('Changes saved');
 }catch(e){toast('Save failed: '+e.message);if(btn){btn.disabled=false;btn.textContent='Save Changes'}}
}
async function saveBottleTasting(){
 const b=state().bottles.find(x=>String(x['Bottle ID'])===String(selectedBottleId));if(!b)return;
 const score=num(document.getElementById('tasteScore').value);
 const record={'Whisky ID':b['Whisky ID'],'Bottle ID':b['Bottle ID'],'Tasting Context':'Standalone','Tasting Date':new Date().toISOString().slice(0,10),'Score':score===null?'':score,'Nose':document.getElementById('tasteNose').value,'Palate':document.getElementById('tastePalate').value,'Finish Character':document.getElementById('tasteFinish').value,'Free Notes':document.getElementById('tasteNotes').value};
 try{await WC2.api('CREATE_DRAM',{record});await WC2.refresh();bottleView='detail';render();toast('Tasting saved')}catch(e){toast('Tasting failed: '+e.message)}
}
async function doRefresh(){
 document.body.classList.add('refreshing');
 try{const r=await WC2.refresh();render();toast(`Updated · ${r.counts.bottles} bottles · ${r.counts.sessions} sessions · ${r.counts.drams} drams`)}
 catch(e){console.error(e);toast('Refresh failed: '+e.message);if(/token|UNAUTHORIZED/i.test(e.message)){WC2.setToken('');setTimeout(render,400)}}
 finally{document.body.classList.remove('refreshing')}
}
window.addEventListener('wc2:state-refreshed',()=>{});
render();
})();
