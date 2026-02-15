 const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");

const cacheDir = path.join(__dirname, "cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

const lastPlay = new Map();

// ================== Money Utils ==================
function parseAmount(str) {
  if (!str) return NaN;
  str = String(str).toLowerCase().replace(/\s+/g, "");
  const m = str.match(/^([\d.]+)([kmbt]?)$/);
  if (!m) return NaN;
  let num = parseFloat(m[1]);
  if (Number.isNaN(num)) return NaN;
  const u = m[2];
  if (u === "k") num *= 1e3;
  if (u === "m") num *= 1e6;
  if (u === "b") num *= 1e9;
  if (u === "t") num *= 1e12;
  return Math.floor(num);
}

function formatMoney(n) {
  const x = Number(n) || 0;
  if (x >= 1e12) return (x / 1e12).toFixed(2).replace(/\.00$/, "") + "T$";
  if (x >= 1e9) return (x / 1e9).toFixed(2).replace(/\.00$/, "") + "B$";
  if (x >= 1e6) return (x / 1e6).toFixed(2).replace(/\.00$/, "") + "M$";
  if (x >= 1e3) return (x / 1e3).toFixed(2).replace(/\.00$/, "") + "k$";
  return x.toLocaleString() + "$";
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  r = clamp(r, 0, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function addParticles(ctx, width, height, rgb = "255,255,255") {
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const s = Math.random() * 1.8 + 0.2;
    const o = Math.random() * 0.25 + 0.05;
    ctx.fillStyle = `rgba(${rgb},${o})`;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ================== Profile (Avatar) ==================
async function getProfilePicture(uid) {
  try {
    // FB Graph avatar (same as your other cmds)
    const url = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
    return await loadImage(Buffer.from(res.data));
  } catch (e) {
    return null;
  }
}

function drawDefaultAvatar(ctx, x, y, size, name = "User") {
  // green gradient circle + initials
  const g = ctx.createRadialGradient(x + size / 2, y + size / 2, 0, x + size / 2, y + size / 2, size / 2);
  g.addColorStop(0, "#22c55e");
  g.addColorStop(1, "#16a34a");
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  const initials = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || "")
    .join("");

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `bold ${Math.floor(size * 0.36)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials || "U", x + size / 2, y + size / 2 + 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// ================== Twemoji (Fix emoji boxes) ==================
const emojiCache = new Map();

function toCodePoint(unicodeSurrogates) {
  const points = [];
  let i = 0;
  while (i < unicodeSurrogates.length) {
    const c = unicodeSurrogates.charCodeAt(i++);
    // skip variation selector-16
    if (c === 0xfe0f) continue;

    if (c >= 0xd800 && c <= 0xdbff && i < unicodeSurrogates.length) {
      const d = unicodeSurrogates.charCodeAt(i);
      if (d >= 0xdc00 && d <= 0xdfff) {
        i++;
        const codePoint = ((c - 0xd800) * 0x400) + (d - 0xdc00) + 0x10000;
        points.push(codePoint.toString(16));
        continue;
      }
    }
    points.push(c.toString(16));
  }
  return points.join("-");
}

async function loadEmojiImage(emoji) {
  if (emojiCache.has(emoji)) return emojiCache.get(emoji);

  // Twemoji CDN
  const code = toCodePoint(emoji);
  const url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${code}.png`;

  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
    const img = await loadImage(Buffer.from(res.data));
    emojiCache.set(emoji, img);
    return img;
  } catch (e) {
    emojiCache.set(emoji, null);
    return null;
  }
}

// ================== Slot Logic (weighted) ==================
const SYMBOLS = [
  { s: "🍒", w: 30 },
  { s: "🍋", w: 26 },
  { s: "🍇", w: 20 },
  { s: "🔔", w: 12 },
  { s: "⭐", w: 8 },
  { s: "💎", w: 3 },
  { s: "7️⃣", w: 1 }
];

function pickSymbol() {
  const total = SYMBOLS.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * total;
  for (const it of SYMBOLS) {
    r -= it.w;
    if (r <= 0) return it.s;
  }
  return "🍒";
}

function calcPayout(a, b, c) {
  if (a === "7️⃣" && b === "7️⃣" && c === "7️⃣") return { win: true, multi: 50, title: "MEGA JACKPOT", tag: "50x" };
  if (a === "💎" && b === "💎" && c === "💎") return { win: true, multi: 20, title: "DIAMOND JACKPOT", tag: "20x" };
  if (a === "⭐" && b === "⭐" && c === "⭐") return { win: true, multi: 10, title: "STAR WIN", tag: "10x" };
  if (a === "🔔" && b === "🔔" && c === "🔔") return { win: true, multi: 6, title: "BELL WIN", tag: "6x" };
  if (a === "🍇" && b === "🍇" && c === "🍇") return { win: true, multi: 4, title: "GRAPE WIN", tag: "4x" };
  if (a === "🍋" && b === "🍋" && c === "🍋") return { win: true, multi: 3, title: "LEMON WIN", tag: "3x" };
  if (a === "🍒" && b === "🍒" && c === "🍒") return { win: true, multi: 2, title: "CHERRY WIN", tag: "2x" };

  if (a === b || b === c || a === c) return { win: true, multi: 1.2, title: "SMALL WIN", tag: "1.2x" };
  return { win: false, multi: 0, title: "LOSS", tag: "0x" };
}

// ================== Canvas Card ==================
async function drawSlotCard({ userName, userID, avatarImg, a, b, c, bet, payout, balance, result }) {
  const width = 980;
  const height = 520;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // BG gradient
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#070a12");
  bg.addColorStop(0.45, "#0b1b14");
  bg.addColorStop(1, "#070a12");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // particles
  addParticles(ctx, width, height);

  // left glow
  const glow = ctx.createLinearGradient(0, 0, width, 0);
  glow.addColorStop(0, result.win ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 420, height);

  // outer frame
  drawRoundedRect(ctx, 18, 18, width - 36, height - 36, 26);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawRoundedRect(ctx, 28, 28, width - 56, height - 56, 22);
  ctx.strokeStyle = result.win ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  ctx.shadowColor = result.win ? "rgba(34,197,94,0.55)" : "rgba(239,68,68,0.55)";
  ctx.shadowBlur = 14;
  ctx.fillText("RAHA SLOT", 56, 82);
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "14px sans-serif";
  ctx.fillText("Casino Spin • 3 Reels", 58, 110);

  // Profile circle (top-left block)
  const pSize = 72;
  const pX = 56;
  const pY = 122;

  // halo
  ctx.beginPath();
  ctx.arc(pX + pSize / 2, pY + pSize / 2, pSize / 2 + 6, 0, Math.PI * 2);
  ctx.fillStyle = result.win ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.12)";
  ctx.fill();

  // draw avatar
  if (avatarImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pX + pSize / 2, pY + pSize / 2, pSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, pX, pY, pSize, pSize);
    ctx.restore();
  } else {
    drawDefaultAvatar(ctx, pX, pY, pSize, userName);
  }

  ctx.beginPath();
  ctx.arc(pX + pSize / 2, pY + pSize / 2, pSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = result.win ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.45)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Left info panel
  drawRoundedRect(ctx, 52, 210, 360, 180, 18);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  ctx.fillStyle = "rgba(187,247,208,0.75)";
  ctx.font = "12px sans-serif";
  ctx.fillText("PLAYER", 74, 246);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(String(userName || "User").slice(0, 18), 74, 276);

  ctx.fillStyle = "rgba(187,247,208,0.75)";
  ctx.font = "12px sans-serif";
  ctx.fillText("BET", 74, 318);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(formatMoney(bet), 74, 348);

  // Result badge
  const badgeW = 140, badgeH = 46;
  drawRoundedRect(ctx, 260, 308, badgeW, badgeH, 14);
  ctx.fillStyle = result.win ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)";
  ctx.fill();
  ctx.strokeStyle = result.win ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)";
  ctx.stroke();

  ctx.fillStyle = result.win ? "#22c55e" : "#ef4444";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(result.win ? "WIN ✅" : "LOSS ❌", 286, 338);

  // Reels area
  const reelsX = 460, reelsY = 135, reelsW = 470, reelsH = 280;
  drawRoundedRect(ctx, reelsX, reelsY, reelsW, reelsH, 22);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  // Reel boxes
  const symbols = [a, b, c];
  const boxW = 135, boxH = 160;
  const gap = 26;
  const startX = reelsX + (reelsW - (boxW * 3 + gap * 2)) / 2;
  const boxY = reelsY + 55;

  // pre-load twemoji images (fix emoji boxes)
  const imgs = await Promise.all(symbols.map(s => loadEmojiImage(s)));

  for (let i = 0; i < 3; i++) {
    const x = startX + i * (boxW + gap);

    // glow behind
    ctx.save();
    drawRoundedRect(ctx, x - 6, boxY - 6, boxW + 12, boxH + 12, 20);
    ctx.fillStyle = result.win ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.07)";
    ctx.fill();
    ctx.restore();

    // main box
    drawRoundedRect(ctx, x, boxY, boxW, boxH, 18);
    const g = ctx.createLinearGradient(x, boxY, x, boxY + boxH);
    g.addColorStop(0, "rgba(255,255,255,0.08)");
    g.addColorStop(1, "rgba(255,255,255,0.03)");
    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = result.win ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.28)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // draw emoji image
    const img = imgs[i];
    if (img) {
      const size = 92;
      const ix = x + (boxW - size) / 2;
      const iy = boxY + (boxH - size) / 2;
      ctx.drawImage(img, ix, iy, size, size);
    } else {
      // fallback text (rare if CDN fails)
      ctx.font = "bold 64px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(symbols[i], x + boxW / 2, boxY + boxH / 2 + 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
  }

  // Result title
  ctx.fillStyle = result.win ? "rgba(34,197,94,0.85)" : "rgba(239,68,68,0.85)";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(result.title, reelsX + 26, reelsY + reelsH - 22);

  // Bottom strip
  drawRoundedRect(ctx, 52, 420, 878, 70, 18);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  const sign = payout >= 0 ? "+" : "-";
  ctx.fillStyle = "#fff";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Change: ${sign}${formatMoney(Math.abs(payout))}`, 74, 462);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Balance: ${formatMoney(balance)}`, 74, 492);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "12px sans-serif";
  ctx.fillText("Tip: slot 1k / slot 2m", 760, 492);

  return canvas.toBuffer("image/png");
}

