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

# find chunk mapping: 713:"..." or {713:
m = re.search(r'713:"([a-f0-9]+)"', content)
if m:
    hash_713 = m.group(1)
    print('Chunk 713 hash:', hash_713)
    chunk_url = f'https://institutions.prepinstaprime.com/static/js/713.{hash_713}.chunk.js'
    print('Downloading:', chunk_url)
    req2 = urllib.request.Request(chunk_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req2, context=ctx, timeout=10) as r2:
        c2 = r2.read().decode('utf-8')
    with open('original/createSuccess.chunk.js', 'w') as out:
        out.write(c2)
    print('Saved createSuccess.chunk.js! Length:', len(c2))
else:
    # Let's search for chunk mapping pattern: n.p + "static/js/" + ...
    m2 = re.search(r'\{[0-9]+:"[a-f0-9]+"[^}]*\}', content)
    if m2:
        print('Found chunk map snippet:', m2.group(0)[:200])
