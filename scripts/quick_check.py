"""Count pending notes quickly by scanning frontmatter only."""
import time
from pathlib import Path

VAULT = Path(r"C:\Users\wanga\OneDrive\Documents\Obsidian Vault\Arthur-IP系统\笔记")

start = time.time()
total = 0
pending = 0
done = 0

for cat_dir in sorted(VAULT.iterdir()):
    if not cat_dir.is_dir():
        continue
    files = list(cat_dir.glob("*.md"))
    total += len(files)
    for f in files:
        try:
            content = f.read_text(encoding="utf-8")
            if "（待提取）" in content:
                pending += 1
            elif "核心观点" in content:
                done += 1
        except Exception as e:
            print(f"  ERROR {f.name}: {e}")

print(f"Scanned in {time.time()-start:.1f}s")
print(f"Total: {total}, Pending: {pending}, Done: {done}")
