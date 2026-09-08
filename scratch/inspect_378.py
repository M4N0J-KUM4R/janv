import re

with open("original/chunks/378.8b2af441.chunk.js") as f:
    c = f.read()

print("=== 378: onSubmit or API calls ===")
for m in re.finditer(r"(?:onSubmit|handleSubmit|createAssessment|saveAssessment)", c):
    print(c[max(0, m.start()-50):min(len(c), m.end()+250)])

print("\n=== 378: navigate calls ===")
navs = re.findall(r"\([\"'](/assessment/[a-zA-Z0-9_\-]+)[\"']", c)
print("Navigations in 378:", set(navs))

print("\n=== 378: state access ===")
for m in re.finditer(r"\.state\b", c):
    print(c[max(0, m.start()-30):min(len(c), m.end()+60)])
