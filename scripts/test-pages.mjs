import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import app from '../worker/index.js';
const base='https://salvo-soccer-upload-lab.fankymalloon.chatgpt.site';
assert.equal((await app.fetch(new Request(base+'/github-pages-bridge'),{})).status,401);
const response=await app.fetch(new Request(base+'/github-pages-bridge',{headers:{'oai-authenticated-user-id':'owner'}}),{});
assert.equal(response.status,200);
const html=await response.text();const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
let listener,calls=0;const messages=[];
const opener={postMessage:(body,origin)=>messages.push({body,origin})};
const context={window:{opener,addEventListener:(type,fn)=>listener=fn},document:{querySelector:()=>({textContent:''})},URL,location:{origin:base},fetch:async(path,options)=>{calls++;assert.equal(path,'/api/upload-auth');assert.equal(options.headers['X-Salvo-Request'],'upload');return Response.json({token:'sample-token'})}};
vm.runInNewContext(script,context);
const event={origin:'https://anecdotal-media.github.io',source:opener,data:{channel:'salvo-imagekit-v1',id:'sample-request',path:'/api/upload-auth',method:'POST'}};
await listener({...event,origin:'https://wrong.example'});assert.equal(calls,0);
await listener({...event,source:{}});assert.equal(calls,0);
await listener({...event,data:{...event.data,path:'/api/delete'}});assert.equal(calls,0);
await listener(event);assert.equal(calls,1);assert.equal(messages[0].origin,event.origin);assert.equal(messages[0].body.body.token,'sample-token');
const pages=await readFile(new URL('../docs/upload.html',import.meta.url),'utf8');
assert.ok(pages.includes('window.SALVO_PAGES = true'));
assert.ok(pages.includes('Sign in to upload'));
assert.ok(!pages.includes('private_'),'Pages must not include private credentials');
assert.ok(pages.includes("const fetch = window.salvoConnection.request;"));
console.log('Passed: bridge authentication, allowed origin/opener, route allowlist, response targeting, Pages credential isolation.');

// Regress the reported 0-of-0 failure: authorization must happen before Uppy starts.
const elements = new Map();
const element = selector => {
  if (!elements.has(selector)) elements.set(selector, {
    value: selector === '#program' ? 'club' : '', textContent: '', disabled: false,
    className: '', listeners: {},
    addEventListener(type, listener, capture) { this.listeners[type] = { listener, capture }; },
    remove() {}, replaceChildren() {}, classList: { add() {} }
  });
  return elements.get(selector);
};
let ready = false, authorize, authorizationCalls = 0, transfers = 0, retries = 0;
const selectedFiles = [{ id: 'selected-photo', name: 'Mac Photo.png' }];
let uploader;
class TestUppy {
  constructor() { uploader = this; }
  use() { return this; }
  addPreProcessor() {}
  on() {}
  getFiles() { return selectedFiles; }
  async upload() { transfers++; }
  async retryAll() { retries++; }
}
const session = {
  isReady: () => ready,
  connect() { authorizationCalls++; return new Promise(resolve => { authorize = () => { ready = true; resolve(); }; }); },
  async request(path) { return Response.json(path === '/api/config' ? { configured: true } : []); }
};
const moduleScript = pages.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*;$/gm, '');
const pageContext = {
  window: { SALVO_PAGES: true, location: {search:''}, salvoConnection: session, addEventListener() {} },
  document: { querySelector: element }, Uppy: TestUppy, Dashboard: class {}, XHRUpload: class {},
  URL, URLSearchParams, setTimeout, Response
};
await vm.runInNewContext('(async () => {' + moduleScript + '\n})()', pageContext);
const gate = element('#uploader').listeners.click;
assert.equal(gate.capture, true, 'Authorize before the uploader handles the click');
let prevented = 0, stopped = 0;
const click = () => ({ target: { closest: () => ({}) }, preventDefault() { prevented++; }, stopImmediatePropagation() { stopped++; } });
gate.listener(click());
assert.equal(authorizationCalls, 1, 'Open sign-in synchronously during the upload gesture');
assert.equal(transfers, 0, 'No transfer starts while unsigned');
assert.equal(selectedFiles[0].name, 'Mac Photo.png', 'Keep selected files during sign-in');
gate.listener(click());
assert.equal(authorizationCalls, 1, 'Repeated clicks do not start competing sign-ins');
authorize(); await new Promise(resolve => setImmediate(resolve));
assert.equal(transfers, 1, 'Resume the selected upload after authorization');
assert.equal(element('#message').textContent, '');
const before = prevented; gate.listener(click());
assert.equal(prevented, before, 'An authorized upload follows the normal Uppy flow');
ready = false; selectedFiles[0].error = new Error('A previous transfer failed');
gate.listener(click()); authorize(); await new Promise(resolve => setImmediate(resolve));
assert.equal(retries, 1, 'Reauthorize and retry a failed transfer when its session window closed');
assert.equal(stopped, 3);
session.connect = async () => { throw new Error('Allow the sign-in window.'); }; ready = false;
gate.listener(click()); await new Promise(resolve => setImmediate(resolve));
assert.equal(element('#message').textContent, 'Allow the sign-in window.');
assert.equal(selectedFiles.length, 1, 'Blocked sign-in retains the file for another attempt');
assert.equal(transfers, 1, 'Blocked sign-in does not start a failed transfer');
console.log('Passed: unsigned-upload gating, selected-file retention, automatic resume, duplicate clicks, closed-session retry, blocked-popup recovery.');

// Destination links resolve without asking contributors to navigate the library.
const contextSource=moduleScript.slice(moduleScript.indexOf('function uploadContext('),moduleScript.indexOf('\nlet context;'));
const routing=vm.createContext({URLSearchParams});vm.runInContext(contextSource,routing);
const folder=vm.runInContext("uploadContext('?folder=woodbury/u12-orange&label=U12%20Orange')",routing);
assert.equal(folder.folder,'/salvo-soccer/test-uploads/woodbury/u12-orange');assert.equal(folder.label,'U12 Orange');
for(const query of ['?folder=../private','?folder=woodbury//other','?folder=/woodbury','?folder=unknown','?folder=woodbury%2F..%2Fprivate','?folder='])assert.throws(()=>routing.uploadContext(query));
assert.equal(routing.uploadContext('').folder,'/salvo-soccer/test-uploads/club');
const home=await readFile(new URL('../docs/index.html',import.meta.url),'utf8');
assert.equal(home,pages,'Both public entry routes open the uploader');
assert.ok(!home.includes('id="gallery"'));assert.ok(!home.includes('id="program"'));assert.ok(!home.includes("fetch('/api/files')"));
const staff=await readFile(new URL('../docs/library.html',import.meta.url),'utf8');assert.ok(staff.includes('Search media'));
console.log('Passed: destination link parsing, invalid-path rejection, upload-only landing page, separate staff library.');
