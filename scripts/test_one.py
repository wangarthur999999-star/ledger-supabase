"""Test enrichment on one specific file."""
import json, os, requests, re

API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
if not API_KEY:
    raise RuntimeError("DEEPSEEK_API_KEY not set")
URL = "https://api.deepseek.com/chat/completions"

path = r"C:\Users\wanga\OneDrive\Documents\Obsidian Vault\Arthur-IP系统\笔记\03_商业财经\2025-07-27 视频-酒酒年的老男人-教你如何正确处理好人际关系，让生...知识 #99年的老男人 #正能量 #社交.md"

with open(path, encoding="utf-8") as f:
    content = f.read()

m = re.search(r"## 详细内容\s*\n(.*?)(?=\n##|\Z)", content, re.DOTALL)
transcript = m.group(1).strip() if m else ""
print(f"Transcript: {len(transcript)} chars")

SYSTEM = """你是内容提炼助手。处理抖音视频ASR转录文本。
任务：1.修正ASR错误 2.提取3-5条核心观点(每条<20字) 3.提取2-4条金句 4.写1-3条行动建议(给在苏里南的创业者Arthur用于X/Twitter)
输出严格JSON：{"core_points":["观点"],"golden_quotes":["金句"],"action_items":["行动"],"corrected_transcript":"全文"}"""

resp = requests.post(
    URL,
    headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    json={
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": transcript[:2500]},
        ],
        "temperature": 0.4,
        "max_tokens": 1500,
    },
    timeout=60,
)

print(f"Status: {resp.status_code}")
data = resp.json()

if "choices" in data:
    text = data["choices"][0]["message"]["content"]
    parsed = json.loads(text)
    for k, v in parsed.items():
        if k != "corrected_transcript":
            print(f"{k}: {v}")
    print(f"Transcript corrected: {len(parsed.get('corrected_transcript',''))} chars")
    print("\nSUCCESS")
else:
    print(f"Error: {json.dumps(data, ensure_ascii=False)[:300]}")
