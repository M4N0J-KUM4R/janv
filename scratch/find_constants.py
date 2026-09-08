import re

with open("original/main.js") as f:
    c = f.read()

for m in re.finditer(r"SECTION:\s*[\"'][^\"']+[\"']", c):
    print("Match:", c[max(0, m.start()-50):min(len(c), m.end()+150)])

# Also find where currentTestCode is called and assessment create payload is built
for m in re.finditer(r"currentTestCode", c):
    print("currentTestCode match:", c[max(0, m.start()-100):min(len(c), m.end()+200)])
