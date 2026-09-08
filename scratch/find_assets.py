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

for mod_id in ['34903', '75786', '8680fbeb87a461100eca854602c32372']:
    m = re.search(r'\b' + mod_id + r':function\([^\)]*\)\{(.*?)\}', content)
    if m:
        print(mod_id, ':', m.group(1))
    else:
        print(mod_id, 'not found by function')
