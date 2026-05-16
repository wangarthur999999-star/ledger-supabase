"""
mizhi 1-3-7-30 客户回访提醒
============================
用法:
  python mizhi_followup.py "客户名" "2026-05-15" "水光针"
  python mizhi_followup.py --today                   # 查看今天该回访谁
"""
import json
import logging
import sys

# Force UTF-8 on Windows consoles
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO, format="%(levelname)s: %(message)s", stream=sys.stderr
)
log = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent
CFG = json.loads((BASE_DIR / "mizhi_config.json").read_text(encoding="utf-8"))

TRACKING_FILE = BASE_DIR.parent / "output" / "mizhi_followup_tracking.json"


def generate_schedule(
    client_name: str, treatment_date: str, service_desc: str
) -> list[dict[str, Any]]:
    t_date = datetime.strptime(treatment_date, "%Y-%m-%d")
    entries: list[dict[str, Any]] = []

    for rule in CFG["followup_schedule"]:
        due_date = t_date + timedelta(days=rule["day"])
        entries.append({
            "client": client_name,
            "service": service_desc,
            "treatment_date": treatment_date,
            "due_date": due_date.strftime("%Y-%m-%d"),
            "day_label": rule["label"],
            "action": rule["action"],
            "template_key": rule["template_key"],
            "done": False,
            "notes": "",
        })
    return entries


def save_schedule(entries: list[dict[str, Any]]) -> None:
    TRACKING_FILE.parent.mkdir(parents=True, exist_ok=True)
    existing: list[dict[str, Any]] = []
    if TRACKING_FILE.exists():
        try:
            existing = json.loads(TRACKING_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing = []
    existing.extend(entries)
    TRACKING_FILE.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")


def print_schedule(entries: list[dict[str, Any]]) -> None:
    print(f"\n  {'='*60}")
    print(f"  客户: {entries[0]['client']}  |  项目: {entries[0]['service']}")
    print(f"  治疗日: {entries[0]['treatment_date']}")
    print(f"  {'='*60}")
    print(f"\n  {'时间':<6} {'日期':<12} {'动作':<14} {'提醒'}")
    print(f"  {'-'*56}")
    for e in entries:
        print(f"  {e['day_label']:<4}  {e['due_date']:<10}  {e['action']:<12}  (模板: {e['template_key']})")
    print(f"\n  >> 已保存到: {TRACKING_FILE}")
    print(f"  >> 共 {len(entries)} 个回访节点")


def check_today() -> None:
    if not TRACKING_FILE.exists():
        print("暂无回访记录。")
        return
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        all_entries = json.loads(TRACKING_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        print("回访文件损坏。")
        return

    due_today = [e for e in all_entries if e["due_date"] == today and not e["done"]]
    overdue = [e for e in all_entries if e["due_date"] < today and not e["done"]]

    if due_today:
        print(f"\n  📅 今天 ({today}) 要回访:")
        for e in due_today:
            print(f"    - {e['client']} | {e['service']} | {e['day_label']}: {e['action']}")
    else:
        print(f"\n  ✅ 今天 ({today}) 没有待回访。")

    if overdue:
        print(f"\n  ⚠️ 已逾期的回访:")
        for e in overdue:
            print(f"    - {e['client']} | {e['service']} | {e['day_label']}: {e['due_date']} (已逾期)")

    pending = len(due_today) + len(overdue)
    done_total = sum(1 for e in all_entries if e["done"])
    print(f"\n  总计: {len(all_entries)} 条 | 已完成: {done_total} | 待处理: {pending}")


def main() -> None:
    if len(sys.argv) >= 4:
        client = sys.argv[1]
        date = sys.argv[2]
        service = sys.argv[3]
        entries = generate_schedule(client, date, service)
        save_schedule(entries)
        print_schedule(entries)
    elif len(sys.argv) == 2 and sys.argv[1] == "--today":
        check_today()
    else:
        print("用法:")
        print('  python mizhi_followup.py "客户名" "2026-05-15" "水光针"')
        print("  python mizhi_followup.py --today")
        print(f"\n回访跟踪文件: {TRACKING_FILE}")


if __name__ == "__main__":
    main()
