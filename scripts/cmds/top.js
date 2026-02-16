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

  onStart: async function ({ message, usersData, event }) {
    try {
      message.reaction("⏳", event.messageID);
      
      const all = await usersData.getAll();
      
      const top15 = all
        .filter(u => u && u.money && Number(u.money) > 0)
        .map(u => ({ 
          id: u.userID, 
          name: u.name || "Unknown User", 
          money: Number(u.money) || 0 
        }))
        .sort((a, b) => b.money - a.money)
        .slice(0, 15);

      if (!top15.length) {
        message.reaction("❌", event.messageID);
        return message.reply(" ");
      }

      const width = 1080;
      const height = 2340;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      const seed = Date.now() / 1000;
      const shimmer = (Math.sin(seed) + 1) / 2;
      const pulse = (Math.cos(seed * 1.2) + 1) / 2;

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#050816");
      bg.addColorStop(0.5, "#0a1224");
      bg.addColorStop(1, "#050816");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Title - Normal Font
      ctx.save();
      ctx.shadowColor = "rgba(255,215,0,0.85)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.font = "bold 80px 'Arial', sans-serif";
      ctx.fillStyle = "#FFD700";
      ctx.textAlign = "center";
      ctx.fillText("TOP 15 RICHEST", width / 2, 180);
      ctx.restore();

      // Top 3 Cards
      const cardW = 320;
      const cardH = 380;
      const topY = 300;
      
      const positions = [
        { idx: 0, x: width / 2 - cardW / 2, type: "gold", label: "1st" },
        { idx: 1, x: 60, type: "silver", label: "2nd" },
        { idx: 2, x: width - cardW - 60, type: "bronze", label: "3rd" }
      ];

      for (const p of positions) {
        const user = top15[p.idx];
        if (!user) continue;

        // Card background
        ctx.save();
        drawRoundRect(ctx, p.x, topY, cardW, cardH, 30);
        ctx.fillStyle = cardGradient(ctx, p.x, topY, cardW, cardH, p.type, shimmer);
        ctx.fill();
        ctx.restore();

        // Rank label
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        drawRoundRect(ctx, p.x + 20, topY + 20, 80, 40, 15);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 25px 'Arial', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.label, p.x + 60, topY + 48);
        ctx.restore();

        // Avatar
        const ax = p.x + cardW / 2;
        const ay = topY + 160;
        const av = await getFBAvatar(user.id);
        
        ctx.save();
        clipCircle(ctx, ax, ay, 75);
        if (av) {
          ctx.drawImage(av, ax - 75, ay - 75, 150, 150);
        } else {
          ctx.fillStyle = "#333";
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "70px 'Arial', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("?", ax, ay);
        }
        ctx.restore();

        // Ring
        ctx.strokeStyle = `rgba(34,197,94,${0.35 + pulse * 0.25})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(ax, ay, 80, 0, Math.PI * 2);
        ctx.stroke();

        // Name
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px 'Arial', sans-serif";
        ctx.fillText(user.name.length > 15 ? user.name.slice(0, 12) + "..." : user.name, ax, topY + 300);

        // Money
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 30px 'Arial', sans-serif";
        ctx.fillText(`${formatShort(user.money)} ${CURRENCY_SYMBOL}`, ax, topY + 350);
      }

      // List 4-15
      const listX = 60;
      const listY = 800;
      const listW = width - 120;
      const rowH = 85;

      for (let i = 3; i < top15.length; i++) {
        const u = top15[i];
        const y = listY + (i - 3) * rowH;
        const rank = i + 1;

        // Row background
        if (i % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          drawRoundRect(ctx, listX, y - 35, listW, 70, 15);
          ctx.fill();
        }

        // Rank number
        ctx.textAlign = "left";
        ctx.fillStyle = "#60a5fa";
        ctx.font = "bold 30px 'Arial', sans-serif";
        ctx.fillText(`#${rank}`, listX + 20, y);

        // Avatar for list
        const av = await getFBAvatar(u.id);
        ctx.save();
        clipCircle(ctx, listX + 120, y - 15, 25);
        if (av) {
          ctx.drawImage(av, listX + 95, y - 40, 50, 50);
        } else {
          ctx.fillStyle = "#333";
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "25px 'Arial', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("?", listX + 120, y - 15);
        }
        ctx.restore();

        // Name
        ctx.fillStyle = "#e5e7eb";
        ctx.font = "28px 'Arial', sans-serif";
        ctx.fillText(u.name.length > 20 ? u.name.slice(0, 17) + "..." : u.name, listX + 170, y);

        // Money
        ctx.textAlign = "right";
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 30px 'Arial', sans-serif";
        ctx.fillText(`${formatShort(u.money)} ${CURRENCY_SYMBOL}`, listX + listW - 20, y);
      }

      // Footer
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "25px 'Arial', sans-serif";
      ctx.fillText("• • •", width / 2, height - 100);

      const out = path.join(CACHE_DIR, `top_${Date.now()}.png`);
      fs.writeFileSync(out, canvas.toBuffer("image/png"));

      message.reaction("✅", event.messageID);
      
      await message.reply({ 
        attachment: fs.createReadStream(out) 
      });
      
      setTimeout(() => fs.unlink(out).catch(() => {}), 20000);
      
    } catch (e) {
      console.error("Top command error:", e);
      message.reaction("❌", event.messageID);
      message.reply(" ");
    }
  }
};
