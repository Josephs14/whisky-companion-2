(()=>{'use strict';
let screen='Overview',status='All',period='All-time',typeMetric='Sessions',typeDetail='',compareA='Select',compareB='Select',focusView='Distilleries',focusMetric='Sessions',focusDetail='',historyMetric='Sessions',historyType='All';
const S=x=>String(x??'').trim(),E=x=>S(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),num=x=>{if(x===''||x==null)return null;const n=Number(x);return Number.isFinite(n)?n:null};
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null,fmt=x=>x==null?'—':Number(x).toFixed(1);
const date=x=>{if(typeof x==='number')return new Date(Date.UTC(1899,11,30)+x*86400000);if(!S(x))return null;const d=new Date(x);return Number.isNaN(+d)?null:d};
const ctl=(items,value,key)=>'<div class="segmented wc2-ins-tabs wc2-ins-dram-controls">'+items.map(x=>'<button type="button" class="'+(x===value?'active':'')+'" data-si-'+key+'="'+E(x)+'">'+E(x)+'</button>').join('')+'</div>';
const sel=(key,values,value)=>'<label class="wc2-di-select">'+E(key)+'<select data-si-select="'+E(key)+'">'+values.map(x=>'<option value="'+E(x)+'" '+(x===value?'selected':'')+'>'+E(x)+'</option>').join('')+'</select></label>';
const card=(title,html)=>'<section class="card setup"><h3>'+E(title)+'</h3>'+html+'</section>';
const kpi=(title,value)=>'<div class="card kpi"><div class="meta">'+E(title)+'</div><div class="value">'+E(value)+'</div></div>';
const list=rows=>'<div class="detailList">'+rows.map(([a,b])=>'<div><span>'+E(a)+'</span><b>'+E(b)+'</b></div>').join('')+'</div>';
const bars=(rows,maximum)=>rows.map(x=>'<div class="wc2-ins-bar" '+(x.detail?'data-si-detail="'+E(x.detail)+'" role="button" tabindex="0"':'')+'><div class="wc2-di-bar-label"><span>'+E(x.name)+'</span><b>'+E(x.value)+'</b></div><div class="wc2-di-track"><div style="width:'+(100*x.size/Math.max(1,maximum)).toFixed(1)+'%"></div></div></div>').join('');
const norm=x=>S(x).toLowerCase();
function classify(s){
 const type=norm(s['Session Type']),name=norm(s['Session Name']),club=norm(s['Workshop Group']||s.Club||s.Organization||s.Organizer||s['Tasting Group']),combined=[type,name,club].join(' ');
 if(/\bcsfc\b|cask strength fan club/.test(combined))return 'CSFC Workshops';
 if(club==='bar')return 'Bar';
 if(club==='other workshop'||/workshop|masterclass/.test(type))return 'Other Workshops';
 if(/home|friends|private|casual/.test(type))return 'Home / Friends';
 return 'Other / Unknown';
}
function format(s){
 const raw=norm(s['Tasting Format']||s.Format||s['Tasting Type']),type=norm(s['Session Type']),name=norm(s['Session Name']),blind=norm(s['Blind?']);
 const t=[raw,type].join(' ');
 if(/vertical/.test(t))return 'Vertical';
 if(/blind/.test(t)||(!raw&&(blind==='yes'||/blind/.test(name))))return 'Blind';
 if(/open|non.blind/.test(t)||(!raw&&blind==='no'))return 'Open';
 return 'Other / Unknown';
}
function featured(s){
 const raw=S(s['Featured Distillery']||s['Focus Distillery']||s.Distillery);
 if(raw)return raw;
 return 'Mixed / General';
}
function theme(s){
 const raw=S(s['Primary Theme']||s['Session Theme']||s.Theme);
 if(raw)return raw;
 const t=norm(s['Session Type']);
 if(/vertical/.test(t))return 'Vertical Tasting';
 return 'Other / Unknown';
}
function data(s){
 const drams=new Map();
 for(const d of s.drams||[]){const key=S(d['Session ID']);if(!drams.has(key))drams.set(key,[]);drams.get(key).push(d)}
 return (s.sessions||[]).filter(x=>S(x['Session ID'])&&!/standalone/i.test([x['Session Name'],x['Session Type']].map(S).join(' '))).map(x=>{
 const ds=drams.get(S(x['Session ID']))||[],scored=ds.map(d=>num(d.Score)).filter(n=>n!==null&&n>=0&&n<=100),when=date(x.Date);
 return {s:x,id:S(x['Session ID']),when,year:when?String(when.getUTCFullYear()):null,drams:ds.length,scored:scored.length,score:mean(scored),completed:norm(x.Status)==='completed',type:classify(x),format:format(x),focus:featured(x),theme:theme(x)};
 })}
const typeNames=['CSFC Workshops','Other Workshops','Bar','Home / Friends','Other / Unknown'];
function summarize(items){const scored=items.filter(x=>x.score!==null);return {sessions:items.length,drams:items.reduce((a,x)=>a+x.drams,0),scored:items.reduce((a,x)=>a+x.scored,0),completed:items.filter(x=>x.completed).length,average:mean(scored.map(x=>x.score))}}
const pct=(a,b)=>b?(100*a/b).toFixed(1)+'%':'—';
function sessionList(items){return '<div class="detailList">'+items.slice().sort((a,b)=>(b.when||0)-(a.when||0)).slice(0,80).map(x=>'<div><span>'+E(S(x.s['Session Name'])||x.s['Session Type']||'Session')+'<small class="meta"> · '+E(x.when?x.when.toISOString().slice(0,10):'Date unknown')+' · '+E(x.s.Location||'Location unknown')+'</small></span><b>'+x.drams+' drams · '+(x.completed?'Completed':'Incomplete')+'</b></div>').join('')+'</div>'+(items.length>80?'<p class="meta">Showing the first 80 sessions.</p>':'')}
function render(s){
 const all=data(s),years=[...new Set(all.map(x=>x.year).filter(Boolean))].sort((a,b)=>b-a);
 if(period!=='All-time'&&!years.includes(period))period='All-time';
 const filtered=all.filter(x=>(status==='All'||status==='Completed'&&x.completed||status==='Incomplete'&&!x.completed)&&(period==='All-time'||x.year===period));
 let html=ctl(['Overview','Session Types','Distilleries & Themes','History'],screen,'screen')+'<div class="wc2-di-filters">'+sel('Status',['All','Completed','Incomplete'],status)+sel('Period',['All-time',...years],period)+'</div>';
 if(screen==='Overview'){
 const a=summarize(filtered),counts=typeNames.map(name=>({name,items:filtered.filter(x=>x.type===name)})),yearCount=new Map();filtered.forEach(x=>{if(x.year)yearCount.set(x.year,(yearCount.get(x.year)||0)+1)});
 const best=[...yearCount].sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
 html+='<div class="kpis">'+kpi('Total sessions',a.sessions)+kpi('Completed sessions',a.completed)+kpi('Total session drams',a.drams)+kpi('Avg. drams / session',a.sessions?fmt(a.drams/a.sessions):'—')+'</div>';
 html+=card('Session types',bars(counts.map(x=>({name:x.name,value:x.items.length+' ('+pct(x.items.length,a.sessions)+')',size:x.items.length})),Math.max(1,...counts.map(x=>x.items.length))));
 html+=card('Additional statistics',list([['Average session score',fmt(a.average)],['Sessions without drams',filtered.filter(x=>!x.drams).length],['Largest session (drams)',Math.max(0,...filtered.map(x=>x.drams))],['Most active year',best]]))+'<p class="meta">Session scores are averaged equally across sessions with at least one valid scored dram. Technical standalone sessions are excluded.</p>';
 }
 if(screen==='Session Types'){
 html+=ctl(['Sessions','Drams','Avg. Score'],typeMetric,'metric');
 const groups=typeNames.map(name=>({name,items:filtered.filter(x=>x.type===name)})).map(x=>({...x,summary:summarize(x.items)}));
 const val=g=>typeMetric==='Sessions'?g.summary.sessions:typeMetric==='Drams'?g.summary.drams:g.summary.average||0;
 html+=card('Session type breakdown',bars(groups.map(g=>({name:g.name,value:typeMetric==='Avg. Score'?fmt(g.summary.average):val(g),size:val(g),detail:g.name})),Math.max(1,...groups.map(val))));
 if(typeDetail){const g=groups.find(x=>x.name===typeDetail);if(g)html+=card(g.name,list([['Sessions',g.summary.sessions],['Total drams',g.summary.drams],['Drams / session',g.summary.sessions?fmt(g.summary.drams/g.summary.sessions):'—'],['Average session score',fmt(g.summary.average)],['Completion rate',pct(g.summary.completed,g.summary.sessions)],['Scoring coverage',pct(g.summary.scored,g.summary.drams)]])+sessionList(g.items));}
 html+=card('Compare session types','<div class="wc2-di-filters">'+sel('Compare A',['Select',...typeNames],compareA)+sel('Compare B',['Select',...typeNames],compareB)+'</div>'+(()=>{
 const a=groups.find(x=>x.name===compareA),b=groups.find(x=>x.name===compareB);
 if(!a||!b||a===b)return '<p class="meta">Select two different session types.</p>';
 const metrics=[['Sessions',g=>g.summary.sessions],['Drams per session',g=>g.summary.sessions?fmt(g.summary.drams/g.summary.sessions):'—'],['Average session score',g=>fmt(g.summary.average)],['Completion rate',g=>pct(g.summary.completed,g.summary.sessions)],['Scoring coverage',g=>pct(g.summary.scored,g.summary.drams)]];
 return '<div class="wc2-di-compare"><b>'+E(a.name)+'</b><b>'+E(b.name)+'</b></div>'+metrics.map(([name,fn])=>'<div class="wc2-di-compare"><div><small>'+E(name)+'</small><strong>'+E(fn(a))+'</strong></div><div><small>'+E(name)+'</small><strong>'+E(fn(b))+'</strong></div></div>').join('');
 })());
 }
 if(screen==='Distilleries & Themes'){
 html+=ctl(['Distilleries','Themes','Formats'],focusView,'focus')+ctl(['Sessions','Drams'],focusMetric,'focusmetric');
 const key=focusView==='Distilleries'?'focus':focusView==='Themes'?'theme':'format',groups=new Map();
 filtered.forEach(x=>{const name=x[key];if(!groups.has(name))groups.set(name,[]);groups.get(name).push(x)});
 const rows=[...groups].map(([name,items])=>({name,items,summary:summarize(items)})).sort((a,b)=>b.summary.sessions-a.summary.sessions);
 const val=g=>focusMetric==='Sessions'?g.summary.sessions:g.summary.drams;
 html+=card(focusView+' breakdown','<p class="meta">'+(focusView==='Distilleries'?'Only explicitly recorded featured distilleries; mixed sessions are separate.':focusView==='Themes'?'One recorded primary theme per session.':'Format is independent of session type.')+'</p>'+bars(rows.map(g=>({name:g.name,value:val(g),size:val(g),detail:g.name})),Math.max(1,...rows.map(val))));
 if(focusDetail){const g=rows.find(x=>x.name===focusDetail);if(g)html+=card(g.name,list([['Sessions',g.summary.sessions],['Linked drams',g.summary.drams]])+sessionList(g.items));}
 }
 if(screen==='History'){
 html+=ctl(['Sessions','Drams','Avg. Size'],historyMetric,'historymetric')+sel('Session type',['All',...typeNames],historyType);
 const subset=filtered.filter(x=>historyType==='All'||x.type===historyType),dated=subset.filter(x=>x.when),buckets=new Map();
 dated.forEach(x=>{const k=period==='All-time'?x.year:x.when.toISOString().slice(0,7);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(x)});
 const keys=period==='All-time'?[...buckets.keys()].sort():Array.from({length:12},(_,i)=>period+'-'+String(i+1).padStart(2,'0'));
 const rows=keys.map(k=>{const items=buckets.get(k)||[],a=summarize(items);return {name:period==='All-time'?k:k.slice(5),value:historyMetric==='Sessions'?a.sessions:historyMetric==='Drams'?a.drams:a.sessions?a.drams/a.sessions:0,empty:!a.sessions}});
 html+=card('Session '+historyMetric.toLowerCase()+' · '+(period==='All-time'?'yearly':'monthly'),'<p class="meta">Session dates determine the time period. Empty months count as zero activity.</p>'+bars(rows.map(x=>({name:x.name,value:historyMetric==='Avg. Size'?(x.empty?'—':fmt(x.value)):x.value,size:x.value})),Math.max(1,...rows.map(x=>x.value))));
 const activeYears=new Set(dated.map(x=>x.year)),perYear=new Map();dated.forEach(x=>perYear.set(x.year,(perYear.get(x.year)||0)+1));
 const best=[...perYear].sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
 html+=card('Historical summary',list([['Total dated sessions',dated.length],['Active years',activeYears.size],['Avg. sessions / active year',activeYears.size?fmt(dated.length/activeYears.size):'—'],['Most active year',best]]));
 if(subset.length>dated.length)html+='<p class="meta">'+(subset.length-dated.length)+' sessions without usable dates are excluded from the timeline.</p>';
 }
 return html;
}
function bind(root,refresh){
 root.querySelectorAll('[data-si-screen],[data-si-metric],[data-si-focus],[data-si-focusmetric],[data-si-historymetric],[data-si-detail]').forEach(el=>{el.onclick=()=>{const d=el.dataset;if(d.siScreen){screen=d.siScreen;typeDetail='';focusDetail=''}if(d.siMetric)typeMetric=d.siMetric;if(d.siFocus){focusView=d.siFocus;focusDetail=''}if(d.siFocusmetric)focusMetric=d.siFocusmetric;if(d.siHistorymetric)historyMetric=d.siHistorymetric;if(d.siDetail){if(screen==='Session Types')typeDetail=typeDetail===d.siDetail?'':d.siDetail;else focusDetail=focusDetail===d.siDetail?'':d.siDetail}refresh()};if(el.hasAttribute('tabindex'))el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}}});
 root.querySelectorAll('[data-si-select]').forEach(el=>el.onchange=()=>{const k=el.dataset.siSelect,v=el.value;if(k==='Status')status=v;if(k==='Period')period=v;if(k==='Compare A')compareA=v;if(k==='Compare B')compareB=v;if(k==='Session type')historyType=v;typeDetail='';focusDetail='';refresh()});
}
window.WC2SessionsInsights={render,bind};
})();