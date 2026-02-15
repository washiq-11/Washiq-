const fs = require("fs-extra");
const path = require("path");
const { createCanvas } = require("canvas");

const cacheDir = path.join(__dirname, "cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

// one active trade per user
const pendingTrade = new Map();

// ---------- helpers ----------
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

// ✅ supports: 10s, 1m, 2h, 1m30s, 1h10m, 1h5m20s
function parseTime(str) {
  if (!str) return null;
  str = String(str).toLowerCase().replace(/\s+/g, "");

  const regex = /(\d+)(s|m|h)/g;
  let match;
  let totalSeconds = 0;

  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === "s") totalSeconds += value;
    if (unit === "m") totalSeconds += value * 60;
    if (unit === "h") totalSeconds += value * 3600;
  }

  return totalSeconds > 0 ? totalSeconds : null;
}

// 💰 time-based random profit percent + 3% jackpot
function getRandomProfitPercent(seconds) {
  let min = 5, max = 20;

  if (seconds <= 30) {
    min = 5; max = 20;
  } else if (seconds <= 120) {
    min = 10; max = 35;
  } else if (seconds <= 600) {
    min = 20; max = 60;
  } else if (seconds <= 1800) {
    min = 40; max = 90;
  } else {
    min = 60; max = 150;
  }

  // 🎰 3% jackpot: 200%–300%
  if (Math.random() < 0.03) {
    return Math.floor(Math.random() * 101) + 200;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickTrend() {
  const r = Math.random();
  if (r < 0.42) return "bull";
  if (r < 0.84) return "bear";
  return "side";
}

function generateCandles(count = 20) {
  const trend = pickTrend();
  const volatility = 0.6 + Math.random() * 1.6; // 0.6..2.2
  let price = 100 + Math.random() * 200;

  const drift =
    trend === "bull" ? (0.10 + Math.random() * 0.30) :
    trend === "bear" ? -(0.10 + Math.random() * 0.30) :
    (Math.random() * 0.08 - 0.04);

  const candles = [];
  for (let i = 0; i < count; i++) {
    const open = price;
    const noise = (Math.random() * 2 - 1) * volatility;
    const move = drift + noise;
    const close = open + move;

    const wickUp = Math.abs((Math.random() * 1.2) * volatility);
    const wickDown = Math.abs((Math.random() * 1.2) * volatility);

    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;

    candles.push({ open, high, low, close });
    price = close;
  }

  return { candles, trend, volatility };
}

function candleDirection(c) {
  return c.close >= c.open ? "up" : "down";
}

function buildResultCandleFromBase(baseClose, direction, volatility) {
  // move size scaled with volatility
  const mag = (0.8 + Math.random() * 2.2) * (0.7 + volatility * 0.35);
  const move = direction === "up" ? mag : -mag;

  const open = baseClose;
  const close = baseClose + move;
  const high = Math.max(open, close) + Math.random() * (1.0 + volatility);
  const low = Math.min(open, close) - Math.random() * (1.0 + volatility);

  return { open, high, low, close };
}

function drawCard({
  userName,
  betAmount,
  choice,
  seconds,
  profitPercent,
  trend,
  candles,
  resultCandle,
  win,
  pnl,
  newBalance
}) {
  const width = 950, height = 520;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // BG
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#070a12");
  bg.addColorStop(1, "#0b1b14");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = "rgba(34,197,94,0.22)";
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // Header
  ctx.fillStyle = "#fff";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("RAHA TRADE", 50, 70);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "14px sans-serif";
  ctx.fillText("Candle Prediction • simulated market", 52, 96);

  // Left panel
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(50, 125, 410, 320);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.strokeRect(50, 125, 410, 320);

  ctx.fillStyle = "rgba(187,247,208,0.8)";
  ctx.font = "12px sans-serif";
  ctx.fillText("TRADER", 70, 160);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(String(userName).slice(0, 22), 70, 188);

  ctx.fillStyle = "rgba(187,247,208,0.8)";
  ctx.font = "12px sans-serif";
  ctx.fillText("BET", 70, 235);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(formatMoney(betAmount), 70, 265);

  ctx.fillStyle = "rgba(187,247,208,0.8)";
  ctx.font = "12px sans-serif";
  ctx.fillText("YOUR PREDICTION", 70, 312);

  ctx.fillStyle = choice === "up" ? "#22c55e" : "#ef4444";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(choice.toUpperCase(), 70, 345);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "12px sans-serif";
  ctx.fillText(
    `Time: ${seconds}s • Trend: ${trend.toUpperCase()} • Profit (if win): +${profitPercent}%`,
    70, 395
  );

  // Chart area
  const chartX = 500, chartY = 120, chartW = 400, chartH = 325;
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(chartX, chartY, chartW, chartH);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.strokeRect(chartX, chartY, chartW, chartH);

  // Scale
  const all = candles.concat([resultCandle]);
  const minP = Math.min(...all.map(c => c.low));
  const maxP = Math.max(...all.map(c => c.high));
  const pad = (maxP - minP) * 0.08 || 1;
  const min = minP - pad;
  const max = maxP + pad;

  const yOf = (price) => {
    const t = (price - min) / (max - min);
    return chartY + chartH - t * chartH;
  };

  // Grid
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for (let i = 1; i < 6; i++) {
    const y = chartY + (chartH / 6) * i;
    ctx.beginPath();
    ctx.moveTo(chartX, y);
    ctx.lineTo(chartX + chartW, y);
    ctx.stroke();
  }

  // Draw candles
  const total = all.length;
  const slot = chartW / total;
  const bodyW = clamp(slot * 0.55, 10, 18);

  function drawOneCandle(c, i, isResult = false) {
    const dir = candleDirection(c);
    const color = dir === "up" ? "#22c55e" : "#ef4444";

    const cx = chartX + slot * i + slot / 2;
    const yHigh = yOf(c.high);
    const yLow = yOf(c.low);
    const yOpen = yOf(c.open);
    const yClose = yOf(c.close);

    // wick
    ctx.strokeStyle = isResult ? "rgba(255,255,255,0.85)" : color;
    ctx.lineWidth = isResult ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(cx, yHigh);
    ctx.lineTo(cx, yLow);
    ctx.stroke();

    // body
    const top = Math.min(yOpen, yClose);
    const bot = Math.max(yOpen, yClose);
    const h = Math.max(6, bot - top);

    ctx.fillStyle = color;
    ctx.fillRect(cx - bodyW / 2, top, bodyW, h);

    // highlight result candle
    if (isResult) {
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - bodyW / 2 - 8, chartY + 8, bodyW + 16, chartH - 16);
    }
  }

  candles.forEach((c, i) => drawOneCandle(c, i, false));
  drawOneCandle(resultCandle, candles.length, true);

  // Footer strip
  ctx.fillStyle = win ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
  ctx.fillRect(50, 455, 850, 45);
  ctx.strokeStyle = win ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)";
  ctx.strokeRect(50, 455, 850, 45);

  ctx.fillStyle = win ? "#22c55e" : "#ef4444";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(win ? "WIN" : "LOSS", 70, 485);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "16px sans-serif";
  const sign = pnl >= 0 ? "+" : "-";
  ctx.fillText(
    `Market: ${candleDirection(resultCandle).toUpperCase()} • PnL: ${sign}${formatMoney(Math.abs(pnl))} • Balance: ${formatMoney(newBalance)}`,
    150, 485
  );

  return canvas.toBuffer("image/png");
}

