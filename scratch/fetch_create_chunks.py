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

for chunk_id in ['510', '378']:
    m = re.search(r'\b' + chunk_id + r':"([a-f0-9]+)"', content)
    if m:
        h = m.group(1)
        url = f'https://institutions.prepinstaprime.com/static/js/{chunk_id}.{h}.chunk.js'
        print(f'Downloading chunk {chunk_id}: {url}')
        req2 = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req2, context=ctx, timeout=10) as r:
            data = r.read().decode('utf-8')
        with open(f'original/{chunk_id}.chunk.js', 'w') as out:
            out.write(data)
        print(f'Saved original/{chunk_id}.chunk.js, length: {len(data)}')
    else:
        print(f'Hash not found for chunk {chunk_id}')
