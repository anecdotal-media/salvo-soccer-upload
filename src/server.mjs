const page = __UPLOAD_PAGE__;
const libraryPage = __LIBRARY_PAGE__;
const pagesBridge = __BRIDGE_PAGE__;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const idPattern=/^[a-f0-9]{24}$/i;
const shape=asset=>Object.fromEntries(['fileId','name','url','thumbnail','size','width','height','fileType','filePath','tags','AITags','description','createdAt','updatedAt','isPrivateFile','customMetadata','extensionStatus'].filter(key=>asset[key]!==undefined).map(key=>[key,asset[key]]));
async function imagekit(env,path,options={}){
 const response=await fetch('https://api.imagekit.io'+path,{...options,headers:{Authorization:'Basic '+btoa(env.IMAGEKIT_PRIVATE_KEY+':'),...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},signal:AbortSignal.timeout(25000)});
 let data;try{data=await response.json()}catch{throw new Error('ImageKit returned an unreadable response. Please retry.')}
 if(!response.ok){const message=response.status===401?'ImageKit rejected the API key. Check server configuration.':response.status===429?'ImageKit is busy. Please wait a moment and retry.':String(data.message||'ImageKit could not complete this request.').slice(0,300);throw new Error(message)}
 return data;
}
async function bodyOf(request){const text=await request.text();if(text.length>16000)throw new Error('This metadata request is too large.');try{return JSON.parse(text)}catch{throw new Error('Invalid request data.')}}
export default {
 async fetch(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(path==='/github-pages-bridge'){
   if(request.method!=='GET')return new Response('Method not allowed',{status:405});
   if(!request.headers.get('oai-authenticated-user-id'))return json({error:'Sign in to access the library.'},401);
   return new Response(pagesBridge,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}});
  }
  if(path.startsWith('/api/')){
   if(!request.headers.get('oai-authenticated-user-id'))return json({error:'Sign in to this private workspace to continue.'},401);
   const configured=Boolean(env.IMAGEKIT_PRIVATE_KEY&&env.IMAGEKIT_PUBLIC_KEY);
   if(path==='/api/config'&&request.method==='GET')return json({configured,aiTagging:true,visualSearch:false});
   if(!configured)return json({error:'ImageKit server credentials are missing.'},503);
   if(request.method==='POST'&&(request.headers.get('X-Salvo-Request')!=='upload'||request.headers.get('Origin')!==url.origin))return json({error:'Invalid request origin.'},403);
   if(path==='/api/upload-auth'&&request.method==='POST'){
    const token=crypto.randomUUID(),expire=Math.floor(Date.now()/1000)+300;
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.IMAGEKIT_PRIVATE_KEY),{name:'HMAC',hash:'SHA-1'},false,['sign']);
    const signature=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(token+expire))),b=>b.toString(16).padStart(2,'0')).join('');
    return json({token,expire,signature,publicKey:env.IMAGEKIT_PUBLIC_KEY});
   }
   if(path==='/api/files'&&request.method==='GET'){
    try{const query=new URLSearchParams({searchQuery:'"tags" IN ["upload-test"]',type:'file',sort:'DESC_CREATED',limit:'12'});const data=await imagekit(env,'/v1/files?'+query);return json(data.filter(f=>f.filePath?.startsWith('/salvo-soccer/test-uploads/')).map(shape));}catch(error){return json({error:error.message},502)}
   }
   if(path==='/api/library'&&request.method==='GET'){
    const offset=Number(url.searchParams.get('offset')||0);if(!Number.isInteger(offset)||offset<0||offset>100000)return json({error:'Invalid library offset.'},400);
    try{const query=new URLSearchParams({searchQuery:'tags EXISTS OR tags NOT EXISTS',type:'file',sort:'DESC_CREATED',limit:'100',skip:String(offset)});const data=await imagekit(env,'/v1/files?'+query);if(!Array.isArray(data))throw new Error('ImageKit returned an unexpected library response.');return json({assets:data.filter(a=>a.fileId).map(shape),nextOffset:data.length===100?offset+100:null});}catch(error){return json({error:error.message},502)}
   }
   if(path==='/api/asset'&&request.method==='GET'){
    const id=url.searchParams.get('id')||'';if(!idPattern.test(id))return json({error:'Invalid asset ID.'},400);
    try{return json(shape(await imagekit(env,'/v1/files/'+id+'/details')))}catch(error){return json({error:error.message},502)}
   }
   if(['/api/asset/update','/api/asset/ai-tags'].includes(path)&&request.method==='POST'){
    let body;try{body=await bodyOf(request)}catch(error){return json({error:error.message},400)}
    if(!idPattern.test(body.id||''))return json({error:'Invalid asset ID.'},400);
    let update;
    if(path==='/api/asset/update'){
     if(!Array.isArray(body.tags)||body.tags.length>40||body.tags.some(t=>typeof t!=='string'||!t.trim()||t.length>100||t.includes(','))||typeof body.description!=='string'||body.description.length>2000)return json({error:'Use up to 40 comma-separated tags (100 characters each) and a description under 2,000 characters.'},400);
     update={tags:[...new Set(body.tags.map(t=>t.trim()))],description:body.description.trim()};
    }else{
     try{const asset=await imagekit(env,'/v1/files/'+body.id+'/details');if(asset.fileType!=='image')return json({error:'AI labeling is available for images only.'},400)}catch(error){return json({error:error.message},502)}
     update={extensions:[{name:'aws-auto-tagging',maxTags:12,minConfidence:80}]};
    }
    try{return json(shape(await imagekit(env,'/v1/files/'+body.id+'/details',{method:'PATCH',body:JSON.stringify(update)})))}catch(error){return json({error:error.message},502)}
   }
   return json({error:'Not found'},404);
  }
  if(!['/','/upload','/upload.html','/library','/library.html'].includes(path))return new Response('Not found',{status:404});
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  return new Response(request.method==='HEAD'?null:['/library','/library.html'].includes(path)?libraryPage:page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline' https://releases.transloadit.com; style-src 'self' 'unsafe-inline' https://releases.transloadit.com; img-src 'self' data: blob: https://ik.imagekit.io; media-src blob: https://ik.imagekit.io; connect-src 'self' https://upload.imagekit.io; font-src 'self' https://releases.transloadit.com; object-src 'none'; base-uri 'none'; form-action 'self'"}});
 }
};
