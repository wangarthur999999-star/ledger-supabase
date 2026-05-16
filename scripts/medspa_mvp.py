"""
苏里南医美社交媒体 MVP — 最小可行版本
======================================
成本: DeepSeek API ~$0.002/条帖子 (500条≈$1)
用法: python medspa_mvp.py "产品名" "核心卖点" "目标受众" "CTA"
"""
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import requests

logging.basicConfig(
    level=logging.INFO, format="%(levelname)s: %(message)s", stream=sys.stderr
)
log = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────
ESTIMATED_COST_PER_POST = 0.002  # DeepSeek API ~$0.002 per post

# Fix Windows GBK encoding for emoji output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (OSError, AttributeError):
        pass

# ── Config ────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
with open(BASE_DIR / "medspa_config.json", encoding="utf-8") as f:
    CFG = json.load(f)

AI_CONFIG: dict[str, str] = {
    **CFG["ai"],
    "api_key": os.environ.get("DEEPSEEK_API_KEY", ""),
}

OUTPUT_DIR = BASE_DIR.parent / "output" / "medspa"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ── Helpers ───────────────────────────────────────────
def parse_ai_json(raw: str, required_keys: list[str]) -> dict[str, Any]:
    """Parse AI JSON response and validate required top-level keys exist."""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"AI returned invalid JSON: {e}") from e
    for key in required_keys:
        if key not in data:
            raise RuntimeError(f"AI response missing required key: {key}")
    return data


