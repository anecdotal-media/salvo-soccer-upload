import {readFile,writeFile} from 'node:fs/promises';
const read = file => readFile(new URL('../'+file,import.meta.url),'utf8');
const [template,upload,layout,css,client,bridge]=await Promise.all(['src/server.mjs','web/upload.html','web/library.html','web/library.css','web/library.js','src/bridge.html'].map(read));
const logo=upload.match(/<img src="(data:image\/png;base64,[^"]+)"/)[1];
const library=layout.replace('__LOGO__',()=>logo).replace('/* LIBRARY_STYLES */',()=>css).replace('// LIBRARY_SCRIPT',()=>client);
await writeFile(new URL('../worker/index.js',import.meta.url),template.replace('__UPLOAD_PAGE__',()=>JSON.stringify(upload)).replace('__LIBRARY_PAGE__',()=>JSON.stringify(library)).replace('__BRIDGE_PAGE__',()=>JSON.stringify(bridge)));
