import os
import subprocess

repo_url = "https://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@github.com/ssami22/red.git"

try:
    subprocess.run(["git", "init"], check=True)
    subprocess.run(["git", "remote", "add", "origin", repo_url], check=True)
    subprocess.run(["git", "fetch", "origin"], check=True)
    subprocess.run(["git", "checkout", "-B", "main"], check=True)
    subprocess.run(["git", "add", "."], check=True)
    subprocess.run(["git", "commit", "-m", "Auto commit"], check=True)
    subprocess.run(["git", "push", "-u", "origin", "main", "--force"], check=True)
    print("✔ الملفات تم رفعها بنجاح")
except subprocess.CalledProcessError as e:
    print(f"✖ خطأ: {e}")