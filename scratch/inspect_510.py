import re

with open("original/chunks/510.d19974bd.chunk.js") as f:
    c = f.read()

print("=== 510: Formik initialValues ===")
m = re.search(r"initialValues:\{([^}]+)\}", c)
if m:
    print(m.group(0))

print("\n=== 510: validationSchema ===")
m2 = re.search(r"validationSchema:[^,]+(?:\.shape\(\{([^}]+)\}\))?", c)
if m2:
    print(m2.group(0))

print("\n=== 510: onSubmit ===")
m3 = re.search(r"onSubmit:([^}]+(?:\{[^}]+\}[^}]+)*)\}\)", c)
if m3:
    print(m3.group(0)[:500])

print("\n=== 510: Form fields / inputs ===")
inputs = re.findall(r"name:[\"']([a-zA-Z0-9_]+)[\"']", c)
print("Input names:", set(inputs))
