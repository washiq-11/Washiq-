const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const CACHE_DIR = path.join(__dirname, "cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const CURRENCY_SYMBOL = "$";
const FB_APP_TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

function formatShort(n) {
  n = Number(n) || 0;
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.00$/, "") + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.00$/, "") + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2).replace(/\.00$/, "") + "K";
  return String(Math.floor(n));
}

function drawRoundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
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

function clipCircle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
}

async function getFBAvatar(uid, size = 256) {
  const url = `https://graph.facebook.com/${uid}/picture?width=${size}&height=${size}&access_token=${encodeURIComponent(FB_APP_TOKEN)}`;
  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    return await loadImage(Buffer.from(res.data));
  } catch { return null; }
}

function cardGradient(ctx, x, y, w, h, type, shimmer) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  if (type === "gold") {
    g.addColorStop(0, "#fbbf24");
    g.addColorStop(0.45, `rgba(255,255,255,${0.10 + shimmer * 0.22})`);
    g.addColorStop(0.55, "#f59e0b");
    g.addColorStop(1, "#b45309");
  } else if (type === "silver") {
    g.addColorStop(0, "#e5e7eb");
    g.addColorStop(0.5, `rgba(255,255,255,${0.08 + shimmer * 0.18})`);
    g.addColorStop(1, "#6b7280");
  } else {
    g.addColorStop(0, "#f59e0b");
    g.addColorStop(0.5, `rgba(255,255,255,${0.07 + shimmer * 0.16})`);
    g.addColorStop(1, "#7c2d12");
  }
  return g;
}

module.exports = {
  config: {
    name: "top",
    aliases: ["rich", "leaderboard"],
    version: "4.0.0",
    author: "Washiq Adnan",
    countDown: 8,
    role: 0,
    category: "economy",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message, usersData }) {
    try {
      const all = await usersData.getAll();
      const top15 = all
        .map(u => ({ id: u.userID, name: u.name || "Unknown", money: Number(u.money || 0) }))
        .sort((a, b) => b.money - a.money)
        .slice(0, 15);

      if (!top15.length) return message.reply("No user data found.");

      // ১০৮০ x ২৩৪০ রেজোলিউশন
      const width = 1080;
      const height = 2340;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      const seed = Date.now() / 1000;
      const shimmer = (Math.sin(seed) + 1) / 2;
      const pulse = (Math.cos(seed * 1.2) + 1) / 2;

      // BACKGROUND
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#050816");
      bg.addColorStop(0.5, "#0a1224");
      bg.addColorStop(1, "#050816");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // OUTER FRAME
      ctx.save();
      ctx.strokeStyle = `rgba(34,197,94,${0.28 + pulse * 0.30})`;
      ctx.lineWidth = 6;
      ctx.shadowColor = "rgba(34,197,94,0.75)";
      ctx.shadowBlur = 35;
      drawRoundRect(ctx, 30, 30, width - 60, height - 60, 50);
      ctx.stroke();
      ctx.restore();

      // TITLE
      ctx.save();
      ctx.font = "bold 85px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "rgba(255,215,0,0.85)";
      ctx.shadowBlur = 30;
      ctx.fillText("RICHEST USERS", width / 2, 250);
      ctx.font = "35px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillText("Top 15 • Live Ranking", width / 2, 320);
      ctx.restore();

      // TOP 3 CARDS (Original Style)
      const cardW = 320;
      const cardH = 380;
      const topY = 450;
      const positions = [
        { idx: 1, x: width / 2 - cardW / 2, type: "gold", label: "1ST" },
        { idx: 0, x: 60, type: "silver", label: "2ND" },
        { idx: 2, x: width - cardW - 60, type: "bronze", label: "3RD" }
      ];

      for (const p of positions) {
        const user = top15[p.idx];
        if (!user) continue;

        ctx.save();
        drawRoundRect(ctx, p.x, topY, cardW, cardH, 30);
        ctx.fillStyle = cardGradient(ctx, p.x, topY, cardW, cardH, p.type, shimmer);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        drawRoundRect(ctx, p.x, topY, cardW, cardH, 30);
        ctx.fill();
        ctx.restore();

        // Label
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        drawRoundRect(ctx, p.x + 20, topY + 20, 80, 45, 15);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.label, p.x + 60, topY + 52);
        ctx.restore();

        // Avatar
        const ax = p.x + cardW / 2;
        const ay = topY + 160;
        const av = await getFBAvatar(user.id);
        ctx.save();
        clipCircle(ctx, ax, ay, 80);
        if (av) ctx.drawImage(av, ax - 80, ay - 80, 160, 160);
        ctx.restore();

        // Ring & Online Dot
        ctx.strokeStyle = `rgba(34,197,94,${0.35 + pulse * 0.25})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(ax, ay, 85, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ax + 60, ay + 60, 14, 0, Math.PI * 2);
        ctx.fillStyle = "#22c55e";
        ctx.fill();
        ctx.stroke();

        // Name & Money
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px sans-serif";
        ctx.fillText(user.name.slice(0, 15), ax, topY + 300);
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 30px sans-serif";
        ctx.fillText(`${formatShort(user.money)}${CURRENCY_SYMBOL}`, ax, topY + 350);
      }

      // LIST 4-15
      const listX = 60;
      const listY = 950;
      const listW = width - 120;
      const rowH = 105;

      for (let i = 3; i < top15.length; i++) {
        const u = top15[i];
        const y = listY + (i - 3) * rowH;

        if (i % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.04)";
          drawRoundRect(ctx, listX, y - 60, listW, 85, 20);
          ctx.fill();
        }

        ctx.textAlign = "left";
        ctx.fillStyle = "#60a5fa";
        ctx.font = "bold 35px sans-serif";
        ctx.fillText(`#${i + 1}`, listX + 40, y);

        const av = await getFBAvatar(u.id);
        ctx.save();
        clipCircle(ctx, listX + 160, y - 12, 30);
        if (av) ctx.drawImage(av, listX + 130, y - 42, 60, 60);
        ctx.restore();

        ctx.fillStyle = "#e5e7eb";
        ctx.font = "35px sans-serif";
        ctx.fillText(u.name.slice(0, 22), listX + 220, y);

        ctx.textAlign = "right";
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 35px sans-serif";
        ctx.fillText(`${formatShort(u.money)}${CURRENCY_SYMBOL}`, listX + listW - 40, y);
      }

      // FOOTER
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "30px sans-serif";
      ctx.fillText("RAHA ECONOMY • LIVE RANK", width / 2, height - 100);

      const out = path.join(CACHE_DIR, `top_${Date.now()}.png`);
      fs.writeFileSync(out, canvas.toBuffer("image/png"));

      await message.reply({ attachment: fs.createReadStream(out) });
      setTimeout(() => fs.unlink(out).catch(() => {}), 20000);
    } catch (e) {
      console.error(e);
      message.reply("Error!");
    }
  }
};
                                       
