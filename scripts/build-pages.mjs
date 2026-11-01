import { mkdir, writeFile } from 'node:fs/promises';
import app from '../worker/index.js';

const origin = 'https://salvo-soccer-upload-lab.fankymalloon.chatgpt.site';
let html = await (await app.fetch(new Request(origin), {})).text();
const client = `
window.SALVO_PAGES = true;
window.salvoConnection = (() => {
  const origin = ${JSON.stringify(origin)};
  let popup, ready = false;
  const pending = new Map();
  const channel = 'salvo-imagekit-v1';
  window.addEventListener('message', event => {
    if (event.origin !== origin || event.source !== popup || event.data?.channel !== channel) return;
    const data = event.data;
    if (data.ready) { ready = true; return; }
    const request = pending.get(data.id);
    if (!request) return;
    clearTimeout(request.timer); pending.delete(data.id);
    if (data.error) request.reject(new Error(data.error));
    else request.resolve(new Response(JSON.stringify(data.body), { status: data.status }));
  });
  return {
    async connect() {
      ready = false;
      popup = window.open(origin + '/github-pages-bridge', 'salvo-imagekit-auth', 'width=520,height=420');
      if (!popup) throw new Error('Allow the sign-in window, then choose “Sign in to upload” again.');
      await new Promise((resolve, reject) => {
        const started = Date.now();
        const timer = setInterval(() => {
          if (ready) { clearInterval(timer); resolve(); }
          else if (popup.closed || Date.now() - started > 120000) {
            clearInterval(timer); reject(new Error('Complete sign-in in the opened window, then choose “Sign in to upload” again.'));
          } else popup.postMessage({ channel, ping: true }, origin);
        }, 500);
      });
      popup.blur(); window.focus();
    },
    async request(path, options = {}) {
      if (!ready || !popup || popup.closed) throw new Error('Choose “Sign in to upload” to continue your upload session.');
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('The upload service took too long to respond. Please try again.')); }, 30000);
        pending.set(id, { resolve, reject, timer });
        popup.postMessage({ channel, id, path, method: options.method || 'GET' }, origin);
      });
    }
  };
})();
`;
html = html.replace('<script type="module">', '<script>' + client + '</script><script type="module">\nconst fetch = window.salvoConnection.request;');
html = html.replace('<div class="connection" id="connection" role="status">Checking connection…</div>', '<button type="button" class="connection" id="connection" style="cursor:pointer">Sign in to upload</button>');
html = html.replace("textContent='● ImageKit connected'", "textContent='● Signed in · Ready to upload'");
const marker = "try{const res=await fetch('/api/config');";
if (!html.includes(marker)) throw new Error('Could not locate the connection initializer.');
html = html.replace(marker, `if(window.SALVO_PAGES){
  const connection = $('#connection');
  $('#empty').textContent = 'Sign in to view your test uploads.';
  connection.addEventListener('click', async () => {
    connection.disabled = true; connection.textContent = 'Signing in…';
    try {
      await window.salvoConnection.connect();
      const res = await fetch('/api/config'); const config = await res.json();
      if (!res.ok || !config.configured) throw new Error('The private server needs ImageKit configuration.');
      $('#message').textContent = ''; await loadRecent();
    } catch(err) {
      connection.textContent = 'Sign in to upload'; connection.className = 'connection';
      $('#message').textContent = err.message;
    } finally { connection.disabled = false; }
  });
} else ` + marker);
html = html.replace('This is a test: use sample media', 'ImageKit is already configured. Sign in to upload, and keep the sign-in window open while uploading. This is a test: use sample media');
html = html.replace('<head>', '<head><meta name="referrer" content="strict-origin-when-cross-origin">');
await mkdir(new URL('../docs/', import.meta.url), { recursive: true });
await writeFile(new URL('../docs/index.html', import.meta.url), html);
await writeFile(new URL('../docs/.nojekyll', import.meta.url), '');
console.log('Built GitHub Pages frontend in docs/. No API credentials included.');