// ================== Command ==================
module.exports = {
  config: {
    name: "slot",
    aliases: [], // ✅ sl/slots বন্ধ
    version: "3.0.0",
    author: "Washiq",
    countDown: 5,
    role: 0,
    description: "Slot machine with avatar + twemoji canvas",
    category: "game",
    guide: "{pn} 1k\n{pn} 500\n{pn} 2m"
  },

  onStart: async function ({ message, event, args, usersData }) {
    const uid = event.senderID;

    // cooldown (5s)
    const now = Date.now();
    const last = lastPlay.get(uid) || 0;
    if (now - last < 5000) {
      const wait = Math.ceil((5000 - (now - last)) / 1000);
      return message.reply(`⏳ Slow down! Try again in ${wait}s.`);
    }
    lastPlay.set(uid, now);

    // require amount
    if (!args[0]) {
      return message.reply("🎰 Please enter amount!\nExamples:\nslot 100\nslot 1k\nslot 2m");
    }

    const bet = parseAmount(args[0]);
    if (!bet || bet <= 0) return message.reply("Invalid bet amount!");

    let money = await usersData.get(uid, "money");
    if (typeof money !== "number") money = 0;

    if (bet > money) {
      return message.reply(`Insufficient balance!\nYour Balance: ${formatMoney(money)}`);
    }

    // spin
    const a = pickSymbol();
    const b = pickSymbol();
    const c = pickSymbol();

    const result = calcPayout(a, b, c);

    // pnl: lose => -bet, win => +(bet*multi)
    let payout = -bet;
    if (result.win) payout = Math.floor(bet * result.multi);

    const newBalance = Math.max(0, money + payout);
    await usersData.set(uid, { money: newBalance });

    // user info
    const userData = await usersData.get(uid);
    const userName = userData?.name || "User";

    // avatar
    const avatarImg = await getProfilePicture(uid);

    // draw
    let buffer;
    try {
      buffer = await drawSlotCard({
        userName,
        userID: uid,
        avatarImg,
        a, b, c,
        bet,
        payout,
        balance: newBalance,
        result
      });

      // safety check
      if (!buffer || buffer.length < 1000) throw new Error("Canvas buffer empty");
    } catch (e) {
      console.error("❌ Slot Canvas Error:", e.message);
      // fallback text
      return message.reply(
        `🎰 SLOT\n| ${a} | ${b} | ${c} |\n` +
        `Bet: ${formatMoney(bet)}\n` +
        `${result.win ? "WIN ✅" : "LOSS ❌"} (${result.tag})\n` +
        `Change: ${(payout >= 0 ? "+" : "-")}${formatMoney(Math.abs(payout))}\n` +
        `Balance: ${formatMoney(newBalance)}`
      );
    }

    const filePath = path.join(cacheDir, `slot_${uid}_${Date.now()}.png`);
    await fs.writeFile(filePath, buffer);

    await message.reply({
      attachment: fs.createReadStream(filePath)
    });

    setTimeout(() => fs.unlink(filePath).catch(() => {}), 10000);
  }
};
