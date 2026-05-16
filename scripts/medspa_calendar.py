"""
医美批量内容日历 — 基于 medspa_mvp.py 的批量生成器
====================================================
输入: 周日历 JSON 配置文件
输出: output/medspa_calendar/{week}/ 目录，每个 slot 独立 JSON + manifest.json

用法:
  python medspa_calendar.py calendar.json        # 批量生成整周
  python medspa_calendar.py --template            # 输出空模板
  python medspa_calendar.py calendar.json --dry   # 预览不调用 API
"""
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from medspa_mvp import ESTIMATED_COST_PER_POST, call_ai, generate_content

logging.basicConfig(
    level=logging.INFO, format="%(levelname)s: %(message)s", stream=sys.stderr
)
log = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
SCRIPTS_DIR = BASE_DIR
OUTPUT_DIR = BASE_DIR.parent / "output" / "medspa_calendar"
TEMPLATE_PATH = SCRIPTS_DIR / "medspa_calendar_template.json"


def load_json_safe(path: Path, fatal: bool = True) -> dict[str, Any] | None:
    """Load and parse a JSON file with error handling.

    If fatal=True (default), exits the process on failure.
    If fatal=False, returns None on failure so the caller can handle it.
    """
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, FileNotFoundError) as e:
        if fatal:
            log.error("Failed to parse %s: %s", path, e)
            sys.exit(1)
        log.warning("Failed to parse %s: %s — will re-generate", path, e)
        return None


# ── Config loader ────────────────────────────────────
CFG = load_json_safe(SCRIPTS_DIR / "medspa_config.json")


def week_label(date_str: str) -> str:
    """Convert '2026-05-18' to '2026W21' (ISO week)."""
    d = datetime.strptime(date_str, "%Y-%m-%d")
    iso = d.isocalendar()
    return f"{iso[0]}W{iso[1]:02d}"


def slot_filename(index: int, slot: dict[str, Any]) -> str:
    """Generate filename like '01_mon_0800.json'."""
    day_short = slot.get("day", f"day{index}")[:3]
    time_short = slot.get("time", "0000").replace(":", "")[:4]
    return f"{index:02d}_{day_short}_{time_short}.json"


