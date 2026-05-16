"""
mizhi 统一客户登记
==================
一张表格填完 → 自动生成预约 + 分账 + 回访 + 消息模板

用法:
  python mizhi_client.py register "Lisa" "skin_booster" "2026-05-21" "14:30" --lang zh --source your_new_client
  python mizhi_client.py list
  python mizhi_client.py view "Lisa"
  python mizhi_client.py today
"""
import json
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

# Force UTF-8 on Windows consoles
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]

logging.basicConfig(
    level=logging.INFO, format="%(levelname)s: %(message)s", stream=sys.stderr
)
log = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent
CFG = json.loads((BASE_DIR / "mizhi_config.json").read_text(encoding="utf-8"))
OUTPUT_DIR = BASE_DIR.parent / "output" / "mizhi_clients"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

BRAND = CFG["brand"]["name"]
LOCATION = CFG["brand"]["location"]
TECH = CFG["technician"]["name"].split(" (")[0]
OP = CFG["operator"]["name"]

DAY_CN_TO_IDX = {d: i for i, d in enumerate(CFG["booking"]["available_days"])}
WEEKDAYS_CN = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]


def find_service(service_id: str) -> dict[str, Any]:
    for s in CFG["services"]:
        if s["id"] == service_id:
            return s
    raise KeyError(f"Unknown service: {service_id}. Use --list-services to see all.")


def get_week_start(date_str: str) -> datetime:
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return d - timedelta(days=d.weekday())


def register_client(
    name: str,
    service_id: str,
    date_str: str,
    time_slot: str,
    lang: str = "zh",
    source: str = "your_new_client",
    phone: str = "",
    notes: str = "",
) -> dict[str, Any]:
    service = find_service(service_id)
    d = datetime.strptime(date_str, "%Y-%m-%d")
    day_cn = WEEKDAYS_CN[d.weekday()]

    if day_cn not in DAY_CN_TO_IDX:
        raise ValueError(f"{day_cn} 不是营业日。营业日: {CFG['booking']['available_days']}")
    if time_slot not in CFG["booking"]["time_slots"]:
        raise ValueError(f"无效时段: {time_slot}。可选: {CFG['booking']['time_slots']}")

    price = service["price"]
    cost = service["cost"]
    profit = price - cost
    split_rule = CFG["profit_split"][source]
    andy_share = round(profit * split_rule["andy"], 2)
    your_share = round(profit * split_rule["you"], 2)

    followups: list[dict[str, Any]] = []
    for rule in CFG["followup_schedule"]:
        due = d + timedelta(days=rule["day"])
        followups.append({
            "due_date": due.strftime("%Y-%m-%d"),
            "day_label": rule["label"],
            "action": rule["action"],
            "template_key": rule["template_key"],
            "done": False,
        })

    msgs: dict[str, str] = {}
    msg_map = {
        "booking_confirmation": (name, service["name_cn"], f"{day_cn} {time_slot}", ""),
        "pre_treatment_reminder": (name, service["name_cn"], f"{day_cn} {time_slot}", ""),
    }
    for tpl_key, (client, svc, details, extra) in msg_map.items():
        msgs[tpl_key] = _render_msg(tpl_key, lang, client, svc, details, extra)

    record: dict[str, Any] = {
        "client": name,
        "phone": phone,
        "language": lang,
        "service_id": service_id,
        "service_name": service["name_cn"],
        "service_en": service["name_en"],
        "date": date_str,
        "day_cn": day_cn,
        "time": time_slot,
        "price": price,
        "cost": cost,
        "profit": profit,
        "source": source,
        "source_desc": split_rule["desc"],
        "andy_share": andy_share,
        "your_share": your_share,
        "followups": followups,
        "messages": msgs,
        "notes": notes,
        "registered_at": datetime.now().isoformat(),
    }

    fpath = OUTPUT_DIR / f"{name}.json"
    fpath.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")

    # Also book in booking system
    _auto_book(date_str, day_cn, time_slot, name, service["name_cn"])

    # Also register follow-up tracking
    _auto_followup(name, date_str, service["name_cn"])

    # Sync to Google Sheets (non-blocking, best-effort)
    _sync_to_sheets(record)

    return record


