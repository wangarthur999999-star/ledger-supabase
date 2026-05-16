/**
 * mizhi WhatsApp Bot
 * ==================
 * 个人号 WhatsApp 自动回复 + 客户信息提取 + Google Sheets 联动
 *
 * 用法:
 *   node scripts/mizhi_bot.js
 *
 * 首次运行扫描 QR 码，后续自动登录。
 */

const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { execSync, spawn } = require("child_process");
const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");

// ── Config ────────────────────────────────────────────────────────

const SCRIPTS_DIR = __dirname;
const AUTH_DIR = path.join(SCRIPTS_DIR, "..", "output", "mizhi_bot_auth");
const CONV_STATE_FILE = path.join(SCRIPTS_DIR, "..", "output", "mizhi_bot_state.json");
const CONFIG_FILE = path.join(SCRIPTS_DIR, "mizhi_config.json");
const PYTHON = "C:\\Users\\wanga\\AppData\\Local\\Programs\\Python\\Python312\\python.exe";

const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
const BRAND = config.brand.name;
const OP = config.operator.name;

// ── Conversation State ────────────────────────────────────────────

// state[chatId] = { step, data: { name, service, date, time, lang } }
let state = {};
if (fs.existsSync(CONV_STATE_FILE)) {
  state = JSON.parse(fs.readFileSync(CONV_STATE_FILE, "utf-8"));
}

function saveState() {
  fs.writeFileSync(CONV_STATE_FILE, JSON.stringify(state, null, 2));
}

function clearChat(chatId) {
  delete state[chatId];
  saveState();
}

// ── Intent Keywords ───────────────────────────────────────────────

const INTENTS = {
  BOOKING: "booking",
  PRICE: "price",
  FOLLOWUP: "followup",
  GREETING: "greeting",
  HELP: "help",
};

function detectIntent(text) {
  const t = text.toLowerCase();

  // Booking intent
  if (/预约|预约|book|afspraak|appointment|约|reserveer|boeken/.test(t)) return INTENTS.BOOKING;
  if (/我想做|我要约|想约/.test(t)) return INTENTS.BOOKING;

  // Price intent
  if (/价格|多少钱|价格|price|prijs|how much|kosten|价目|价钱/.test(t)) return INTENTS.PRICE;

  // Post-treatment followup
  if (/术后|做完|刚做完|做完后|after treatment|na behandeling|感觉|恢复/.test(t)) return INTENTS.FOLLOWUP;

  // Greeting
  if (/^(hi|hello|你好|嗨|哈喽|hoi|hallo)\b/.test(t)) return INTENTS.GREETING;

  // Help
  if (/帮助|help|菜单|menu|info/.test(t)) return INTENTS.HELP;

  return null;
}

// ── Language Detection ────────────────────────────────────────────

function detectLang(text) {
  if (/[一-鿿]/.test(text)) return "zh";
  if (/afspraak|behandeling|boek|prijs|kosten|hoi|hallo|niet|wel|voor/.test(text.toLowerCase())) return "nl";
  return "en";
}

// ── Quick Replies ─────────────────────────────────────────────────

