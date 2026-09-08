import json
import subprocess
import os

res = subprocess.check_output([
    "aws", "lightsail", "get-instance-access-details",
    "--instance-name", "janv-app-server",
    "--region", "ap-south-1"
])
data = json.loads(res.decode("utf-8"))["accessDetails"]

key_path = os.path.expanduser("~/.ssh/lightsail_janv.pem")
cert_path = os.path.expanduser("~/.ssh/lightsail_janv-cert.pub")

with open(key_path, "w") as f:
    f.write(data["privateKey"])

with open(cert_path, "w") as f:
    f.write(data["certKey"])

os.chmod(key_path, 0o600)
os.chmod(cert_path, 0o600)

print(f"Saved key to {key_path} and cert to {cert_path}")
