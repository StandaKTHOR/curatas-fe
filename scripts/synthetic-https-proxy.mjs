// Owned loopback-only fixture. No OS certificate store, DNS or infrastructure changes.
import https from 'node:https';import http from 'node:http';import {readFile} from 'node:fs/promises';import path from 'node:path';
export async function startSyntheticHttps(input){
 const root=path.resolve('dist'),backend=new URL(input.backend);
 const pfx=await readFile(input.pfx);const csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
 const tls=https.createServer({pfx,passphrase:input.pfxPassword,minVersion:'TLSv1.2'},async(req,res)=>{
  res.setHeader('Strict-Transport-Security','max-age=31536000');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',csp);res.setHeader('Cache-Control','no-store');
  if(req.url.startsWith('/api/')){
   const headers={...req.headers,host:backend.host};for(const h of Object.keys(headers))if(h==='forwarded'||h.startsWith('x-forwarded-'))delete headers[h];
   const upstream=http.request(new URL(req.url,backend),{method:req.method,headers,timeout:15000},r=>{res.statusCode=r.statusCode;for(const [k,v] of Object.entries(r.headers))if(v!==undefined&&!['connection','transfer-encoding','strict-transport-security','content-security-policy'].includes(k))res.setHeader(k,v);r.pipe(res);});
   upstream.on('error',()=>{res.statusCode=502;res.end();});upstream.on('timeout',()=>upstream.destroy());req.pipe(upstream);return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.end();return;}
  try{const pathname=decodeURIComponent(new URL(req.url,'https://127.0.0.1:18423').pathname);let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)&&file!==root){res.statusCode=404;res.end();return;}if(!path.extname(file))file=path.join(root,'index.html');const bytes=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(file)]??'application/octet-stream'));res.end(req.method==='HEAD'?undefined:bytes);}catch{res.statusCode=404;res.end();}
 });
 const redirect=http.createServer((req,res)=>{res.writeHead(308,{Location:'https://127.0.0.1:18423'+req.url,'Cache-Control':'no-store'});res.end();});
 try{await new Promise((resolve,reject)=>{tls.once('error',reject);tls.listen(18423,'127.0.0.1',resolve);});await new Promise((resolve,reject)=>{redirect.once('error',reject);redirect.listen(18424,'127.0.0.1',resolve);});}
 catch(e){tls.close();redirect.close();throw e;}
 return {close:async()=>{await Promise.all([tls,redirect].map(s=>new Promise((resolve,reject)=>s.close(e=>e?reject(e):resolve()))));}};
}
