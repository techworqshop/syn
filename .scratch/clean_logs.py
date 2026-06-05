P='/root/synweb/app/src/app/api/sessions/[id]/stream/route.ts'
s=open(P).read()
for line in ['      console.log("[sse] start", channel);\n',
             '        console.log("[sse] subscribed", channel);\n',
             '      console.log("[sse] cancel", channel);\n']:
    s=s.replace(line,'')
open(P,'w').write(s)
print('cleaned, [sse] count remaining:', s.count('[sse]'))
