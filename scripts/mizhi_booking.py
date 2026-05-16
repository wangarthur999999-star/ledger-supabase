"""
mizhi 预约时段管理
==================
用法:
  python mizhi_booking.py 2026-05-19              # 查看本周预约
  python mizhi_booking.py 2026-05-19 --book "周三" "14:30" "Lisa" "水光针"
  python mizhi_booking.py 2026-05-19 --cancel "周三" "14:30"
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
BOOKING_DIR = BASE_DIR.parent / "output" / "mizhi_bookings"
MAX_PER_DAY = CFG["booking"]["max_per_day"]
TIME_SLOTS = CFG["booking"]["time_slots"]
AVAILABLE_DAYS = CFG["booking"]["available_days"]


def week_file(week_start: datetime) -> Path:
    return BOOKING_DIR / f"week_{week_start.strftime('%Y%m%d')}.json"


def load_week(week_start: datetime) -> dict[str, Any]:
    fpath = week_file(week_start)
    if fpath.exists():
        try:
            return json.loads(fpath.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            log.warning("Corrupt booking file, starting fresh")
    return {
        "week_start": week_start.strftime("%Y-%m-%d"),
        "slots": {},
    }


def save_week(week: dict[str, Any], week_start: datetime) -> None:
    BOOKING_DIR.mkdir(parents=True, exist_ok=True)
    week_file(week_start).write_text(json.dumps(week, ensure_ascii=False, indent=2), encoding="utf-8")


def view_week(week_start: datetime) -> None:
    week = load_week(week_start)
    print(f"\n  📅 预约表: {week['week_start']} 周")
    print(f"  Andy 每日上限: {MAX_PER_DAY} 人\n")

    monday = week_start
    for i in range(6):
        day = monday + timedelta(days=i)
        day_cn = AVAILABLE_DAYS[i] if i < len(AVAILABLE_DAYS) else ""
        display = day.strftime("%m/%d")
        print(f"  {day_cn} {display}  {'─' * 40}")

        count = 0
        for ts in TIME_SLOTS:
            key = f"{day.strftime('%Y-%m-%d')}_{ts}"
            booking = week["slots"].get(key)
            if booking:
                count += 1
                print(f"    {ts}  ✅ {booking['client']:<10} {booking['service']}")
            else:
                print(f"    {ts}  ── 空闲 ──")
        bar = "▮" * min(count, MAX_PER_DAY) + "▯" * max(0, MAX_PER_DAY - count)
        print(f"         {bar}  {count}/{MAX_PER_DAY}\n")


def book_slot(week_start: datetime, day_cn: str, time_slot: str, client: str, service: str) -> None:
    week = load_week(week_start)

    if day_cn not in AVAILABLE_DAYS:
        log.error("无效日期: %s。可选: %s", day_cn, ", ".join(AVAILABLE_DAYS))
        sys.exit(1)

    if time_slot not in TIME_SLOTS:
        log.error("无效时段: %s。可选: %s", time_slot, ", ".join(TIME_SLOTS))
        sys.exit(1)

    day_idx = AVAILABLE_DAYS.index(day_cn)
    day_date = week_start + timedelta(days=day_idx)
    key = f"{day_date.strftime('%Y-%m-%d')}_{time_slot}"

    if key in week["slots"]:
        existing = week["slots"][key]
        log.error("时段已占用: %s %s → %s (%s)", day_cn, time_slot, existing["client"], existing["service"])
        sys.exit(1)

    # Check daily limit
    day_count = sum(1 for k, v in week["slots"].items() if k.startswith(day_date.strftime("%Y-%m-%d")))
    if day_count >= MAX_PER_DAY:
        log.error("%s 已达每日上限 (%d人)", day_cn, MAX_PER_DAY)
        sys.exit(1)

    week["slots"][key] = {"client": client, "service": service, "booked_at": datetime.now().isoformat()}
    save_week(week, week_start)
    print(f"\n  ✅ 预约成功: {day_cn} {time_slot} → {client} ({service})")


def cancel_slot(week_start: datetime, day_cn: str, time_slot: str) -> None:
    week = load_week(week_start)
    day_idx = AVAILABLE_DAYS.index(day_cn)
    day_date = week_start + timedelta(days=day_idx)
    key = f"{day_date.strftime('%Y-%m-%d')}_{time_slot}"

    if key not in week["slots"]:
        log.error("该时段无预约: %s %s", day_cn, time_slot)
        sys.exit(1)

    removed = week["slots"].pop(key)
    save_week(week, week_start)
    print(f"\n  ❌ 已取消: {day_cn} {time_slot} → {removed['client']} ({removed['service']})")


def get_week_start(date_str: str) -> datetime:
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return d - timedelta(days=d.weekday())


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("用法:")
        print("  python mizhi_booking.py 2026-05-19                          # 查看本周")
        print('  python mizhi_booking.py 2026-05-19 --book "周三" "14:30" "Lisa" "水光针"')
        print('  python mizhi_booking.py 2026-05-19 --cancel "周三" "14:30"')
        print(f"\n可选日: {AVAILABLE_DAYS}")
        print(f"可选时段: {TIME_SLOTS}")
        return

    try:
        week_start = get_week_start(sys.argv[1])
    except ValueError:
        log.error("日期格式错误，用 YYYY-MM-DD")
        sys.exit(1)

    if "--book" in sys.argv:
        try:
            idx = sys.argv.index("--book")
            day_cn, time_slot, client, service = sys.argv[idx + 1:idx + 5]
            book_slot(week_start, day_cn, time_slot, client, service)
        except (ValueError, IndexError):
            log.error('用法: --book "周三" "14:30" "客户名" "项目名"')
            sys.exit(1)
    elif "--cancel" in sys.argv:
        try:
            idx = sys.argv.index("--cancel")
            day_cn, time_slot = sys.argv[idx + 1:idx + 3]
            cancel_slot(week_start, day_cn, time_slot)
        except (ValueError, IndexError):
            log.error('用法: --cancel "周三" "14:30"')
            sys.exit(1)
    else:
        view_week(week_start)


if __name__ == "__main__":
    main()
