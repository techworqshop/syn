import urllib.request, time, threading, subprocess
SID='3d8d5756-debe-484b-8616-0f3b262a53aa'
TOK=open('/tmp/tok_host').read().strip()
def hold():
    try:
        req=urllib.request.Request(f'http://127.0.0.1:3100/api/sessions/{SID}/stream',
          headers={'Cookie':f'__Secure-authjs.session-token={TOK}','Accept':'text/event-stream'})
        r=urllib.request.urlopen(req,timeout=12)
        while True:
            l=r.readline()
            if not l: break
    except Exception as e: print('hold-end',type(e).__name__)
threading.Thread(target=hold,daemon=True).start()
for i in range(9):
    time.sleep(1)
    o=subprocess.run(['docker','exec','synweb-redis','redis-cli','pubsub','numsub','session:'+SID],capture_output=True,text=True).stdout.strip().replace(chr(10),' ')
    print(f'{i+1}s numsub: {o}')
