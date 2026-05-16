"""
mizhi 分账计算器
================================
用法:
  python mizhi_profit_split.py                    # 交互模式
  python mizhi_profit_split.py --list             # 列出所有服务
  python mizhi_profit_split.py skin_booster       # 计算水光针分账
  python mizhi_profit_split.py skin_booster --source social_media_exclusive
"""
import json
import logging
import sys

# Force UTF-8 on Windows consoles
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO, format="%(levelname)s: %(message)s", stream=sys.stderr
)
log = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent
CFG = json.loads((BASE_DIR / "mizhi_config.json").read_text(encoding="utf-8"))


def find_service(service_id: str) -> dict[str, Any]:
    for s in CFG["services"]:
        if s["id"] == service_id:
            return s
    raise KeyError(f"Service '{service_id}' not found. Use --list to see all.")


def calculate_split(
    service: dict[str, Any],
    source: str = "your_new_client",
    custom_price: float | None = None,
) -> dict[str, Any]:
    price = custom_price if custom_price is not None else service["price"]
    cost = service["cost"]
    profit = price - cost
    split_rule = CFG["profit_split"][source]

    andy_share = round(profit * split_rule["andy"], 2)
    your_share = round(profit * split_rule["you"], 2)

    return {
        "service": service["name_cn"],
        "service_en": service["name_en"],
        "price": price,
        "cost": cost,
        "profit": profit,
        "source": source,
        "source_desc": split_rule["desc"],
        "andy": andy_share,
        "you": your_share,
        "andy_pct": f"{split_rule['andy']:.0%}",
        "you_pct": f"{split_rule['you']:.0%}",
    }


def print_result(r: dict[str, Any]) -> None:
    print("\n" + "=" * 50)
    print(f"  {r['service']} ({r['service_en']})")
    print("=" * 50)
    print(f"  价格:     ${r['price']:.2f}")
    print(f"  耗材成本: ${r['cost']:.2f}")
    print(f"  纯利:     ${r['profit']:.2f}")
    print(f"  分账规则: {r['source_desc']}")
    print("-" * 50)
    print(f"  Andy ({r['andy_pct']}): ${r['andy']:.2f}")
    print(f"  你   ({r['you_pct']}): ${r['you']:.2f}")
    print("=" * 50)


def list_services() -> None:
    print(f"\n{'服务ID':<22} {'项目':<14} {'价格':>8} {'成本':>8} {'纯利':>8}")
    print("-" * 62)
    for s in CFG["services"]:
        profit = s["price"] - s["cost"]
        print(f"  {s['id']:<20} {s['name_cn']:<12} ${s['price']:>6.0f}  ${s['cost']:>6.0f}  ${profit:>6.0f}")


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("用法:")
        print("  python mizhi_profit_split.py --list               # 列出所有服务")
        print("  python mizhi_profit_split.py <service_id>         # 计算默认(50:50)分账")
        print("  python mizhi_profit_split.py <service_id> --source <rule>")
        print(f"  分账规则: {', '.join(CFG['profit_split'].keys())}")
        return

    if sys.argv[1] == "--list":
        list_services()
        return

    service_id = sys.argv[1]
    source = "your_new_client"
    for i, arg in enumerate(sys.argv):
        if arg == "--source" and i + 1 < len(sys.argv):
            source = sys.argv[i + 1]

    if source not in CFG["profit_split"]:
        log.error("Unknown source '%s'. Options: %s", source, ", ".join(CFG["profit_split"].keys()))
        sys.exit(1)

    try:
        service = find_service(service_id)
    except KeyError as e:
        log.error(str(e))
        sys.exit(1)

    result = calculate_split(service, source)
    print_result(result)


if __name__ == "__main__":
    main()