# ── AI Call ───────────────────────────────────────────
def call_ai(system_prompt: str, user_message: str, json_mode: bool = True) -> str:
    if not AI_CONFIG["api_key"]:
        raise RuntimeError("DEEPSEEK_API_KEY not set — set the env var and retry")
    headers = {
        "Authorization": f"Bearer {AI_CONFIG['api_key']}",
        "Content-Type": "application/json",
    }
    body: dict[str, Any] = {
        "model": AI_CONFIG["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.8,
        "max_tokens": 4096,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    resp = requests.post(
        f"{AI_CONFIG['base_url']}/chat/completions",
        headers=headers,
        json=body,
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"API error: {data['error']}")
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected API response structure: {e}") from e


# ── Prompts ───────────────────────────────────────────
HOOK_PROMPT = """You are an elite social media strategist for Facebook and Instagram.
Generate exactly 5 hooks — NOT full posts. Each hook <=15 words.

Product: {product}
Key Benefit: {benefit}
Target Audience: {audience}
Brand Voice: {tone}
Campaign Goal: {goal}

Hook Type Mix (at least one of each):
1. Pattern-Interrupt — challenge a common belief
2. Curiosity Gap — open a loop the reader must close
3. Direct Benefit — immediate value promise
4. Social Proof — leverage herd instinct, data, or numbers
5. Emotion-Bait — trigger feeling before information

Output JSON with keys: hooks (array of {{index, type, text, score, score_reason}}), best_pick ({{index, reason}})"""

BODY_PROMPT = """You are a social media copywriter. Produce Facebook + Instagram versions.

Hook: {hook}
Product: {product}
Benefit: {benefit}
Supporting Info: {supporting}
Target Audience: {audience}
Brand Voice: {tone}
Forbidden Words: {forbidden}
Must Include: {must_include}
Max Emojis: {emoji_limit}
Sentence Style: {sentence_style}
CTA: {cta}
IG Handle: {ig_handle}

Facebook Rules:
- Conversational, community-driven tone
- Structure: Hook -> Context(2-3 lines) -> Problem -> Solution -> Engagement Question
- 80-150 words, short paragraphs with line breaks, max {emoji_limit} emojis
- End with a genuine question to drive comments

Instagram Rules:
- Visual-first, punchy, aesthetic
- Structure: Hook -> Quick bullets -> Social proof -> CTA
- 30-80 words
- Generate exactly 15 hashtags: 3 broad + 7 mid-range + 5 long-tail
- Place hashtags in a separate comment block

Output JSON with: facebook ({{body, engagement_question}}), instagram ({{caption, hashtags, hashtag_comment}})"""


# ── Core Flow ─────────────────────────────────────────
def generate_content(
    product: str,
    benefit: str,
    audience: str,
    cta: str,
    supporting: str = "",
) -> dict[str, Any]:
    brand = CFG["brand"]
    tone = "、".join(brand["tone_pillars"])

    # Step 1: Generate 5 hooks
    log.info("[1/3] Generating 5 hook variants...")
    hooks_raw = call_ai(
        system_prompt="You are a social media hook generator. Always output valid JSON.",
        user_message=HOOK_PROMPT.format(
            product=product, benefit=benefit, audience=audience,
            tone=tone, goal="conversion",
        ),
    )
    hooks_data = parse_ai_json(hooks_raw, ["hooks", "best_pick"])
    best = hooks_data["best_pick"]
    hook_idx = best["index"] - 1
    if hook_idx < 0 or hook_idx >= len(hooks_data["hooks"]):
        raise RuntimeError(f"best_pick index {best['index']} out of range for {len(hooks_data['hooks'])} hooks")
    chosen_hook = hooks_data["hooks"][hook_idx]["text"]
    hook_type = hooks_data["hooks"][hook_idx]["type"]
    log.info("  Selected Hook #%d (%s): %s", best["index"], hook_type, chosen_hook)

    # Step 2: Expand to FB + IG versions
    log.info("[2/3] Expanding body copy (FB + IG)...")
    body_raw = call_ai(
        system_prompt="You are a social media copywriter. Always output valid JSON.",
        user_message=BODY_PROMPT.format(
            hook=chosen_hook, product=product, benefit=benefit,
            supporting=supporting or benefit, audience=audience, tone=tone,
            forbidden="、".join(brand["forbidden_words"]),
            must_include="、".join(brand["must_include_kw"]),
            emoji_limit=brand["emoji_limit"],
            sentence_style=brand["sentence_style"],
            cta=cta, ig_handle=brand["ig_handle"],
        ),
    )
    body_data = parse_ai_json(body_raw, ["facebook", "instagram"])

    return {
        "product": product,
        "benefit": benefit,
        "audience": audience,
        "hook": chosen_hook,
        "hook_type": hook_type,
        "all_hooks": hooks_data["hooks"],
        "facebook": body_data["facebook"],
        "instagram": body_data["instagram"],
        "generated_at": datetime.now().isoformat(),
    }


# ── Output ────────────────────────────────────────────
def print_result(result: dict[str, Any]) -> None:
    print("\n" + "=" * 60)
    print(f"Product: {result['product']} | {result['benefit']}")
    print(f"Audience: {result['audience']} | Hook type: {result['hook_type']}")
    print("=" * 60)
    print(f"\n>> Selected Hook:\n   \"{result['hook']}\"\n")

    print("-" * 60)
    print("[FACEBOOK]")
    print("-" * 60)
    print(result["facebook"]["body"])
    print(f"\nEngagement Q: {result['facebook']['engagement_question']}")

    print("\n" + "-" * 60)
    print("[INSTAGRAM]")
    print("-" * 60)
    print(result["instagram"]["caption"])
    print(f"\nHashtags: {' '.join(result['instagram'].get('hashtags', []))}")
    print(f"First comment: {result['instagram'].get('hashtag_comment', '')}")


def save_result(result: dict[str, Any]) -> None:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    name = result["product"].replace(" ", "_").replace("/", "-")[:30]
    fpath = OUTPUT_DIR / f"{name}_{ts}.json"
    fpath.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("Saved: %s", fpath)


# ── Main ──────────────────────────────────────────────
def main() -> None:
    if len(sys.argv) >= 5:
        product, benefit, audience, cta = sys.argv[1:5]
    else:
        print("=" * 50)
        print("  苏里南医美 — 社交媒体内容生成器")
        print(f"  Cost: ~${ESTIMATED_COST_PER_POST:.3f}/post (DeepSeek API)")
        print("=" * 50)
        product = input("\nProduct/Service: ").strip()
        benefit = input("Key benefit: ").strip()
        audience = input("Target audience: ").strip()
        cta = input("CTA: ").strip()

    if not all([product, benefit, audience, cta]):
        log.error("All fields required")
        sys.exit(1)

    try:
        result = generate_content(product, benefit, audience, cta)
    except Exception as e:
        log.error("AI generation failed: %s", e)
        sys.exit(1)

    print_result(result)
    save_result(result)
    print(f"\nCost this run: ~${ESTIMATED_COST_PER_POST:.3f}")


if __name__ == "__main__":
    main()
