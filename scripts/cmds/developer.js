const fs = require("fs-extra");

// Fancy Font Converter Function
function fancy(text) {
	const map = {
		'0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗',
		'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
		'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙'
	};
	return text.split('').map(c => map[c] || c).join('');
}

module.exports = {
  config: {
    name: "developer",
    aliases: ["dev"],
    version: "1.1",
    author: "Washiq",
    countDown: 5,
    role: 0,
    description: {
      en: "Add, remove, or list bot developers with style"
    },
    category: "owner",
    guide: {
      en: "{pn} [add | remove | list] <uid | @tag | reply>"
    }
  },

  onStart: async function ({ message, args, usersData, event }) {
    const cfg = global?.GoatBot?.config || {};
    const senderID = String(event.senderID);

    // Permission check
    const staff = new Set([
      ...(Array.isArray(cfg.adminBot) ? cfg.adminBot : []),
      ...(Array.isArray(cfg.devUsers) ? cfg.devUsers : []),
      ...(Array.isArray(cfg.premiumUsers) ? cfg.premiumUsers : [])
    ].map(String));

    if (!staff.has(senderID)) {
      return message.reply("⚠️ | 𝗬𝗼𝘂 𝗱𝗼𝗻'𝘁 𝗵𝗮𝘃𝗲 𝗽𝗲𝗿𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝘁𝗼 𝘂𝘀𝗲 𝘁𝗵𝗶𝘀 𝗰𝗼𝗺𝗺𝗮𝗻𝗱.");
    }

    if (!Array.isArray(cfg.devUsers)) cfg.devUsers = [];
    const sub = (args[0] || "").toLowerCase();

    // LIST DEVELOPERS
    if (sub === "list" || sub === "-l") {
      const getNames = await Promise.all(
        cfg.devUsers.map(uid => usersData.getName(uid).then(name => ({ uid, name })))
      );
      
      const list = getNames.map(({ uid, name }) => `🍭 ${fancy(name)} ➻ ⁽${fancy(uid)}⁾`).join("\n");
      
      const msg = `✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n` +
                  `🛠️✨ 𝐑𝐚𝐡𝐚 𝐀𝐈 𝐃𝐞𝐯𝐞𝐥𝐨𝐩𝐞𝐫 𝐋𝐢𝐬𝐭 ✨🛠️\n\n` +
                  (list || "No developers found.") +
                  `\n\n🍭 𝐓𝐡𝐞 𝐦𝐢𝐧𝐝𝐬 𝐛𝐞𝐡𝐢𝐧𝐝 𝐭𝐡𝐞 𝐛𝐨𝐭! 🧸\n` +
                  `✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄`;
      
      return message.reply(msg);
    }

    const uids = collectTargetUids(args, event);

    // ADD DEVELOPER
    if (sub === "add" || sub === "-a") {
      if (uids.length === 0) return message.reply("⚠️ | 𝗣𝗹𝗲𝗮𝘀𝗲 𝗿𝗲𝗽𝗹𝘆, 𝘁𝗮𝗴, 𝗼𝗿 𝗲𝗻𝘁𝗲𝗿 𝗮 𝘃𝗮𝗹𝗶𝗱 𝗨𝗜𝗗.");

      let addedList = [];
      for (const uid of uids) {
        if (!cfg.devUsers.map(String).includes(String(uid))) {
          cfg.devUsers.push(String(uid));
          const name = await usersData.getName(uid);
          addedList.push(`🍭 ${fancy(name)} ➻ ⁽${fancy(uid)}⁾`);
        }
      }

      if (addedList.length > 0) {
        await saveConfig(cfg);
        return message.reply(`✅ 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥𝐥𝐲 𝐀𝐝𝐝𝐞𝐝 𝐃𝐞𝐯:\n\n${addedList.join("\n")}`);
      } else return message.reply("⚠️ | 𝗨𝘀𝗲𝗿(𝘀) 𝗮𝗹𝗿𝗲𝗮𝗱𝘆 𝗶𝗻 𝘁𝗵𝗲 𝗱𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿 𝗹𝗶𝘀𝘁.");
    }

    // REMOVE DEVELOPER
    if (sub === "remove" || sub === "-r") {
      if (uids.length === 0) return message.reply("⚠️ | 𝗣𝗹𝗲𝗮𝘀𝗲 𝗿𝗲𝗽𝗹𝘆, 𝘁𝗮𝗴, 𝗼𝗿 𝗲𝗻𝘁𝗲𝗿 𝗮 𝘃𝗮𝗹𝗶𝗱 𝗨𝗜𝗗.");

      let removedList = [];
      for (const uid of uids.map(String)) {
        const idx = cfg.devUsers.map(String).indexOf(uid);
        if (idx !== -1) {
          cfg.devUsers.splice(idx, 1);
          const name = await usersData.getName(uid);
          removedList.push(`🍭 ${fancy(name)} ➻ ⁽${fancy(uid)}⁾`);
        }
      }

      if (removedList.length > 0) {
        await saveConfig(cfg);
        return message.reply(`❌ 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥𝐥𝐲 𝐑𝐞𝐦𝐨𝐯𝐞𝐝 𝐃𝐞𝐯:\n\n${removedList.join("\n")}`);
      } else return message.reply("⚠️ | 𝗨𝘀𝗲𝗿(𝘀) 𝗻𝗼𝘁 𝗳𝗼𝘂𝗻𝗱 𝗶𝗻 𝗱𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿 𝗹𝗶𝘀𝘁.");
    }

    return message.reply("⚙️ | 𝗨𝘀𝗮𝗴𝗲: `dev [add | remove | list] <reply | tag | uid>`");
  }
};

function collectTargetUids(args, event) {
  const mentionIds = event?.mentions ? Object.keys(event.mentions) : [];
  if (mentionIds.length) return mentionIds.map(String);
  if (event?.messageReply?.senderID) return [String(event.messageReply.senderID)];
  return (args || []).filter(x => /^\d+$/.test(x)).map(String);
}

async function saveConfig(configObj) {
  const path = global?.client?.dirConfig || global?.client?.dirConfigFile || global?.GoatBot?.dirConfig || "config.json";
  await fs.writeJson(path, configObj, { spaces: 2 });
      }
