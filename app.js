(() => {
'use strict';
const root=document.getElementById('app');
let tab='Home', noticeTimer=null, collectionFilter='All', collectionQuery='', selectedBottleId=null;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
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
 <section class="quick"><button><span>🍾</span>Add Bottle</button><button><span>🥃</span>New Tasting</button><button data-go="Live"><span>📷</span>Live Mode</button><button id="refresh"><span>↻</span>Refresh</button></section>`;
}

function collection(){
 const s=state(),wi=new Map(s.whiskies.map(w=>[String(w['Whisky ID']),w]));
 const statuses=['All','Open','Sealed','Finished'];
 const counts={All:s.bottles.length};
 statuses.slice(1).forEach(x=>counts[x]=s.bottles.filter(b=>String(b['Status']||'').toLowerCase()===x.toLowerCase()).length);
 const q=collectionQuery.trim().toLowerCase();
 const filtered=s.bottles.filter(b=>{
   if(collectionFilter!=='All'&&String(b['Status']||'').toLowerCase()!==collectionFilter.toLowerCase())return false;
   if(!q)return true;
   const w=wi.get(String(b['Whisky ID']))||{};
   return [b['Bottle ID'],w['Distillery'],w['Brand / Producer'],w['Expression'],w['Region'],w['Country'],w['Age Statement'],w['ABV %']].some(v=>String(v||'').toLowerCase().includes(q));
 }).sort((a,b)=>{
   const wa=wi.get(String(a['Whisky ID']))||{},wb=wi.get(String(b['Whisky ID']))||{};
   return String(wa['Distillery']||wa['Brand / Producer']||'').localeCompare(String(wb['Distillery']||wb['Brand / Producer']||''))||String(wa['Expression']||'').localeCompare(String(wb['Expression']||''));
 });
 if(selectedBottleId){
   const b=s.bottles.find(x=>String(x['Bottle ID'])===String(selectedBottleId));
   if(b)return bottleDetail(b,wi.get(String(b['Whisky ID']))||{});
   selectedBottleId=null;
 }
 const current=s.bottles.filter(b=>String(b['Status']||'').toLowerCase()!=='finished').length;
 return `<div class="topbar"><div><div class="title">Collection</div><div class="sync">${s.bottles.length} bottles · ${current} current</div></div><button class="iconBtn" id="collectionRefresh">↻</button></div>
 <section class="collectionSummary">
   <div><strong>${s.bottles.length}</strong><span>Total</span></div>
   <div><strong>${counts.Open||0}</strong><span>Open</span></div>
   <div><strong>${counts.Sealed||0}</strong><span>Sealed</span></div>
   <div><strong>${counts.Finished||0}</strong><span>Finished</span></div>
 </section>
 <div class="segmented">${statuses.map(x=>`<button data-collection-filter="${x}" class="${collectionFilter===x?'active':''}">${x}<small>${counts[x]||0}</small></button>`).join('')}</div>
 <div class="searchbox">⌕<input id="collectionSearch" value="${esc(collectionQuery)}" placeholder="Search distillery, expression, region…"><button id="clearSearch">${collectionQuery?'×':''}</button></div>
 <div class="sectionHead"><h2>${collectionFilter} Bottles</h2><span class="meta">${filtered.length} shown</span></div>
 <section class="bottleGrid">${filtered.length?filtered.map(b=>bottleCard(b,wi.get(String(b['Whisky ID']))||{})).join(''):'<div class="card placeholder">No bottles match this view.</div>'}</section>`;
}
function bottleCard(b,w){
 const status=String(b['Status']||'Unknown'),fill=num(b['Current Fill %']);
 const maker=w['Distillery']||w['Brand / Producer']||'Unknown whisky';
 const expression=w['Expression']||w['Series / Collection']||'';
 const bits=[w['Age Statement']||'',w['ABV %']!==''&&w['ABV %']!=null?(w['ABV %']+'% ABV'):'',w['Region']||''].filter(Boolean);
 return `<article class="card bottleCard" data-bottle-id="${esc(b['Bottle ID'])}">
   <div class="bottleArt">🍾</div><div class="grow"><div class="bottleTop"><div><div class="name">${esc(maker)}</div><div class="expression">${esc(expression)}</div></div><span class="pill ${status.toLowerCase()}">${esc(status)}</span></div>
   <div class="meta">${esc(bits.join(' · '))}</div>
   ${status.toLowerCase()==='open'&&fill!==null?`<div class="fillLine"><div><span>Fill</span><b>${fill}%</b></div><div class="fillTrack"><i style="width:${Math.max(0,Math.min(100,fill))}%"></i></div></div>`:''}
   <div class="bottleFoot"><span>${esc(b['Bottle ID'])}</span><span>View ›</span></div></div></article>`;
}
function bottleDetail(b,w){
 const fields=[['Status',b['Status']],['Current fill',b['Current Fill %']!==''&&b['Current Fill %']!=null?b['Current Fill %']+'%':'—'],['Age',w['Age Statement']||w['Age Years']],['ABV',w['ABV %']!==''&&w['ABV %']!=null?w['ABV %']+'%':'—'],['Region',w['Region']],['Cask / Maturation',w['Cask Type / Maturation']],['Acquired',b['Acquisition Date']],['Source',b['Shop / Source']],['Bottle ID',b['Bottle ID']],['Whisky ID',b['Whisky ID']]];
 return `<div class="topbar"><button class="backBtn" id="backCollection">‹ Collection</button><button class="iconBtn" id="detailRefresh">↻</button></div>
 <section class="detailHero card"><div class="detailBottle">🍾</div><div><div class="eyebrow">${esc(w['Distillery']||w['Brand / Producer']||'Whisky')}</div><h1>${esc(w['Expression']||w['Series / Collection']||'Bottle')}</h1><span class="pill ${String(b['Status']||'').toLowerCase()}">${esc(b['Status']||'Unknown')}</span></div></section>
 <div class="detailActions"><button>✎<span>Edit</span></button><button>🥃<span>Taste</span></button><button>▥<span>History</span></button></div>
 <div class="sectionHead"><h2>Bottle Details</h2></div>
 <section class="card detailList">${fields.filter(x=>x[1]!==''&&x[1]!=null).map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</section>
 ${b['Notes']?`<div class="sectionHead"><h2>Notes</h2></div><section class="card notes">${esc(b['Notes'])}</section>`:''}`;
}

function generic(title,text){return `<div class="topbar"><div class="title">${title}</div></div><div class="card placeholder"><b>${title}</b><br><br>${text}</div>`}
function setup(){return `<div class="topbar"><div class="brand"><div class="logo">🥃</div><div class="title">Whisky Companion</div></div></div><div class="card setup"><div class="name">Connect this device</div><div class="meta">Enter the private API token for this development device. It is stored only for this browser session and is not committed to GitHub.</div><input id="tokenInput" type="password" autocomplete="off" placeholder="API token"><button class="primary" id="saveToken">Connect & Refresh</button></div>`}
function bottom(){return `<nav class="bottom"><div class="bottomInner">${[['Home','⌂'],['Collection','🍾'],['Tastings','🥃'],['Live','📷'],['Insights','▥']].map(([x,i])=>`<button data-tab="${x}" class="${tab===x?'active':''}"><span>${i}</span>${x}</button>`).join('')}</div></nav>`}
function render(){
 const hasToken=!!sessionStorage.getItem('wc2ApiToken');
 let body=!hasToken?setup():tab==='Home'?home():tab==='Collection'?collection():tab==='Tastings'?generic('Tastings','Sessions and drams will use the unified Whisky / Session / Dram relationships.'):tab==='Live'?generic('Live Tasting','Fast dram entry, photo recognition and session workflow will be built here.'):tab==='Trip'?generic('Scotland Trip 2026','Itinerary, distilleries, tastings, buying targets, purchases and trip notes will live here.'):generic('Insights','Dynamic collection and tasting analytics will be built from the canonical database.');
 root.innerHTML=`<main class="shell">${body}</main>${hasToken?bottom():''}`;
 bind();
}
function bind(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{tab=b.dataset.go;render()});
 const save=document.getElementById('saveToken');if(save)save.onclick=async()=>{const v=document.getElementById('tokenInput').value.trim();if(!v)return;WC2.setToken(v);await doRefresh()};
 const refresh=document.getElementById('refresh');if(refresh)refresh.onclick=doRefresh;
 const cr=document.getElementById('collectionRefresh');if(cr)cr.onclick=doRefresh;
 const dr=document.getElementById('detailRefresh');if(dr)dr.onclick=doRefresh;
 document.querySelectorAll('[data-collection-filter]').forEach(b=>b.onclick=()=>{collectionFilter=b.dataset.collectionFilter;render()});
 const cs=document.getElementById('collectionSearch');if(cs)cs.oninput=e=>{collectionQuery=e.target.value;render();const n=document.getElementById('collectionSearch');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}};
 const clear=document.getElementById('clearSearch');if(clear)clear.onclick=()=>{collectionQuery='';render()};
 document.querySelectorAll('[data-bottle-id]').forEach(b=>b.onclick=()=>{selectedBottleId=b.dataset.bottleId;render();window.scrollTo(0,0)});
 const back=document.getElementById('backCollection');if(back)back.onclick=()=>{selectedBottleId=null;render()};
 const settings=document.getElementById('settings');if(settings)settings.onclick=()=>{WC2.setToken('');render()};
 const trip=document.getElementById('tripCard');if(trip)trip.onclick=()=>{tab='Trip';render()};
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
