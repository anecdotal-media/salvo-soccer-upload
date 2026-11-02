import { mkdir, writeFile } from 'node:fs/promises';
import './compile.mjs';
const {default:app}=await import('../worker/index.js');

const origin = 'https://salvo-soccer-upload-lab.fankymalloon.chatgpt.site';
let html = await (await app.fetch(new Request(origin+'/upload'), {})).text();
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
    isReady() { return Boolean(ready && popup && !popup.closed); },
    async connect() {
      ready = false;
      popup = window.open(origin + '/github-pages-bridge', 'salvo-imagekit-auth-'+Math.random().toString(36).slice(2), 'width=520,height=420');
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
      if (!ready || !popup || popup.closed) throw new Error('Your upload session ended. Choose Upload again to sign in and continue.');
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('The upload service took too long to respond. Please try again.')); }, 30000);
        pending.set(id, { resolve, reject, timer });
        popup.postMessage({ channel, id, path, method: options.method || 'GET', body: options.body }, origin);
      });
    }
  };
})();
`;
html = html.replace('<script type="module">', '<script>' + client + '</script><script type="module">\nconst fetch = window.salvoConnection.request;');
html = html.replace('<head>', '<head><meta name="referrer" content="strict-origin-when-cross-origin">');
await mkdir(new URL('../docs/', import.meta.url), { recursive: true });
await writeFile(new URL('../docs/upload.html', import.meta.url), html);
await writeFile(new URL('../docs/index.html', import.meta.url), html);
let library=await(await app.fetch(new Request(origin+'/library'),{})).text();
library=library.replace('<script type=\"module\">','<script>'+client+'</script><script type=\"module\">');
await writeFile(new URL('../docs/library.html',import.meta.url),library);
await writeFile(new URL('../docs/.nojekyll', import.meta.url), '');
console.log('Built GitHub Pages frontend in docs/. No API credentials included.');
