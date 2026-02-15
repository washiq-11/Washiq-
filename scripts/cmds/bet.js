const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");

const cacheDir = path.join(__dirname, "cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

function formatBalance(num) {
  if (num >= 1e12) return (num / 1e12).toFixed(2).replace(/\.00$/, "") + "T$";
  if (num >= 1e9) return (num / 1e9).toFixed(2).replace(/\.00$/, "") + "B$";
  if (num >= 1e6) return (num / 1e6).toFixed(2).replace(/\.00$/, "") + "M$";
  if (num >= 1e3) return (num / 1e3).toFixed(2).replace(/\.00$/, "") + "k$";
  return num + "$";
}

function parseAmount(str) {
  str = str.toLowerCase().replace(/\s+/g, "");
  const match = str.match(/^([\d.]+)([kmbt]?)$/);
  if (!match) return NaN;
  let num = parseFloat(match[1]);
  const unit = match[2];
  switch (unit) {
    case "k": num *= 1e3; break;
    case "m": num *= 1e6; break;
    case "b": num *= 1e9; break;
    case "t": num *= 1e12; break;
  }
  return Math.floor(num);
}

module.exports.config = {
  name: "bet",
  aliases: ["gamble", "cas"],
  version: "2.5.1",
  author: "AR ADNAN (connected to usersData.money)",
  countDown: 5,
  role: 0,
  description: "Casino-style bet with image result (uses usersData money)",
  category: "game",
  guide: "{pn} <amount> (e.g., bet 1k)"
};

module.exports.onStart = async function ({ message, event, args, usersData }) {
  const { senderID } = event;

  try {
    // ✅ 1) Load balance from GoatBot usersData (persistent)
    let balance = await usersData.get(senderID, "money");
    if (typeof balance !== "number") balance = 0;

    if (!args[0]) return message.reply("Please enter amount: bet 500 or bet 1k");

    const betAmount = parseAmount(args[0]);
    if (isNaN(betAmount) || betAmount <= 0) return message.reply("Invalid amount!");

    if (betAmount > balance) {
      return message.reply(`Insufficient balance!\nYour Balance: ${formatBalance(balance)}`);
    }

    // 2) Gamble logic (same)
    const multipliers = [3, 4, 8, 20, 50];
    const chosenMultiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
    const win = Math.random() < 0.4; // 40% Win Chance

    let newBalance = balance;
    let resultText = "";
    let profit = 0;

    if (win) {
      profit = betAmount * chosenMultiplier;
      newBalance += profit;
      resultText = `JACKPOT! ${chosenMultiplier}x`;
    } else {
      newBalance -= betAmount;
      resultText = "TRY AGAIN";
    }

    // ✅ 3) Save new balance back to usersData (persistent)
    await usersData.set(senderID, { money: newBalance });

    // 4) Generate casino card (same)
    const userData = await usersData.get(senderID);
    const userName = userData.name || "User";
    const avatarUrl = `https://graph.facebook.com/${senderID}/picture?height=500&width=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

    let avatar;
    try {
      const res = await axios.get(avatarUrl, { responseType: "arraybuffer", timeout: 12000 });
      avatar = await loadImage(Buffer.from(res.data));
    } catch (e) {
      avatar = null;
    }

    const filePath = await generateCasinoCard({
      userName,
      avatar,
      betAmount,
      resultText,
      multiplier: win ? chosenMultiplier : null,
      profit: win ? profit : betAmount,
      newBalance,
      win
    });

    await message.reply({
      body: `🎰 Result for ${userName}\nResult: ${win ? "Win" : "Loss"}\nNew Balance: ${formatBalance(newBalance)}`,
      attachment: fs.createReadStream(filePath)
    });

    setTimeout(() => fs.existsSync(filePath) && fs.unlinkSync(filePath), 10000);
  } catch (error) {
    console.error(error);
    message.reply("An error occurred!");
  }
};

async function generateCasinoCard(data) {
  const width = 900;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#0f0f23");
  bgGrad.addColorStop(1, "#1a1a2e");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = data.win ? "#00ff88" : "#ff4444";
  ctx.lineWidth = 8;
  drawRoundedRect(ctx, 20, 20, width - 40, height - 40, 30);
  ctx.stroke();

  ctx.font = "bold 60px sans-serif";
  ctx.fillStyle = "#ffd700";
  ctx.textAlign = "center";
  ctx.fillText("RAHA CASINO", width / 2, 100);

  if (data.avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(120, 200, 70, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(data.avatar, 50, 130, 140, 140);
    ctx.restore();
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  ctx.font = "bold 36px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(data.userName.slice(0, 15), 230, 190);

  ctx.font = "bold 32px sans-serif";
  ctx.fillStyle = "#00ffcc";
  ctx.fillText(`Bet: ${formatBalance(data.betAmount)}`, 230, 240);

  ctx.fillStyle = data.win ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 0, 0, 0.1)";
  drawRoundedRect(ctx, 230, 280, 430, 180, 25);
  ctx.fill();

  ctx.font = "bold 56px sans-serif";
  ctx.fillStyle = data.win ? "#00ff00" : "#ff0000";
  ctx.textAlign = "center";
  ctx.fillText(data.resultText, width / 2 + 50, 360);

  if (data.win) {
    ctx.font = "bold 42px sans-serif";
    ctx.fillStyle = "#ffd700";
    ctx.fillText(`${data.multiplier}x MULTIPLIER`, width / 2 + 50, 420);
  }

  ctx.font = "bold 36px sans-serif";
  ctx.fillStyle = data.win ? "#00ff00" : "#ff4444";
  ctx.fillText(data.win ? `+${formatBalance(data.profit)}` : `-${formatBalance(data.betAmount)}`, width / 2, 510);

  ctx.font = "28px sans-serif";
  ctx.fillStyle = "#cccccc";
  ctx.fillText(`Balance: ${formatBalance(data.newBalance)}`, width / 2, 560);

  const filePath = path.join(cacheDir, `bet_${Date.now()}.png`);
  fs.writeFileSync(filePath, canvas.toBuffer());
  return filePath;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
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
