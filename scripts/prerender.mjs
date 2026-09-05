import { createServer } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { services, faqs } from '../src/data.js';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try {
 const {prerender}=await server.ssrLoadModule('/src/entry-server.js');
 const template=await readFile('dist/index.html','utf8');
 const routes=['index',...services.map(s=>s.slug),'realizace','nas-pristup','kontakt','lokality-jihlava-vysocina','404'];
 for(const route of routes){
  const {body,head}=prerender(route==='index'?'/':`/${route}`);
  const original=await readFile(`original/${route}.html`,'utf8').catch(()=>readFile('original/index.html','utf8'));
  const schemaMatch=original.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  let schema='';
  if(schemaMatch){
   const data=JSON.parse(schemaMatch[1]);
   if(data['@graph']) data['@graph']=data['@graph'].filter(x=>x['@type']!=='FAQPage');
   if(route==='index')data['@graph'].push({'@type':'FAQPage',mainEntity:faqs.map(([name,text])=>({'@type':'Question',name,acceptedAnswer:{'@type':'Answer',text}}))});
   schema=`<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  }
  const clean=template.replace(/<title>.*?<\/title>/s,'').replace(/<meta name="description"[^>]*>/,'');
  const output=clean.replace('</head>',`${head}${schema}${route==='404'?'<meta name="robots" content="noindex">':''}</head>`).replace('<div id="app"></div>',`<div id="app">${body}</div>`);
  await writeFile(`dist/${route}.html`,output);
 }
 console.log(`Prerendered ${routes.length} pages with Svelte 5.`);
} finally {await server.close();}
