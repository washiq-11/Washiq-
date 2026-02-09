module.exports = {
  config: {
    name: "tagme",
    aliases: ["tag", "tme"],
    version: "2.1",
    author: "IP@AR61.58736.72.29815",
    shortDescription: "List groups and tag yourself by selection",
    longDescription: "Shows group list with name & ID, reply with t-number to tag yourself in that group",
    category: "owner",
    guide: "{pn} → show group list\nReply: t-1 / 1"
  },

  onStart: async function ({ message, api, event, commandName }) {
    const senderID = String(event.senderID);

    // ===== Permission (GoatBot config) =====
    const cfg = global?.GoatBot?.config || {};
    const adminBot = (cfg.adminBot || []).map(String);
    const devUsers = (cfg.devUsers || []).map(String);

    if (!adminBot.includes(senderID) && !devUsers.includes(senderID)) {
      return message.reply("❌ You don’t have permission to use this command.");
    }
    // ======================================

    try {
      const threadList = await api.getThreadList(100, null, ["INBOX"]);
      const groups = (threadList || []).filter(t => t.isGroup && t.threadID);

      if (groups.length === 0) {
        return message.reply("ℹ️ No groups found.");
      }

      let body = "📋 Group List (reply with t-<number>)\n\n";
      const mapped = [];

      groups.forEach((g, i) => {
        const idx = i + 1;
        body +=
          `t-${idx}. ${g.name || "Unnamed Group"}\n` +
          `   🆔 ${g.threadID}\n\n`;

        mapped.push({
          index: idx,
          threadID: g.threadID,
          name: g.name || "Unnamed Group"
        });
      });

      message.reply(body.trim(), (err, info) => {
        if (err) return;
        global.GoatBot.onReply.set(info.messageID, {
          commandName,
          messageID: info.messageID,
          author: event.senderID,
          mapped
        });
      });
    } catch (err) {
      console.error(err);
      return message.reply("❌ Failed to fetch group list.");
    }
  },

  onReply: async function ({ message, Reply, event, api }) {
    const { author, mapped, messageID } = Reply;

    if (String(event.senderID) !== String(author)) {
      return message.reply("❌ Only the requester can select.");
    }

    const raw = (event.body || "").trim().toLowerCase();
    let n = raw.startsWith("t-")
      ? parseInt(raw.slice(2), 10)
      : parseInt(raw, 10);

    if (!n || n < 1 || n > mapped.length) {
      return message.reply(`❌ Invalid choice. Use t-1 to t-${mapped.length}.`);
    }

    const target = mapped[n - 1];

    try {
      const userInfo = await api.getUserInfo(event.senderID);
      const name = userInfo[event.senderID]?.name || "Owner";

      await api.sendMessage(
        {
          body: name,          // শুধু নাম
          mentions: [
            {
              tag: name,       // @ থাকবে না
              id: event.senderID
            }
          ]
        },
        target.threadID
      );

      try { api.unsendMessage(messageID); } catch (_) {}

      return message.reply(`✅ Tagged you in:\n${target.name}\n🆔 ${target.threadID}`);
    } catch (err) {
      console.error(err);
      return message.reply("❌ Failed to tag in that group.");
    }
  }
};
