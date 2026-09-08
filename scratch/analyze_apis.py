import re, glob

def search_file(path, label):
    with open(path) as f:
        c = f.read()
    print(f"=== {label} ({path}) ===")
    
    # Check env variables
    env_vars = set(re.findall(r"process\.env\.([A-Z0-9_]+)", c))
    if env_vars:
        print("Env vars:", env_vars)
        
    # Check http urls
    urls = set(re.findall(r"https?://[a-zA-Z0-9_\-\.\:]+/[a-zA-Z0-9_\-\.\/]+", c))
    for u in sorted(urls):
        if not any(k in u for k in ["w3.org", "schema.org", "github.com", "prepinstaprime.com/static"]):
            print("URL:", u)
            
    # Check axios / fetch calls
    calls = re.findall(r"\.(?:get|post|put|delete|patch)\(([^,\)]+)", c)
    valid_calls = set()
    for cl in calls:
        cl_clean = cl.strip()
        if '"' in cl_clean or "'" in cl_clean or '`' in cl_clean:
            valid_calls.add(cl_clean[:80])
    if valid_calls:
        print("API calls:")
        for vc in sorted(valid_calls)[:15]:
            print(" ", vc)

search_file("original/main.js", "MAIN")
for chunk in sorted(glob.glob("original/chunks/*.chunk.js")):
    search_file(chunk, chunk)
