#!/bin/sh
TOK=$(cat /tmp/tok)
SID=3d8d5756-debe-484b-8616-0f3b262a53aa
rm -f /tmp/sse_int.log
curl -sS -N --max-time 7 -H "Cookie: __Secure-authjs.session-token=$TOK" "http://localhost:3000/api/sessions/$SID/stream" > /tmp/sse_int.log 2>&1 &
CURLPID=$!
sleep 2
node -e "const R=require('ioredis');const c=new R(process.env.REDIS_URL);c.publish('session:$SID',JSON.stringify({type:'message',message:{id:'live-test-1',role:'coordinator',content:'LIVE_TEST_PING'}})).then(n=>{console.log('published subs='+n);c.quit();});"
sleep 3
echo "=== SSE OUTPUT (internal, bypasses Caddy) ==="
cat /tmp/sse_int.log
echo "=== END ==="
