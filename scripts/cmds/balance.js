const { createCanvas, loadImage, registerFont } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

// font + cache
const fontDir = path.join(__dirname, "assets", "font");
const cacheDir = path.join(__dirname, "cache");

try {
  if (fs.existsSync(path.join(fontDir, "NotoSans-Bold.ttf"))) {
    registerFont(path.join(fontDir, "NotoSans-Bold.ttf"), { family: "NotoSans", weight: "bold" });
  }
  if (fs.existsSync(path.join(fontDir, "NotoSans-SemiBold.ttf"))) {
    registerFont(path.join(fontDir, "NotoSans-SemiBold.ttf"), { family: "NotoSans", weight: "600" });
  }
  if (fs.existsSync(path.join(fontDir, "NotoSans-Regular.ttf"))) {
    registerFont(path.join(fontDir, "NotoSans-Regular.ttf"), { family: "NotoSans", weight: "normal" });
  }
  if (fs.existsSync(path.join(fontDir, "BeVietnamPro-Bold.ttf"))) {
    registerFont(path.join(fontDir, "BeVietnamPro-Bold.ttf"), { family: "BeVietnamPro", weight: "bold" });
  }
  if (fs.existsSync(path.join(fontDir, "BeVietnamPro-SemiBold.ttf"))) {
    registerFont(path.join(fontDir, "BeVietnamPro-SemiBold.ttf"), { family: "BeVietnamPro", weight: "600" });
  }
} catch (e) {
  console.log("BalanceCard: Using fallback fonts");
}

const CURRENCY_SYMBOL = "$";

