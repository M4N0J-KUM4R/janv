import re

with open("original/main.js") as f:
    c = f.read()

# Find all template strings like `${...}...`
templates = set(re.findall(r"`\$\{[a-zA-Z0-9_\.]+\}([a-zA-Z0-9_\-\.\/\?\=\&\{\}\$]+)`", c))
print(f"Found {len(templates)} template URL strings:")
for t in sorted(templates):
    print("  ", t)

# Also find standard string literals that look like endpoints
endpoints = set(re.findall(r"[\"'](/[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-\.\/]*)[\"']", c))
print(f"\nFound {len(endpoints)} path endpoints:")
for ep in sorted(endpoints):
    if any(k in ep.lower() for k in ["assessment", "section", "question", "test", "report", "user", "admin", "login", "auth"]):
        print("  ", ep)
