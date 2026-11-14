#!/usr/bin/env python3
"""Usage: python3 tools/pwa_build.py [dossier_du_depot]
Découpe mairie.html (CSS + 4 scripts) et ajoute les balises PWA aux 2 pages. Idempotent."""
import sys,os,re,time
R=sys.argv[1] if len(sys.argv)>1 else "."
P=lambda *a:os.path.join(R,*a)
rd=lambda f:open(P(f),encoding="utf-8").read()
def wr(f,s):
    os.makedirs(os.path.dirname(P(f)) or R,exist_ok=True);open(P(f),"w",encoding="utf-8",newline="\n").write(s)
VER=str(int(time.time()))
def head(kind):
    m="mairie" if kind=="mairie" else "citoyen"
    t="#073A1E" if kind=="mairie" else "#0B5A2E"
    return (f'<link rel="manifest" href="/manifest-{m}.webmanifest"><meta name="theme-color" content="{t}">'
            f'<link rel="icon" type="image/png" href="/icon-{m}-192.png"><link rel="apple-touch-icon" href="/icon-{m}-192.png">'
            '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">'
            '<script>window.tsReady=function(){};</script>')
REG='<script>if("serviceWorker"in navigator)addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})</script>'
def pwa(h,kind):
    if 'rel="manifest"' not in h:
        h=re.sub(r'(<meta name="viewport"[^>]*>)',lambda m:m.group(1)+"\n"+head(kind),h,count=1)
    if "serviceWorker" not in h: h=h.replace("</body>",REG+"</body>",1)
    return h
# mairie.html : découpage
h=rd("mairie.html")
if 'src="/js/core.js' not in h:
    s=h.index("<style>");e=h.index("</style>")
    wr("css/mairie.css",h[s+7:e].strip()+"\n")
    h=h[:s]+f'<link rel="stylesheet" href="/css/mairie.css?v={VER}">'+h[e+8:]
    a=h.rindex("<script>\nconst $=");b=h.rindex("</script></body></html>")
    code=h[a+9:b]
    k=[code.index("/* ===== MODULE ADJOINTS"),code.index("/* ===== MODULE SECRÉTARIAT"),code.index("/* actions */")]
    parts=[("core",code[:k[0]]),("adjoints",code[k[0]:k[1]]),("secretariat",code[k[1]:k[2]]),("actions",code[k[2]:])]
    for n,c in parts: wr(f"js/{n}.js",c.strip()+"\n")
    tags="".join(f'<script src="/js/{n}.js?v={VER}"></script>' for n,_ in parts)
    h=h[:a]+tags+h[b+9:]
wr("mairie.html",pwa(h,"mairie"))
wr("index.html",pwa(rd("index.html"),"citoyen"))
print("OK : mairie.html découpé, PWA ajoutée. Version",VER)
