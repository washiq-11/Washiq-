const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

// Configuration and Constants
const TMP_PATH = path.join(__dirname, "cache");
if (!fs.existsSync(TMP_PATH)) fs.mkdirSync(TMP_PATH, { recursive: true });

const RESOURCE_URL = "https://i.ibb.co/W45cwyhV/image0.jpg";
const GRAPH_ACCESS_TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

async function fetchBuffer(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 20000,
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  return await loadImage(Buffer.from(response.data));
}

async function resolveUserAvatar(uid) {
  const fbUrl = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=${encodeURIComponent(GRAPH_ACCESS_TOKEN)}`;
  try {
    return await fetchBuffer(fbUrl);
  } catch (error) {
    return null;
  }
}

function applyAvatarMask(ctx, img, x, y, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}

module.exports = {
  config: {
    name: "fokir",
    aliases: ["fakir", "bhikkha"],
    version: "3.1.2",
    author: "𝙰𝙳𝙽𝙰𝙽",
    countDown: 5,
    role: 0,
    category: "fun",
    guide: { en: "{pn} (reply/mention/uid)" }
  },

  onStart: async function ({ message, event, args, usersData }) {
    try {
      if (message.reaction) message.reaction("⏳", event.messageID);

      // Resolve Target UID
      let victimID = event.senderID;
      if (event.messageReply?.senderID) {
        victimID = event.messageReply.senderID;
      } else if (event.mentions && Object.keys(event.mentions).length > 0) {
        victimID = Object.keys(event.mentions)[0];
      } else if (args[0] && /^\d+$/.test(args[0])) {
        victimID = args[0];
      }

      const info = await usersData.get(victimID);
      const name = info?.name || "User";

      // Load Assets
      const template = await fetchBuffer(RESOURCE_URL);
      const userImg = await resolveUserAvatar(victimID);

      const canvas = createCanvas(template.width, template.height);
      const render = canvas.getContext("2d");

      render.drawImage(template, 0, 0, canvas.width, canvas.height);

      // Positioning Logic
      const centerX = Math.floor(canvas.width * 0.60);
      const centerY = Math.floor(canvas.height * 0.20);
      const dynamicRadius = Math.floor(canvas.width * 0.095);

      // Layer 1: Background Shadow
      render.beginPath();
      render.arc(centerX, centerY, dynamicRadius + 14, 0, Math.PI * 2);
      render.fillStyle = "rgba(0,0,0,0.4)";
      render.fill();

      // Layer 2: Avatar or Placeholder
      if (userImg) {
        applyAvatarMask(render, userImg, centerX, centerY, dynamicRadius);
      } else {
        render.beginPath();
        render.arc(centerX, centerY, dynamicRadius, 0, Math.PI * 2);
        render.fillStyle = "#444";
        render.fill();
      }

      // Layer 3: Accent Border
      render.beginPath();
      render.arc(centerX, centerY, dynamicRadius + 3, 0, Math.PI * 2);
      render.strokeStyle = "#22c55e";
      render.lineWidth = 6;
      render.stroke();

      // Layer 4: Status Indicator
      render.beginPath();
      render.arc(centerX + dynamicRadius - 12, centerY + dynamicRadius - 12, 12, 0, Math.PI * 2);
      render.fillStyle = "#22c55e";
      render.fill();
      render.strokeStyle = "#000";
      render.lineWidth = 3;
      render.stroke();

      const filePath = path.join(TMP_PATH, `export_${Date.now()}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

      await message.reply({
        body: `এখন ${name} গুলিস্তানে বসে ভিক্ষা করছে🙃🙏`,
        mentions: [{ id: victimID, tag: name }],
        attachment: fs.createReadStream(filePath)
      });

      if (message.reaction) message.reaction("✅", event.messageID);

      setTimeout(() => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, 25000);

    } catch (e) {
      console.error("CRITICAL_ERR_FOKIR:", e);
      if (message.reaction) message.reaction("❌", event.messageID);
    }
  }
};
    
