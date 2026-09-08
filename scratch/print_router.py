import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(
    'https://institutions.prepinstaprime.com/static/js/main.c80b120a.js',
    headers={'User-Agent': 'Mozilla/5.0'}
)
with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
    content = resp.read().decode('utf-8', errors='ignore')

matches = [m.start() for m in re.finditer(r'children:\[\{path:"activetest', content)]
for idx in matches:
    print('Found router at', idx)
    print(content[max(0, idx-400):min(len(content), idx+2000)])