const QUICK_REPLIES = {
  greeting: {
    zh: `你好～感谢联系 ${BRAND}！👋\n\n我是${OP}，有什么可以帮你的？\n\n📅 预约项目\n💰 了解价格\n📋 查看服务\n\n直接告诉我就行～`,
    en: `Hi! Thanks for reaching out to ${BRAND}! 👋\n\nI'm ${OP}, how can I help?\n\n📅 Book an appointment\n💰 Check prices\n📋 View services\n\nJust let me know!`,
    nl: `Hoi! Bedankt voor je bericht aan ${BRAND}! 👋\n\nIk ben ${OP}, waarmee kan ik helpen?\n\n📅 Afspraak maken\n💰 Prijzen bekijken\n📋 Services bekijken\n\nLaat het me weten!`,
  },
  booking_start: {
    zh: "好的，我来帮你预约～\n\n请告诉我以下信息：\n1️⃣ 你想做什么项目？\n（深层清洁/纹绣/水光针/皮秒...）\n\n直接回复项目名称就行👇",
    en: "Great, let's book your appointment!\n\nFirst, which treatment are you interested in?\n(Deep Cleansing / Microblading / Skin Booster / Pico...)\n\nJust reply with the treatment name 👇",
    nl: "Top, laten we een afspraak maken!\n\nWelke behandeling wil je?\n(Reiniging / Wenkbrauwen / Huidbooster / Pico...)\n\nStuur de naam van de behandeling 👇",
  },
  booking_date: {
    zh: "好的～你想约哪天？\n\n我们营业时间：周二至周六\n时段：09:00 / 10:30 / 13:00 / 14:30 / 16:00\n\n请回复日期和时间，比如：5月20日 14:30 👇",
    en: "Which date would you like?\n\nHours: Tue-Sat\nSlots: 09:00 / 10:30 / 13:00 / 14:30 / 16:00\n\nReply with date & time, e.g.: May 20 14:30 👇",
    nl: "Welke datum?\n\nOpening: Di-Za\nTijden: 09:00 / 10:30 / 13:00 / 14:30 / 16:00\n\nStuur datum & tijd, bijv.: 20 mei 14:30 👇",
  },
  booking_confirm: {
    zh: "确认一下：\n📅 {{date}} {{time}}\n💆 {{service}}\n👤 {{name}}\n\n都对吗？回复「确认」我帮你锁定 ✅",
    en: "Let me confirm:\n📅 {{date}} {{time}}\n💆 {{service}}\n👤 {{name}}\n\nAll correct? Reply 'Confirm' to lock it in ✅",
    nl: "Even bevestigen:\n📅 {{date}} {{time}}\n💆 {{service}}\n👤 {{name}}\n\nKlopt dit? Stuur 'Bevestig' om vast te leggen ✅",
  },
  booking_done: {
    zh: "预约成功！✅\n\n{{name}}，你的{{service}}已锁定在{{date}} {{time}}。\n\n术前提醒：\n• 当天不要化妆\n• 如有过敏史请提前告知\n• 地址：Tourtonnellon 21, Paramaribo\n\n改期请提前24小时联系我。到时见！✨",
    en: "Booked! ✅\n\n{{name}}, your {{service}} is confirmed for {{date}} {{time}}.\n\nPre-treatment:\n• No makeup on the day\n• Inform us of any allergies\n• Address: Tourtonnellon 21, Paramaribo\n\nNeed to reschedule? 24h notice please. See you! ✨",
    nl: "Geboekt! ✅\n\n{{name}}, je {{service}} staat vast op {{date}} {{time}}.\n\nVoor de behandeling:\n• Geen make-up\n• Meld allergieën\n• Adres: Tourtonnellon 21, Paramaribo\n\nWil je verzetten? 24u van tevoren. Tot dan! ✨",
  },
  price_reply: {
    zh: "我们的价目参考：\n\n🧖 皮肤管理：$50-70\n💉 水光针/微整形：$150起\n✒️ 半永久纹绣：$180-250\n💡 光电：$80-180\n🎁 新客体验卡：$30\n\n具体价格看你想改善什么～告诉我你感兴趣的项目，我帮你推荐 ✨",
    en: "Our prices:\n\n🧖 Skin Management: $50-70\n💉 Injectables: from $150\n✒️ PMU: $180-250\n💡 Light Therapy: $80-180\n🎁 Trial Card: $30\n\nPrices vary by treatment. Tell me what you're interested in! ✨",
    nl: "Onze prijzen:\n\n🧖 Huidverzorging: $50-70\n💉 Injectables: vanaf $150\n✒️ PMU: $180-250\n💡 Licht Therapie: $80-180\n🎁 Proefkaart: $30\n\nPrijzen variëren. Waar ben je in geïnteresseerd? ✨",
  },
  followup_reply: {
    zh: "收到～方便说一下具体感觉怎么样吗？有没有按时冰敷？发张照片给我看看恢复情况也可以 📸\n\nAndy老师说术后护理很重要，有任何不舒服都要及时跟我说～",
    en: "Got it! How are you feeling specifically? Did you apply ice? Feel free to send a photo so I can check 📸\n\nPost-treatment care is really important — let me know if anything feels off.",
    nl: "Begrepen! Hoe voel je je precies? Heb je ijs gebruikt? Stuur gerust een foto 📸\n\nNazorg is heel belangrijk — laat het weten als er iets niet goed voelt.",
  },
};

// ── Service Matching ──────────────────────────────────────────────

