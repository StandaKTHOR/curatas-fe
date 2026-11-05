// Owned loopback fixture for the actual production build; no response/data mocks.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
export async function startSyntheticHttp(input){
 const backend=new URL(input.backend),root=path.resolve('dist');
 if(backend.protocol!=='http:'||backend.hostname!=='127.0.0.1'||['8082','8084','8085','5432','15432'].includes(backend.port))throw Error('Owned random backend required');
 const server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url.startsWith('/api/')){const request=http.request(new URL(req.url,backend),{method:req.method,headers:{...req.headers,host:backend.host}},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});request.on('error',()=>{res.writeHead(502);res.end();});req.pipe(request);return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1:18213').pathname));if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(404);res.end();return;}
  const target=fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(target)]??'application/octet-stream');if(req.method==='HEAD')res.end();else fs.createReadStream(target).pipe(res);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(18213,'127.0.0.1',resolve);});
 return {close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
