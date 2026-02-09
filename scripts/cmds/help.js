const fs = require("fs-extra");
const path = require("path");

const { commands, aliases } = global.GoatBot;

// ===== GIF ROTATION SETUP =====
const helpGifs = [
  "https://files.catbox.moe/l1woep.gif",
  "https://files.catbox.moe/pjs3r7.gif",
  "https://files.catbox.moe/hjt1f0.gif"
];

// keep rotation state in memory
if (typeof global.GoatBot.helpGifIndex !== "number") {
  global.GoatBot.helpGifIndex = 0;
}

function getNextHelpGif() {
  const gif = helpGifs[global.GoatBot.helpGifIndex % helpGifs.length];
  global.GoatBot.helpGifIndex =
    (global.GoatBot.helpGifIndex + 1) % helpGifs.length;
  return gif;
}
// =================================

module.exports = {
  config: {
    name: "help",
    aliases: ["menu", "commands"],
    version: "5.1",
    author: "Washiq",
    countDown: 5,
    role: 0,
    shortDescription: { en: "View command list with pages + command details" },
    longDescription: { en: "Shows all commands by category with page system and fancy style" },
    category: "info",
    guide: { en: "{pn} [page] / {pn} <cmdName>" },
    priority: 1
  },

  onStart: async function ({ message, args, event, threadsData, role }) {
    const { threadID } = event;

    // Prefix (global + box)
    const threadData = await threadsData.get(threadID);
    const globalPrefix = global.GoatBot.config.prefix;
    const boxPrefix = threadData.data?.prefix || globalPrefix;

    // Fancy font converter
    const fancyFont = (text) => {
      const fonts = {
        a: "𝐚", b: "𝐛", c: "𝐜", d: "𝐝", e: "𝐞", f: "𝐟", g: "𝐠", h: "𝐡", i: "𝐢", j: "𝐣", k: "𝐤", l: "𝐥", m: "𝐦",
        n: "𝐧", o: "𝐨", p: "𝐩", q: "𝐪", r: "𝐫", s: "𝐬", t: "𝐭", u: "𝐮", v: "𝐯", w: "𝐰", x: "𝐱", y: "𝐲", z: "𝐳",
        A: "𝐀", B: "𝐁", C: "𝐂", D: "𝐃", E: "𝐄", F: "𝐅", G: "𝐆", H: "𝐇", I: "𝐈", J: "𝐉", K: "𝐊", L: "𝐋", M: "𝐌",
        N: "𝐍", O: "𝐎", P: "𝐏", Q: "𝐐", R: "𝐑", S: "𝐒", T: "𝐓", U: "𝐔", V: "𝐕", W: "𝐖", X: "𝐗", Y: "𝐘", Z: "𝐙",
        "0": "𝟎", "1": "𝟏", "2": "𝟐", "3": "𝟑", "4": "𝟒", "5": "𝟓", "6": "𝟔", "7": "𝟕", "8": "𝟖", "9": "𝟗"
      };
      return String(text).split("").map(ch => fonts[ch] || ch).join("");
    };

    const roleTextToString = (r) => {
      switch (r) {
        case 0: return "𝟎 (𝐀𝐥𝐥 𝐮𝐬𝐞𝐫𝐬)";
        case 1: return "𝟏 (𝐆𝐫𝐨𝐮𝐩 𝐚𝐝𝐦𝐢𝐧𝐬)";
        case 2: return "𝟐 (𝐁𝐨𝐭 𝐚𝐝𝐦𝐢𝐧)";
        default: return "𝐔𝐧𝐤𝐧𝐨𝐰𝐧";
      }
    };

    const getCommandCategories = () => {
      const cats = {};
      for (const [name, cmd] of commands) {
        if (cmd.config?.role > 0 && role < cmd.config.role) continue;
        const category = cmd.config?.category || "Uncategorized";
        cats[category] = cats[category] || { commands: [] };
        cats[category].commands.push(name);
      }
      return cats;
    };

    const generateCommandList = (page = 1, categories) => {
      const categoryKeys = Object.keys(categories).sort((a, b) => a.localeCompare(b));
      const categoriesPerPage = 10;
      const totalPages = Math.max(1, Math.ceil(categoryKeys.length / categoriesPerPage));
      const currentPage = Math.max(1, Math.min(page, totalPages));

      const startIndex = (currentPage - 1) * categoriesPerPage;
      const currentCategories = categoryKeys.slice(startIndex, startIndex + categoriesPerPage);

      let msg = "";
      msg += "୨୧ ─·· 🍰 𝐂𝐨𝐦𝐦𝐚𝐧𝐝 𝐌𝐞𝐧𝐮 🍰 ··─ ୨୧\n\n";
      msg += `🍓 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐬: ${commands.size}\n`;
      msg += `🌐 𝐒𝐲𝐬𝐭𝐞𝐦 𝐩𝐫𝐞𝐟𝐢𝐱: ${globalPrefix}\n`;
      msg += `🛸 𝐘𝐨𝐮𝐫 𝐛𝐨𝐱 𝐩𝐫𝐞𝐟𝐢𝐱: ${boxPrefix}\n`;
      msg += `📖 𝐏𝐚𝐠𝐞: ${currentPage} / ${totalPages}\n\n`;

      for (const category of currentCategories) {
        msg += `╭・─「 🌸 ${fancyFont(String(category).toUpperCase())} 🌸 」\n`;
        const names = categories[category].commands.sort((a, b) => a.localeCompare(b));
        const fancyNames = names.map(n => fancyFont(n));
        for (let i = 0; i < fancyNames.length; i += 3) {
          msg += `│  🎀 ${fancyNames.slice(i, i + 3).join(" ✧ ")}\n`;
        }
        msg += `╰・─── ⬦ 🍓 ⬦ ───・\n\n`;
      }

      msg += `╭─⋅──⋅୨♡୧⋅──⋅─\n`;
      if (currentPage > 1) msg += `│ ⏪ ${boxPrefix}help ${currentPage - 1}\n`;
      if (currentPage < totalPages) msg += `│ ⏩ ${boxPrefix}help ${currentPage + 1}\n`;
      msg += `│ 🔍 ${boxPrefix}help <cmd>\n`;
      msg += `│ 👑 𝐂𝐫𝐞𝐚𝐭𝐨𝐫: ${fancyFont("Washiq")}\n`;
      msg += `╰─⋅──⋅୨♡୧⋅──⋅─\n`;
      msg += `‧₊˚ ☁️⋅♡𓂃 ࣪ ִֶָ☾. 𝐏𝐚𝐠𝐞 ${currentPage}/${totalPages}`;

      return { message: msg, totalPages };
    };

    const gif = getNextHelpGif();

    // page number
    if (args.length > 0 && !isNaN(args[0])) {
      const categories = getCommandCategories();
      const result = generateCommandList(parseInt(args[0]), categories);
      return message.reply({
        body: result.message,
        attachment: await global.utils.getStreamFromURL(gif)
      });
    }

    // command detail
    if (args.length > 0 && isNaN(args[0])) {
      const commandName = args[0].toLowerCase();
      const command = commands.get(commandName) || commands.get(aliases.get(commandName));
      if (!command) return message.reply(`❌ Command "${commandName}" not found.`);

      const cfg = command.config || {};
      const roleText = roleTextToString(cfg.role ?? 0);
      const longDesc = typeof cfg.longDescription === "string"
        ? cfg.longDescription
        : (cfg.longDescription?.en || "No description");

      const guideRaw = typeof cfg.guide === "string"
        ? cfg.guide
        : (cfg.guide?.en || "No guide");

      const usage = guideRaw.replace(/{pn}/g, boxPrefix + cfg.name);

      return message.reply(
`╭────⊙『 ${fancyFont(String(cfg.name).toUpperCase())} 』
│ 📝 ${longDesc}
│ 👑 Author: ${cfg.author || "Unknown"}
│ ⚙️ Usage: ${usage}
│ 🔯 Version: ${cfg.version || "1.0"}
│ ♻️ Role: ${roleText}
╰────────────⊙`
      );
    }

    // default page 1
    const categories = getCommandCategories();
    const result = generateCommandList(1, categories);
    return message.reply({
      body: result.message,
      attachment: await global.utils.getStreamFromURL(gif)
    });
  }
};