function findService(text) {
  const services = config.services;
  const t = text.toLowerCase();

  // Direct ID match
  for (const s of services) {
    if (s.id === t) return s;
  }

  // Name match (CN/EN/NL)
  for (const s of services) {
    if (
      s.name_cn.includes(text) || s.name_en.toLowerCase().includes(t) ||
      s.name_nl.toLowerCase().includes(t) ||
      t.includes(s.name_en.toLowerCase())
    ) return s;
  }

  // Keyword fuzzy match
  const kwMap = {
    "清洁": "deep_cleanse", "deep": "deep_cleanse", "reiniging": "deep_cleanse",
    "镇静": "calming", "calm": "calming",
    "美白": "whitening", "white": "whitening", "bleken": "whitening",
    "焕肤": "whitening",
    "雾眉": "powder_brows", "powder": "powder_brows", "poeder": "powder_brows",
    "线条眉": "microblading", "microblading": "microblading",
    "丝雾": "combo_brows", "combo": "combo_brows", "combinatie": "combo_brows",
    "果冻唇": "lip_blush", "唇": "lip_blush", "lip": "lip_blush",
    "水光": "skin_booster", "booster": "skin_booster", "huidbooster": "skin_booster",
    "抗皱": "anti_wrinkle", "皱纹": "anti_wrinkle", "wrinkle": "anti_wrinkle", "rimpel": "anti_wrinkle",
    "玻尿酸": "filler", "填充": "filler", "filler": "filler",
    "线雕": "thread_lift", "thread": "thread_lift", "draadlift": "thread_lift",
    "溶脂": "fat_dissolve", "fat": "fat_dissolve", "vetoplossing": "fat_dissolve",
    "皮秒": "pico_laser", "pico": "pico_laser", "laser": "pico_laser",
    "脱毛": "hair_removal", "hair": "hair_removal", "ontharen": "hair_removal",
    "ipl": "ipl", "彩光": "ipl", "光子": "ipl",
    "洗眉": "tattoo_removal", "洗纹身": "tattoo_removal", "tattoo": "tattoo_removal", "verwijderen": "tattoo_removal",
    "体验": "trial_card", "trial": "trial_card", "proefkaart": "trial_card",
  };

  for (const [kw, id] of Object.entries(kwMap)) {
    if (t.includes(kw)) return services.find(s => s.id === id);
  }

  return null;
}

// ── Date/Time Parsing ─────────────────────────────────────────────

function parseDateTime(text, lang) {
  const months = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
  };
  const cnNums = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10 };

  let match;
  const timeRe = /(\d{1,2}):(\d{2})/;
  const timeMatch = text.match(timeRe);
  const time = timeMatch ? timeMatch[0] : "";

  // CN: 5月20日 or 5/20
  match = text.match(/(\d{1,2})月(\d{1,2})[日号]/);
  if (match) return { date: `2026-${String(match[1]).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}`, time };

  // EN/NL: May 20 or 20 May
  match = text.match(/(\d{1,2})\s*(?:May|June|July|Aug|Sept|Oct|Nov|Dec)/i);
  if (match) {
    const m = Object.entries(months).find(([k, v]) => v.toLowerCase() === text.match(/may|june|july|aug|sept|oct|nov|dec/i)?.[0]?.toLowerCase());
  }

  // ISO: 2026-05-20 or 2026/5/20
  match = text.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (match) return { date: `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`, time };

  // MM/DD or DD/MM
  match = text.match(/(\d{1,2})\/(\d{1,2})/);
  if (match) {
    return { date: `2026-${String(match[1]).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}`, time };
  }

  return { date: "", time };
}

// ── Register Client via Python ────────────────────────────────────

function registerClient(chatData) {
  const { name, service, date, time, lang } = chatData;
  const svc = findService(service) || { name_cn: service };
  const sid = findService(service)?.id || service;

  try {
    const cmd = [
      PYTHON,
      path.join(SCRIPTS_DIR, "mizhi_client.py"),
      "register", name, sid, date, time || "14:30",
      "--lang", lang,
      "--source", "your_new_client",
    ];
    execSync(cmd.join(" "), { encoding: "utf-8", timeout: 30000 });
    return true;
  } catch (e) {
    console.error("Register error:", e.message);
    return false;
  }
}

// ── Main Bot ──────────────────────────────────────────────────────

