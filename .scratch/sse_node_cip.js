const http=require('http'),fs=require('fs'),R=require('ioredis');
const TOK=fs.readFileSync('/tmp/tok','utf8').trim();
const SID='3d8d5756-debe-484b-8616-0f3b262a53aa';
const t0=Date.now(),el=()=>((Date.now()-t0)/1000).toFixed(1)+'s';
const req=http.get({host:'172.18.0.9',port:3000,path:'/api/sessions/'+SID+'/stream',
 headers:{'Cookie':'__Secure-authjs.session-token='+TOK,'Accept':'text/event-stream'}},res=>{
 console.log('['+el()+'] STATUS',res.statusCode,res.headers['content-type']||'');
 res.setEncoding('utf8');
 res.on('data',c=>console.log('['+el()+'] CHUNK '+JSON.stringify(c)));
});
req.on('error',e=>console.log('REQ_ERR',e.message));
setTimeout(()=>{const c=new R(process.env.REDIS_URL);
 c.publish('session:'+SID,JSON.stringify({type:'message',message:{id:'lt2',role:'coordinator',content:'LIVE_PING'}}))
  .then(n=>{console.log('['+el()+'] PUBLISHED subs='+n);c.quit();});},2000);
setTimeout(()=>{console.log('['+el()+'] DONE');process.exit(0);},5000);
