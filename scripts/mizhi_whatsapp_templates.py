"""
mizhi 三语 WhatsApp 消息模板库
===============================
用法:
  python mizhi_whatsapp_templates.py                     # 列出所有场景
  python mizhi_whatsapp_templates.py booking_confirmation zh "Lisa" "水光针" "周三 14:30"
  python mizhi_whatsapp_templates.py post_treatment_check en "Lisa" "Deep Cleansing"
  python mizhi_whatsapp_templates.py --cat               # 按分类查看
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

BRAND = CFG["brand"]["name"]
LOCATION = CFG["brand"]["location"]
TECH = CFG["technician"]["name"].split(" (")[0]
OP = CFG["operator"]["name"]

TEMPLATES: dict[str, dict[str, str]] = {
    "booking_confirmation": {
        "zh": (
            f"【{BRAND}】预约确认 ✅\n\n"
            "{{client}} 你好，你的预约已锁定：\n"
            "📅 时间：{{details}}\n"
            "📍 地址：{location}\n\n"
            "术前提醒：\n"
            "• 当天不要化妆\n"
            "• 如有过敏史请提前告知\n"
            "• 请准时到达\n\n"
            f"如需改期请提前24小时联系我。{TECH}老师等你来✨"
        ),
        "en": (
            f"【{BRAND}】Booking Confirmed ✅\n\n"
            "Hi {{client}}, your appointment is confirmed:\n"
            "📅 Time: {{details}}\n"
            "📍 Location: {location}\n\n"
            "Pre-treatment notes:\n"
            "• No makeup on the day\n"
            "• Inform us of any allergies\n"
            "• Please arrive on time\n\n"
            "Need to reschedule? Let me know 24h in advance. See you! ✨"
        ),
        "nl": (
            f"【{BRAND}】Afspraak Bevestigd ✅\n\n"
            "Hoi {{client}}, je afspraak staat vast:\n"
            "📅 Tijd: {{details}}\n"
            "📍 Locatie: {location}\n\n"
            "Voor de behandeling:\n"
            "• Geen make-up op de dag zelf\n"
            "• Meld eventuele allergieën\n"
            "• Kom op tijd\n\n"
            "Wil je verzetten? Laat het 24u van tevoren weten. Tot dan! ✨"
        ),
    },
    "post_treatment_check": {
        "zh": (
            "{{client}} 你好～今天做完{{service}}感觉怎么样？"
            "有没有按时冰敷？麻药退了以后疼不疼？\n\n"
            "有任何不舒服随时跟我说，我帮你问Andy老师。"
            "早点休息，明天起来你会发现不一样了💫"
        ),
        "en": (
            "Hi {{client}}! How are you feeling after your {{service}} today? "
            "Did you apply the ice pack? Any discomfort after the numbing wore off?\n\n"
            "Let me know if anything feels off — I'm here to help. "
            "Get some rest, you'll wake up glowing 💫"
        ),
        "nl": (
            "Hoi {{client}}! Hoe voel je je na de {{service}} vandaag? "
            "Heb je ijs gebruikt? Nog pijn na de verdoving?\n\n"
            "Laat het me weten als iets niet goed voelt — ik help je graag. "
            "Rust goed uit, morgen zie je het verschil 💫"
        ),
    },
    "day3_followup": {
        "zh": (
            "{{client}} 已经第3天啦～恢复得怎么样？方便发张照片给我看看吗？\n\n"
            "这个阶段可能会有点轻微的脱皮/结痂，都是正常的。"
            "记得这段时间忌口：海鲜、辛辣、酒精先别碰🍷❌\n\n"
            "继续用修复面膜，效果会更好～"
        ),
        "en": (
            "Hi {{client}}! Day 3 — how's the recovery going? "
            "Mind sending a quick photo so I can check?\n\n"
            "Some light peeling or scabbing at this stage is totally normal. "
            "Avoid seafood, spicy food, and alcohol for now 🍷❌\n\n"
            "Keep using the repair mask — it makes a difference!"
        ),
        "nl": (
            "Hoi {{client}}! Dag 3 — hoe gaat het herstel? "
            "Kun je een snelle foto sturen zodat ik kan meekijken?\n\n"
            "Lichte peeling of korstjes zijn normaal in deze fase. "
            "Vermijd vis, pittig eten en alcohol voor nu 🍷❌\n\n"
            "Blijf het herstelmasker gebruiken — het helpt echt!"
        ),
    },
    "day7_followup": {
        "zh": (
            "{{client}} 一周了！效果应该已经出来了～你觉得怎么样？😊\n\n"
            "如果效果好，方便的话帮我拍张自然光下的照片，"
            "我存档用（不会公开，只是记录你的变化轨迹）📸\n\n"
            "另外～你身边有没有小姐妹也想做的？推荐过来我送你一次免费补水💧"
        ),
        "en": (
            "Hi {{client}}! One week already — the results should be showing now. How do you like it? 😊\n\n"
            "If you're happy with it, would you mind sending a photo in natural light? "
            "Just for my records — I won't share without your permission 📸\n\n"
            "Also — got any friends looking for the same treatment? "
            "Refer a friend and you both get a free hydrating session 💧"
        ),
        "nl": (
            "Hoi {{client}}! Al een week — de resultaten zouden nu zichtbaar moeten zijn. Tevreden? 😊\n\n"
            "Als je blij bent, wil je dan een foto sturen in natuurlijk licht? "
            "Alleen voor mijn administratie — ik deel niets zonder toestemming 📸\n\n"
            "Ken je iemand die ook zoiets wil? "
            "Breng een vriendin mee en jullie krijgen allebei een gratis hydraterende sessie 💧"
        ),
    },
    "day30_followup": {
        "zh": (
            "{{client}} 已经一个月了！效果还满意吗？\n\n"
            "根据你的方案，下个月该补{{next_service}}了。"
            "要不要我先把时间锁上？现在预约下周还有个优惠时段～\n\n"
            "你现在的皮肤状态应该比之前好很多了，继续保持💪✨"
        ),
        "en": (
            "Hi {{client}}! It's been a month — still loving the results?\n\n"
            "Based on your plan, it's about time for your next {{next_service}}. "
            "Want me to lock in a slot? I still have a few good times next week.\n\n"
            "Your skin should be looking so much better now — let's keep it going 💪✨"
        ),
        "nl": (
            "Hoi {{client}}! Een maand geleden al — nog steeds blij met het resultaat?\n\n"
            "Volgens je plan is het tijd voor je volgende {{next_service}}. "
            "Zal ik een tijdslot voor je vastzetten? Ik heb nog een paar goede tijden volgende week.\n\n"
            "Je huid zou er nu zoveel beter uit moeten zien — laten we het zo houden 💪✨"
        ),
    },
    "price_inquiry": {
        "zh": (
            "你好～感谢关注{BRAND}！\n\n"
            "我们是预约制私人工作室，{TECH}老师（南方医科大学，深圳10年经验）亲自操作。\n\n"
            "具体价格取决于你想改善什么～告诉我你感兴趣的项目，我帮你推荐：\n"
            "• 皮肤管理（深层清洁/美白焕肤）$50-70\n"
            "• 半永久纹绣（雾眉/线条眉/果冻唇）$180-250\n"
            "• 水光针/微整形 $150起\n"
            "• 光电（皮秒/脱毛/IPL）$80-180\n\n"
            "第一次来可以先做体验卡（$30），感受一下环境和手法再决定✨"
        ),
        "en": (
            "Hi! Thanks for reaching out to {BRAND}! 👋\n\n"
            "We're a private appointment-only studio. {TECH} is our specialist — "
            "10 years experience in Shenzhen, China.\n\n"
            "Prices depend on what you'd like to improve. Tell me what you're interested in:\n"
            "• Skin Management (Cleansing / Whitening) $50-70\n"
            "• PMU (Powder Brows / Microblading / Lip Blush) $180-250\n"
            "• Skin Booster / Injectables from $150\n"
            "• Light Therapy (Pico / Hair Removal / IPL) $80-180\n\n"
            "First time? Try our trial card at $30 — see the space and meet the specialist ✨"
        ),
        "nl": (
            "Hoi! Bedankt voor je interesse in {BRAND}! 👋\n\n"
            "Wij zijn een privéstudio op afspraak. {TECH} is onze specialist — "
            "10 jaar ervaring in Shenzhen, China.\n\n"
            "Prijzen hangen af van wat je wilt verbeteren. Waar ben je in geïnteresseerd?\n"
            "• Huidverzorging (Reiniging / Verheldering) $50-70\n"
            "• PMU (Poeder Wenkbrauwen / Microblading / Lip Blush) $180-250\n"
            "• Huidbooster / Injectables vanaf $150\n"
            "• Licht Therapie (Pico / Ontharing / IPL) $80-180\n\n"
            "Eerste keer? Probeer onze proefkaart voor $30 — bekijk de ruimte en ontmoet de specialist ✨"
        ),
    },
    "pre_treatment_reminder": {
        "zh": (
            "{{client}} 明天见！⏰ {{details}}\n\n"
            "术前提醒：\n"
            "• 不要化妆，清洁脸部\n"
            "• 如有感冒/发烧/过敏请提前告诉我\n"
            "• 地址：{location}\n\n"
            "到了发消息给我，我出来接你～"
        ),
        "en": (
            "{{client}} — see you tomorrow! ⏰ {{details}}\n\n"
            "Quick reminders:\n"
            "• No makeup, come with a clean face\n"
            "• Let me know if you have a cold/fever/allergies\n"
            "• Address: {location}\n\n"
            "Message me when you arrive — I'll come get you!"
        ),
        "nl": (
            "{{client}} — tot morgen! ⏰ {{details}}\n\n"
            "Herinnering:\n"
            "• Geen make-up, kom met een schoon gezicht\n"
            "• Laat het weten bij verkoudheid/koorts/allergie\n"
            "• Adres: {location}\n\n"
            "Stuur een berichtje als je er bent — ik haal je op!"
        ),
    },
}

TEMPLATES["booking_confirmation"]["zh"] = TEMPLATES["booking_confirmation"]["zh"].format(
    location=LOCATION, TECH=TECH
)
TEMPLATES["booking_confirmation"]["en"] = TEMPLATES["booking_confirmation"]["en"].format(
    location=LOCATION
)
TEMPLATES["booking_confirmation"]["nl"] = TEMPLATES["booking_confirmation"]["nl"].format(
    location=LOCATION
)

for k in ("price_inquiry", "pre_treatment_reminder"):
    for lang in ("zh", "en", "nl"):
        TEMPLATES[k][lang] = TEMPLATES[k][lang].format(
            location=LOCATION, TECH=TECH, BRAND=BRAND
        )


def render(key: str, lang: str, client: str, service: str, details: str = "", extra: str = "") -> str:
    if key not in TEMPLATES:
        raise KeyError(f"Unknown template: {key}")
    if lang not in TEMPLATES[key]:
        raise KeyError(f"Language '{lang}' not available for '{key}'")
    msg = TEMPLATES[key][lang]
    msg = msg.replace("{client}", client).replace("{{client}}", client)
    msg = msg.replace("{service}", service).replace("{{service}}", service)
    msg = msg.replace("{details}", details).replace("{{details}}", details)
    msg = msg.replace("{next_service}", extra or service).replace("{{next_service}}", extra or service)
    return msg


def list_templates() -> None:
    print(f"\n  {'场景':<28} {'key':<28} {'语言'}")
    print(f"  {'='*68}")
    categories = {
        "预约": ["booking_confirmation", "pre_treatment_reminder"],
        "回访": ["post_treatment_check", "day3_followup", "day7_followup", "day30_followup"],
        "咨询": ["price_inquiry"],
    }
    for cat, keys in categories.items():
        print(f"\n  [{cat}]")
        for key in keys:
            langs = ", ".join(TEMPLATES[key].keys())
            print(f"    {key:<26} {langs}")


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("用法:")
        print("  python mizhi_whatsapp_templates.py                       # 列出所有模板")
        print('  python mizhi_whatsapp_templates.py booking_confirmation zh "Lisa" "水光针" "周三 14:30"')
        print('  python mizhi_whatsapp_templates.py day7_followup en "Lisa" "Microblading"')
        return

    if sys.argv[1] == "--cat":
        list_templates()
        return

    key = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) > 2 else "zh"
    client = sys.argv[3] if len(sys.argv) > 3 else "CLIENT"
    service = sys.argv[4] if len(sys.argv) > 4 else "SERVICE"
    details = sys.argv[5] if len(sys.argv) > 5 else ""
    extra = sys.argv[6] if len(sys.argv) > 6 else ""

    try:
        msg = render(key, lang, client, service, details, extra)
        print(f"\n{'='*60}")
        print(f"  模板: {key} | 语言: {lang}")
        print(f"{'='*60}\n")
        print(msg)
        print(f"\n{'='*60}")
    except KeyError as e:
        log.error(str(e))
        list_templates()
        sys.exit(1)


if __name__ == "__main__":
    main()
