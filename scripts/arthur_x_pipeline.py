"""
Arthur-IP X/Twitter 内容管线 v2
V12 精炼笔记池 → ASR纠错(可选) → AI改写 → X推文
"""
import os
import json
import random
import re
from datetime import datetime
from pathlib import Path
from typing import NamedTuple

import requests

# ── Config ────────────────────────────────────────────
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
if not DEEPSEEK_API_KEY:
    raise RuntimeError("DEEPSEEK_API_KEY not set — set the env var and retry")
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

VAULT_BASE = Path(os.environ.get(
    "ARTHUR_NOTES_PATH",
    r"C:\Users\wanga\OneDrive\Documents\Obsidian Vault\Arthur-IP系统\笔记"
))

# V12 actual file counts per category
CATEGORY_WEIGHTS = {
    "01_认知思维": 0.30,
    "03_商业财经": 0.30,
    "02_职场发展": 0.25,
    "04_行业洞察": 0.08,
    "08_未分类":  0.05,
    "05_个人成长": 0.02,
}

OUTPUT_DIR = Path(__file__).parent.parent / "output" / "x_posts"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class Note(NamedTuple):
    path: Path
    title: str
    date: str
    category: str
    core_points: list[str]
    golden_quotes: list[str]
    action_items: list[str]
    full_transcript: str


# ── Prompts ──────────────────────────────────────────

ASR_CORRECTION_PROMPT = """你是一个中文语音识别纠错助手。以下是抖音视频的自动字幕转录，含有ASR(语音识别)错误。

请修正：
- 同音错字（如"打满坟"→"打满分"、"乔不及"→"瞧不起"、"体谅"→"体量"、"语佛相来"→"与否向来"、"坦朋友"→"谈朋友"、"九肉"→"纠结"）
- 断句错误
- 乱码和无意义片段

只输出修正后的文本，不要添加解释。"""

SHORT_POST_SYSTEM = """你是 "Arthur"，一个在苏里南的华人创业者。你的内容风格 99% 模仿抖音博主 "99年的老男人"。

## 风格
- 语气：直白、不装、带点痞气。像混过社会的过来人掏心窝子。
- 节奏：短句。每句一个 punch。不绕弯。
- 视角：底层创业者/小老板视角讲商业真相。反常识、揭内幕、讲潜规则。
- 结构：核心观点 → 2-3句论证 → 最后一句扎心收尾。
- 字数：中文 120-200 字。

## 苏里南视角
如果素材的"行动建议"里提到了苏里南，可以自然融入本地视角。但不要硬塞。

## 1% AI-native 露出
每 7-10 条内容中，有 1 条可以轻微带出 "我用 AI 搭了这套系统" 的感觉。自然流露，不卖课。

## 禁止
- 不要"你知道吗""家人们""兄弟们"喊麦口吻
- 不要鸡汤、不要正确的废话
- 不要 emoji
- 不要英文单词（除非无中文替代）
- 不要 #标签"""

SHORT_USER_TEMPLATE = """素材：

{core_points}

{quotes}

{action_context}

写一条 X 推文："""

THREAD_SYSTEM = """你是 Arthur，风格同上。写一条 X 长线程。

结构：
1/ 扎心结论 hook（让人想点开）
2/ 论证角度 1（具体场景）
3/ 论证角度 2（换个角度）
4/ 反常识或内幕
5/ 知道后怎么办
6/ 收尾 + 自然引流

每条 120-180 字，共 5-7 条。"""


