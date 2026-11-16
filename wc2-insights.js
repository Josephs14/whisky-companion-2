(()=>{'use strict';
let section='Collection',screen='Overview',scope='Current',unit='Whiskies',dimension='Region',detail='',sort='Bottles';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const number=x=>{const n=parseFloat(String(x??'').replace('%',''));return Number.isFinite(n)?n:null};
const id=x=>String(x??'').trim();
const isCurrent=b=>!/^finished$/i.test(id(b.Status));
const date=x=>{if(typeof x==='number')return new Date(Date.UTC(1899,11,30)+x*86400000);const s=id(x);if(!s)return null;const d=new Date(s);return isNaN(+d)?null:d};
const bar=(name,count,max,total,click='')=>'<div class="wc2-ins-bar" '+(click?'data-wc2-detail="'+esc(click)+'" role="button" tabindex="0"':'')+'><div style="display:flex;justify-content:space-between;gap:8px"><span>'+esc(name)+'</span><b>'+count+' <small style="opacity:.6">('+((count/Math.max(1,total))*100).toFixed(1)+'%)</small></b></div><div style="background:#e9e4dc;height:9px;border-radius:8px;margin:6px 0 13px"><div style="width:'+(100*count/Math.max(1,max))+'%;background:#8b714f;height:100%;border-radius:8px"></div></div></div>';
const kpi=(label,value)=>'<div class="card kpi"><div class="meta">'+esc(label)+'</div><div class="value">'+esc(value)+'</div></div>';
const controls=(items,active,attr)=>'<div class="segmented wc2-ins-tabs wc2-ins-'+attr+'" role="tablist" aria-label="'+esc(attr)+'">'+items.map(v=>'<button type="button" role="tab" aria-selected="'+(v===active?'true':'false')+'" class="'+(v===active?'active':'')+'" data-wc2-'+attr+'="'+esc(v)+'">'+esc(v)+'</button>').join('')+'</div>';
const countBy=(records,wi,field,transform)=>{const m=new Map();for(const r of records){const w=wi.get(id(r['Whisky ID']))||{};let v=transform?transform(w[field],w):id(w[field])||'Unknown';m.set(v,(m.get(v)||0)+1)}return [...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))};
const cask=x=>{const v=id(x).toLowerCase();if(!v)return 'Unknown';if(/sauternes|port|rioja|wine|pinot|amarone|red wine|white wine|barolo|marsala|madeira|champagne|moscatel/.test(v))return 'Wine';if(/sherry|oloroso|pedro xim|\bpx\b|fino|amontillado/.test(v))return 'Sherry';if(/bourbon|virgin oak|american oak/.test(v))return 'Bourbon';if(/rum/.test(v))return 'Rum';return 'Other'};
const caskDetail=x=>{const v=id(x);if(!v)return 'Unknown';const match=v.match(/sauternes|port|rioja|pinot noir|amarone|oloroso|pedro ximenez|\bPX\b|fino|amontillado|bourbon|rum|madeira|barolo|moscatel/i);return match?match[0].replace(/^./,c=>c.toUpperCase()):v};
const age=x=>{const v=number(x);if(/nas/i.test(id(x)))return 'NAS';if(v===null)return 'Unknown';return v<10?'Under 10':v<=12?'10–12':v<=17?'13–17':v<=24?'18–24':'25+'};
const abv=x=>{const v=number(x);return v===null?'Unknown':v<43?'Below 43%':v<=46?'43–46%':v<=50?'46.1–50%':v<=55?'50.1–55%':'Above 55%'};
const peat=x=>/^(true|yes|peated|1)$/i.test(id(x))?'Peated':/^(false|no|unpeated|0)$/i.test(id(x))?'Unpeated':'Unknown';
function render(s,legacy){
 const wi=new Map((s.whiskies||[]).map(w=>[id(w['Whisky ID']),w]));
 const all=s.bottles||[], current=all.filter(isCurrent), bottles=scope==='Current'?current:all;
 const unique=arr=>[...new Map(arr.filter(b=>wi.has(id(b['Whisky ID']))).map(b=>[id(b['Whisky ID']),b])).values()];
 const selected=unit==='Bottles'?bottles:unique(bottles);
 const cards='<div class="wc2-insights"><div class="topbar"><div><div class="title">Insights</div><div class="sync">Your whisky collection and tasting analytics</div></div><button class="iconBtn" id="insightsRefresh" aria-label="Refresh insights">↻</button></div>'+controls(['Collection','Drams','Sessions','Consumption','Purchases'],section,'section');
 if(section!=='Collection')return cards+(section==='Drams'?legacy():'<section class="card setup"><h3>'+esc(section)+'</h3><p class="meta">Coming in the next Insights development phase.</p></section>')+'</div>';
 let html=cards+controls(['Overview','Composition','Distilleries','History'],screen,'screen');
 html+=controls(['Current','All-time'],scope,'scope');
 if(screen==='Overview'){
 const distinct=unique(bottles),known=distinct.map(b=>wi.get(id(b['Whisky ID']))).filter(Boolean);
 const ages=known.map(w=>number(w.Age)).filter(x=>x!==null),abvs=known.map(w=>number(w['ABV %'])).filter(x=>x!==null);
 const knownPeat=known.map(w=>peat(w.Peated)).filter(x=>x!=='Unknown');
 const avg=xs=>xs.length?(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(1):'—';
 const sealed=all.filter(b=>/^sealed$/i.test(id(b.Status))).length,opened=all.filter(b=>/^open$/i.test(id(b.Status))).length,finished=all.filter(b=>/^finished$/i.test(id(b.Status))).length;
 html+='<div class="kpis">'+kpi('Physical bottles',bottles.length)+kpi('Unique whiskies',distinct.length)+kpi('Sealed bottles',sealed)+kpi('Open bottles',opened)+'</div>';
 html+='<section class="card setup"><h3>Bottle status</h3><div class="detailList"><div><span>Sealed</span><b>'+sealed+'</b></div><div><span>Open</span><b>'+opened+'</b></div>'+(scope==='All-time'?'<div><span>Finished</span><b>'+finished+'</b></div>':'')+'</div></section>';
 html+='<section class="card setup"><h3>Collection characteristics</h3><div class="detailList"><div><span>Average stated age</span><b>'+avg(ages)+' years</b></div><div><span>Average ABV</span><b>'+avg(abvs)+'%</b></div><div><span>Peated (known status)</span><b>'+(knownPeat.length?(100*knownPeat.filter(x=>x==='Peated').length/knownPeat.length).toFixed(1)+'%':'—')+'</b></div></div></section>';
 html+='<section class="card setup"><h3>Historical snapshot</h3><div class="detailList"><div><span>Finished bottles ever</span><b>'+finished+'</b></div><div><span>Unique whiskies ever owned</span><b>'+unique(all).length+'</b></div></div></section>';
 }
 if(screen==='Composition'){
 const dimensions=['Region','Cask Type','Age','ABV','Peat','Bottler'];
 html+=controls(['Bottles','Whiskies'],unit,'unit')+controls(dimensions,dimension,'dimension');
 const field={'Region':'Region','Cask Type':'Cask Type / Maturation','Age':'Age','ABV':'ABV %','Peat':'Peated','Release Type':'Release Type','Whisky Type':'Whisky Type','Bottler':'Bottler'}[dimension];
 const transform=dimension==='Cask Type'?(x=>detail?caskDetail(x):cask(x)):dimension==='Age'?age:dimension==='ABV'?abv:dimension==='Peat'?peat:null;
 let rows=countBy(selected,wi,field,transform);
 if(detail&&dimension==='Cask Type')rows=countBy(selected.filter(b=>cask((wi.get(id(b['Whisky ID']))||{})[field])===detail),wi,field,caskDetail);
 html+='<section class="card setup"><h3>'+esc(detail&&dimension==='Cask Type'?detail+' — specific casks':dimension)+'</h3>'+(detail?'<button data-wc2-back="1">‹ All cask types</button>':'')+'<div class="meta">Based on '+selected.length+' '+unit.toLowerCase()+'. Unknown values are retained.</div>'+ (rows.length?rows.map(([n,v])=>bar(n,v,rows[0][1],selected.length,dimension==='Cask Type'&&!detail?n:'')).join(''):'<p>No data available.</p>')+'</section>';
 if(dimension==='Cask Type')html+='<p class="meta">Broad cask categories are inferred from maturation text. Mixed casks are assigned to one category for totals; original descriptions remain unchanged.</p>';
 }
 if(screen==='Distilleries'){
 const rows=countBy(selected,wi,'Distillery');const max=rows[0]?.[1]||1;
 const topFive=rows.slice(0,5).reduce((n,r)=>n+r[1],0);
 html+=controls(['Bottles','Whiskies'],unit,'unit');
 html+='<div class="kpis">'+kpi('Distilleries represented',rows.filter(r=>r[0]!=='Unknown').length)+kpi('Top 5 concentration',selected.length?(100*topFive/selected.length).toFixed(1)+'%':'—')+'</div>';
 html+='<section class="card setup"><h3>Distillery ranking</h3>'+rows.map(([n,v])=>bar(n,v,max,selected.length,n)).join('')+'</section>';
 if(detail){const matches=bottles.filter(b=>id((wi.get(id(b['Whisky ID']))||{}).Distillery)===detail);const expressions=unique(matches);html+='<section class="card setup"><button data-wc2-back="1">‹ Close details</button><h3>'+esc(detail)+'</h3><div class="detailList"><div><span>Bottles</span><b>'+matches.length+'</b></div><div><span>Expressions</span><b>'+expressions.length+'</b></div><div><span>Sealed</span><b>'+matches.filter(b=>/^sealed$/i.test(id(b.Status))).length+'</b></div><div><span>Open</span><b>'+matches.filter(b=>/^open$/i.test(id(b.Status))).length+'</b></div><div><span>Finished</span><b>'+matches.filter(b=>/^finished$/i.test(id(b.Status))).length+'</b></div></div>'+expressions.slice(0,30).map(b=>{const w=wi.get(id(b['Whisky ID']))||{};return '<div class="meta" style="padding:6px 0;border-bottom:1px solid #ddd">'+esc([w.Expression,w.Age&&w.Age+'y',w['Cask Type / Maturation']].filter(Boolean).join(' · '))+'</div>'}).join('')+'</section>'}
 }
 if(screen==='History'){
 const finished=all.filter(b=>/^finished$/i.test(id(b.Status))).length;
 html+='<div class="kpis">'+kpi('Bottles ever owned',all.length)+kpi('Finished bottles',finished)+kpi('Current bottles',current.length)+kpi('Whiskies ever owned',unique(all).length)+'</div>';
 const years=new Set();all.forEach(b=>{const d=date(b['Acquisition Date']);if(d)years.add(d.getUTCFullYear());});const sorted=[...years].sort((a,b)=>a-b);
 const unknown=all.filter(b=>!date(b['Acquisition Date'])).length;
 html+='<section class="card setup"><h3>Collection evolution — year end</h3><p class="meta">Active bottles, cumulative acquired bottles and finished bottles. Based only on usable recorded dates.</p>';
 const history=sorted.map(y=>{const end=Date.UTC(y,11,31,23,59,59);const acquired=all.filter(b=>{const d=date(b['Acquisition Date']);return d&&+d<=end});const active=acquired.filter(b=>{const d=date(b['Finished Date']);return !d||+d>end});const done=acquired.filter(b=>{const d=date(b['Finished Date']);return d&&+d<=end});return {y,acquired:acquired.length,active:active.length,done:done.length}});
 html+=history.map(r=>'<div class="detailList"><div><span>'+r.y+'</span><b>'+r.active+' active · '+r.acquired+' ever owned · '+r.done+' finished</b></div></div>').join('')||'<p class="meta">No dated acquisition records available.</p>';
 html+='</section>'+(unknown?'<p class="meta">'+unknown+' bottle records have missing or unrecognized acquisition dates and are excluded from historical timelines.</p>':'');
 }
 return html+'</div>';
}
function bind(root,refresh){root.querySelectorAll('[data-wc2-section],[data-wc2-screen],[data-wc2-scope],[data-wc2-unit],[data-wc2-dimension],[data-wc2-detail],[data-wc2-back]').forEach(el=>{el.onclick=()=>{const d=el.dataset;if(d.wc2Section){section=d.wc2Section;detail=''}if(d.wc2Screen){screen=d.wc2Screen;detail=''}if(d.wc2Scope)scope=d.wc2Scope;if(d.wc2Unit)unit=d.wc2Unit;if(d.wc2Dimension){dimension=d.wc2Dimension;detail=''}if(d.wc2Detail)detail=d.wc2Detail;if(d.wc2Back)detail='';refresh()};if(el.hasAttribute('tabindex'))el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}}})}
window.WC2Insights={render,bind};
})();