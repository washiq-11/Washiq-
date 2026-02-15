const fs = require("fs-extra");

const lastPlay = new Map();

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

// Weighted reels => house edge
const SYMBOLS = [
  { s: "🍒", w: 30 },
  { s: "🍋", w: 26 },
  { s: "🍇", w: 20 },
  { s: "🔔", w: 12 },
  { s: "⭐", w: 8 },
  { s: "💎", w: 3 },
  { s: "7️⃣", w: 1 } // rare
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

function calcPayout(a, b, c, bet) {
  // jackpot override (very rare)
  if (a === "7️⃣" && b === "7️⃣" && c === "7️⃣") {
    return { win: true, multi: 50, title: "🎰 MEGA JACKPOT 50x!" };
  }
  if (a === "💎" && b === "💎" && c === "💎") {
    return { win: true, multi: 20, title: "💎 DIAMOND JACKPOT 20x!" };
  }
  if (a === "⭐" && b === "⭐" && c === "⭐") {
    return { win: true, multi: 10, title: "⭐ STAR WIN 10x!" };
  }
  if (a === "🔔" && b === "🔔" && c === "🔔") {
    return { win: true, multi: 6, title: "🔔 BELL WIN 6x!" };
  }
  if (a === "🍇" && b === "🍇" && c === "🍇") {
    return { win: true, multi: 4, title: "🍇 GRAPE WIN 4x!" };
  }
  if (a === "🍋" && b === "🍋" && c === "🍋") {
    return { win: true, multi: 3, title: "🍋 LEMON WIN 3x!" };
  }
  if (a === "🍒" && b === "🍒" && c === "🍒") {
    return { win: true, multi: 2, title: "🍒 CHERRY WIN 2x!" };
  }

  // any 2 match (small win)
  if (a === b || b === c || a === c) {
    return { win: true, multi: 1.2, title: "✨ SMALL WIN 1.2x!" };
  }

  return { win: false, multi: 0, title: "❌ LOST" };
}

module.exports = {
  config: {
    name: "slot",
    aliases: ["slots", "sl"],
    version: "1.0.0",
    author: "Washiq",
    countDown: 5,
    role: 0,
    description: "Slot machine game (usersData money)",
    category: "game",
    guide: "{pn} 1k\n{pn} 500\n{pn} 2m"
  },

  onStart: async function ({ message, event, args, usersData }) {
    const uid = event.senderID;

    // cooldown
    const now = Date.now();
    const last = lastPlay.get(uid) || 0;
    if (now - last < 5000) {
      const wait = Math.ceil((5000 - (now - last)) / 1000);
      return message.reply(`⏳ Slow down! Try again in ${wait}s.`);
    }
    lastPlay.set(uid, now);

    // bet
    const betAmount = args[0] ? parseAmount(args[0]) : 100;
    if (!betAmount || betAmount <= 0) return message.reply("Invalid bet amount!");

    let money = await usersData.get(uid, "money");
    if (typeof money !== "number") money = 0;

    if (betAmount > money) {
      return message.reply(`Insufficient balance!\nYour Balance: ${formatMoney(money)}`);
    }

    // spin
    const a = pickSymbol();
    const b = pickSymbol();
    const c = pickSymbol();

    const payout = calcPayout(a, b, c, betAmount);

    let pnl = -betAmount; // default lose bet
    if (payout.win) {
      const winAmount = Math.floor(betAmount * payout.multi);
      pnl = winAmount; // profit added (doesn't subtract bet separately)
    }

    const newBalance = Math.max(0, money + pnl);
    await usersData.set(uid, { money: newBalance });

    // message
    const lines =
      `🎰 SLOT MACHINE\n` +
      `──────────────\n` +
      `| ${a} | ${b} | ${c} |\n` +
      `──────────────\n` +
      `Bet: ${formatMoney(betAmount)}\n` +
      `${payout.win ? payout.title : "❌ You lost!"}\n` +
      `Change: ${pnl >= 0 ? "+" : "-"}${formatMoney(Math.abs(pnl))}\n` +
      `Balance: ${formatMoney(newBalance)}`;

    return message.reply(lines);
  }
};