# ── Note Parser (V12 format) ─────────────────────────
def parse_note(filepath: Path) -> Note | None:
    """Parse V12 format note."""
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception:
        return None

    category = filepath.parent.name

    # Frontmatter
    title = ""
    date_str = ""
    fm_match = re.search(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if fm_match:
        fm = fm_match.group(1)
        title_m = re.search(r'title:\s*"?(.+?)"?\s*$', fm, re.MULTILINE)
        date_m = re.search(r"date:\s*(\S+)", fm)
        if title_m:
            title = title_m.group(1).strip()
        if date_m:
            date_str = date_m.group(1).strip()

    # V12: "## 核心观点" (no emoji)
    core_points = []
    cp = re.search(r"## 核心观点\s*\n(.*?)(?=\n##|\Z)", content, re.DOTALL)
    if cp:
        points = re.findall(r"\d+\.\s*(.+)", cp.group(1))
        core_points = [p.strip() for p in points if len(p.strip()) > 3 and "（待" not in p]

    # V12: "## 金句摘录" (no emoji)
    quotes = []
    gq = re.search(r"## 金句摘录\s*\n(.*?)(?=\n##|\Z)", content, re.DOTALL)
    if gq:
        qs = re.findall(r">\s*(.+)", gq.group(1))
        quotes = [q.strip() for q in qs if len(q.strip()) > 3 and "（待" not in q]

    # V12: "## 行动建议" - Arthur-specific context
    action_items = []
    aa = re.search(r"## 行动建议\s*\n(.*?)(?=\n##|\Z)", content, re.DOTALL)
    if aa:
        lines = [l.strip() for l in aa.group(1).strip().split("\n") if l.strip()]
        action_items = [l for l in lines if len(l) > 3 and "（待" not in l and not l.startswith("---")]

    # V12: "## 详细内容" - raw transcript (may need ASR correction)
    transcript = ""
    dc = re.search(r"## 详细内容\s*\n(.*?)(?=\n##|\Z)", content, re.DOTALL)
    if dc:
        transcript = dc.group(1).strip()

    if not core_points and not quotes:
        return None

    return Note(
        path=filepath, title=title, date=date_str, category=category,
        core_points=core_points, golden_quotes=quotes,
        action_items=action_items, full_transcript=transcript,
    )


# ── ASR Correction ───────────────────────────────────
def correct_asr(text: str) -> str:
    """Fix ASR errors in raw transcript using DeepSeek."""
    if len(text) < 20:
        return text
    try:
        resp = requests.post(
            DEEPSEEK_URL,
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": ASR_CORRECTION_PROMPT},
                    {"role": "user", "content": text[:2000]},
                ],
                "temperature": 0.3,
                "max_tokens": 2000,
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception:
        return text


# ── Note Picker ───────────────────────────────────────
def pick_notes(count: int = 5) -> list[Note]:
    """Weighted random selection from V12 pool."""
    all_notes: list[Note] = []
    for cat, weight in CATEGORY_WEIGHTS.items():
        cat_dir = VAULT_BASE / cat
        if not cat_dir.exists():
            continue
        files = list(cat_dir.glob("*.md"))
        sample_size = max(1, int(len(files) * weight * 0.1))
        sampled = random.sample(files, min(sample_size, len(files)))
        for f in sampled:
            note = parse_note(f)
            if note:
                all_notes.append(note)

    # Deduplicate
    seen = set()
    unique = []
    for n in all_notes:
        key = n.title[:30]
        if key not in seen:
            seen.add(key)
            unique.append(n)

    random.shuffle(unique)
    return unique[:count]


# ── AI Rewriter ───────────────────────────────────────
def call_deepseek(system: str, user: str, temperature: float = 0.85) -> str:
    resp = requests.post(
        DEEPSEEK_URL,
        headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": 1000,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def rewrite_short(note: Note, ai_native: bool = False) -> str:
    """Rewrite one V12 note into a short X post."""
    user = SHORT_USER_TEMPLATE.format(
        core_points="\n".join(f"- {p}" for p in note.core_points[:4]),
        quotes="\n".join(f"> {q}" for q in note.golden_quotes[:2]),
        action_context=(
            f"苏里南视角：\n" + "\n".join(f"- {a}" for a in note.action_items[:2])
            if note.action_items else ""
        ),
    )
    extra = ""
    if ai_native:
        extra = "\n这条可以轻微带出你用AI搭系统的感觉，但自然不卖课。"
    return call_deepseek(SHORT_POST_SYSTEM, user + extra)


def rewrite_thread(notes: list[Note]) -> str:
    """Rewrite multiple V12 notes into an X thread."""
    combined = []
    for n in notes:
        combined.extend(n.core_points[:3])
        combined.extend(n.golden_quotes[:2])
    # Also include ASR-corrected transcript context
    user = "素材：\n" + "\n".join(f"- {p}" for p in combined[:10])
    return call_deepseek(THREAD_SYSTEM, user, temperature=0.9)


# ── Output ────────────────────────────────────────────
def save_post(content: str, post_type: str, index: int, meta: dict = None) -> Path:
    date_str = datetime.now().strftime("%Y%m%d")
    filename = f"{date_str}_{post_type}_{index:03d}.md"
    filepath = OUTPUT_DIR / filename
    frontmatter = f"---\ndate: {datetime.now().isoformat()}\ntype: {post_type}\n"
    if meta:
        frontmatter += f"source: {meta.get('source', '')}\n"
        frontmatter += f"category: {meta.get('category', '')}\n"
    frontmatter += "---\n\n"
    filepath.write_text(frontmatter + content, encoding="utf-8")
    return filepath


# ── Main Pipeline ─────────────────────────────────────
def generate_daily_batch(short_count: int = 6, thread_count: int = 1):
    total_notes = short_count + thread_count * 3
    print(f"📋 V12 笔记池 ({sum((VAULT_BASE/d).exists() and len(list((VAULT_BASE/d).glob('*.md'))) or 0 for d in CATEGORY_WEIGHTS)} 条), 抽取 {total_notes} 条...")

    short_notes = pick_notes(short_count)
    thread_notes = pick_notes(3)

    # AI-native rotation: every 8th post
    ai_native_slot = random.randint(0, short_count - 1) if short_count > 7 else -1

    results = []
    for i, note in enumerate(short_notes):
        is_ai = (i == ai_native_slot)
        tag = "[AI-native] " if is_ai else ""
        print(f"  ✍️ {tag}短推 {i+1}/{short_count}: {note.title[:50]}...")
        content = rewrite_short(note, ai_native=is_ai)
        path = save_post(content, "short", i + 1, {"source": note.title, "category": note.category})
        results.append(("short", path))
        print(f"     → {path.name}")

    if thread_notes:
        print(f"  🧵 生成线程...")
        content = rewrite_thread(thread_notes)
        path = save_post(content, "thread", 1)
        results.append(("thread", path))
        print(f"     → {path.name}")

    print(f"\n✅ 完成: {len(results)} 条 → {OUTPUT_DIR}")
    return results


if __name__ == "__main__":
    generate_daily_batch()
