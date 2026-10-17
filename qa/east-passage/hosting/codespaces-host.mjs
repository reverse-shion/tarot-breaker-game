// Temporary Codespaces-only static QA server. Default: save seeding DISABLED.
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, join, extname, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateOrigin} from './verify-host.mjs';

const MIME=Object.freeze({
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.webp':'image/webp',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon',
  '.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav',
  '.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf',
  '.mp4':'video/mp4','.webm':'video/webm','.wasm':'application/wasm',
  '.vtt':'text/vtt; charset=utf-8','.txt':'text/plain; charset=utf-8'
});
const BLOCKED=new Set(['.git','.github','.devcontainer','node_modules','tests','scripts','docs','hosting']);
const send=(res,status,text)=>{res.writeHead(status,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer'});res.end(text)};
const GOOD_HOSTNAME=/^[a-z0-9-]+-\d+\.app\.github\.dev$/i;
export function makeHandler({root=process.cwd(),approvedOrigin=''}={}){
  const base=resolve(root);
  const approved=approvedOrigin?validateOrigin(approvedOrigin):'';
  if(approved && !GOOD_HOSTNAME.test(new URL(approved).hostname))
    throw Error('Only verified GitHub Codespaces port origins may be approved here');
  return async(req,res)=>{
    if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,'Method not allowed');
    let pathname;
    try{
      pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    }catch{return send(res,400,'Bad URL')}
    if(pathname.includes('\0')||pathname.includes('\\')||pathname.includes('//')||
       !pathname.startsWith('/')||pathname.split('/').some(s=>s==='..'||s.startsWith('.')))
      return send(res,403,'Forbidden');
    const rel=pathname==='/'?'index.html':pathname.slice(1);
    const segments=rel.split('/');
    if(segments.some(s=>BLOCKED.has(s)))return send(res,403,'Forbidden');
    if(rel.startsWith('qa/') && !new Set([
      'qa/east-passage/index.html','qa/east-passage/launcher.js',
      'qa/east-passage/qa-safety.js','qa/east-passage/approved-origin.js'
    ]).has(rel))return send(res,403,'Forbidden');
    const ext=extname(rel).toLowerCase();
    if(!Object.hasOwn(MIME,ext))return send(res,404,'Not found');
    const file=resolve(join(base,rel));
    if(!file.startsWith(base+sep))return send(res,403,'Forbidden');
    try{
      let body;
      if(approved && rel==='qa/east-passage/approved-origin.js'){
        // QA-only runtime approval. The committed source stays empty/disabled.
        body=Buffer.from('window.TarotEastPassageQAApprovedOrigin = '+JSON.stringify(approved)+';\n');
      }else{
        if(!(await stat(file)).isFile())return send(res,404,'Not found');
        body=await readFile(file);
      }
      res.writeHead(200,{'content-type':MIME[ext],
        'cache-control':'no-store','x-content-type-options':'nosniff',
        'x-frame-options':'DENY','referrer-policy':'no-referrer',
        'content-length':body.length,'cross-origin-resource-policy':'same-origin'});
      res.end(req.method==='HEAD'?undefined:body);
    }catch{return send(res,404,'Not found')}
  };
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const port=Number(process.argv[2]||8765);
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
  const approved=process.env.TAROT_QA_APPROVED_ORIGIN||'';
  const server=createServer(makeHandler({approvedOrigin:approved}));
  server.listen(port,'0.0.0.0',()=>{
    console.log('QA_CODESPACES_SERVER_READY port='+port+
      ' seed='+ (approved?'EXPLICIT_APPROVAL_CONFIGURED':'LOCKED')+
      ' local=http://localhost:'+port);
  });
}