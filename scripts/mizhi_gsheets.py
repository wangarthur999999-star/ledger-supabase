"""
mizhi Google Sheets 集成
========================
OAuth 2.0 Desktop App 认证，自动读写 Google Sheets。

实际结构:
  mizhi_运营系统  ← CLI 写入主表
    ├── 客户追踪    (14 列)
    ├── 分账记录    (9 列)
    └── 预约日历    (6 列)
  mizhi_三语价目表  ← CLI 读取服务/模板

用法:
  python mizhi_gsheets.py                    # 测试连接
  python mizhi_gsheets.py --auth             # 重新授权
  python mizhi_gsheets.py --list-tabs        # 列出所有 Tab
  python mizhi_gsheets.py --list-tabs --sheet-id <ID>
"""

import json
import logging
import sys
import os
from datetime import datetime
from pathlib import Path
from typing import Any

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]

logging.basicConfig(
    level=logging.INFO, format="%(levelname)s: %(message)s", stream=sys.stderr
)
log = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent
OAUTH_FILE = BASE_DIR / "mizhi_google_oauth.json"
TOKEN_FILE = BASE_DIR / "mizhi_google_token.json"

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]

# ── Auth ──────────────────────────────────────────────────────────

def _get_spreadsheet():
    import gspread
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow

    if not OAUTH_FILE.exists():
        raise FileNotFoundError(
            f"OAuth 密钥不存在: {OAUTH_FILE}\n"
            "请从 GCP 下载 OAuth 客户端 JSON 放到 scripts/ 目录。"
        )

    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_info(
            json.loads(TOKEN_FILE.read_text(encoding="utf-8")), SCOPES
        )

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(OAUTH_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")

    return gspread.authorize(creds)


def get_spreadsheet_by_id(spreadsheet_id: str):
    gc = _get_spreadsheet()
    return gc.open_by_key(spreadsheet_id)


# ── 配置 ──────────────────────────────────────────────────────────

def _load_config() -> dict[str, Any]:
    cfg_path = BASE_DIR / "mizhi_config.json"
    return json.loads(cfg_path.read_text(encoding="utf-8"))


def get_ops_sheet_id() -> str:
    """获取运营系统 Sheet ID。"""
    cfg = _load_config()
    return cfg["google_sheets"]["ops_sheet_id"]


def get_price_sheet_id() -> str:
    """获取价目表 Sheet ID。"""
    cfg = _load_config()
    return cfg["google_sheets"]["price_sheet_id"]


# ── 客户追踪 Tab ──────────────────────────────────────────────────
# 表头: 日期, 姓名, 语言, 来源渠道, 项目, 金额(USD), 耗材成本(USD),
#        纯利(USD), Andy分成(USD), 你的分成(USD), 下次回访日, 下次复购日,
#        转介绍人数, 备注

def append_client_tracking(record: dict[str, Any]) -> None:
    """写入「客户追踪」。"""
    sid = get_ops_sheet_id()
    sh = get_spreadsheet_by_id(sid)
    ws = sh.worksheet("客户追踪")

    next_followup = ""
    if record.get("followups"):
        next_followup = record["followups"][0]["due_date"]

    row = [
        record["date"],                              # 日期
        record["client"],                            # 姓名
        record.get("language", "zh"),                # 语言
        record.get("source_desc", ""),               # 来源渠道
        record["service_name"],                      # 项目
        record["price"],                             # 金额(USD)
        record["cost"],                              # 耗材成本(USD)
        record["profit"],                            # 纯利(USD)
        record["andy_share"],                        # Andy分成(USD)
        record["your_share"],                        # 你的分成(USD)
        next_followup,                               # 下次回访日
        "",                                          # 下次复购日
        0,                                           # 转介绍人数
        record.get("notes", ""),                     # 备注
    ]
    ws.append_row(row, value_input_option="USER_ENTERED")
    log.info("已写入客户追踪: %s", record["client"])


def get_all_clients() -> list[dict[str, Any]]:
    sid = get_ops_sheet_id()
    sh = get_spreadsheet_by_id(sid)
    ws = sh.worksheet("客户追踪")
    return ws.get_all_records()


# ── 分账记录 Tab ──────────────────────────────────────────────────
# 表头: 日期, 客户名, 总金额, 耗材, 纯利, Andy到手, 你到手, Andy确认, 备注

def append_profit_split(record: dict[str, Any]) -> None:
    """写入「分账记录」。"""
    sid = get_ops_sheet_id()
    sh = get_spreadsheet_by_id(sid)
    ws = sh.worksheet("分账记录")
    row = [
        record["date"],                              # 日期
        record["client"],                            # 客户名
        record["price"],                             # 总金额
        record["cost"],                              # 耗材
        record["profit"],                            # 纯利
        record["andy_share"],                        # Andy到手
        record["your_share"],                        # 你到手
        "FALSE",                                     # Andy确认
        record.get("source_desc", ""),               # 备注
    ]
    ws.append_row(row, value_input_option="USER_ENTERED")
    log.info("已写入分账记录: %s $%.2f", record["client"], record["profit"])


# ── 预约日历 Tab ──────────────────────────────────────────────────
# 表头: 日期, 时间, 客户名, 项目, 语言, 状态

def append_booking(record: dict[str, Any]) -> None:
    """写入「预约日历」。"""
    sid = get_ops_sheet_id()
    sh = get_spreadsheet_by_id(sid)
    ws = sh.worksheet("预约日历")
    row = [
        record["date"],                              # 日期
        record["time"],                              # 时间
        record["client"],                            # 客户名
        record["service_name"],                      # 项目
        record.get("language", "zh"),                # 语言
        "已预约",                                     # 状态
    ]
    ws.append_row(row, value_input_option="USER_ENTERED")
    log.info("已写入预约日历: %s %s %s", record["date"], record["time"], record["client"])


def get_bookings() -> list[dict[str, Any]]:
    sid = get_ops_sheet_id()
    sh = get_spreadsheet_by_id(sid)
    ws = sh.worksheet("预约日历")
    return ws.get_all_records()


# ── 读取价目表 ────────────────────────────────────────────────────

def get_services_from_sheet() -> list[dict[str, Any]]:
    """从「三语价目表」读取所有服务。"""
    sid = get_price_sheet_id()
    sh = get_spreadsheet_by_id(sid)
    ws = sh.worksheet("三语价目表")
    return ws.get_all_records()


# ── 一键同步 ──────────────────────────────────────────────────────

def sync_full_client(record: dict[str, Any]) -> None:
    """注册客户后一键写入三个 Tab。"""
    append_client_tracking(record)
    append_profit_split(record)
    append_booking(record)
    log.info("全量同步完成: %s", record["client"])


# ── CLI ──────────────────────────────────────────────────────────

def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="mizhi Google Sheets 集成")
    parser.add_argument("--auth", action="store_true", help="重新授权")
    parser.add_argument("--list-tabs", action="store_true", help="列出所有 Tab")
    parser.add_argument("--sheet-id", help="Google Sheet ID (覆盖默认)")
    parser.add_argument("--test-write", action="store_true", help="测试写入")
    args = parser.parse_args()

    if args.auth:
        TOKEN_FILE.unlink(missing_ok=True)
        log.info("已清除旧 token。")

    if args.sheet_id:
        sh = get_spreadsheet_by_id(args.sheet_id)
    else:
        sh = get_spreadsheet_by_id(get_ops_sheet_id())

    if args.list_tabs:
        print(f"\n  Sheet: {sh.title}")
        print(f"  {'─'*40}")
        for ws in sh.worksheets():
            print(f"  - {ws.title}  ({ws.row_count} 行 × {ws.col_count} 列)")
        print()

    if args.test_write:
        from datetime import datetime as dt
        test = {
            "client": "TEST_USER",
            "date": dt.now().strftime("%Y-%m-%d"),
            "time": "14:30",
            "day_cn": "周五",
            "service_name": "深层清洁",
            "language": "zh",
            "price": 50,
            "cost": 8,
            "profit": 42,
            "andy_share": 21,
            "your_share": 21,
            "source": "test",
            "source_desc": "自动化测试",
            "notes": "此行可手动删除",
            "followups": [{"due_date": dt.now().strftime("%Y-%m-%d")}],
        }
        sync_full_client(test)
        print("\n  已写入测试行（请手动删除）。\n")

    if not args.list_tabs and not args.test_write:
        print(f"\n  ✅ 已连接: {sh.title}")
        print(f"  Tabs: {', '.join(ws.title for ws in sh.worksheets())}\n")


if __name__ == "__main__":
    main()
