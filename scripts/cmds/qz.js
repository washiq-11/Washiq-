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
  bgGrad.addColorStop(0...