// ---------- command ----------
module.exports = {
  config: {
    name: "trade",
    aliases: ["trd", "candle"],
    version: "12.18",
    author: "𝙰𝙳𝙽𝙰𝙽",
    countDown: 5,
    role: 0,
    description: "Trading candle prediction with user-set time + random profit",
    category: "game",
    guide:
      "{pn} up 1k 10s\n" +
      "{pn} down 500k 2m\n" +
      "{pn} up 1m 1m30s\n" +
      "{pn} down 2k 1h5m20s"
  },

  onStart: async function ({ message, event, args, usersData }) {
    const uid = event.senderID;

    // input: trade <up/down> <amount> <time>
    const dirRaw = (args[0] || "").toLowerCase();
    const amountRaw = args[1];
    const timeRaw = args[2];

    const choice =
      ["up", "u", "buy", "long"].includes(dirRaw) ? "up" :
      ["down", "d", "sell", "short"].includes(dirRaw) ? "down" :
      null;

    if (!choice || !amountRaw || !timeRaw) {
      return message.reply(
        "Use:\n" +
        "trade up 1k 10s\n" +
        "trade down 500k 2m\n" +
        "trade up 1m 1m30s\n" +
        "trade down 2k 1h5m20s"
      );
    }

    if (pendingTrade.has(uid)) {
      return message.reply("⏳ You already have an active trade. Please wait for the result.");
    }

    const seconds = parseTime(timeRaw);
    if (!seconds || seconds < 5 || seconds > 7200) {
      return message.reply("⏱ Time must be between 5 seconds and 2 hours.\nExample: trade up 1k 1m30s");
    }

    const betAmount = parseAmount(amountRaw);
    if (!betAmount || betAmount <= 0) return message.reply("Invalid amount!");

    let money = await usersData.get(uid, "money");
    if (typeof money !== "number") money = 0;

    if (betAmount > money) {
      return message.reply(`Insufficient balance!\nYour Balance: ${formatMoney(money)}`);
    }

    // generate market candles now (fixed after wait)
    const { candles, trend, volatility } = generateCandles(20);
    const last = candles[candles.length - 1];

    // 💰 profit percent is random (time-based range)
    const profitPercent = getRandomProfitPercent(seconds);

    // 🏦 house edge: win chance ~48%
    const winChance = 0.48;
    const win = Math.random() < winChance;

    // make result direction consistent with win/lose + user's prediction
    const resultDir = win ? choice : (choice === "up" ? "down" : "up");
    const resultCandle = buildResultCandleFromBase(last.close, resultDir, volatility);

    pendingTrade.set(uid, true);

    await message.reply(
      `📈 Trade placed!\n` +
      `Prediction: ${choice.toUpperCase()}\n` +
      `Amount: ${formatMoney(betAmount)}\n` +
      `Time: ${seconds}s • Profit (if win): +${profitPercent}%\n` +
      `⏳ Waiting...`
    );

    setTimeout(async () => {
      try {
        // fresh balance (in case user earned/spent while waiting)
        let freshMoney = await usersData.get(uid, "money");
        if (typeof freshMoney !== "number") freshMoney = 0;

        // pnl: win => +bet*profit% , lose => -bet
        const pnl = win
          ? Math.floor((betAmount * profitPercent) / 100)
          : -betAmount;

        const newBalance = Math.max(0, freshMoney + pnl);
        await usersData.set(uid, { money: newBalance });

        const userData = await usersData.get(uid);
        const userName = userData?.name || "User";

        const buffer = drawCard({
          userName,
          betAmount,
          choice,
          seconds,
          profitPercent,
          trend,
          candles,
          resultCandle,
          win,
          pnl,
          newBalance
        });

        const filePath = path.join(cacheDir, `trade_${uid}_${Date.now()}.png`);
        await fs.writeFile(filePath, buffer);

        const sign = pnl >= 0 ? "+" : "-";
        await message.reply({
          body:
            `📊 Trade Result\n` +
            `Market: ${candleDirection(resultCandle).toUpperCase()}\n` +
            `You: ${choice.toUpperCase()} → ${win ? "WIN ✅" : "LOSS ❌"}\n` +
            `PnL: ${sign}${formatMoney(Math.abs(pnl))}\n` +
            `Balance: ${formatMoney(newBalance)}`,
          attachment: fs.createReadStream(filePath)
        });

        setTimeout(() => fs.existsSync(filePath) && fs.unlinkSync(filePath), 10000);
      } catch (e) {
        console.error("trade error:", e?.message || e);
      } finally {
        pendingTrade.delete(uid);
      }
    }, seconds * 1000);
  }
};