def generate_calendar(config_path: str, dry_run: bool = False) -> None:
    """Main entry: load calendar config, generate all slots, save output."""
    calendar = load_json_safe(Path(config_path))

    week_start = calendar.get("week_start", "")
    if not week_start:
        log.error("calendar config missing 'week_start'")
        sys.exit(1)

    slots = calendar.get("slots", [])
    if not slots:
        log.error("No slots in calendar config")
        sys.exit(1)

    week_dir = OUTPUT_DIR / week_label(week_start)
    week_dir.mkdir(parents=True, exist_ok=True)

    # Save input snapshot
    (week_dir / "calendar_input.json").write_text(
        json.dumps(calendar, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    total = len(slots)
    manifest_entries: list[dict[str, Any]] = []
    cost_est = total * ESTIMATED_COST_PER_POST

    print(f"{'='*60}")
    print(f"Week: {week_label(week_start)} | Slots: {total} | Est. cost: ~${cost_est:.3f}")
    if dry_run:
        print("[DRY RUN] No API calls will be made")
    print(f"{'='*60}\n")

    for i, slot in enumerate(slots):
        idx = i + 1
        fname = slot_filename(idx, slot)
        fpath = week_dir / fname

        # Skip if already generated (only if cache file is valid)
        if fpath.exists():
            existing = load_json_safe(fpath, fatal=False)
            if existing is not None:
                log.info("[%d/%d] %s %s — SKIP (already exists)", idx, total, slot.get("day", ""), slot.get("time", ""))
                manifest_entries.append({
                    "index": idx,
                    "day": slot.get("day", ""),
                    "time": slot.get("time", ""),
                    "file": fname,
                    "product": slot.get("product", ""),
                    "hook": existing.get("hook", ""),
                    "status": "cached",
                })
                continue
            # Corrupt cache — delete and fall through to re-generate
            fpath.unlink(missing_ok=True)

        print(f"[{idx}/{total}] {slot.get('day', '')} {slot.get('time', '')} — {slot.get('product', '')[:30]}...")

        if dry_run:
            print(f"  >> [DRY] Would generate: {slot.get('benefit', '')[:40]}")
            manifest_entries.append({
                "index": idx,
                "day": slot.get("day", ""),
                "time": slot.get("time", ""),
                "file": fname,
                "product": slot.get("product", ""),
                "hook": "",
                "status": "dry_run",
            })
            continue

        try:
            result = generate_content(
                product=slot.get("product", ""),
                benefit=slot.get("benefit", ""),
                audience=slot.get("audience", ""),
                cta=slot.get("cta", ""),
                supporting=slot.get("supporting", ""),
            )
            # Augment with calendar metadata
            result["slot_day"] = slot.get("day", "")
            result["slot_time"] = slot.get("time", "")
            result["slot_type"] = slot.get("type", "fb_ig")
            result["visual_style"] = slot.get("visual_style", "")
            result["hook_preference"] = slot.get("hook_preference", "")

            fpath.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"  >> Hook: {result['hook'][:50]}...")
            print(f"  >> Saved: {fname}")

            manifest_entries.append({
                "index": idx,
                "day": slot.get("day", ""),
                "time": slot.get("time", ""),
                "file": fname,
                "product": slot.get("product", ""),
                "hook": result["hook"],
                "hook_type": result.get("hook_type", ""),
                "status": "generated",
            })
        except Exception as e:
            log.error("Slot %d failed: %s", idx, e)
            manifest_entries.append({
                "index": idx,
                "day": slot.get("day", ""),
                "time": slot.get("time", ""),
                "file": fname,
                "product": slot.get("product", ""),
                "hook": "",
                "status": f"error: {str(e)[:80]}",
            })

    # Write manifest
    manifest: dict[str, Any] = {
        "week_start": week_start,
        "week_label": week_label(week_start),
        "brand": CFG.get("brand", {}).get("name", ""),
        "generated_at": datetime.now().isoformat(),
        "total_slots": total,
        "slots": manifest_entries,
    }
    manifest_path = week_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    # Summary
    ok = sum(1 for e in manifest_entries if e["status"] == "generated")
    cached = sum(1 for e in manifest_entries if e["status"] == "cached")
    errors = sum(1 for e in manifest_entries if isinstance(e.get("status"), str) and e["status"].startswith("error"))
    dry = sum(1 for e in manifest_entries if e["status"] == "dry_run")

    print(f"\n{'='*60}")
    print(f"Complete! Generated: {ok}, Cached: {cached}, Errors: {errors}, Dry: {dry}")
    print(f"Output: {week_dir}")
    print(f"Manifest: {manifest_path}")
    print(f"Est. API cost: ~${ok * ESTIMATED_COST_PER_POST:.3f}")


def print_template() -> None:
    if TEMPLATE_PATH.exists():
        print(f"Template: {TEMPLATE_PATH}")
        data = load_json_safe(TEMPLATE_PATH)
        print(f"Slots: {len(data.get('slots', []))}")
    else:
        log.error("Template not found. Run without --template and provide a config path.")
        sys.exit(1)


def main() -> None:
    if len(sys.argv) < 2:
        print("=" * 50)
        print("  医美批量内容日历")
        print("=" * 50)
        print("\n用法:")
        print("  python medspa_calendar.py calendar.json        # 批量生成")
        print("  python medspa_calendar.py calendar.json --dry  # 预览不调API")
        print("  python medspa_calendar.py --template           # 查看模板路径")
        print(f"\n模板文件: {TEMPLATE_PATH}")
        sys.exit(1)

    if sys.argv[1] == "--template":
        print_template()
        return

    config_path = sys.argv[1]
    if not Path(config_path).exists():
        log.error("Config file not found: %s", config_path)
        sys.exit(1)

    dry_run = "--dry" in sys.argv
    generate_calendar(config_path, dry_run=dry_run)


if __name__ == "__main__":
    main()