async function startBot() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: authState,
    printQRInTerminal: true,
    defaultQueryTimeoutMs: 60000,
  });

  // Show QR in terminal
  sock.ev.on("connection.update", ({ qr, connection, lastDisconnect }) => {
    if (qr) {
      console.log("\n📱 请用 WhatsApp 扫描 QR 码:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("\n✅ WhatsApp Bot 已连接!\n");
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;
      console.log(`⚠️ 连接断开: ${reason || lastDisconnect?.error}. 重连: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(startBot, 5000);
      } else {
        console.log("❌ 已登出，请删除 output/mizhi_bot_auth 重新运行。");
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // ── Message Handler ──────────────────────────────────────────

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;

      const chatId = msg.key.remoteJid;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      if (!text) continue;

      const senderName = msg.pushName || chatId.split("@")[0];
      const lang = detectLang(text);
      const intent = detectIntent(text);

      console.log(`[${senderName}] ${text.slice(0, 80)} (intent: ${intent || "none"}, lang: ${lang})`);

      // ── Conversation State Machine ──────────────────────────

      const conv = state[chatId];

      // Step: awaiting service selection
      if (conv?.step === "awaiting_service") {
        const svc = findService(text);
        if (svc) {
          conv.data.service = svc.name_cn;
          conv.data.serviceId = svc.id;
          conv.step = "awaiting_date";
          conv.lang = conv.lang || lang;
          await sock.sendMessage(chatId, { text: QUICK_REPLIES.booking_date[conv.lang] });
        } else {
          await sock.sendMessage(chatId, {
            text: `我没找到这个项目，能再描述一下吗？\n\n可选项目：\n深层清洁/美白焕肤/雾眉/野生眉/果冻唇\n水光针/抗皱针/玻尿酸/线雕/溶脂\n皮秒/脱毛/IPL/洗眉/体验卡\n\n回复项目名称 👇`,
          });
        }
        saveState();
        continue;
      }

      // Step: awaiting date/time
      if (conv?.step === "awaiting_date") {
        const { date, time } = parseDateTime(text, conv.lang);
        if (date) {
          conv.data.date = date;
          conv.data.time = time || "14:30";
          conv.step = "confirming";

          const confirmTpl = QUICK_REPLIES.booking_confirm[conv.lang]
            .replace("{{date}}", date)
            .replace("{{time}}", time || "14:30")
            .replace("{{service}}", conv.data.service)
            .replace("{{name}}", conv.data.name);

          await sock.sendMessage(chatId, { text: confirmTpl });
        } else {
          await sock.sendMessage(chatId, {
            text: conv.lang === "zh"
              ? "请告诉我具体日期和时间，比如：5月20日 14:30 👇"
              : "Please tell me the date and time, e.g.: May 20 14:30 👇",
          });
        }
        saveState();
        continue;
      }

      // Step: confirming
      if (conv?.step === "confirming") {
        const confirmWords = /^(确认|是的|对的|没错|confirm|yes|ja|ok|okay|bevestig|ja hoor)/i;
        const cancelWords = /^(取消|不了|不要|不对|cancel|nee|no|niet)/i;

        if (confirmWords.test(text)) {
          // Register!
          const success = registerClient(conv.data);
          if (success) {
            const doneTpl = QUICK_REPLIES.booking_done[conv.lang]
              .replace("{{date}}", conv.data.date || "")
              .replace("{{time}}", conv.data.time || "")
              .replace("{{service}}", conv.data.service || "")
              .replace("{{name}}", conv.data.name || senderName);

            await sock.sendMessage(chatId, { text: doneTpl });
          } else {
            await sock.sendMessage(chatId, { text: "预约系统出了点问题，请稍后再试或直接联系 Arthur 🙏" });
          }
          clearChat(chatId);
        } else if (cancelWords.test(text)) {
          await sock.sendMessage(chatId, {
            text: lang === "zh" ? "好的，已取消。需要再找我～" : "Ok, cancelled. Let me know if you need anything!",
          });
          clearChat(chatId);
        } else {
          await sock.sendMessage(chatId, {
            text: lang === "zh" ? "请回复「确认」锁定预约，或「取消」放弃。" : "Reply 'Confirm' to book or 'Cancel' to abort.",
          });
        }
        saveState();
        continue;
      }

      // ── Intent-based handlers (new conversations) ───────────

      if (intent === INTENTS.BOOKING) {
        state[chatId] = {
          step: "awaiting_service",
          lang,
          data: { name: senderName },
        };
        saveState();
        await sock.sendMessage(chatId, { text: QUICK_REPLIES.booking_start[lang] });
        continue;
      }

      if (intent === INTENTS.PRICE) {
        await sock.sendMessage(chatId, { text: QUICK_REPLIES.price_reply[lang] });
        continue;
      }

      if (intent === INTENTS.FOLLOWUP) {
        await sock.sendMessage(chatId, { text: QUICK_REPLIES.followup_reply[lang] });
        continue;
      }

      if (intent === INTENTS.GREETING || intent === INTENTS.HELP) {
        await sock.sendMessage(chatId, { text: QUICK_REPLIES.greeting[lang] });
        continue;
      }

      // Unknown intent — try to help
      if (text.length < 100) {
        await sock.sendMessage(chatId, { text: QUICK_REPLIES.greeting[lang] });
      }
    }
  });

  // ── Graceful shutdown ───────────────────────────────────────

  process.on("SIGINT", () => {
    console.log("\n👋 Bot shutting down...");
    saveState();
    process.exit(0);
  });
}

// ── Launch ────────────────────────────────────────────────────────

console.log("\n🤖 mizhi WhatsApp Bot starting...\n");
startBot().catch(console.error);
