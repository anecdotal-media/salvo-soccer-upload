const $ = selector => document.querySelector(selector);
const PROGRAMS = {club:'Club / general',academy:'Salvo SC Academy',rosemount:'Rosemount','two-rivers':'Two Rivers',woodbury:'Woodbury'};
let assets=[], activeView='all', selected=new Set(), activeAsset=null, loading=false, signedIn=false, detailRevision=0;
const storage = {
  read(key,fallback){try{return JSON.parse(localStorage.getItem('salvo-dam:'+key))??fallback}catch{return fallback}},
  write(key,value){try{localStorage.setItem('salvo-dam:'+key,JSON.stringify(value))}catch{toast('Browser storage is unavailable; this view cannot be saved.')}}
};
const storedFavorites=storage.read('favorites',[]),storedViews=storage.read('views',[]);
let favorites=new Set(Array.isArray(storedFavorites)?storedFavorites:[]), savedViews=Array.isArray(storedViews)?storedViews.filter(v=>v&&typeof v.name==='string'&&v.filters):[];
const api=(path,options={})=>window.SALVO_PAGES?window.salvoConnection.request(path,options):fetch(path,{...options,headers:{...options.headers,...(options.method==='POST'?{'X-Salvo-Request':'upload','Content-Type':'application/json'}:{})}});
const ready=()=>!window.SALVO_PAGES||window.salvoConnection.isReady();
const typeOf=a=>a.fileType==='image'?'image':(/\.(mp4|mov|webm|m4v|avi)$/i.test(a.name)?'video':'other');
const programOf=a=>a.filePath?.match(/\/salvo-soccer\/test-uploads\/([^/]+)\//)?.[1]||(a.tags||[]).find(t=>PROGRAMS[t])||'';
const dateText=value=>value?new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'Date unavailable';
const sizeText=value=>Number(value)>=1000000?(value/1000000).toFixed(1)+' MB':Math.max(1,Math.round((Number(value)||0)/1000))+' KB';
function node(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,4500)}
function error(message){$('#error').textContent=message;$('#error').hidden=!message}
function delivery(url,tr){try{const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.hostname!=='ik.imagekit.io'||!parsed.pathname.startsWith('/anecdotal/'))return '';if(tr)parsed.searchParams.set('tr',tr);return parsed.href}catch{return ''}}
function filterState(){return {q:$('#search').value,scope:$('#scope').value,program:$('#filter-program').value,type:$('#filter-type').value,days:$('#filter-date').value,sort:$('#sort').value,view:activeView}}
function findAssets(list,state,now=Date.now()){
  const terms=state.q.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return list.filter(asset=>{
    const corpus=[asset.name,asset.description,asset.filePath,...(asset.tags||[]),...(asset.AITags||[]).map(t=>t.name),...Object.values(asset.customMetadata||{}).map(v=>JSON.stringify(v))].join(' ').toLocaleLowerCase();
    if(!terms.every(term=>corpus.includes(term)))return false;
    if(state.scope==='salvo'&&!asset.filePath?.startsWith('/salvo-soccer/test-uploads/'))return false;
    if(state.program&&programOf(asset)!==state.program)return false;
    if(state.type&&typeOf(asset)!==state.type)return false;
    const days=state.view==='recent'?Math.min(Number(state.days)||7,7):Number(state.days);
    if(days&&(!asset.createdAt||Date.parse(asset.createdAt)<now-days*86400000))return false;
    if(state.view==='favorites'&&!favorites.has(asset.fileId))return false;
    const meaningful=(asset.tags||[]).filter(t=>!['salvo-soccer','upload-test',...Object.keys(PROGRAMS)].includes(t));
    if(state.view==='untagged'&&(meaningful.length||(asset.AITags||[]).length))return false;
    return true;
  }).sort((a,b)=>state.sort==='name'?a.name.localeCompare(b.name):state.sort==='oldest'?Date.parse(a.createdAt||0)-Date.parse(b.createdAt||0):Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0));
}
function render(){
  const filtered=findAssets(assets,filterState());const grid=$('#assets');grid.replaceChildren();
  $('#all-count').textContent=signedIn?String(assets.length):'—';
  $('#result-count').textContent=loading?'Loading library across all folders…':signedIn?filtered.length+' of '+assets.length+' assets'+(selected.size?' · '+selected.size+' selected':''):'Sign in to load your media.';
  $('#empty').hidden=filtered.length>0||loading;
  if(signedIn&&!filtered.length){$('#empty').replaceChildren(node('h2',null,assets.length?'No matching assets.':'Your library is ready for its first upload.'),node('p',null,assets.length?'Try a different search or clear the filters. AI-label search finds labels generated on your images.':'Choose Upload media to add photos and videos.'))}
  for(const asset of filtered){
    const card=node('article','asset-card'+(selected.has(asset.fileId)?' selected':''));
    const checkLabel=node('label','asset-check');const checkbox=node('input');checkbox.type='checkbox';checkbox.checked=selected.has(asset.fileId);checkbox.setAttribute('aria-label','Select '+asset.name);checkbox.addEventListener('change',()=>{checkbox.checked?selected.add(asset.fileId):selected.delete(asset.fileId);card.classList.toggle('selected',checkbox.checked);renderSelection()});checkLabel.append(checkbox);card.append(checkLabel);
    const star=node('button','favorite',favorites.has(asset.fileId)?'★':'☆');star.setAttribute('aria-label',(favorites.has(asset.fileId)?'Remove favorite ':'Favorite ')+asset.name);star.setAttribute('aria-pressed',String(favorites.has(asset.fileId)));star.addEventListener('click',()=>{favorites.has(asset.fileId)?favorites.delete(asset.fileId):favorites.add(asset.fileId);storage.write('favorites',[...favorites]);render()});card.append(star);
    const thumb=node('button','asset-thumb');thumb.setAttribute('aria-label','View '+asset.name);
    const src=!asset.isPrivateFile&&typeOf(asset)==='image'?delivery(asset.url,'w-650,h-450,c-at_max,f-auto,q-75'):!asset.isPrivateFile&&typeOf(asset)==='video'?delivery(asset.thumbnail):'';
    if(src){const img=node('img');img.src=src;img.alt=asset.name;img.loading='lazy';img.addEventListener('error',()=>{img.remove();thumb.append(node('span','doc-icon',typeOf(asset)==='video'?'▶ VIDEO':'IMAGE'))},{once:true});thumb.append(img)}else thumb.append(node('span','doc-icon',asset.isPrivateFile?'Private asset':typeOf(asset)==='video'?'▶ VIDEO':typeOf(asset)==='image'?'IMAGE':asset.name.split('.').pop().toUpperCase()));
    thumb.addEventListener('click',()=>openAsset(asset));card.append(thumb);
    const body=node('div','asset-body'),name=node('button','asset-name',asset.name);name.addEventListener('click',()=>openAsset(asset));body.append(name,node('p','asset-meta',sizeText(asset.size)+(asset.width?' · '+asset.width+' × '+asset.height:'')));
    const footer=node('div','asset-footer');footer.append(node('span',null,PROGRAMS[programOf(asset)]||'ImageKit library'),node('time',null,dateText(asset.createdAt)));body.append(footer);
    const tags=node('div','asset-tags');for(const tag of (asset.tags||[]).filter(t=>!['salvo-soccer','upload-test'].includes(t)).slice(0,2))tags.append(node('span','tag',PROGRAMS[tag]||tag));if(asset.AITags?.length)tags.append(node('span','tag ai',asset.AITags.length+' AI labels'));body.append(tags);card.append(body);grid.append(card);
  }
  renderSelection();
}
function renderSelection(){$('#bulk').hidden=!selected.size;$('#selected-count').textContent=selected.size+' selected';if(!loading&&signedIn)$('#result-count').textContent=findAssets(assets,filterState()).length+' of '+assets.length+' assets'+(selected.size?' · '+selected.size+' selected':'')}
async function loadLibrary(){
  if(loading)return;loading=true;$('#refresh').disabled=true;error('');render();
  try{let collected=[],offset=0;do{const response=await api('/api/library?offset='+offset);const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not load the library.');if(!Array.isArray(data.assets))throw new Error('The library returned an unexpected response.');collected.push(...data.assets);offset=data.nextOffset;}while(offset!==null);assets=collected;selected=new Set([...selected].filter(id=>assets.some(a=>a.fileId===id)));signedIn=true;$('#session').textContent='● Signed in';$('#empty').replaceChildren();}
  catch(err){error(err.message);if(!signedIn)$('#empty').hidden=false;}
  finally{loading=false;$('#refresh').disabled=false;render()}
}
let authenticating=false;
async function signIn(){
  if(authenticating)return;authenticating=true;$('#session').disabled=true;$('#session').textContent='Signing in…';error('');
  try{if(window.SALVO_PAGES&&!ready())await window.salvoConnection.connect();const response=await api('/api/config');const config=await response.json();if(!response.ok||!config.configured)throw new Error('ImageKit is not configured on the server.');await loadLibrary();if(!signedIn)$('#session').textContent='Retry library';}
  catch(err){error(err.message);$('#session').textContent='Sign in to library';}
  finally{authenticating=false;$('#session').disabled=false;}
}
async function authorizedAction(callback){if(!ready()){await signIn();if(!ready()||!signedIn)return;}return callback()}
$('#session').addEventListener('click',signIn);$('#empty-signin').addEventListener('click',signIn);$('#refresh').addEventListener('click',()=>signedIn&&ready()?loadLibrary():signIn());
$('#search-form').addEventListener('submit',e=>{e.preventDefault();render()});$('#search').addEventListener('input',render);
for(const selector of ['#scope','#filter-program','#filter-type','#filter-date','#sort'])$(selector).addEventListener('change',render);
$('#clear-filters').addEventListener('click',()=>{$('#search').value='';$('#scope').value='all';$('#filter-program').value='';$('#filter-type').value='';$('#filter-date').value='';$('#sort').value='newest';setView('all')});
function setView(view){activeView=view;for(const button of $('#views').querySelectorAll('button')){button.dataset.view===view?button.setAttribute('aria-current','page'):button.removeAttribute('aria-current')}const headings={all:['All assets','Your entire ImageKit library, across every folder.'],recent:['Recent uploads','Everything uploaded in the last seven days, across folders.'],favorites:['Favorites','Your starred assets, saved on this browser.'],untagged:['Needs tags','Assets without descriptive tags or AI labels.']};$('h1').textContent=headings[view][0];$('#view-description').textContent=headings[view][1];render()}
$('#views').addEventListener('click',event=>{const button=event.target.closest('button[data-view]');if(button)setView(button.dataset.view)});
$('#grid-view').addEventListener('click',()=>setLayout(false));$('#list-view').addEventListener('click',()=>setLayout(true));
function setLayout(list){$('#assets').classList.toggle('list',list);$('#list-view').setAttribute('aria-pressed',String(list));$('#grid-view').setAttribute('aria-pressed',String(!list));storage.write('layout',list?'list':'grid')}
$('#ai-toggle').addEventListener('click',()=>{const panel=$('#ai-panel');panel.hidden=!panel.hidden;$('#ai-toggle').setAttribute('aria-expanded',String(!panel.hidden))});
$('#clear-selection').addEventListener('click',()=>{selected.clear();render()});
$('#copy-selected').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(assets.filter(a=>selected.has(a.fileId)&&!a.isPrivateFile).map(a=>delivery(a.url)).filter(Boolean).join('\n'));toast('Public delivery links copied.')}catch{error('Clipboard access was blocked. Open an asset to copy its link.')}});
$('#export-selected').addEventListener('click',()=>{const csv=values=>values.map(v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"').join(',');const text=[csv(['Name','Folder','Type','Upload date','Tags','AI labels','URL']),...assets.filter(a=>selected.has(a.fileId)).map(a=>csv([a.name,a.filePath,typeOf(a),a.createdAt,(a.tags||[]).join('; '),(a.AITags||[]).map(t=>t.name).join('; '),a.isPrivateFile?'Private asset':a.url]))].join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8;'}));const link=node('a');link.href=url;link.download='salvo-media-selection.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
function renderSaved(){const container=$('#saved-views');container.replaceChildren();for(const view of savedViews){const row=node('div','saved-row'),button=node('button','saved-view',view.name),remove=node('button','remove-view','×');remove.setAttribute('aria-label','Remove saved view '+view.name);button.addEventListener('click',()=>{const s=view.filters;$('#search').value=s.q;$('#scope').value=s.scope;$('#filter-program').value=s.program;$('#filter-type').value=s.type;$('#filter-date').value=s.days;$('#sort').value=s.sort;setView(s.view||'all')});remove.addEventListener('click',()=>{savedViews=savedViews.filter(v=>v.id!==view.id);storage.write('views',savedViews);renderSaved()});row.append(button,remove);container.append(row)}if(!savedViews.length)container.append(node('p','muted small','Save a search and its filters for next time.'))}
$('#save-view').addEventListener('click',()=>{$('#save-dialog').showModal();$('#view-name').focus()});$('#cancel-save').addEventListener('click',()=>$('#save-dialog').close());$('#save-view-form').addEventListener('submit',event=>{event.preventDefault();const name=$('#view-name').value.trim();if(!name)return;savedViews.push({id:crypto.randomUUID(),name,filters:filterState()});storage.write('views',savedViews);renderSaved();$('#save-dialog').close();$('#view-name').value='';toast('View saved on this browser.')});
function populateDetail(asset){
  activeAsset=asset;$('#asset-title').textContent=asset.name;$('#asset-summary').textContent=sizeText(asset.size)+(asset.width?' · '+asset.width+' × '+asset.height:'')+' · '+typeOf(asset);$('#description').value=asset.description||'';$('#asset-tags').value=(asset.tags||[]).join(', ');$('#detail-status').textContent='';$('#ai-state').textContent='';
  const facts=$('#asset-facts');facts.replaceChildren();for(const [label,value]of [['Uploaded',dateText(asset.createdAt)],['Program',PROGRAMS[programOf(asset)]||'Not assigned'],['Folder',asset.filePath?.substring(0,asset.filePath.lastIndexOf('/'))||'/'],['Delivery',asset.isPrivateFile?'Private asset':'Public link']])facts.append(node('dt',null,label),node('dd',null,value));
  const url=asset.isPrivateFile?'':delivery(asset.url);$('#open-original').hidden=!url;$('#open-original').href=url;$('#copy-original').disabled=!url;$('#native-details').href='https://imagekit.io/dashboard/search?q='+encodeURIComponent(asset.name)+'&sort=DESC_CREATED';
  const preview=$('#preview-media');preview.replaceChildren();$('#preview-actions').replaceChildren();
  if(url&&(typeOf(asset)==='image'||typeOf(asset)==='video')){const media=node(typeOf(asset)==='video'?'video':'img');if(media.tagName==='VIDEO'){media.controls=true;media.preload='metadata';media.src=url}else{media.alt=asset.name;media.src=delivery(url,'w-1200,h-1000,c-at_max,f-auto,q-85')}preview.append(media);if(typeOf(asset)==='image'){for(const [label,tr]of [['Fit','w-1200,h-1000,c-at_max,f-auto,q-85'],['Square crop','w-800,h-800,fo-auto,f-auto,q-85'],['Grayscale','w-1200,h-1000,c-at_max,e-grayscale,f-auto,q-85']]){const button=node('button',null,label);button.setAttribute('aria-pressed',String(label==='Fit'));button.addEventListener('click',()=>{media.src=delivery(url,tr);for(const b of $('#preview-actions').children)b.setAttribute('aria-pressed','false');button.setAttribute('aria-pressed','true')});$('#preview-actions').append(button)}}}else preview.append(node('p','muted',asset.isPrivateFile?'Open this private asset in ImageKit to preview it.':'Open the original file to view this asset.'));
  renderAILabels(asset);$('#generate-ai').disabled=typeOf(asset)!=='image';
}
function renderAILabels(asset){const container=$('#ai-tags');container.replaceChildren();for(const tag of asset.AITags||[])container.append(node('span',null,tag.name+(tag.confidence?' · '+Math.round(tag.confidence)+'%':'')));if(!asset.AITags?.length)container.append(node('p','small muted','No AI labels yet. Generate labels to make visual content searchable.'))}
function lockDetail(locked){for(const selector of ['#description','#asset-tags','#save-metadata'])$(selector).disabled=locked;$('#generate-ai').disabled=locked||!activeAsset||typeOf(activeAsset)!=='image';}
async function openAsset(asset){
 const revision=++detailRevision;populateDetail(asset);lockDetail(true);$('#asset-dialog').showModal();$('#asset-dialog').scrollTop=0;
 try{const response=await api('/api/asset?id='+encodeURIComponent(asset.fileId));const data=await response.json();if(!response.ok)throw new Error(data.error);if(activeAsset?.fileId===asset.fileId&&revision===detailRevision){replaceAsset(data);populateDetail(data)}}
 catch(err){if(activeAsset?.fileId===asset.fileId&&revision===detailRevision)$('#detail-status').textContent=err.message||'Could not load current details.'}
 finally{if(activeAsset?.fileId===asset.fileId&&revision===detailRevision)lockDetail(false)}
}
function replaceAsset(updated){const index=assets.findIndex(a=>a.fileId===updated.fileId);if(index>=0)assets[index]={...assets[index],...updated};if(activeAsset?.fileId===updated.fileId)activeAsset={...activeAsset,...updated};render()}
$('#close-detail').addEventListener('click',()=>{$('#asset-dialog').close();const video=$('#preview-media video');if(video)video.pause();activeAsset=null;detailRevision++});$('#asset-dialog').addEventListener('cancel',()=>{const video=$('#preview-media video');if(video)video.pause();activeAsset=null;detailRevision++});
$('#copy-original').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(delivery(activeAsset.url));$('#detail-status').textContent='Delivery URL copied.'}catch{$('#detail-status').textContent='Clipboard access was blocked. Use Open original to copy the link.'}});
$('#metadata-form').addEventListener('submit',event=>{
 event.preventDefault();if(!activeAsset)return;
 const id=activeAsset.fileId,description=$('#description').value.trim(),tags=$('#asset-tags').value.split(',').map(t=>t.trim()).filter(Boolean),button=$('#save-metadata');
 button.disabled=true;
 void authorizedAction(async()=>{
  if(activeAsset?.fileId!==id||!$('#asset-dialog').open)return;
  $('#detail-status').textContent='Saving…';
  try{const response=await api('/api/asset/update',{method:'POST',body:JSON.stringify({id,tags,description})});const updated=await response.json();if(!response.ok)throw new Error(updated.error||'Could not save metadata.');replaceAsset(updated);if(activeAsset?.fileId===id)$('#detail-status').textContent='Metadata saved to ImageKit.'}
  catch(err){if(activeAsset?.fileId===id)$('#detail-status').textContent=err.message}
 }).finally(()=>{if(activeAsset?.fileId===id)button.disabled=false});
});
function aiRunStatus(asset,previous){
 const status=asset.extensionStatus||{},name='aws-auto-tagging';
 if(status.failed?.includes?.(name)||status[name]==='failed')return 'failed';
 if(status.success?.includes?.(name)||status[name]==='success')return 'complete';
 if(status.pending?.includes?.(name)||status[name]==='pending')return 'pending';
 return JSON.stringify(asset.AITags||[])!==previous&&asset.AITags?.length?'complete':'pending';
}
$('#generate-ai').addEventListener('click',()=>{
 if(!activeAsset)return;const id=activeAsset.fileId,previous=JSON.stringify(activeAsset.AITags||[]),button=$('#generate-ai');button.disabled=true;
 void authorizedAction(async()=>{
  if(activeAsset?.fileId!==id||!$('#asset-dialog').open)return;
  $('#ai-state').textContent='Requesting ImageKit AI labels…';
  try{
   const response=await api('/api/asset/ai-tags',{method:'POST',body:JSON.stringify({id})});let updated=await response.json();if(!response.ok)throw new Error(updated.error||'AI tagging could not start.');replaceAsset(updated);
   for(let attempt=0;attempt<6&&aiRunStatus(updated,previous)==='pending';attempt++){
    await new Promise(resolve=>setTimeout(resolve,2000));const poll=await api('/api/asset?id='+encodeURIComponent(id));if(!poll.ok)break;updated=await poll.json();replaceAsset(updated);
   }
   if(activeAsset?.fileId===id){renderAILabels(updated);const status=aiRunStatus(updated,previous);$('#ai-state').textContent=status==='complete'?'AI labels saved. You can search for these words in the library.':status==='failed'?'ImageKit could not finish AI tagging. Existing labels are unchanged.':'Tagging was requested. Existing labels are shown; refresh or reopen this asset to check completion.';}
  }catch(err){if(activeAsset?.fileId===id)$('#ai-state').textContent=err.message}
 }).finally(()=>{if(activeAsset?.fileId===id)button.disabled=false});
});

if(!window.SALVO_PAGES){$('#upload-link').href='/upload';$('#session').textContent='Checking session…';void signIn();}
renderSaved();setLayout(storage.read('layout','grid')==='list');
