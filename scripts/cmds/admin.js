const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

// Fancy Font Converter (Bolder style to avoid using **)
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
		name: "admin",
		version: "1.6",
		author: "NTKhang",
		countDown: 5,
		role: 3,
		description: {
			en: "Manage bot admin roles with style"
		},
		category: "system",
		guide: {
			en: '{pn} [add | remove | list] <uid | @tag | reply>'
		}
	},

	onStart: async function ({ message, args, usersData, event }) {
		const { adminBot } = config;

		switch (args[0]) {
			case "add":
			case "-a": {
				let uids = [];
				if (event.messageReply) uids.push(event.messageReply.senderID);
				else if (Object.keys(event.mentions).length > 0) uids = Object.keys(event.mentions);
				else uids = args.filter(arg => !isNaN(arg));

				if (uids.length == 0) return message.reply("⚠️ | 𝗣𝗹𝗲𝗮𝘀𝗲 𝗿𝗲𝗽𝗹𝘆, 𝘁𝗮𝗴, 𝗼𝗿 𝗲𝗻𝘁𝗲𝗿 𝗮 𝘃𝗮𝗹𝗶𝗱 𝗨𝗜𝗗.");

				let added = [];
				for (const uid of uids) {
					if (!adminBot.includes(uid)) {
						adminBot.push(uid);
						const name = await usersData.getName(uid);
						added.push(`🍭 ${fancy(name)} ➻ ⁽${fancy(uid)}⁾`);
					}
				}

				if (added.length > 0) {
					writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
					return message.reply(`✅ 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥𝐥𝐲 𝐀𝐝𝐝𝐞𝐝:\n\n${added.join("\n")}`);
				} else return message.reply("⚠️ | 𝗨𝘀𝗲𝗿(𝘀) 𝗮𝗹𝗿𝗲𝗮𝗱𝘆 𝗶𝗻 𝘁𝗵𝗲 𝗹𝗶𝘀𝘁.");
			}

			case "remove":
			case "-r": {
				let uids = [];
				if (event.messageReply) uids.push(event.messageReply.senderID);
				else if (Object.keys(event.mentions).length > 0) uids = Object.keys(event.mentions);
				else uids = args.filter(arg => !isNaN(arg));

				if (uids.length == 0) return message.reply("⚠️ | 𝗣𝗹𝗲𝗮𝘀𝗲 𝗿𝗲𝗽𝗹𝘆, 𝘁𝗮𝗴, 𝗼𝗿 𝗲𝗻𝘁𝗲𝗿 𝗮 𝘃𝗮𝗹𝗶𝗱 𝗨𝗜𝗗.");

				let removed = [];
				for (const uid of uids) {
					const index = adminBot.indexOf(uid);
					if (index !== -1) {
						const name = await usersData.getName(uid);
						adminBot.splice(index, 1);
						removed.push(`🍭 ${fancy(name)} ➻ ⁽${fancy(uid)}⁾`);
					}
				}

				if (removed.length > 0) {
					writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
					return message.reply(`❌ 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥𝐥𝐲 𝐑𝐞𝐦𝐨𝐯𝐞𝐝:\n\n${removed.join("\n")}`);
				} else return message.reply("⚠️ | 𝗨𝘀𝗲𝗿(𝘀) 𝗻𝗼𝘁 𝗳𝗼𝘂𝗻𝗱 𝗶𝗻 𝗮𝗱𝗺𝗶𝗻 𝗹𝗶𝘀𝘁.");
			}

			case "list":
			case "-l": {
				const list = await Promise.all(adminBot.map(async (uid) => {
					const name = await usersData.getName(uid);
					return `🍭 ${fancy(name)} ➻ ⁽${fancy(uid)}⁾`;
				}));

				const msg = `✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n` +
							`👑✨ 𝐑𝐚𝐡𝐚 𝐀𝐈 𝐀𝐝𝐦𝐢𝐧 𝗟𝗶𝘀𝘁 ✨👑\n\n` +
							list.join("\n") +
							`\n\n🍭 𝐌𝐲 𝐟𝐚𝐯𝐨𝐫𝐢𝐭𝐞 𝐡𝐮𝐦𝐚𝐧𝐬 𝐞𝐯𝐞𝐫, 𝐛𝐛𝐲! 🧸\n` +
							`✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄`;

				return message.reply(msg);
			}

			default:
				return message.reply("⚙️ | 𝗨𝘀𝗮𝗴𝗲: `admin [add | remove | list] <reply | tag | uid>`");
		}
	}
};
                                     
