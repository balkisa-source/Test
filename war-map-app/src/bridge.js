// Runs inside the WebView before the War Map loads. It provides the same
// window.claude.use('db' | 'assets' | 'sample' | 'downloads') runtime the page
// gets inside Claude, backed by the native app instead, and adds the
// Connections (Settings) and calendar (Plan) cards.
export function buildBridge(init) {
  return `(function(){
var INIT=${JSON.stringify(init)};
var docs=INIT.docs||{};
var native=INIT.native||{};
var clone=function(o){return o===undefined?undefined:JSON.parse(JSON.stringify(o))};
var post=function(m){window.ReactNativeWebView.postMessage(JSON.stringify(m))};
var seq=0,pending={};
function call(type,payload){return new Promise(function(res,rej){var id=++seq;pending[id]={res:res,rej:rej};var m=payload||{};m.id=id;m.type=type;post(m)})}
window.__wmReply=function(id,ok,val){var p=pending[id];if(!p)return;delete pending[id];if(ok)p.res(val);else{var e=new Error(val&&val.message||'Failed');if(val&&val.code)e.code=val.code;p.rej(e)}};

/* ---- db: a small Firestore-like store, persisted natively ---- */
var docL={},colL={};
function snapDoc(path){var d=docs[path];return {id:path.split('/').pop(),exists:d!==undefined,data:function(){return clone(d)}}}
function snapCol(c){var pre=c+'/';var ds=Object.keys(docs).filter(function(p){return p.indexOf(pre)===0&&p.indexOf('/',pre.length)<0}).map(function(p){return {id:p.slice(pre.length),exists:true,data:function(){return clone(docs[p])}}});return {docs:ds,size:ds.length,empty:!ds.length,forEach:function(f){ds.forEach(f)}}}
function notify(path){(docL[path]||[]).slice().forEach(function(f){f(snapDoc(path))});var c=path.split('/')[0];(colL[c]||[]).slice().forEach(function(f){f(snapCol(c))})}
function listen(map,key,cb,snap){(map[key]=map[key]||[]).push(cb);setTimeout(function(){cb(snap())},0);return function(){map[key]=(map[key]||[]).filter(function(x){return x!==cb})}}
window.__wmApply=function(path,data){if(data==null)delete docs[path];else docs[path]=data;notify(path)};
function docRef(path){return {id:path.split('/').pop(),path:path,
  get:function(){return Promise.resolve(snapDoc(path))},
  set:function(o){docs[path]=clone(o);post({type:'db.set',path:path,data:docs[path]});notify(path);return Promise.resolve()},
  update:function(o){docs[path]=Object.assign({},docs[path]||{},clone(o));post({type:'db.set',path:path,data:docs[path]});notify(path);return Promise.resolve()},
  delete:function(){delete docs[path];post({type:'db.delete',path:path});notify(path);return Promise.resolve()},
  onSnapshot:function(cb){return listen(docL,path,cb,function(){return snapDoc(path)})}}}
var db={doc:docRef,collection:function(c){return {
  doc:function(id){return docRef(c+'/'+id)},
  get:function(){return Promise.resolve(snapCol(c))},
  onSnapshot:function(cb){return listen(colL,c,cb,function(){return snapCol(c)})}}}};

/* ---- photos: saved as files by the app; /_blob/<id> points at them ---- */
function fileB64(f){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(String(r.result).split(',')[1]||'')};r.onerror=function(){rej(r.error)};r.readAsDataURL(f)})}
var assets={upload:function(f){return fileB64(f).then(function(b){return call('asset.upload',{b64:b,mime:f.type||'image/jpeg'})})}};
var fix=function(u){return typeof u==='string'&&u.indexOf('/_blob/')===0?INIT.blobBase+u.slice(7):u};
var d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:true,enumerable:true,get:function(){return d.get.call(this)},set:function(v){d.set.call(this,fix(v))}});
var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){return sa.call(this,n,n==='src'?fix(v):v)};
function fixImgs(root){if(!root.querySelectorAll)return;root.querySelectorAll('img[src^="/_blob/"]').forEach(function(i){i.setAttribute('src',i.getAttribute('src'))})}

/* ---- downloads: hand files to the iOS share sheet ---- */
var downloads={save:function(o){var data=o.data;var p=typeof data==='string'?Promise.resolve({text:data}):fileB64(data).then(function(b){return {b64:b}});return p.then(function(x){x.filename=o.filename;return call('download',x)})}};

/* ---- sample: Claude, called from the app with your API key ---- */
var sample=null;
if(INIT.ai){
  sample=function(prompt,opts){opts=opts||{};var p=call('ai.text',{prompt:prompt});
    if(opts.signal)p=Promise.race([p,new Promise(function(_,rej){opts.signal.addEventListener('abort',function(){var e=new Error('Aborted');e.name='AbortError';rej(e)})})]);
    return p.then(function(r){if(opts.onText)try{opts.onText({text:r.text})}catch(_){}return r})};
  sample.json=function(prompt,opts){var imgs=(opts&&opts.images)||[];return Promise.all(imgs.map(function(f){return fileB64(f).then(function(b){return {b64:b,mime:f.type||'image/jpeg'}})})).then(function(images){return call('ai.json',{prompt:prompt,images:images})})};
  sample.limits=function(){return Promise.resolve({images:true})};
}
var caps={db:db,assets:assets,sample:sample,downloads:downloads};
window.claude={use:function(n){return Promise.resolve(caps[n]||null)}};

/* ---- native cards: Connections in Settings, calendar in Plan ---- */
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var ago=function(t){if(!t)return 'never';var m=Math.round((Date.now()-t)/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+'h ago':new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short'})};
var hm=function(s){return new Date(s).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})};
function connCard(){var h=native.health||{},g=native.gcal||{};
  var hb=!h.supported?'<span class="sub small">Apple Health needs the installed War Map app (a development build, not Expo Go).</span>':h.connected?'<div class="row"><span class="sub small">'+(h.syncing?'Syncing…':'Last sync '+esc(ago(h.lastSync)))+'</span><button class="btn sm light" data-wm="health-sync">Sync now</button></div>':'<button class="btn" data-wm="health-connect">Connect Apple Health</button>';
  var gb=!g.configured?'<span class="sub small">Add your Google iOS client ID to the app’s .env to turn this on.</span>':g.connected?'<div class="row"><span class="sub small">Connected</span><button class="btn sm light" data-wm="gcal-disconnect">Disconnect</button></div>':'<button class="btn" data-wm="gcal-connect">Connect Google Calendar</button>';
  return '<section class="card" id="wm-conn"><h2>Connections</h2>'
   +'<div style="display:flex;flex-direction:column;gap:8px"><b>❤️ Apple Health</b><span class="sub small">Fills in steps, weight, sleep and MyFitnessPal nutrition each day. Anything you type yourself stays as you typed it.</span>'+hb+(h.error?'<span class="sub small" style="color:var(--bad)">'+esc(h.error)+'</span>':'')+'</div>'
   +'<div style="display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--soft);padding-top:12px"><b>📅 Google Calendar</b><span class="sub small">Puts your 3 priorities on your calendar as deep-work blocks, and shows today’s events in Plan.</span>'+gb+(g.error?'<span class="sub small" style="color:var(--bad)">'+esc(g.error)+'</span>':'')+'</div></section>'}
function calCard(){var g=native.gcal||{};if(!g.configured)return '';
  if(!g.connected)return '<section class="card tight" id="wm-cal"><div class="row"><div style="display:flex;flex-direction:column;gap:2px"><b>📅 Your calendar</b><span class="sub small">See today’s events and block time for your priorities.</span></div><button class="btn sm" data-wm="gcal-connect">Connect</button></div></section>';
  var ev=(g.events||[]);
  var rows=ev.length?ev.map(function(e){return '<div class="pl"><span class="pl-n'+(e.wm?' one':'')+'" style="width:auto;padding:0 8px;border-radius:10px;font-size:12px">'+(e.allDay?'All day':esc(hm(e.start)))+'</span><div class="pl-b"><span class="pl-t">'+esc(e.title)+'</span>'+(e.allDay?'':'<span class="sub small">until '+esc(hm(e.end))+'</span>')+'</div></div>'}).join(''):'<div class="empty">Nothing on your calendar today.</div>';
  return '<section class="card" id="wm-cal"><div class="row"><h2>On your calendar today</h2><button class="link small" data-wm="gcal-refresh">Refresh</button></div><div class="pl-list">'+rows+'</div><button class="btn'+(g.busy?'" disabled':'"')+' data-wm="gcal-push">'+(g.busy?'Working…':'🎯 Block time for today’s priorities')+'</button>'+(g.note?'<span class="sub small">'+esc(g.note)+'</span>':'')+(g.error?'<span class="sub small" style="color:var(--bad)">'+esc(g.error)+'</span>':'')+'</section>'}
function swap(sel,html,place){var old=document.getElementById(sel);if(old){if(old.__h!==html){var t=document.createElement('div');t.innerHTML=html;var n=t.firstChild;if(n){n.__h=html;old.replaceWith(n)}else old.remove()}return}if(!html)return;var t2=document.createElement('div');t2.innerHTML=html;var n2=t2.firstChild;n2.__h=html;place(n2)}
var queued=false;
function decorate(){queued=false;
  var st=document.getElementById('sheet-title'),sh=st&&st.closest('.sheet');
  if(sh&&st.textContent.trim()==='Settings')swap('wm-conn',connCard(),function(n){sh.appendChild(n)});
  var h1=Array.prototype.find.call(document.querySelectorAll('.top h1'),function(h){return !h.closest('.sheet')});
  if(h1&&h1.textContent.trim()==='Plan'){var top=h1.closest('.top');swap('wm-cal',calCard(),function(n){top.insertAdjacentElement('afterend',n)})}
}
function queue(){if(!queued){queued=true;requestAnimationFrame(decorate)}}
window.__wmSetNative=function(s){native=s||{};queue()};
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-wm]');if(!b)return;e.preventDefault();e.stopPropagation();post({type:'ui',action:b.getAttribute('data-wm')})},true);
document.addEventListener('DOMContentLoaded',function(){fixImgs(document);new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType===1){if(n.tagName==='IMG')n.setAttribute('src',n.getAttribute('src')||'');else fixImgs(n)}})});queue()}).observe(document.body,{childList:true,subtree:true});queue()});
})();true;`;
}
