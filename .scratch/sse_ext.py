import urllib.request, time, threading, subprocess
SID='3d8d5756-debe-484b-8616-0f3b262a53aa'
TOK=open('/tmp/tok_host').read().strip()
t0=time.time(); el=lambda:f"{time.time()-t0:.1f}s"
def pub():
    time.sleep(2)
    subprocess.run(['docker','exec','synweb-redis','redis-cli','publish',f'session:{SID}',
      '{"type":"message","message":{"id":"ext1","role":"coordinator","content":"EXT_PING"}}'],
      capture_output=True); print("PUBSUBS:",__import__("subprocess").run(["docker","exec","synweb-redis","redis-cli","pubsub","numsub","session:"+SID],capture_output=True,text=True).stdout.strip())
    print(f'[{el()}] published')
threading.Thread(target=pub,daemon=True).start()
req=urllib.request.Request(f'https://syn.worqshop.io/api/sessions/{SID}/stream',
  headers={'Cookie':f'__Secure-authjs.session-token={TOK}','Accept':'text/event-stream',
           'Accept-Encoding':'gzip, deflate, br'})
try:
    r=urllib.request.urlopen(req,timeout=8)
    print(f'[{el()}] STATUS {r.status} ct={r.headers.get("content-type")} enc={r.headers.get("content-encoding")}')
    start=time.time()
    while time.time()-start<6:
        line=r.readline()
        if not line: break
        print(f'[{el()}] {line!r}')
except Exception as e:
    print('ERR',type(e).__name__,e)
