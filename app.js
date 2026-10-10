(() => {
'use strict';
const root=document.getElementById('app');
let tab='Home', noticeTimer=null, collectionFilter='Current', collectionQuery='', selectedBottleId=null, collectionFilters={distillery:'',region:'',country:'',age:'',abv:'',peated:'',bottler:'',cask:'',fill:'',finishedYear:''}, filtersOpen=false, bottleView='detail', historyIncludeSameWhisky=false, collectionSort='name', editSection='bottle', addMode='existing', selectedSessionId=null, selectedDramId=null, tastingView='sessions', tastingSearch='', sessionFiltersOpen=false, sessionFilters={type:'',year:'',location:'',companion:'',blind:''}, tastingEdit=null, addingDram=false, creatingSession=false, dramFiltersOpen=false, dramFilters={distillery:'',region:'',country:'',bottler:'',peated:'',age:'',score:'',year:'',session:'',bottleLink:'',completeness:''};

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const dateInput=v=>{if(v===null||v===undefined||v==='')return '';if(typeof v==='number'){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.toISOString().slice(0,10)}const s=String(v);return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):s};
const fieldChoices={
 'Whisky Type':['Single Malt','Blended Malt','Blended Whisky','Single Grain','Single Pot Still','Bourbon','Rye','Other'],
 'Release Type':['Core Range','Limited Edition','Single Cask','Small Batch','Distillery Exclusive','Independent Bottling','Other'],
 'Peated':['Peated','Unpeated','Unknown'],
 'Collection Role':['Standard','Limited Edition','Special Release','Gift','Other'],
 'Acquisition Date Precision':['Exact','Month','Year','Approximate','Unknown'],
 'Open Date Precision':['Exact','Month','Year','Approximate','Unknown'],
 'Finished Date Precision':['Exact','Month','Year','Approximate','Unknown'],
 'Acquisition Type':['Purchased','Gift','Trade','Other'],
 'Currency':['GBP','ILS','EUR','USD','JPY','Other'],
 'Replace When Empty':['Yes','No','Maybe'],
 'Verification Status':['Verified','Partially Verified','Unverified','Updated via Whisky Companion'],
 'Age Statement':['NAS','Unknown']
};
const suggestionFields=new Set(['Distillery','Bottler','Brand / Producer','Country','Region','Shop / Source','Cask Type / Maturation']);
function fieldSuggestions(key,entity){return [...new Set((entity==='whisky'?state().whiskies:state().bottles).map(r=>String(r[key]??'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function fieldSelect(key,entity,val,attr){
 const options=key==='Peated'?fieldChoices[key]:[...new Set([...(fieldChoices[key]||[]),...fieldSuggestions(key,entity),...(val!==''?[String(val)]:[])])];
 const selected=key==='Peated'?(/^(true|yes|y|1|peated)$/i.test(String(val))?'Peated':/^(false|no|n|0|unpeated)$/i.test(String(val))?'Unpeated':String(val||'Unknown')):String(val);
 return `<select ${attr}><option value="">Select…</option>${options.map(v=>`<option value="${esc(v)}" ${String(v)===selected?'selected':''}>${esc(v)}</option>`).join('')}</select>`;
}
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
 <section class="hero"><h1>${new Date().getHours()<12?'Good morning':new Date().getHours()<17?'Good afternoon':'Good evening'}</h1><p>What shall we explore today?</p></section>
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
 }).sort((a,b)=>{const wa=wi.get(String(a['Whisky ID']))||{},wb=wi.get(String(b['Whisky ID']))||{};const name=()=>String(wa['Distillery']||wa['Brand / Producer']||'').localeCompare(String(wb['Distillery']||wb['Brand / Producer']||''))||String(wa['Expression']||'').localeCompare(String(wb['Expression']||''));if(collectionSort==='recent')return dateValue(b['Acquisition Date'])-dateValue(a['Acquisition Date'])||name();if(collectionSort==='oldest')return dateValue(a['Acquisition Date'])-dateValue(b['Acquisition Date'])||name();if(collectionSort==='fillLow')return (num(a['Current Fill %'])??101)-(num(b['Current Fill %'])??101)||name();if(collectionSort==='fillHigh')return (num(b['Current Fill %'])??-1)-(num(a['Current Fill %'])??-1)||name();return name()});
 if(selectedBottleId){const b=s.bottles.find(x=>String(x['Bottle ID'])===String(selectedBottleId));if(b)return bottleDetail(b,wi.get(String(b['Whisky ID']))||{});selectedBottleId=null}
 const current=counts.Current;
 const dist=new Map(),reg=new Map();let abvs=[];
 base.forEach(b=>{const w=wi.get(String(b['Whisky ID']))||{};const d=String(w['Distillery']||w['Brand / Producer']||'').trim(),r=String(w['Region']||'').trim(),a=num(w['ABV %']);if(d)dist.set(d,(dist.get(d)||0)+1);if(r)reg.set(r,(reg.get(r)||0)+1);if(a!==null)abvs.push(a)});
 const top=m=>[...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]||['—',0],td=top(dist),tr=top(reg),avg=abvs.length?(abvs.reduce((a,b)=>a+b,0)/abvs.length).toFixed(1):'—';
 const active=Object.entries(f).filter(([,v])=>v);
 const opts=(arr,val)=>'<option value="">All</option>'+arr.map(x=>`<option ${x===val?'selected':''}>${esc(x)}</option>`).join('');
 const years=[...new Set(base.map(b=>{const m=String(b['Finished Date']||'').match(/(20\\d{2})/);return m&&m[1]}).filter(Boolean))].sort().reverse();
 return `<div class="topbar"><div><div class="title">Collection</div><div class="sync">${s.bottles.length} bottles · ${current} current</div></div><div><button class="filterBtn" id="addBottleCollection" type="button" aria-label="Add bottle" style="white-space:nowrap;padding:6px 8px;font-size:12px">＋ Add Bottle</button><button class="iconBtn" id="collectionRefresh">↻</button></div></div>
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
 <div class="sectionHead"><h2>${collectionFilter} Bottles</h2><span class="meta">${filtered.length} shown</span></div><div style="display:flex;justify-content:flex-end;margin:0 0 10px"><label class="meta" for="collectionSort">Sort: <select id="collectionSort" style="max-width:190px"><option value="name" ${collectionSort==='name'?'selected':''}>Distillery A–Z</option><option value="recent" ${collectionSort==='recent'?'selected':''}>Recently acquired</option><option value="oldest" ${collectionSort==='oldest'?'selected':''}>Oldest acquired</option><option value="fillLow" ${collectionSort==='fillLow'?'selected':''}>Lowest fill first</option><option value="fillHigh" ${collectionSort==='fillHigh'?'selected':''}>Highest fill first</option></select></label></div>
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
  const life=s.bottleLifecycle.filter(x=>String(x['Bottle ID'])===id),fills=s.fillHistory.filter(x=>String(x['Bottle ID'])===id),cons=s.consumptionEvents.filter(x=>String(x['Bottle ID'])===id),drams=s.drams.filter(x=>String(x['Bottle ID'])===id||(historyIncludeSameWhisky&&String(x['Whisky ID']||'')!==''&&String(x['Whisky ID'])===String(b['Whisky ID'])));
  const sessionMap=new Map(s.sessions.map(x=>[String(x['Session ID']),x]));
  const standalone=x=>!x||/standalone/i.test([x['Session Name'],x['Session Type']].join(' '));
  const events=[...life.map(x=>({date:x['Event Date'],type:x['Event Type']||'Lifecycle',note:x['Source / Note']||((x['From Status']||'')+' → '+(x['To Status']||''))})),...fills.map(x=>({date:x['Event Date'],type:'Fill '+x['Fill %']+'%',note:x['Source / Note']||''})),...cons.map(x=>({date:x['Event Date'],type:x['Event Type']||'Consumption',note:x['Note']||''})),...drams.map(x=>{const session=sessionMap.get(String(x['Session ID']||''));const direct=standalone(session);return {date:x['Tasting Date']||session?.['Date'],type:'Tasting'+(x['Score']!==''?' · '+x['Score']:'') ,note:(direct?'Standalone tasting':String(session['Session Name']||session['Location']||'Tasting session'))+(String(x['Bottle ID'])===id?'':' · Same whisky (bottle not confirmed)'),target:'dram',targetId:x['Tasting ID']}})].sort((a,b)=>dateValue(b.date)-dateValue(a.date));
  return `<div class="topbar"><button class="backBtn" id="backBottleDetail">‹ Bottle</button><div class="title">History</div><span></span></div><section class="card setup"><label><input type="checkbox" id="includeSameWhiskyHistory" ${historyIncludeSameWhisky?'checked':''}> Include tastings of the same whisky without a confirmed bottle link</label><div class="meta">By default, History shows this physical bottle’s events and tastings explicitly linked to its Bottle ID.</div></section><section class="card list">${events.length?events.map(x=>x.target&&x.targetId?`<button type="button" class="row historyTastingLink" data-history-target="${esc(x.target)}" data-history-id="${esc(x.targetId)}"><div class="grow"><div class="name">${esc(x.type)} <span class="historyArrow">↗</span></div><div class="meta">${esc(x.date||'Date unknown')}${x.note?' · '+esc(x.note):''}</div></div></button>`:`<div class="row"><div class="grow"><div class="name">${esc(x.type)}</div><div class="meta">${esc(x.date||'Date unknown')}${x.note?' · '+esc(x.note):''}</div></div></div>`).join(''):'<div class="placeholder">No history recorded for this bottle.</div>'}</section>`;
 }
 if(bottleView==='edit'){
  const bottleFields=['Bottle Number','Collection Role','Acquisition Date','Acquisition Date Precision','Acquisition Type','Shop / Source','Purchase Price','Currency','Status','Open Date','Open Date Precision','Finished Date','Finished Date Precision','Current Fill %','Replace When Empty','Notes','Verification Status'];
  const whiskyFields=['Whisky Type','Distillery','Bottler','Brand / Producer','Expression','Series / Collection','Release Type','Country','Region','Bottling Year','Age Years','Age Statement','ABV %','Bottle Size ml','Cask Type / Maturation','Cask Number','Outturn','Peated','Whiskybase ID','Whiskybase URL','Verification Status','Last Verified'];
  const fields=editSection==='bottle'?bottleFields:whiskyFields, source=editSection==='bottle'?b:w;
  const form=fields.map(key=>{
   const dateField=['Acquisition Date','Open Date','Finished Date','Last Verified'].includes(key);
   const val=dateField?dateInput(source[key]):(source[key]??''),label=esc(key),inputId=esc(key);
   if(fieldChoices[key]||key==='Status')return `<label>${label}${fieldSelect(key,editSection,val,`data-edit-field="${inputId}" data-edit-entity="${editSection}" ${key==='Status'?'disabled':''}`)}</label>`;
   if(key==='Notes')return `<label>${label}<textarea data-edit-field="${inputId}" data-edit-entity="bottle" rows="4">${esc(val)}</textarea></label>`;
   const type=dateField?'date':(['Purchase Price','Current Fill %','Age Years','ABV %','Bottle Size ml','Bottling Year','Outturn'].includes(key)?'number':'text');
   const known=suggestionFields.has(key)?fieldSuggestions(key,editSection):[],listId='edit-list-'+key.replace(/[^a-z0-9]/gi,'-');
   return `<label>${label}<input type="${type}" data-edit-field="${inputId}" data-edit-entity="${editSection}" value="${esc(val)}" ${known.length?`list="${listId}"`:``}>${known.length?`<datalist id="${listId}">${known.map(v=>`<option value="${esc(v)}"></option>`).join("")}</datalist>`:``}</label>`;
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
 ${whiskybaseLink(w)?`<div class="wbBottleLink"><a class="wbLink" href="${esc(whiskybaseLink(w))}" target="_blank" rel="noopener noreferrer">Whiskybase ↗</a></div>`:``}<div class="detailActions four"><button id="editBottle">✎<span>Edit</span></button><button id="tasteBottle">🥃<span>Taste</span></button><button id="historyBottle">▥<span>History</span></button><button id="deleteBottle" class="dangerAction">⌫<span>Delete</span></button></div>
 <div class="sectionHead"><h2>Bottle Management</h2></div><section class="card setup"><div class="meta">Status: <strong>${esc(b['Status']||'Unknown')}</strong> · Fill: <strong>${esc(b['Current Fill %']!==''&&b['Current Fill %']!=null?b['Current Fill %']+'%':'Not recorded')}</strong></div><div class="meta">Each action is validated first, then requires your confirmation before saving to Google Sheets.</div><div class="detailActions"><button type="button" id="openManagedBottle" ${String(b['Status']||'').toLowerCase()==='sealed'?'':'disabled'}>Open Bottle</button><button type="button" id="changeManagedFill" ${String(b['Status']||'').toLowerCase()==='open'?'':'disabled'}>Change Fill</button><button type="button" id="finishManagedBottle" ${String(b['Status']||'').toLowerCase()==='open'?'':'disabled'}>Finish Bottle</button></div></section>
 <div class="sectionHead"><h2>Bottle Details</h2></div><section class="card detailList">${fields.filter(x=>x[1]!==''&&x[1]!=null).map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</section>
 ${b['Notes']?`<div class="sectionHead"><h2>Notes</h2></div><section class="card notes">${esc(b['Notes'])}</section>`:''}`;
}

function generic(title,text){return `<div class="topbar"><div class="title">${title}</div></div><div class="card placeholder"><b>${title}</b><br><br>${text}</div>`}
function setup(){return `<div class="topbar"><div class="brand"><div class="logo">🥃</div><div class="title">Whisky Companion</div></div></div><div class="card setup"><div class="name">Connect this device</div><div class="meta">Enter the private API token for this development device. It is stored only for this browser session and is not committed to GitHub.</div><input id="tokenInput" type="password" autocomplete="off" placeholder="API token"><button class="primary" id="saveToken">Connect & Refresh</button></div>`}
function bottom(){return `<nav class="bottom"><div class="bottomInner">${[['Home','⌂'],['Collection','🍾'],['Tastings','🥃'],['Live','📷'],['Insights','▥']].map(([x,i])=>`<button data-tab="${x}" class="${tab===x?'active':''}"><span>${i}</span>${x}</button>`).join('')}</div></nav>`}
function addBottlePage(){
 const s=state(),whiskies=[...s.whiskies].sort((a,b)=>String(a['Distillery']||'').localeCompare(String(b['Distillery']||''))||String(a['Expression']||'').localeCompare(String(b['Expression']||'')));
 const whiskyFields=['Distillery','Expression','Whisky Type','Bottler','Brand / Producer','Country','Region','Age Years','ABV %','Bottle Size ml','Cask Type / Maturation','Peated','Whiskybase ID','Whiskybase URL'];
 const bottleFields=['Collection Role','Acquisition Date','Acquisition Date Precision','Acquisition Type','Shop / Source','Purchase Price','Currency','Status','Replace When Empty','Notes'];
 const input=(key,entity)=>{
  const id='add-'+entity+'-'+key.replace(/[^a-z0-9]/gi,'-');
  if(key==='Notes')return `<label>${esc(key)}<textarea data-add-entity="${entity}" data-add-field="${esc(key)}"></textarea></label>`;
  if(fieldChoices[key]||key==='Status')return `<label>${esc(key)}${fieldSelect(key,entity,key==='Status'?'Sealed':'',`data-add-entity="${entity}" data-add-field="${esc(key)}"`)}</label>`;
  const type=/Date$/.test(key)?'date':(['Age Years','ABV %','Bottle Size ml','Purchase Price'].includes(key)?'number':'text');
  const known=type==='text'&&suggestionFields.has(key)?fieldSuggestions(key,entity):[];
  return `<label>${esc(key)}<input id="${id}" type="${type}" data-add-entity="${entity}" data-add-field="${esc(key)}" ${known.length?`list="${id}-list"`:''} ${key==='Distillery'||key==='Expression'?'required':''}>${known.length?`<datalist id="${id}-list">${known.map(v=>`<option value="${esc(v)}"></option>`).join('')}</datalist>`:''}</label>`;
 };
 const matchLabel=w=>[w['Distillery']||w['Brand / Producer'],w['Expression'],w['Age Years']?w['Age Years']+'y':'',w['ABV %']?w['ABV %']+'%':''].filter(Boolean).join(' · ');
 return `<div class="topbar"><button id="backAddBottle" class="backBtn">‹ Collection</button><div class="title">Add Bottle</div><span></span></div>
 <section class="card setup"><div class="meta">Select an existing release or register a new whisky.</div>
 <div class="segmented editTabs"><button data-add-mode="existing" class="${addMode==='existing'?'active':''}">Existing Whisky</button><button data-add-mode="new" class="${addMode==='new'?'active':''}">New Whisky</button></div>
 ${addMode==='existing'?`<label>Search whisky by distillery, expression, age or ID<input id="addWhiskySearch" type="search" autocomplete="off" placeholder="Start typing a whisky name…"></label><input id="addWhiskyId" type="hidden"><div id="addWhiskyResults" class="editFields" style="max-height:280px;overflow:auto"><div class="meta">Type to search ${whiskies.length} whiskies.</div></div><div id="addWhiskySelected" class="meta"></div>`:`<div class="editFields">${whiskyFields.map(k=>input(k,'whisky')).join('')}</div><div class="meta">New whisky creation is a separate database operation from bottle creation.</div>`}
 <h3>Bottle information</h3><div class="editFields">${bottleFields.map(k=>input(k,'bottle')).join('')}</div>
 <button id="saveNewBottle" class="primary">Create Bottle</button><div class="meta">Optional fields can be completed later in Edit Bottle. Bottle IDs are generated by the database.</div></section>`;
}
function dramIdentityPicker(record){
 const s=state(),whiskies=new Map(s.whiskies.map(w=>[String(w['Whisky ID']),w]));
 const bottleId=String(record['Bottle ID']||''),whiskyId=String(record['Whisky ID']||'');
 const label=w=>[w['Distillery']||w['Brand / Producer'],w['Expression'],w['Bottler'],w['Age Years']?w['Age Years']+'y':'',w['ABV %']?w['ABV %']+'%':''].filter(Boolean).join(' · ');
 const bottles=s.bottles.filter(b=>whiskies.has(String(b['Whisky ID']))).map(b=>({id:String(b['Bottle ID']),whiskyId:String(b['Whisky ID']),name:label(whiskies.get(String(b['Whisky ID'])))+' · '+(b['Status']||'Unknown')+' · '+b['Bottle ID']}));
 const items=s.whiskies.map(w=>({id:String(w['Whisky ID']),name:label(w)+' · '+w['Whisky ID']}));
 return `<section class="identityPicker"><h3>Collection first · All whiskies available</h3><p class="meta">Type a whisky name below. Choose a specific bottle if the tasting came from your collection, or choose Whisky only if you tasted it elsewhere. The same whisky can appear in both groups intentionally.</p><div class="card" style="padding:12px;margin:10px 0"><label style="display:block;font-weight:600;margin-bottom:8px">Bottle photo (optional)</label><input id="dramPhotoInput" type="file" accept="image/*" capture="environment" style="max-width:100%"><div id="dramPhotoPreview" class="meta" aria-live="polite">Take a photo or choose an existing image. Preview only; no image is uploaded or saved.</div><p class="meta">Photo recognition is not yet connected. Use the bottle or whisky search below to select the correct record.</p></div><input id="dramIdentitySearch" type="search" placeholder="Type to find a bottle or whisky…" autocomplete="off"><div id="dramIdentityResults" class="identityResults"></div><div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button type="button" class="filterBtn" id="identityQuickCurrent">My open bottles</button><button type="button" class="filterBtn" id="identityQuickAll">All collection bottles</button><button type="button" class="filterBtn" id="identityQuickWhiskies">Whisky database</button></div><div class="identitySelected" id="dramIdentitySelected">${esc(bottleId?'Collection bottle: '+bottleId+' · '+(label(whiskies.get(whiskyId)||{})||''):whiskyId?'Whisky: '+(label(whiskies.get(whiskyId)||{})||whiskyId)+' · '+whiskyId:'No identity linked')}</div>${addingDram?"<button type=\"button\" class=\"filterBtn\" id=\"toggleNewDramWhisky\">＋ Whisky not listed? Create new whisky</button><div id=\"newDramWhiskyFields\" hidden><p class=\"meta\">Creates a whisky identity only, not a bottle. Search first to avoid duplicates.</p><div class=\"editFields\"><label>Distillery<input data-new-dram-whisky=\"Distillery\" type=\"text\"></label><label>Expression<input data-new-dram-whisky=\"Expression\" type=\"text\"></label><label>Bottler<input data-new-dram-whisky=\"Bottler\" type=\"text\"></label><label>Country<input data-new-dram-whisky=\"Country\" type=\"text\"></label><label>Region<input data-new-dram-whisky=\"Region\" type=\"text\"></label><label>Age Years<input data-new-dram-whisky=\"Age Years\" type=\"number\"></label><label>ABV %<input data-new-dram-whisky=\"ABV %\" type=\"number\"></label><label>Cask Type / Maturation<input data-new-dram-whisky=\"Cask Type / Maturation\" type=\"text\"></label><label>Whiskybase URL<input data-new-dram-whisky=\"Whiskybase URL\" type=\"text\"></label><div id=\"newWhiskybaseCheck\" class=\"meta\"></div><button type=\"button\" class=\"filterBtn\" id=\"lookupWhiskybaseDetails\">Find Alternative Sources</button><div id=\"whiskybaseLookupStatus\" class=\"meta\" aria-live=\"polite\"></div></div></div>":""}<input type="hidden" id="dramSelectedBottle" value="${esc(bottleId)}"><input type="hidden" id="dramSelectedWhisky" value="${esc(whiskyId)}"></section>`;
}
function bindDramIdentityPicker(){
 const search=document.getElementById('dramIdentitySearch');if(!search)return;
 const results=document.getElementById('dramIdentityResults'),selected=document.getElementById('dramIdentitySelected'),bInput=document.getElementById('dramSelectedBottle'),wInput=document.getElementById('dramSelectedWhisky');
 const s=state(),whiskies=new Map(s.whiskies.map(w=>[String(w['Whisky ID']),w]));
 const label=w=>[w['Distillery']||w['Brand / Producer'],w['Expression'],w['Bottler'],w['Age Years']?w['Age Years']+'y':'',w['ABV %']?w['ABV %']+'%':''].filter(Boolean).join(' · ');
 const bottles=s.bottles.filter(b=>whiskies.has(String(b['Whisky ID']))).map(b=>({id:String(b['Bottle ID']),whiskyId:String(b['Whisky ID']),name:label(whiskies.get(String(b['Whisky ID'])))+' · '+(b['Status']||'Unknown')+' · '+b['Bottle ID']}));
 const items=s.whiskies.map(w=>({id:String(w['Whisky ID']),name:label(w)+' · '+w['Whisky ID']}));
 const renderQuick=mode=>{results.innerHTML='';const rows=mode==='open'?bottles.filter(b=>b.name.includes(' · Open · ')):mode==='bottles'?bottles:items;const kind=mode==='whiskies'?'whisky':'bottle';const h=document.createElement('div');h.className='identityGroup';h.textContent=mode==='open'?'Open collection bottles':mode==='bottles'?'Collection bottles':'Whisky database';results.appendChild(h);rows.slice(0,60).forEach(item=>{const btn=document.createElement('button');btn.type='button';btn.className='identityResult';btn.textContent=item.name;btn.onclick=()=>{bInput.value=kind==='bottle'?item.id:'';wInput.value=kind==='bottle'?item.whiskyId:item.id;selected.textContent=(kind==='bottle'?'Collection bottle: ':'Whisky: ')+item.name;results.innerHTML='';search.value=''};results.appendChild(btn)});if(!rows.length){const p=document.createElement('p');p.className='meta';p.textContent='No matching entries.';results.appendChild(p)}};[['identityQuickCurrent','open'],['identityQuickAll','bottles'],['identityQuickWhiskies','whiskies']].forEach(([id,mode])=>{const el=document.getElementById(id);if(el)el.onclick=()=>renderQuick(mode)});
 search.oninput=()=>{const q=search.value.trim().toLowerCase();results.innerHTML='';if(!q)return;
 const groups=[['My Collection · select a specific bottle',bottles.filter(x=>x.name.toLowerCase().includes(q)).slice(0,20),'bottle'],['Whisky only · no physical bottle linked',items.filter(x=>x.name.toLowerCase().includes(q)).slice(0,20),'whisky']];
 for(const [heading,rows,kind] of groups){if(!rows.length)continue;const h=document.createElement('div');h.className='identityGroup';h.textContent=heading;results.appendChild(h);
 for(const item of rows){const btn=document.createElement('button');btn.type='button';btn.className='identityResult';btn.textContent=item.name;btn.onclick=()=>{bInput.value=kind==='bottle'?item.id:'';wInput.value=kind==='bottle'?item.whiskyId:item.id;selected.textContent=(kind==='bottle'?'Collection bottle: ':'Whisky: ')+item.name;results.innerHTML='';search.value=''};results.appendChild(btn)}}};
}
const dramDescriptorOptions={
 Nose:['Fruity','Floral','Vanilla','Honey','Oak','Smoke','Spicy','Maritime','Citrus','Dried Fruit'],
 Palate:['Sweet','Citrus','Dried Fruit','Chocolate','Peat','Pepper','Nutty','Creamy','Oaky','Malty'],
 Finish:['Sweet','Dry','Spicy','Smoky','Oaky','Fruity','Bitter','Warming','Lingering']
};
let dramDescriptorDraft={Nose:[],Palate:[],Finish:[]};
function descriptorValues(record,kind){const raw=record[kind+' Descriptors'];if(Array.isArray(raw))return raw.filter(Boolean);return String(raw||'').split(/[,;|]/).map(x=>x.trim()).filter(Boolean)}
function dramDescriptorSummary(d){return ['Nose','Palate','Finish'].map(k=>{const vals=descriptorValues(d,k);return vals.length?`<div class="dramDescriptorLine"><span>${esc(k)}</span> ${vals.map(v=>`<span class="dramDescriptorTag">${esc(v)}</span>`).join('')}</div>`:''}).filter(Boolean).join('')}
function descriptorPicker(kind){
 return `<div class="descriptorPicker"><div class="meta">Structured ${esc(kind)} descriptors</div><div class="descriptorChips">${dramDescriptorOptions[kind].map(v=>`<button type="button" class="descriptorChip ${dramDescriptorDraft[kind].includes(v)?'active':''}" data-descriptor-kind="${esc(kind)}" data-descriptor-value="${esc(v)}" aria-pressed="${dramDescriptorDraft[kind].includes(v)}">${esc(v)}</button>`).join('')}</div></div>`;
}
function tastingEditForm(kind,record){
 if(kind==='session'){const fields=['Session Name','Date','Session Type','Location','Companions','Blind?','Notes'];return `<section class="card setup"><h3>Edit Session</h3><div class="editFields">${fields.map(k=>{const v=record[k]??'',type=k==='Date'?'date':'text';return `<label>${esc(k)}${k==='Notes'?`<textarea data-tasting-edit="${esc(k)}">${esc(v)}</textarea>`:`<input type="${type}" data-tasting-edit="${esc(k)}" value="${esc(type==='date'?dateInput(v):v)}">`}</label>`}).join('')}</div><button class="primary" id="saveTastingEdit">Save Changes</button><button type="button" class="filterBtn" id="cancelTastingEdit">Cancel</button></section>`;}
 const choices={'Finish Length':['','Short','Medium','Long'],'Buy Decision':['','Must Buy','Would Buy','At the Right Price','Taste Again Before Deciding','Would Not Buy'],'Memorability':['','Exceptional','Memorable','Average','Forgettable']};
 const field=k=>{const v=String(record[k]??'');if(choices[k])return `<label>${esc(k)}<select data-tasting-edit="${esc(k)}">${[...new Set([...choices[k],...(v&&!choices[k].includes(v)?[v]:[])])].map(x=>`<option value="${esc(x)}" ${x===v?'selected':''}>${esc(x||'Not assessed')}</option>`).join('')}</select></label>`;if(['Nose','Palate','Finish Character','Free Notes'].includes(k))return `<label>${esc(k==='Finish Character'?'Finish notes':k)}<textarea data-tasting-edit="${esc(k)}" rows="3">${esc(v)}</textarea></label>`;return `<label>${esc(k)}<input type="number" ${k==='Score'?'min="0" max="100" step="0.5"':'min="1" step="1"'} data-tasting-edit="${esc(k)}" value="${esc(v)}"></label>`;};
 return `<section class="card setup dramEdit"><h3>${addingDram?'Add Dram':'Edit Dram'}</h3>${addingDram?`<div class="editFields"><label>Tasting Date<input type="date" id="newDramDate" value="${esc(dateInput(record['Tasting Date']))}" ${selectedSessionId?'disabled':''}></label><label>Dram # (optional)<input type="number" min="1" step="1" id="newDramNumber" value="${esc(record['Dram #']||'')}"></label><label>Tasting Sample Type<select id="newDramSample">${['Regular Bottling','Cask Sample','Distillery Sample','Unknown'].map(v=>`<option>${esc(v)}</option>`).join('')}</select></label></div>`:''}<section class="dramEditSection dramIdentityAlways"><h3>1. Identification — choose bottle or whisky</h3>${dramIdentityPicker(record)}</section><details class="dramEditSection" open><summary>2. Evaluation</summary><div class="editFields">${['Score','Nose','Palate','Finish Length','Finish Character'].map(k=>field(k)+(k==='Nose'?descriptorPicker('Nose'):k==='Palate'?descriptorPicker('Palate'):k==='Finish Character'?descriptorPicker('Finish'):'')).join('')}</div><p class="meta">Descriptors are stored separately from written notes. Saving requires backend support and will be verified after refresh.</p></details><details class="dramEditSection"><summary>3. Personal Assessment</summary><div class="editFields">${['Buy Decision','Memorability','Session Rank'].map(field).join('')}</div></details><details class="dramEditSection"><summary>4. Additional Notes</summary><div class="editFields">${field('Free Notes')}</div></details><button class="primary" id="saveTastingEdit">${addingDram?'Add Dram':'Save Changes'}</button><button type="button" class="filterBtn" id="cancelTastingEdit">Cancel</button></section>`;
}
async function createNewDram(){
 const wi=document.getElementById('dramSelectedWhisky'),bi=document.getElementById('dramSelectedBottle'),date=document.getElementById('newDramDate'),n=document.getElementById('newDramNumber'),sample=document.getElementById('newDramSample'),btn=document.getElementById('saveTastingEdit');
 const newFields=document.getElementById('newDramWhiskyFields'),makingWhisky=!!newFields&&!newFields.hidden;
 if(!wi?.value&&!makingWhisky){toast('Choose a collection bottle or whisky first');return}
 const session=selectedSessionId?state().sessions.find(s=>String(s['Session ID'])===String(selectedSessionId)):null;
 const tastingDate=session?dateInput(session['Date']):date?.value;
 if(!tastingDate){toast('Tasting date is required');return}
 const record={'Tasting Context':session?'Session':'Standalone','Tasting Date':tastingDate};if(!makingWhisky)record['Whisky ID']=wi.value;
 if(bi?.value&&!makingWhisky)record['Bottle ID']=bi.value;
 if(session)record['Session ID']=selectedSessionId;
 if(n?.value)record['Dram #']=Number(n.value);
 if(sample?.value)record['Tasting Sample Type']=sample.value;
 document.querySelectorAll('[data-tasting-edit]').forEach(el=>{if(el.value!=='')record[el.dataset.tastingEdit]=el.type==='number'?Number(el.value):el.value});
 for(const k of ['Nose','Palate','Finish'])if(dramDescriptorDraft[k].length)record[k+' Descriptors']=dramDescriptorDraft[k].join('; ');
 if(record.Score!==undefined&&(record.Score<0||record.Score>100||record.Score*2%1!==0)){toast('Score must be 0–100 in 0.5 steps');return}
 if(!session&&record['Dram #']===undefined)delete record['Dram #'];
 if(btn)btn.disabled=true;
 try{
  if(makingWhisky){const whisky={};document.querySelectorAll('[data-new-dram-whisky]').forEach(el=>{const v=el.value.trim();if(v)whisky[el.dataset.newDramWhisky]=el.type==='number'?Number(v):v});if(!whisky.Distillery||!whisky.Expression){toast('Distillery and Expression are required');return}if(whisky['Whiskybase URL']){let u;try{u=new URL(whisky['Whiskybase URL'])}catch(e){toast('Invalid Whiskybase URL');return}const m=u.pathname.match(/^\/whiskies\/whisky\/(\d+)(?:\/|$)/);if(!/(^|\.)whiskybase\.com$/i.test(u.hostname)||!m){toast('Enter a valid Whiskybase whisky URL');return}whisky['Whiskybase ID']=m[1];if(state().whiskies.some(w=>String(w['Whiskybase ID']||'')===m[1]||String(w['Whiskybase URL']||'').includes('/whisky/'+m[1]+'/'))){toast('Whiskybase ID already exists. Select the existing whisky.');return}}if(!confirm('Create this whisky identity and then save the dram? No physical bottle will be created.'))return;const created=await WC2.api('CREATE_WHISKY',{record:whisky});const newId=created.record?.['Whisky ID'];if(!newId)throw new Error('Whisky created but ID not returned. Refresh before retrying.');record['Whisky ID']=newId;}
  const result=await WC2.api('CREATE_DRAM',{record});
  const id=result.record?.['Tasting ID'];
  await WC2.refresh();
  if(!id||!state().drams.some(d=>String(d['Tasting ID'])===String(id))){toast('Created, but refresh verification failed. Check before retrying.');return}
  addingDram=false;tastingEdit=null;selectedDramId=id;render();toast('Dram added');
 }catch(e){toast('Add failed: '+e.message)}finally{if(btn&&document.contains(btn))btn.disabled=false}
}
async function saveTastingEdit(){
 if(addingDram)return createNewDram();
 const kind=tastingEdit;if(!kind)return;
 const record=kind==='session'?state().sessions.find(x=>String(x['Session ID'])===String(selectedSessionId)):state().drams.find(x=>String(x['Tasting ID'])===String(selectedDramId));
 if(!record)return;
 const changes={};document.querySelectorAll('[data-tasting-edit]').forEach(el=>{const k=el.dataset.tastingEdit,v=el.value,old=k==='Date'?dateInput(record[k]):String(record[k]??'');if(v!==old)changes[k]=el.type==='number'&&v!==''?Number(v):v});
 if(kind==='dram'){const bi=document.getElementById('dramSelectedBottle'),wi=document.getElementById('dramSelectedWhisky');if(bi&&wi){const oldWhisky=String(record['Whisky ID']||''),nextWhisky=String(wi.value||''),nextBottle=String(bi.value||'');if(nextWhisky!==oldWhisky){toast('Changing the whisky identity is not enabled here. Choose a bottle of the existing whisky.');return}if(nextBottle!==String(record['Bottle ID']||'')){const bottle=nextBottle?state().bottles.find(b=>String(b['Bottle ID'])===nextBottle):null;if(nextBottle&&(!bottle||String(bottle['Whisky ID'])!==oldWhisky)){toast('Bottle must belong to the tasting whisky.');return}changes['Bottle ID']=nextBottle}}}
 if(kind==='dram'){for(const k of ['Nose','Palate','Finish']){const field=k+' Descriptors',before=descriptorValues(record,k).join('; '),after=dramDescriptorDraft[k].join('; ');if(before!==after)changes[field]=after}}
 if(kind==='dram'&&Object.keys(changes).some(k=>k.endsWith(' Descriptors'))&&!['Nose Descriptors','Palate Descriptors','Finish Descriptors'].every(k=>Object.prototype.hasOwnProperty.call(record,k))){toast('Descriptor saving is blocked: backend GET_STATE does not yet expose the new fields. Existing notes are safe.');return}
 if(!Object.keys(changes).length){toast('No changes to save');return}
 const btn=document.getElementById('saveTastingEdit');btn.disabled=true;
 try{if(kind==='dram'&&Object.prototype.hasOwnProperty.call(changes,'Bottle ID')){const payload={tastingId:record['Tasting ID'],changes,dryRun:true};const check=await WC2.api('UPDATE_DRAM',payload);if(check.success!==true||check.dryRun!==true)throw Error('Backend validation was not confirmed');const oldBottle=String(record['Bottle ID']||'')||'Whisky only',newBottle=String(changes['Bottle ID']||'')||'Whisky only';if(!confirm('Backend validation passed.\\nChange bottle association: '+oldBottle+' → '+newBottle+'?\\n\\nThis updates the real tasting record.')){btn.disabled=false;return}}const saved=await WC2.api(kind==='session'?'UPDATE_SESSION':'UPDATE_DRAM',{...(kind==='session'?{sessionId:record['Session ID']}:{tastingId:record['Tasting ID']}),changes});if(saved.success!==true||saved.dryRun===true)throw Error('Backend did not confirm saving');await WC2.refresh();if(kind==='dram'){const updated=state().drams.find(x=>String(x['Tasting ID'])===String(record['Tasting ID']));const mismatch=Object.keys(changes).filter(k=>String(updated?.[k]??'')!==String(changes[k]??''));if(mismatch.length){toast('Save not verified for: '+mismatch.join(', '));return}}tastingEdit=null;render();toast('Changes saved')}
 catch(e){toast('Save failed: '+e.message);btn.disabled=false}
}
function whiskybaseLink(w){const url=String(w['Whiskybase URL']||'').trim();if(/^https:\/\/(www\.)?whiskybase\.com\/whiskies\/whisky\/\d+/i.test(url))return url;const id=String(w['Whiskybase ID']||'').trim();return /^\d+$/.test(id)?'https://www.whiskybase.com/whiskies/whisky/'+id:''}
function tastingsPage(){
 const s=state(),wi=new Map(s.whiskies.map(w=>[String(w['Whisky ID']),w]));
 const standalone=x=>/standalone/i.test([x['Session Name'],x['Session Type']].join(' '));
 const sessions=[...s.sessions].filter(x=>!standalone(x)).sort((a,b)=>dateValue(b['Date'])-dateValue(a['Date']));
 const allSessions=new Map(s.sessions.map(x=>[String(x['Session ID']),x]));
 const dramsBySession=new Map();s.drams.forEach(d=>{const k=String(d['Session ID']||'');if(!dramsBySession.has(k))dramsBySession.set(k,[]);dramsBySession.get(k).push(d)});
 const whisky=d=>wi.get(String(d['Whisky ID']))||{};
 const identity=d=>{const w=whisky(d);return [w['Expression'],w['Age Years']?w['Age Years']+' years':'',w['ABV %']?w['ABV %']+'%':''].filter(Boolean).join(' · ')||w['Brand / Producer']||'Unidentified bottle'};
 const distillery=d=>whisky(d)['Distillery']||whisky(d)['Brand / Producer']||'Unknown distillery';
 const dramName=d=>[distillery(d),identity(d)].join(' · ');
 const wb=d=>{const url=whiskybaseLink(whisky(d));return url?`<a class="wbLink" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Whiskybase ↗</a>`:''};
 const fmt=v=>{const d=dateValue(v);return d?new Date(d).toLocaleDateString():'Date unknown'};
 const unique=new Set(s.drams.map(d=>String(d['Whisky ID']||'').trim()).filter(Boolean));
 const scored=s.drams.map(d=>num(d['Score'])).filter(v=>v!==null);
 const heading=`<div class="topbar"><div><div class="title">Tastings</div><div class="sync">${sessions.length} sessions · ${unique.size} unique whiskies · ${s.drams.length} tasting records</div></div><button class="iconBtn" id="tastingsRefresh">↻</button></div>`;
 const tabs=`<div class="tastingCreateBar" style="display:flex;gap:8px"><button type="button" class="primary" id="addDramTop" style="flex:1;min-width:0;padding:9px 7px;font-size:13px">＋ Add Dram</button><button type="button" class="primary" id="createSession" style="flex:1;min-width:0;padding:9px 7px;font-size:13px">＋ Create Session</button></div><div class="segmented tastingTabs"><button data-tasting-view="sessions" class="${tastingView==='sessions'?'active':''}">Sessions</button><button data-tasting-view="drams" class="${tastingView==='drams'?'active':''}">All Drams</button></div>`;
 if(creatingSession)return `<div class="topbar"><button class="backBtn" id="cancelCreateSession">‹ Back</button><div class="title">Create Session</div></div><section class="card setup"><h3>New tasting session</h3><div class="editFields"><label>Date<input id="newSessionDate" type="date" value="${new Date().toLocaleDateString('en-CA')}"></label><label>Session name<input id="newSessionName" type="text" placeholder="e.g. Friday whisky tasting"></label><label>Session type<select id="newSessionType"><option>Casual</option><option>Workshop</option><option>Distillery Visit</option><option>Other</option></select></label><label>Location<input id="newSessionLocation" type="text"></label><label>Companions<input id="newSessionCompanions" type="text" placeholder="Names separated by commas"></label><label>Blind tasting?<select id="newSessionBlind"><option value="No">No</option><option value="Yes">Yes</option></select></label><label>Notes<textarea id="newSessionNotes" rows="3"></textarea></label></div><button class="primary" id="saveNewSession">Create Session</button><button type="button" class="filterBtn" id="cancelCreateSessionBottom">Cancel</button></section>`;
 if(addingDram){const sess=selectedSessionId?allSessions.get(String(selectedSessionId)):null;const d={'Tasting Date':sess?dateInput(sess['Date']):new Date().toLocaleDateString('en-CA')};return `<div class="topbar"><button class="backBtn" id="cancelNewDram">‹ Back</button><div class="title">Add Dram</div></div>${tastingEditForm('dram',d)}`}
 if(selectedDramId){
  const d=s.drams.find(x=>String(x['Tasting ID'])===String(selectedDramId));if(!d){selectedDramId=null;return tastingsPage()}
  const sess=allSessions.get(String(d['Session ID']))||{};
  if(tastingEdit==='dram')return `<div class="topbar"><button class="backBtn" id="backDram">‹ Back</button><div class="title">Edit Dram</div></div>${tastingEditForm('dram',d)}`;
  return `<div class="topbar"><button class="backBtn" id="backDram">‹ Back</button><div class="title">Dram Details</div></div><section class="card tastingSessionHero">
  <div class="eyebrow">${esc(distillery(d))}</div><h2>${esc(identity(d))}</h2><div class="tastingManage"><button id="editDram">Edit Dram</button><button id="addNextDram">＋ Add Next Dram</button><button id="deleteDram" class="dangerAction">Delete Dram</button></div>
  <div class="meta">${esc(fmt(d['Tasting Date']||sess['Date']))} · ${esc(sess['Session Name']||'Standalone tasting')}</div>
  <div class="tastingDramStats"><span>Score <b>${d['Score']!==''&&d['Score']!=null?esc(d['Score']):'—'}</b></span><span>Session rank <b>${esc(d['Session Rank']||'—')}</b></span><span>Dram # <b>${esc(d['Dram #']||'—')}</b></span></div>
  ${(()=>{const fields=[['Score',d['Score']],['Nose',d['Nose']],['Palate',d['Palate']],['Finish',d['Finish Character']||d['Finish Length']],['Personal notes',d['Free Notes']]];const completed=fields.filter(([k,v])=>v!==null&&v!==undefined&&String(v).trim()!=='');const missing=fields.filter(([k,v])=>v===null||v===undefined||String(v).trim()==='').map(([k])=>k);return '<div class="tastingNote"><span>Tasting note completeness</span><p>'+completed.length+' of '+fields.length+' fields recorded'+(missing.length?' · Missing: '+esc(missing.join(', ')):' · Complete')+'</p></div>'})()}
  ${dramDescriptorSummary(d)}
  ${['Nose','Palate','Finish Length','Finish Character','Free Notes','Buy Decision','Memorability'].filter(k=>d[k]).map(k=>`<div class="tastingNote"><span>${esc(k)}</span><p>${esc(String(d[k]).startsWith('[WCMETA]')?'Legacy metadata (not a tasting note)':d[k])}</p></div>`).join('')}
  <div class="tastingNote"><span>Collection bottle link</span><p>${(()=>{const bid=String(d['Bottle ID']||'').trim();const bottle=bid?state().bottles.find(b=>String(b['Bottle ID'])===bid):null;return bottle?'Confirmed bottle · '+esc(bid):bid?'Bottle reference not found · '+esc(bid):'Whisky identity only — no physical bottle confirmed'})()}</p></div>${d['Bottle ID']&&state().bottles.some(b=>String(b['Bottle ID'])===String(d['Bottle ID']))?'<button type="button" class="filterBtn" id="viewLinkedDramBottle">View linked bottle →</button>':''}${wb(d)}<div class="meta">Tasting ID: ${esc(d['Tasting ID'])}</div></section>`;
 }
 if(selectedSessionId){
  const sess=allSessions.get(String(selectedSessionId));if(!sess){selectedSessionId=null;return tastingsPage()}
  if(tastingEdit==='session')return `<div class="topbar"><button class="backBtn" id="backTastings">‹ Back</button><div class="title">Edit Session</div></div>${tastingEditForm('session',sess)}`;
  const drams=[...(dramsBySession.get(String(selectedSessionId))||[])].sort((a,b)=>(num(a['Dram #'])??999)-(num(b['Dram #'])??999));
  return `<div class="topbar"><button class="backBtn" id="backTastings">‹ Tastings</button><div class="title">Session Details</div></div>
  <section class="card tastingSessionHero"><h2>${esc(sess['Session Name']||sess['Location']||'Tasting Session')}</h2>
  <div class="meta">${esc(fmt(sess['Date']))} · ${esc(sess['Session Type']||'Tasting')} · ${esc(sess['Status']||'')}</div>
  <p>${esc(sess['Location']||'')}</p><div class="tastingManage"><button id="editSession">Edit Session</button>${String(sess['Status']||'').toLowerCase()==='completed'?'<span class="meta">✓ Session completed</span>':'<button type="button" id="completeSession" class="filterBtn">✓ Complete Session</button>'}<button id="deleteSession" class="dangerAction">Delete Session</button></div><p class="meta">With: ${esc(sess['Companions']||'—')} · Blind: ${esc(sess['Blind?']||'—')}</p></section>
  <div class="sectionHead"><h2>Drams (${drams.length})</h2><button class="filterBtn" id="addDramSession">+ Add Dram</button></div>
  ${drams.map((d,i)=>`<div class="card tastingDram tastingDramCompact"><button type="button" class="tastingDramOpen" data-dram-id="${esc(d['Tasting ID'])}"><div class="eyebrow">#${esc(d['Dram #']||i+1)} · ${esc(distillery(d))}</div><strong>${esc(identity(d))}</strong><div class="tastingDramStats"><span>Score <b>${d['Score']!==''&&d['Score']!=null?esc(d['Score']):'—'}</b></span><span>Session rank <b>${esc(d['Session Rank']||'—')}</b></span></div>${dramDescriptorSummary(d)}<div class="meta">Notes: ${[d['Score'],d['Nose'],d['Palate'],d['Finish Character']||d['Finish Length'],d['Free Notes']].filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='').length}/5 fields</div></button>${wb(d)}</div>`).join('')||'<section class="card">No drams recorded.</section>'}`;
 }
 const q=tastingSearch.trim().toLowerCase();
 if(tastingView==='drams'){
  const f=dramFilters, all=s.drams, peat=v=>{const x=String(v??'').toLowerCase();return ['yes','true','peated','1'].includes(x)?'Peated':['no','false','unpeated','0'].includes(x)?'Unpeated':'Unknown'};
  const year=d=>{const v=String(d['Tasting Date']||allSessions.get(String(d['Session ID']))?.['Date']||'');const m=v.match(/(?:19|20)\d{2}/);return m?m[0]:''};
  const vals=fn=>[...new Set(all.map(fn).map(v=>String(v??'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const options=(arr,v)=>'<option value="">All</option>'+arr.map(x=>`<option value="${esc(x)}" ${x===v?'selected':''}>${esc(x)}</option>`).join('');
  const active=Object.values(f).filter(Boolean).length;
  const rows=[...all].sort((a,b)=>dateValue(b['Tasting Date']||allSessions.get(String(b['Session ID']))?.['Date'])-dateValue(a['Tasting Date']||allSessions.get(String(a['Session ID']))?.['Date'])).filter(d=>{
   const w=whisky(d),score=num(d['Score']),age=num(w['Age Years']);
   if(q&&![dramName(d),d['Tasting ID'],d['Bottle ID'],w['Bottler'],w['Region'],w['Cask Type / Maturation'],allSessions.get(String(d['Session ID']))?.['Session Name']].some(v=>String(v??'').toLowerCase().includes(q)))return false;
   if(f.distillery&&distillery(d)!==f.distillery)return false;
   if(f.region&&String(w['Region']||'')!==f.region)return false;
   if(f.country&&String(w['Country']||'')!==f.country)return false;
   if(f.bottler&&String(w['Bottler']||'')!==f.bottler)return false;
   if(f.peated&&peat(w['Peated'])!==f.peated)return false;
   if(f.session&&String(d['Session ID'])!==f.session)return false;
   if(f.completeness){const fields=[d['Score'],d['Nose'],d['Palate'],d['Finish Character']||d['Finish Length'],d['Free Notes']];const count=fields.filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='').length;if(f.completeness==='complete'&&count!==5)return false;if(f.completeness==='incomplete'&&count===5)return false;if(f.completeness==='missingScore'&&fields[0]!==null&&fields[0]!==undefined&&String(fields[0]).trim()!=='')return false;}
   if(f.bottleLink){const bid=String(d['Bottle ID']||'').trim(),b=bid?s.bottles.find(x=>String(x['Bottle ID'])===bid):null,valid=!!b&&String(b['Whisky ID'])===String(d['Whisky ID']);if(f.bottleLink==='linked'&&!valid)return false;if(f.bottleLink==='unlinked'&&bid)return false;if(f.bottleLink==='invalid'&&(!bid||valid))return false;}
   if(f.year&&year(d)!==f.year)return false;
   if(f.age==='NAS'&&age!==null)return false;
   if(f.age==='0-9'&&(age===null||age>9))return false;
   if(f.age==='10-17'&&(age===null||age<10||age>17))return false;
   if(f.age==='18+'&&(age===null||age<18))return false;
   if(f.score==='unscored'&&score!==null)return false;
   if(f.score==='under70'&&(score===null||score>=70))return false;
   if(f.score==='70-79'&&(score===null||score<70||score>=80))return false;
   if(f.score==='80-89'&&(score===null||score<80||score>=90))return false;
   if(f.score==='90+'&&(score===null||score<90))return false;
   return true;
  });
  return `${heading}${tabs}<section class="collectionSummary"><div><strong>${unique.size}</strong><span>Unique whiskies</span></div><div><strong>${s.drams.length}</strong><span>Tasting records</span></div></section>
  <div class="searchFilterRow"><div class="searchbox">⌕<input type="search" id="tastingSearch" placeholder="Search distillery, expression, session…" value="${esc(tastingSearch)}"><button type="button" id="clearDramSearch">${tastingSearch?'×':''}</button></div><button type="button" class="filterBtn" id="dramFilterToggle">☷ Filters${active?' · '+active:''}</button></div>
  ${dramFiltersOpen?`<section class="card filterPanel"><div class="filterGrid">
  <label>Distillery<select data-dram-filter="distillery">${options(vals(distillery),f.distillery)}</select></label>
  <label>Region<select data-dram-filter="region">${options(vals(d=>whisky(d)['Region']),f.region)}</select></label>
  <label>Country<select data-dram-filter="country">${options(vals(d=>whisky(d)['Country']),f.country)}</select></label>
  <label>Bottler<select data-dram-filter="bottler">${options(vals(d=>whisky(d)['Bottler']),f.bottler)}</select></label>
  <label>Peated<select data-dram-filter="peated">${options(['Peated','Unpeated','Unknown'],f.peated)}</select></label>
  <label>Age<select data-dram-filter="age">${options(['NAS','0-9','10-17','18+'],f.age)}</select></label>
  <label>Score<select data-dram-filter="score">${options(['unscored','under70','70-79','80-89','90+'],f.score)}</select></label>
  <label>Tasting year<select data-dram-filter="year">${options(vals(year).reverse(),f.year)}</select></label>
  <label>Note completeness<select data-dram-filter="completeness"><option value="">All</option><option value="complete" ${f.completeness==='complete'?'selected':''}>Complete (5/5)</option><option value="incomplete" ${f.completeness==='incomplete'?'selected':''}>Needs notes (under 5/5)</option><option value="missingScore" ${f.completeness==='missingScore'?'selected':''}>Missing score</option></select></label>
  <label>Bottle association<select data-dram-filter="bottleLink"><option value="">All</option><option value="linked" ${f.bottleLink==='linked'?'selected':''}>Linked to collection bottle</option><option value="unlinked" ${f.bottleLink==='unlinked'?'selected':''}>Whisky only · no bottle</option><option value="invalid" ${f.bottleLink==='invalid'?'selected':''}>Invalid or missing bottle reference</option></select></label>
  <label>Session<select data-dram-filter="session"><option value="">All</option>${[...allSessions.values()].map(sess=>`<option value="${esc(sess['Session ID'])}" ${f.session===String(sess['Session ID'])?'selected':''}>${esc(sess['Session Name']||sess['Location']||sess['Session ID'])}</option>`).join('')}</select></label>
  </div><button type="button" class="clearFilters" id="clearDramFilters">Clear all filters</button></section>`:''}
  <div class="sectionHead"><h2>All Drams (${rows.length})</h2></div>
  ${rows.map(d=>`<div class="card tastingDram tastingDramCompact"><button type="button" class="tastingDramOpen" data-dram-id="${esc(d['Tasting ID'])}"><div class="eyebrow">${esc(distillery(d))}</div><strong>${esc(identity(d))}</strong><div class="meta">${esc(fmt(d['Tasting Date']||allSessions.get(String(d['Session ID']))?.['Date']))} · ${esc(allSessions.get(String(d['Session ID']))?.['Session Name']||'Standalone')}</div><div class="tastingDramStats"><span>Score <b>${d['Score']!==''&&d['Score']!=null?esc(d['Score']):'—'}</b></span><span>Rank <b>${esc(d['Session Rank']||'—')}</b></span></div>${dramDescriptorSummary(d)}</button>${wb(d)}</div>`).join('')||'<section class="card">No matching drams.</section>'}`;
 }
 const sf=sessionFilters,sessionYear=x=>{const m=String(dateInput(x['Date'])||x['Date']||'').match(/(?:19|20)\d{2}/);return m?m[0]:''};
 const sessionTypes=[...new Set(sessions.map(x=>String(x['Session Type']||'Other')))].sort();
 const years=[...new Set(sessions.map(sessionYear).filter(Boolean))].sort().reverse();
 const locations=[...new Set(sessions.map(x=>String(x['Location']||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const companions=[...new Set(sessions.flatMap(x=>String(x['Companions']||'').split(/,|;|\band\b|&/i).map(v=>v.trim()).filter(Boolean)))].sort((a,b)=>a.localeCompare(b));
 const blindCategory=x=>{const v=String(x['Blind?']||'').trim().toLowerCase();if(!v)return 'Unknown';if(/non.?blind|not blind|false|^no$|^0$/.test(v))return 'Non-blind';if(/blind|true|^yes$|^1$/.test(v))return 'Blind';return 'Unknown'};
 const filtered=sessions.filter(x=>(!sf.type||String(x['Session Type']||'Other')===sf.type)&&(!sf.year||sessionYear(x)===sf.year)&&(!sf.location||String(x['Location']||'').trim()===sf.location)&&(!sf.companion||String(x['Companions']||'').toLowerCase().split(/,|;|\band\b|&/i).some(v=>v.trim()===sf.companion.toLowerCase()))&&(!sf.blind||blindCategory(x)===sf.blind)&&(!q||[x['Session Name'],x['Location'],x['Companions'],x['Session Type'],x['Date']].some(v=>String(v??'').toLowerCase().includes(q))||((dramsBySession.get(String(x['Session ID']))||[]).some(d=>dramName(d).toLowerCase().includes(q)))));
 return `${heading}${tabs}<section class="collectionSummary"><div><strong>${sessions.length}</strong><span>Sessions</span></div><div><strong>${unique.size}</strong><span>Unique whiskies</span></div><div><strong>${s.drams.length}</strong><span>Tasting records</span></div><div><strong>${scored.length?(scored.reduce((a,b)=>a+b,0)/scored.length).toFixed(1):'—'}</strong><span>Avg score</span></div></section>
 <div class="searchFilterRow"><div class="searchbox">⌕<input type="search" id="tastingSearch" placeholder="Search sessions, companions, whiskies…" value="${esc(tastingSearch)}"></div><button class="filterBtn" id="sessionFilterToggle">☷ Filters${Object.values(sf).filter(Boolean).length?' · '+Object.values(sf).filter(Boolean).length:''}</button></div>
 ${sessionFiltersOpen?`<section class="card filterPanel"><div class="filterGrid"><label>Session type<select data-session-filter="type"><option value="">All types</option>${sessionTypes.map(v=>`<option value="${esc(v)}" ${sf.type===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label>Year<select data-session-filter="year"><option value="">All years</option>${years.map(v=>`<option ${sf.year===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label>Location<select data-session-filter="location"><option value="">All locations</option>${locations.map(v=>`<option value="${esc(v)}" ${sf.location===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label>Companion<select data-session-filter="companion"><option value="">All companions</option>${companions.map(v=>`<option value="${esc(v)}" ${sf.companion===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label>Blind tasting<select data-session-filter="blind"><option value="">All</option>${['Blind','Non-blind','Unknown'].map(v=>`<option value="${v}" ${sf.blind===v?'selected':''}>${v}</option>`).join('')}</select></label></div><button id="clearSessionFilters" class="clearFilters">Clear filters</button></section>`:''}
 <div class="sectionHead"><h2>Sessions (${filtered.length})</h2></div>
 ${filtered.map(sess=>{const ds=dramsBySession.get(String(sess['Session ID']))||[];return `<button type="button" class="card tastingSessionRow" data-session-id="${esc(sess['Session ID'])}"><strong>${esc(sess['Session Name']||sess['Location']||'Tasting Session')}</strong><div class="meta">${esc(fmt(sess['Date']))} · ${esc(sess['Location']||'')} · ${ds.length} drams</div><div class="meta">${esc(sess['Session Type']||'')} ${sess['Companions']?'· '+esc(sess['Companions']):''}</div></button>`}).join('')||'<section class="card">No matching sessions.</section>'}`;
}
function render(){
 const hasToken=!!(localStorage.getItem('wc2ApiToken') || sessionStorage.getItem('wc2ApiToken') || window.WC2_API_TOKEN);
 let body=!hasToken?setup():tab==='AddBottle'?addBottlePage():tab==='Home'?home():tab==='Collection'?collection():tab==='Tastings'?tastingsPage():tab==='Live'?generic('Live Tasting','Fast dram entry, photo recognition and session workflow will be built here.'):tab==='Trip'?generic('Scotland Trip 2026','Itinerary, distilleries, tastings, buying targets, purchases and trip notes will live here.'):generic('Insights','Dynamic collection and tasting analytics will be built from the canonical database.');
 root.innerHTML=`<main class="shell">${body}</main>${hasToken?bottom():''}`;
 bind();
}
function bind(){
 const sortSelect=document.getElementById('collectionSort');if(sortSelect)sortSelect.onchange=()=>{collectionSort=sortSelect.value;render()};
 const createSession=document.getElementById('createSession');if(createSession)createSession.onclick=()=>{creatingSession=true;selectedSessionId=null;render();window.scrollTo(0,0)};
 for(const id of ['cancelCreateSession','cancelCreateSessionBottom']){const el=document.getElementById(id);if(el)el.onclick=()=>{creatingSession=false;render()}}
 const saveNewSession=document.getElementById('saveNewSession');if(saveNewSession)saveNewSession.onclick=async()=>{const get=id=>document.getElementById(id)?.value.trim()||'';const record={'Date':get('newSessionDate'),'Session Name':get('newSessionName'),'Session Type':get('newSessionType'),'Location':get('newSessionLocation'),'Companions':get('newSessionCompanions'),'Blind?':get('newSessionBlind'),'Notes':get('newSessionNotes')};if(!record.Date||!record['Session Name']){toast('Date and session name are required');return}saveNewSession.disabled=true;try{if(!confirm('Create session '+record['Session Name']+' on '+record.Date+'?'))return;const result=await WC2.api('CREATE_SESSION',{record});if(result.success!==true||result.dryRun===true)throw Error('Backend did not confirm creation');const id=result.record?.['Session ID'];await WC2.refresh();if(!id||!state().sessions.some(s=>String(s['Session ID'])===String(id))){toast('Creation not verified. Check Sessions before retrying.');return}creatingSession=false;selectedSessionId=id;render();toast('Session created')}catch(e){toast('Create session failed: '+e.message)}finally{if(document.contains(saveNewSession))saveNewSession.disabled=false}};
 document.querySelectorAll('#addDramTop,#addDramSession').forEach(el=>el.onclick=()=>{addingDram=true;selectedDramId=null;dramDescriptorDraft={Nose:[],Palate:[],Finish:[]};render();window.scrollTo(0,0)});
 const cancelNew=document.getElementById('cancelNewDram');if(cancelNew)cancelNew.onclick=()=>{addingDram=false;render()};
 document.querySelectorAll('[data-descriptor-kind]').forEach(el=>el.onclick=()=>{const kind=el.dataset.descriptorKind,v=el.dataset.descriptorValue;const arr=dramDescriptorDraft[kind];dramDescriptorDraft[kind]=arr.includes(v)?arr.filter(x=>x!==v):[...arr,v];el.classList.toggle('active',dramDescriptorDraft[kind].includes(v));el.setAttribute('aria-pressed',String(dramDescriptorDraft[kind].includes(v)))});
 const dramPhoto=document.getElementById('dramPhotoInput');if(dramPhoto)dramPhoto.onchange=()=>{const target=document.getElementById('dramPhotoPreview');if(!target)return;target.replaceChildren();const file=dramPhoto.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){target.textContent='Please choose an image file.';return}const url=URL.createObjectURL(file);const img=document.createElement('img');img.alt='Bottle photo preview';img.style.cssText='display:block;max-width:100%;max-height:260px;object-fit:contain;border-radius:10px;margin-top:8px';img.onload=()=>URL.revokeObjectURL(url);img.src=url;target.appendChild(img);const note=document.createElement('p');note.textContent='Local preview only — not uploaded or linked to the dram.';target.appendChild(note)};
 bindDramIdentityPicker();
 const wb=document.querySelector('[data-new-dram-whisky="Whiskybase URL"]');
 if(wb)wb.addEventListener('input',()=>{
  const raw=wb.value.trim(),status=document.getElementById('newWhiskybaseCheck');if(!status)return;
  status.replaceChildren();if(!raw)return;
  let id='';try{const u=new URL(raw),m=u.pathname.match(/^\/whiskies\/whisky\/(\d+)(?:\/|$)/);if(/(^|\.)whiskybase\.com$/i.test(u.hostname)&&m)id=m[1]}catch(e){}
  if(!id){status.textContent='Enter a valid Whiskybase whisky URL.';return}
  const matches=state().whiskies.filter(w=>String(w['Whiskybase ID']||'')===id||String(w['Whiskybase URL']||'').includes('/whisky/'+id+'/'));
  if(!matches.length){status.textContent='Whiskybase ID '+id+' recognized. Other fields require manual entry.';return}
  for(const w of matches){
   const label=[w['Distillery'],w['Expression'],w['Whisky ID']].filter(Boolean).join(' · ');
   const info=document.createElement('div');info.textContent='Already exists: '+label;status.appendChild(info);
   const btn=document.createElement('button');btn.type='button';btn.className='filterBtn';btn.textContent='Use Existing Whisky — '+label;
   btn.onclick=()=>{
    document.getElementById('dramSelectedWhisky').value=String(w['Whisky ID']);
    document.getElementById('dramSelectedBottle').value='';
    document.getElementById('dramIdentitySelected').textContent='Whisky: '+label+' · no physical bottle linked';
    const fields=document.getElementById('newDramWhiskyFields');fields.hidden=true;
    const toggle=document.getElementById('toggleNewDramWhisky');toggle.textContent='＋ Whisky not listed? Create new whisky';
    const search=document.getElementById('dramIdentitySearch');search.disabled=false;search.value='';
    document.getElementById('dramIdentityResults').replaceChildren();
    toast('Existing whisky selected. No new whisky will be created.');
   };status.appendChild(btn);
  }
 });
 const lookup=document.getElementById('lookupWhiskybaseDetails');
 if(lookup)lookup.onclick=async()=>{
  const raw=document.querySelector('[data-new-dram-whisky="Whiskybase URL"]')?.value.trim()||'';
  const status=document.getElementById('whiskybaseLookupStatus');
  let u;try{u=new URL(raw);if(!/(^|\.)whiskybase\.com$/i.test(u.hostname)||!/^\/whiskies\/whisky\/\d+(?:\/|$)/.test(u.pathname))throw Error()}catch(e){status.textContent='Enter a valid Whiskybase link first.';return}
  const id=u.pathname.match(/\/whisky\/(\d+)/)[1];
  if(state().whiskies.some(w=>String(w['Whiskybase ID']||'')===id||String(w['Whiskybase URL']||'').includes('/whisky/'+id+'/'))){status.textContent='Already in database — use the existing whisky button.';return}
  lookup.disabled=true;lookup.textContent='Searching…';status.replaceChildren();
  const slug=decodeURIComponent(u.pathname.split('/').filter(Boolean).pop()||'').replace(/[-_]+/g,' ').replace(/\b\d{6,}\b/g,'').trim();
  const query='"'+id+'" whiskybase whisky '+slug;
  const sources=[
   {name:'Whiskybase indexed search',url:'https://www.google.com/search?q='+encodeURIComponent('site:whiskybase.com/whiskies/whisky/'+id+' '+slug)},
   {name:'Independent whisky listings',url:'https://www.google.com/search?q='+encodeURIComponent('"'+slug+'" whisky ABV bottler cask')},
   {name:'Whiskybase page',url:u.href}
  ];
  const heading=document.createElement('div');heading.textContent='Research matches for Whiskybase #'+id+'. Review the source before entering details:';status.appendChild(heading);
  for(const source of sources){const link=document.createElement('a');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=source.name+' ↗';link.style.display='block';link.style.marginTop='8px';status.appendChild(link)}
  const note=document.createElement('div');note.style.marginTop='10px';note.textContent='No metadata has been autofilled: the original page is blocked, and a search result alone cannot reliably verify an exact bottling. Use the sources above to confirm details, then enter them manually. Nothing is saved until you confirm.';status.appendChild(note);
  lookup.disabled=false;lookup.textContent='Find Alternative Sources';
 };
 const toggleNewWhisky=document.getElementById('toggleNewDramWhisky');if(toggleNewWhisky)toggleNewWhisky.onclick=()=>{const f=document.getElementById('newDramWhiskyFields');f.hidden=!f.hidden;toggleNewWhisky.textContent=f.hidden?'＋ Whisky not listed? Create new whisky':'− Cancel new whisky';document.getElementById('dramIdentitySearch').disabled=!f.hidden;if(!f.hidden){document.getElementById('dramSelectedBottle').value='';document.getElementById('dramSelectedWhisky').value='';document.getElementById('dramIdentitySelected').textContent='New whisky · no collection bottle linked';document.getElementById('dramIdentityResults').replaceChildren();}};
 document.querySelectorAll('[data-history-target]').forEach(el=>el.onclick=()=>{const id=el.dataset.historyId;if(el.dataset.historyTarget==='session'){selectedSessionId=id;selectedDramId=null;tastingView='sessions'}else{selectedDramId=id;selectedSessionId=null;tastingView='drams'}tastingEdit=null;tab='Tastings';render();window.scrollTo(0,0)});
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;if(tab==='Tastings'){selectedSessionId=null;selectedDramId=null}render()});
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{tab=b.dataset.go;render()});
 document.querySelectorAll('#addBottleHome,#addBottleCollection').forEach(el=>el.onclick=()=>{tab='AddBottle';render();window.scrollTo(0,0)});
 document.querySelectorAll('[data-add-mode]').forEach(el=>el.onclick=()=>{addMode=el.dataset.addMode;render()});
 const backAdd=document.getElementById('backAddBottle');if(backAdd)backAdd.onclick=()=>{tab='Collection';render()};
 const whiskySearch=document.getElementById('addWhiskySearch');if(whiskySearch){
  const results=document.getElementById('addWhiskyResults'),hidden=document.getElementById('addWhiskyId'),selected=document.getElementById('addWhiskySelected');
  whiskySearch.oninput=()=>{hidden.value='';selected.textContent='';const q=whiskySearch.value.trim().toLowerCase();results.innerHTML='';if(!q){results.textContent='Start typing to search the whisky database.';return}
   const matches=state().whiskies.filter(w=>[w['Distillery'],w['Brand / Producer'],w['Expression'],w['Age Years'],w['Whisky ID'],w['Whiskybase ID']].some(v=>String(v??'').toLowerCase().includes(q))).slice(0,30);
   if(!matches.length){results.textContent='No matching whiskies. Try another search or select New Whisky.';return}
   matches.forEach(w=>{const el=document.createElement('button');el.type='button';el.className='card';el.style.cssText='width:100%;text-align:left;padding:12px;margin:4px 0';el.textContent=[w['Distillery']||w['Brand / Producer'],w['Expression'],w['Age Years']?w['Age Years']+'y':'',w['ABV %']?w['ABV %']+'%':'',w['Whisky ID']].filter(Boolean).join(' · ');el.onclick=()=>{hidden.value=w['Whisky ID'];whiskySearch.value=[w['Distillery'],w['Expression']].filter(Boolean).join(' · ');selected.textContent='Selected: '+el.textContent;results.innerHTML=''};results.appendChild(el)})
  };
 }
 const saveNew=document.getElementById('saveNewBottle');if(saveNew)saveNew.onclick=createNewBottle;
 document.querySelectorAll('[data-tasting-view]').forEach(el=>el.onclick=()=>{tastingView=el.dataset.tastingView;selectedSessionId=null;selectedDramId=null;tastingSearch='';render()});
 document.querySelectorAll('[data-dram-id]').forEach(el=>el.onclick=()=>{selectedDramId=el.dataset.dramId;render();window.scrollTo(0,0)});
 const dramToggle=document.getElementById('dramFilterToggle');if(dramToggle)dramToggle.onclick=()=>{dramFiltersOpen=!dramFiltersOpen;render()};
 document.querySelectorAll('[data-dram-filter]').forEach(el=>el.onchange=()=>{dramFilters[el.dataset.dramFilter]=el.value;render()});
 const clearDramFilters=document.getElementById('clearDramFilters');if(clearDramFilters)clearDramFilters.onclick=()=>{dramFilters={distillery:'',region:'',country:'',bottler:'',peated:'',age:'',score:'',year:'',session:'',bottleLink:'',completeness:''};render()};
 const clearDramSearch=document.getElementById('clearDramSearch');if(clearDramSearch)clearDramSearch.onclick=()=>{tastingSearch='';render()};
 const sessionToggle=document.getElementById('sessionFilterToggle');if(sessionToggle)sessionToggle.onclick=()=>{sessionFiltersOpen=!sessionFiltersOpen;render()};
 document.querySelectorAll('[data-session-filter]').forEach(el=>el.onchange=()=>{sessionFilters[el.dataset.sessionFilter]=el.value;render()});
 const clearSession=document.getElementById('clearSessionFilters');if(clearSession)clearSession.onclick=()=>{sessionFilters={type:'',year:'',location:'',companion:'',blind:''};render()};
 const editSession=document.getElementById('editSession');if(editSession)editSession.onclick=()=>{tastingEdit='session';render()};
 const editDram=document.getElementById('editDram');if(editDram)editDram.onclick=()=>{const d=state().drams.find(x=>String(x['Tasting ID'])===String(selectedDramId))||{};dramDescriptorDraft={Nose:descriptorValues(d,'Nose'),Palate:descriptorValues(d,'Palate'),Finish:descriptorValues(d,'Finish')};tastingEdit='dram';render()};
 const cancelEdit=document.getElementById('cancelTastingEdit');if(cancelEdit)cancelEdit.onclick=()=>{if(addingDram){addingDram=false;render();return}tastingEdit=null;render()};
 const saveTastingBtn=document.getElementById('saveTastingEdit');if(saveTastingBtn)saveTastingBtn.onclick=saveTastingEdit;
 for(const id of ['deleteSession','deleteDram']){const el=document.getElementById(id);if(el)el.onclick=()=>toast('Deletion is not enabled until a safe backend delete action is available.')}
 const linkedBottle=document.getElementById('viewLinkedDramBottle');if(linkedBottle)linkedBottle.onclick=()=>{const d=state().drams.find(x=>String(x['Tasting ID'])===String(selectedDramId));if(!d||!state().bottles.some(b=>String(b['Bottle ID'])===String(d['Bottle ID'])))return;selectedBottleId=String(d['Bottle ID']);bottleView='detail';tab='Collection';render()};
 const addNextDram=document.getElementById('addNextDram');if(addNextDram)addNextDram.onclick=()=>{const current=state().drams.find(d=>String(d['Tasting ID'])===String(selectedDramId));if(!current)return;const sessionId=String(current['Session ID']||'');selectedSessionId=sessionId||null;selectedDramId=null;addingDram=true;dramDescriptorDraft={Nose:[],Palate:[],Finish:[]};render();window.scrollTo(0,0);const number=document.getElementById('newDramNumber');if(number&&sessionId){const existing=state().drams.filter(d=>String(d['Session ID'])===sessionId).map(d=>num(d['Dram #'])).filter(n=>n!==null);number.value=String(Math.max(0,...existing)+1)}};
 const backDram=document.getElementById('backDram');if(backDram)backDram.onclick=()=>{selectedDramId=null;tastingEdit=null;render()};
 const completeSession=document.getElementById('completeSession');if(completeSession)completeSession.onclick=async()=>{const sess=state().sessions.find(s=>String(s['Session ID'])===String(selectedSessionId));if(!sess)return;if(!confirm('Mark '+(sess['Session Name']||'this session')+' as completed? Existing drams and notes will be preserved.'))return;completeSession.disabled=true;try{const result=await WC2.api('COMPLETE_SESSION',{sessionId:sess['Session ID']});if(result.success!==true||result.dryRun===true)throw Error('Backend did not confirm completion');await WC2.refresh();const updated=state().sessions.find(s=>String(s['Session ID'])===String(sess['Session ID']));if(!updated||String(updated['Status']||'').toLowerCase()!=='completed'){toast('Completion sent but status not verified. Check before retrying.');return}render();toast('Session completed')}catch(e){toast('Complete session failed: '+e.message)}finally{if(document.contains(completeSession))completeSession.disabled=false}};
 const backTastings=document.getElementById('backTastings');if(backTastings)backTastings.onclick=()=>{selectedSessionId=null;tastingEdit=null;render()};
 document.querySelectorAll('[data-session-id]').forEach(el=>el.onclick=()=>{selectedSessionId=el.dataset.sessionId;render();window.scrollTo(0,0)});
 const tastingInput=document.getElementById('tastingSearch');if(tastingInput)tastingInput.oninput=e=>{tastingSearch=e.target.value;render();const el=document.getElementById('tastingSearch');if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length)}};
 const tastingRefresh=document.getElementById('tastingsRefresh');if(tastingRefresh)tastingRefresh.onclick=doRefresh;
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
 const lifecycleAction=async(action,extra={})=>{
  const bottle=state().bottles.find(x=>String(x['Bottle ID'])===String(selectedBottleId));if(!bottle)return;
  const status=String(bottle['Status']||'').trim().toLowerCase();
  if((action==='OPEN_BOTTLE'&&status!=='sealed')||(action!=='OPEN_BOTTLE'&&status!=='open')){toast('Bottle status has changed. Refresh and retry.');return}
  const date=new Date().toLocaleDateString('en-CA');
  const payload={bottleId:bottle['Bottle ID'],eventDate:date,datePrecision:'Exact',dryRun:true,...extra};
  const summary=action.replaceAll('_',' ')+' · '+bottle['Bottle ID']+(extra.fillPercent!==undefined?' · '+extra.fillPercent+'%':'');
  try{
    const check=await WC2.api(action,payload);
    if(check.success!==true||check.dryRun!==true)throw Error('Backend did not confirm a safe dry run');
    if(!confirm('Backend validation passed.\\n'+summary+'\\n\\nSave this change to your real collection?'))return;
    const saved=await WC2.api(action,{...payload,dryRun:false});
    if(saved.success!==true||saved.dryRun===true)throw Error('Backend did not confirm a completed write');
    await WC2.refresh();
    render();
    alert('Bottle updated successfully.\\n'+summary+'\\n\\nYou can review the change in Bottle History.');
  }catch(e){alert('Bottle operation was not confirmed.\\n'+String(e.message||e)+'\\n\\nRefresh the collection to check its current status before retrying.')}
 };
 const openManaged=document.getElementById('openManagedBottle');if(openManaged)openManaged.onclick=()=>lifecycleAction('OPEN_BOTTLE');
 const fillManaged=document.getElementById('changeManagedFill');if(fillManaged)fillManaged.onclick=()=>{
  const bottle=state().bottles.find(x=>String(x['Bottle ID'])===String(selectedBottleId));if(!bottle)return;
  const raw=prompt('Validate new fill percentage (above 0, up to 100):',String(bottle['Current Fill %']??100));if(raw===null)return;
  const value=Number(raw),old=Number(bottle['Current Fill %']);
  if(!raw.trim()||!Number.isFinite(value)||value<=0||value>100||value===old){toast('Enter a changed fill percentage above 0 and up to 100. Use Finish Bottle for 0%.');return}
  lifecycleAction('CHANGE_FILL',{fillPercent:value});
 };
 const finishManaged=document.getElementById('finishManagedBottle');if(finishManaged)finishManaged.onclick=()=>lifecycleAction('FINISH_BOTTLE');
 const relatedHistory=document.getElementById('includeSameWhiskyHistory');if(relatedHistory)relatedHistory.onchange=()=>{historyIncludeSameWhisky=relatedHistory.checked;render()};
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
  if(createdBottle.success!==true||createdBottle.dryRun===true)throw new Error('Backend did not confirm bottle creation. Check Collection before retrying.');
  const id=createdBottle.record?.['Bottle ID'];
  if(!id)throw new Error('Bottle request returned without an ID. Refresh Collection before retrying.');
  await WC2.refresh();
  const verified=state().bottles.find(b=>String(b['Bottle ID'])===String(id));
  if(!verified){toast('Bottle was submitted but not verified after refresh. Check Collection before retrying.');return}
  selectedBottleId=id;bottleView='detail';tab='Collection';
  render();toast('Bottle created and verified');
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
// Load the canonical Google Sheets state automatically when a saved token exists.
// Do not erase a saved token for transient network or authorization errors.
if(localStorage.getItem('wc2ApiToken') || sessionStorage.getItem('wc2ApiToken') || window.WC2_API_TOKEN){
 document.body.classList.add('refreshing');
 WC2.refresh().then(()=>render()).catch(e=>{console.error('Initial sync failed',e);render();toast('Automatic sync failed: '+e.message+' · Tap Refresh to retry')}).finally(()=>document.body.classList.remove('refreshing'));
}
})();