def _auto_book(date_str: str, day_cn: str, time_slot: str, client: str, service: str) -> None:
    week_start = get_week_start(date_str)
    booking_dir = BASE_DIR.parent / "output" / "mizhi_bookings"
    booking_dir.mkdir(parents=True, exist_ok=True)
    fpath = booking_dir / f"week_{week_start.strftime('%Y%m%d')}.json"

    week: dict[str, Any] = {"week_start": week_start.strftime("%Y-%m-%d"), "slots": {}}
    if fpath.exists():
        try:
            week = json.loads(fpath.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass

    key = f"{date_str}_{time_slot}"
    week["slots"][key] = {"client": client, "service": service, "booked_at": datetime.now().isoformat()}
    fpath.write_text(json.dumps(week, ensure_ascii=False, indent=2), encoding="utf-8")


def _auto_followup(client: str, date_str: str, service: str) -> None:
    track_dir = BASE_DIR.parent / "output"
    track_dir.mkdir(parents=True, exist_ok=True)
    fpath = track_dir / "mizhi_followup_tracking.json"

    existing: list[dict[str, Any]] = []
    if fpath.exists():
        try:
            existing = json.loads(fpath.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass

    t_date = datetime.strptime(date_str, "%Y-%m-%d")
    for rule in CFG["followup_schedule"]:
        due = t_date + timedelta(days=rule["day"])
        existing.append({
            "client": client,
            "service": service,
            "treatment_date": date_str,
            "due_date": due.strftime("%Y-%m-%d"),
            "day_label": rule["label"],
            "action": rule["action"],
            "template_key": rule["template_key"],
            "done": False,
            "notes": "",
        })

    fpath.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")


def _sync_to_sheets(record: dict[str, Any]) -> None:
    """Sync a complete client record to Google Sheets (non-blocking)."""
    ops_id = CFG.get("google_sheets", {}).get("ops_sheet_id", "")
    if not ops_id:
        return
    try:
        from mizhi_gsheets import sync_full_client
        sync_full_client(record)
    except Exception as e:
        log.warning("Google Sheets 同步失败 (数据已存本地): %s", e)


def _render_msg(key: str, lang: str, client: str, service: str, details: str, extra: str) -> str:
    try:
        from mizhi_whatsapp_templates import render
        return render(key, lang, client, service, details, extra)
    except ImportError:
        return f"[模板 {key}/{lang} — 请运行 mizhi_whatsapp_templates.py]"


def print_record(record: dict[str, Any]) -> None:
    W = 60
    print(f"\n{'='*W}")
    print(f"  {BRAND} — 客户登记表")
    print(f"{'='*W}")
    print(f"  {'客户:':<12} {record['client']}")
    print(f"  {'项目:':<12} {record['service_name']} ({record['service_en']})")
    print(f"  {'时间:':<12} {record['date']} {record['day_cn']} {record['time']}")
    if record.get("phone"):
        print(f"  {'电话:':<12} {record['phone']}")
    if record.get("notes"):
        print(f"  {'备注:':<12} {record['notes']}")
    print(f"  {'语言:':<12} {record['language']}")

    print(f"\n  {'─'*W}")
    print(f"  [Money] 分账明细")
    print(f"  {'─'*W}")
    print(f"  价格:     ${record['price']:.2f}")
    print(f"  耗材成本: ${record['cost']:.2f}")
    print(f"  纯利:     ${record['profit']:.2f}")
    print(f"  来源:     {record['source_desc']}")
    print(f"  Andy:     ${record['andy_share']:.2f}")
    print(f"  {OP}:      ${record['your_share']:.2f}")

    print(f"\n  {'─'*W}")
    print(f"  [Schedule] 回访计划 (1-3-7-30)")
    print(f"  {'─'*W}")
    for f in record["followups"]:
        status = "[x]" if f["done"] else "[ ]"
        print(f"  {status} {f['due_date']}  {f['day_label']:<4} {f['action']}")

    print(f"\n  {'─'*W}")
    print(f"  [Messages] 即时消息")
    print(f"  {'─'*W}")
    for tpl_key, msg in record.get("messages", {}).items():
        label = {"booking_confirmation": "预约确认", "pre_treatment_reminder": "术前提醒"}.get(tpl_key, tpl_key)
        print(f"\n  [{label}]")
        print(f"  {'─'*40}")
        for line in msg.split("\n"):
            print(f"  {line}")
        print()

    print(f"{'='*W}")
    print(f"  已保存: {OUTPUT_DIR / record['client']}.json")
    print(f"{'='*W}\n")


def view_client(name: str) -> None:
    fpath = OUTPUT_DIR / f"{name}.json"
    if not fpath.exists():
        log.error("客户 '%s' 不存在", name)
        sys.exit(1)
    print_record(json.loads(fpath.read_text(encoding="utf-8")))


def list_clients() -> None:
    files = sorted(OUTPUT_DIR.glob("*.json"))
    if not files:
        print("\n  暂无客户记录。\n")
        return
    print(f"\n  {'客户':<14} {'项目':<12} {'日期':<12} {'时段':<8} {'纯利':>8} {'你得':>8}")
    print(f"  {'─'*64}")
    for fp in files:
        r = json.loads(fp.read_text(encoding="utf-8"))
        print(f"  {r['client']:<12}  {r['service_name']:<10}  {r['date']:<10}  {r['time']:<6}  ${r['profit']:>6.0f}  ${r['your_share']:>6.0f}")
    print()


def check_today() -> None:
    track_path = BASE_DIR.parent / "output" / "mizhi_followup_tracking.json"
    if not track_path.exists():
        print("\n  暂无回访记录。\n")
        return

    today = datetime.now().strftime("%Y-%m-%d")
    entries = json.loads(track_path.read_text(encoding="utf-8"))
    due = [e for e in entries if e["due_date"] == today and not e["done"]]
    overdue = [e for e in entries if e["due_date"] < today and not e["done"]]

    if due:
        print(f"\n  [Schedule] 今天 ({today}) 要回访:")
        for e in due:
            print(f"    - {e['client']} | {e['service']} | {e['day_label']}: {e['action']}")
    else:
        print(f"\n  [x] 今天无待回访。")

    if overdue:
        print(f"\n  [!!] 已逾期:")
        for e in overdue:
            print(f"    - {e['client']} | {e['day_label']}: {e['due_date']} (逾期)")


def list_services() -> None:
    print(f"\n  {'服务ID':<20} {'项目':<14} {'价格':>8} {'成本':>8} {'纯利':>8}")
    print(f"  {'─'*60}")
    for s in CFG["services"]:
        p = s["price"] - s["cost"]
        print(f"  {s['id']:<18}  {s['name_cn']:<12}  ${s['price']:>6.0f}  ${s['cost']:>6.0f}  ${p:>6.0f}")


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("用法:")
        print('  python mizhi_client.py register "Lisa" "skin_booster" "2026-05-21" "14:30"')
        print("       [--lang zh] [--source your_new_client] [--phone +597xxxx] [--notes ...]")
        print("  python mizhi_client.py list                    # 所有客户")
        print('  python mizhi_client.py view "Lisa"             # 客户详情')
        print("  python mizhi_client.py today                   # 今日待回访")
        print("  python mizhi_client.py services                # 服务列表")
        return

    cmd = sys.argv[1]

    if cmd == "services":
        list_services()
        return

    if cmd == "list":
        list_clients()
        return

    if cmd == "today":
        check_today()
        return

    if cmd == "view":
        if len(sys.argv) < 3:
            log.error("用法: mizhi_client.py view <客户名>")
            sys.exit(1)
        view_client(sys.argv[2])
        return

    if cmd == "register":
        args = sys.argv[2:]
        lang = "zh"
        source = "your_new_client"
        phone = ""
        notes = ""

        i = 0
        flags = []
        positional = []
        while i < len(args):
            if args[i].startswith("--"):
                flags.append(args[i])
                if i + 1 < len(args) and not args[i + 1].startswith("--"):
                    flags.append(args[i + 1])
                    i += 1
                i += 1
            else:
                positional.append(args[i])
                i += 1

        for j, f in enumerate(flags):
            if f == "--lang" and j + 1 < len(flags):
                lang = flags[j + 1]
            elif f == "--source" and j + 1 < len(flags):
                source = flags[j + 1]
            elif f == "--phone" and j + 1 < len(flags):
                phone = flags[j + 1]
            elif f == "--notes" and j + 1 < len(flags):
                notes = flags[j + 1]

        if len(positional) < 4:
            log.error('用法: register "客户名" "服务ID" "日期" "时段"')
            sys.exit(1)

        name, svc_id, date_str, time_slot = positional[0], positional[1], positional[2], positional[3]

        try:
            record = register_client(name, svc_id, date_str, time_slot, lang, source, phone, notes)
            print_record(record)
        except (KeyError, ValueError) as e:
            log.error(str(e))
            sys.exit(1)
        return

    log.error("未知命令: %s", cmd)
    sys.exit(1)


if __name__ == "__main__":
    main()
