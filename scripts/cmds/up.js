const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "upt"],
    version: "2.3",
    author: "Washiq",
    role: 0,
    shortDescription: { en: "Check bot uptime with ping and image" },
    longDescription: { en: "Display how long the bot is running along with ping time and a custom image" },
    category: "system",
    guide: { en: "{pn} → check bot uptime (prefix for all, no-prefix only owner)" }
  },

  onStart() {
    console.log("✅ Uptime command loaded.");
  },

  onChat: async function ({ event, message, commandName }) {
    const prefix = global.GoatBot?.config?.prefix || "/";
    const rawBody = (event.body || "").trim();
    if (!rawBody) return;

    // ✅ ONLY YOU can use without prefix
    const OWNER_ID = "61587367229815";
    const isOwner = String(event.senderID) === OWNER_ID;

    const body = rawBody.toLowerCase();
    const names = [commandName, ...(this.config.aliases || [])].map(n => String(n).toLowerCase());

    const isWithPrefix = names.some(n => body === (prefix + n) || body.startsWith(prefix + n + " "));
    const isWithoutPrefix = names.some(n => body === n || body.startsWith(n + " "));

    // block if not a trigger
    if (!isWithPrefix && !isWithoutPrefix) return;

    // 🔒 block non-owner using without prefix
    if (isWithoutPrefix && !isOwner) return;

    const imagePath = path.join(__dirname, "uptime_image.png");

    const EMOJI = {
      bot: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f916.png",
      time: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/23f3.png",
      bolt: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/26a1.png",
      crown: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f451.png"
    };

    try {
      const pingMsg = await message.reply("⚡ Checking ping...");
      const start = Date.now();
      await new Promise(res => setTimeout(res, 100));
      const ping = Date.now() - start;

      const uptime = Math.floor(process.uptime());
      const days = Math.floor(uptime / (3600 * 24));
      const hours = Math.floor((uptime % (3600 * 24)) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = uptime % 60;
      const upTimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      const canvas = createCanvas(1000, 500);
      const ctx = canvas.getContext("2d");

      const bgUrl = "https://i.imgur.com/b4rDlP9.png";
      const background = await loadImage(bgUrl);
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

      const [icoBot, icoTime, icoBolt, icoCrown] = await Promise.all([
        loadImage(EMOJI.bot),
        loadImage(EMOJI.time),
        loadImage(EMOJI.bolt),
        loadImage(EMOJI.crown)
      ]);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 45px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 4;

      const drawRow = (iconImg, text, x, y) => {
        const size = 52;
        ctx.drawImage(iconImg, x, y - size / 2, size, size);
        ctx.fillText(text, x + size + 16, y);
      };

      drawRow(icoBot, "BOT UPTIME", 60, 100);
      drawRow(icoTime, upTimeStr, 60, 200);
      drawRow(icoBolt, `Ping: ${ping}ms`, 60, 280);
      drawRow(icoCrown, "Owner: Washiq", 60, 360);

      fs.writeFileSync(imagePath, canvas.toBuffer("image/png"));

      try { await message.unsend(pingMsg.messageID); } catch (_) {}

      await message.reply({
        body:
`━━━━━━━━━━━━━━
𝐁𝐎𝐓 𝐒𝐓𝐀𝐓𝐔𝐒 ✅
╭─╼━━━━━━━━╾─╮
│ 💤 Uptime : ${upTimeStr}
│ ⚡ Ping   : ${ping}ms
│ 👑 Owner  : Washiq
╰─━━━━━━━━━╾─╯
━━━━━━━━━━━━━━`,
        attachment: fs.createReadStream(imagePath)
      });

    } catch (err) {
      console.error("❌ Error in uptime command:", err);
      await message.reply("⚠️ Failed to generate uptime.");
    } finally {
      if (fs.existsSync(imagePath)) {
        try { fs.unlinkSync(imagePath); } catch (_) {}
      }
    }
  }
};
