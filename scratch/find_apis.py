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

matches = re.findall(r'[A-Z_]+:\s*"[^"]+"', content)
for m in set(matches):
    if 'assessment' in m.lower() or 'section' in m.lower():
        print(m)
