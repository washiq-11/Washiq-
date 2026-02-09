const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "upt"],
    version: "2.1",
    author: "Washiq",
    role: 0,
    usePrefix: true,
    shortDescription: { en: "Check bot uptime with ping and image" },
    longDescription: { en: "Display how long the bot is running along with ping time and a custom image" },
    category: "system",
    guide: { en: "{pn} → check bot uptime with ping" }
  },

  onStart() {
    console.log("✅ Uptime command loaded.");
  },

  onChat: async function ({ event, message, commandName }) {
    const prefix = global.GoatBot?.config?.prefix || "/";
    const body = event.body?.trim() || "";
    if (
      !body.startsWith(prefix + commandName) &&
      !this.config.aliases.some(a => body.startsWith(prefix + a))
    ) return;

    const imagePath = path.join(__dirname, "uptime_image.png");

    // Twemoji (PNG) icons — emoji draw as images (works even without emoji fonts)
    const EMOJI = {
      bot: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f916.png",
      time: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/23f3.png",
      bolt: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/26a1.png",
      crown: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f451.png",
      check: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2705.png"
    };

    try {
      const pingMsg = await message.reply("⚡ Checking ping...");
      const start = Date.now();
      await new Promise(res => setTimeout(res, 100));
      const ping = Date.now() - start;

      const uptime = Math.floor(process.uptime()); // seconds
      const days = Math.floor(uptime / (3600 * 24));
      const hours = Math.floor((uptime % (3600 * 24)) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = uptime % 60;
      const upTimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      const canvas = createCanvas(1000, 500);
      const ctx = canvas.getContext("2d");

      // Background
      const bgUrl = "https://i.imgur.com/b4rDlP9.png";
      const background = await loadImage(bgUrl);
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

      // Load emoji icons (as images)
      // যদি সার্ভারে net না থাকে, এখানে error হবে—তখন বললে আমি লোকাল আইকন ভার্সন দিব।
      const [icoBot, icoTime, icoBolt, icoCrown] = await Promise.all([
        loadImage(EMOJI.bot),
        loadImage(EMOJI.time),
        loadImage(EMOJI.bolt),
        loadImage(EMOJI.crown)
      ]);

      // Text styling
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 45px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 4;

      // Helper to draw "emoji icon + text"
      const drawRow = (iconImg, text, x, y) => {
        const size = 52; // icon size
        ctx.drawImage(iconImg, x, y - size / 2, size, size);
        ctx.fillText(text, x + size + 16, y);
      };

      // Header (no emoji text; icon drawn)
      drawRow(icoBot, "BOT UPTIME", 60, 100);
      drawRow(icoTime, upTimeStr, 60, 200);
      drawRow(icoBolt, `Ping: ${ping}ms`, 60, 280);
      drawRow(icoCrown, "Owner: Washiq", 60, 360);

      const buffer = canvas.toBuffer("image/png");
      fs.writeFileSync(imagePath, buffer);

      await message.unsend(pingMsg.messageID);

      await message.reply({
        body: `
━━━━━━━━━━━━━━
𝐁𝐎𝐓 𝐒𝐓𝐀𝐓𝐔𝐒 ✅
╭─╼━━━━━━━━╾─╮
│ 💤 Uptime : ${upTimeStr}
│ ⚡ Ping   : ${ping}ms
│ 👑 Owner  : Washiq
╰─━━━━━━━━━╾─╯
━━━━━━━━━━━━━━
        `,
        attachment: fs.createReadStream(imagePath)
      });

    } catch (err) {
      console.error("❌ Error in uptime command:", err);
      await message.reply("⚠️ Failed to generate uptime.");
    } finally {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
  }
};