function formatMoneyShort(n) {
  if (n < 1000) return n;
  if (n >= 1e12) return +(n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return +(n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return +(n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return +(n / 1e3).toFixed(1) + "k";
  return n;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function getProfilePicture(uid) {
  try {
    const avatarURL = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const response = await axios.get(avatarURL, { responseType: "arraybuffer", timeout: 10000 });
    return await loadImage(Buffer.from(response.data));
  } catch (error) {
    return null;
  }
}

function drawDefaultAvatar(ctx, x, y, size) {
  const gradient = ctx.createRadialGradient(x + size / 2, y + size / 2, 0, x + size / 2, y + size / 2, size / 2);
  gradient.addColorStop(0, "#22c55e");
  gradient.addColorStop(1, "#16a34a");
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2 - 10, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + size / 2, y + size / 2 + 45, 40, 30, 0, Math.PI, 0, true);
  ctx.fill();
}

async function createBalanceCard(userData, userID, balance) {
  const width = 950;
  const height = 520;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const displayBalance = formatMoneyShort(balance);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#0a0f0d");
  gradient.addColorStop(0.3, "#0d1f17");
  gradient.addColorStop(0.6, "#0f2a1d");
  gradient.addColorStop(1, "#0a0f0d");

  drawRoundedRect(ctx, 0, 0, width, height, 25);
  ctx.fillStyle = gradient;
  ctx.fill();

  // stars
  ctx.save();
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 1.5 + 0.3;
    const opacity = Math.random() * 0.3 + 0.1;
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // lines
  ctx.save();
  ctx.strokeStyle = "rgba(34, 197, 94, 0.03)";
  ctx.lineWidth = 1;
  for (let i = -height; i < width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  ctx.restore();

  // borders
  ctx.strokeStyle = "rgba(34, 197, 94, 0.2)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 12, 12, width - 24, height - 24, 20);
  ctx.stroke();

  ctx.strokeStyle = "rgba(34, 197, 94, 0.08)";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, 20, 20, width - 40, height - 40, 16);
  ctx.stroke();

  const glowGradient = ctx.createLinearGradient(0, 0, 350, 0);
  glowGradient.addColorStop(0, "rgba(34, 197, 94, 0.15)");
  glowGradient.addColorStop(1, "rgba(34, 197, 94, 0)");
  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, 0, 350, height);

  // header
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 30px "NotoSans", "BeVietnamPro", sans-serif';
  ctx.shadowColor = "rgba(34, 197, 94, 0.5)";
  ctx.shadowBlur = 10;
  ctx.fillText("WALLET BALANCE", 50, 70);
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.font = '600 15px "NotoSans", "BeVietnamPro", sans-serif';
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillText("Digital Payment Card", 50, 100);

  ctx.font = '600 14px "NotoSans", "BeVietnamPro", sans-serif';
  ctx.fillStyle = "rgba(187, 247, 208, 0.7)";
  ctx.fillText("AVAILABLE BALANCE", 50, 175);

  // glow text
  ctx.save();
  for (let i = 12; i > 0; i--) {
    ctx.fillStyle = `rgba(34, 197, 94, ${0.015 * i})`;
    ctx.font = `bold ${68 + i * 0.5}px "NotoSans", "BeVietnamPro", sans-serif`;
    ctx.fillText(`${CURRENCY_SYMBOL}${displayBalance}`, 48 + (12 - i) * 0.2, 248 + (12 - i) * 0.2);
  }
  ctx.restore();

  const balanceGradient = ctx.createLinearGradient(50, 200, 450, 250);
  balanceGradient.addColorStop(0, "#4ade80");
  balanceGradient.addColorStop(0.5, "#22c55e");
  balanceGradient.addColorStop(1, "#16a34a");
  ctx.fillStyle = balanceGradient;
  ctx.font = 'bold 68px "NotoSans", "BeVietnamPro", sans-serif';
  ctx.fillText(`${CURRENCY_SYMBOL}${displayBalance}`, 50, 250);

  // holder
  ctx.font = '600 14px "NotoSans", "BeVietnamPro", sans-serif';
  ctx.fillStyle = "rgba(187, 247, 208, 0.7)";
  ctx.fillText("CARD HOLDER", 50, 320);

  ctx.font = 'bold 26px "NotoSans", "BeVietnamPro", sans-serif';
  ctx.fillStyle = "#ffffff";
  const displayName = (userData.name || "Unknown").toUpperCase().slice(0, 22);
  ctx.fillText(displayName, 50, 355);

  // id
  ctx.font = '600 14px "NotoSans", "BeVietnamPro", sans-serif';
  ctx.fillStyle = "rgba(187, 247, 208, 0.7)";
  ctx.fillText("USER ID", 50, 410);

  ctx.font = 'bold 18px "NotoSans", "BeVietnamPro", monospace';
  ctx.fillStyle = "#bbf7d0";
  ctx.fillText(String(userID), 50, 445);

  // avatar
  const profilePic = await getProfilePicture(userID);
  const picSize = 130;
  const picX = width - picSize - 55;
  const picY = 55;

  ctx.save();
  for (let i = 18; i > 0; i--) {
    ctx.beginPath();
    ctx.arc(picX + picSize / 2, picY + picSize / 2, picSize / 2 + i, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(34, 197, 94, ${0.02 * i})`;
    ctx.fill();
  }
  ctx.restore();

  if (profilePic) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(picX + picSize / 2, picY + picSize / 2, picSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(profilePic, picX, picY, picSize, picSize);
    ctx.restore();
  } else {
    drawDefaultAvatar(ctx, picX, picY, picSize);
  }

  ctx.beginPath();
  ctx.arc(picX + picSize / 2, picY + picSize / 2, picSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 4;
  ctx.stroke();

  // status
  const statusX = picX + picSize - 12;
  const statusY = picY + picSize - 12;
  ctx.beginPath();
  ctx.arc(statusX, statusY, 14, 0, Math.PI * 2);
  ctx.fillStyle = "#22c55e";
  ctx.fill();
  ctx.strokeStyle = "#0a0f0d";
  ctx.lineWidth = 3;
  ctx.stroke();

  return canvas.toBuffer("image/png");
}

module.exports = {
  config: {
    name: "bal",
    aliases: ["wallet", "balance"],
    version: "14.0.0",
    author: "Neoaz x Washiq",
    countDown: 5,
    role: 0,
    description: "Canvas Balance Card (uses usersData money)",
    category: "economy",
    guide: "{pn}"
  },

  onStart: async function ({ message, event, usersData }) {
    try {
      message.reaction("⏳", event.messageID);
      await fs.ensureDir(cacheDir);

      let targetID = event.senderID;
      if (event.messageReply) targetID = event.messageReply.senderID;
      else if (Object.keys(event.mentions).length > 0) targetID = Object.keys(event.mentions)[0];

      const userData = await usersData.get(targetID);

      // ✅ ONLY usersData money (persisted by GoatBot)
      const balance = (await usersData.get(targetID, "money")) || 0;

      const buffer = await createBalanceCard(userData, targetID, balance);
      const imagePath = path.join(cacheDir, `bal_${targetID}.png`);
      await fs.writeFile(imagePath, buffer);

      await message.reply({
        body: `${userData.name}\nBalance: ${CURRENCY_SYMBOL}${Number(balance).toLocaleString()}`,
        attachment: fs.createReadStream(imagePath)
      });

      message.reaction("✅", event.messageID);
      setTimeout(() => fs.unlink(imagePath).catch(() => {}), 5000);
    } catch (error) {
      console.error(error);
      message.reply("Error!");
    }
  }
};
