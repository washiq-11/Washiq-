module.exports = {
  config: {
    name: "calladgc",
    aliases: ["cagc", "callgc"],
    version: "2.3",
    author: "Washiq",
    countDown: 5,
    role: 2,
    category: "owner",
    guide: {
      en:
        "{pn} -> show valid group list (bot present)\n" +
        "Reply with number -> select group\n" +
        "Then reply with message -> send to that group\n" +
        "Replies relay back to inbox group"
    }
  },

  onStart: async function ({ message, event, threadsData, api }) {
    const INBOX_THREAD_ID = "1480449516759776"; // fixed inbox group

    if (String(event.threadID) !== INBOX_THREAD_ID) {
      return message.reply("❌ Use this command in the Inbox Group only.");
    }

    const allThreads = await threadsData.getAll();
    const rawGroups = (allThreads || []).filter(t => t?.threadID && t?.isGroup);

    if (!rawGroups.length) return message.reply("❌ Bot database has no groups.");

    // Validate groups by live fetch (bot is present)
    const MAX_CHECK = 80; // increase carefully
    const groupsToCheck = rawGroups.slice(0, MAX_CHECK);

    const validGroups = [];
    for (const g of groupsToCheck) {
      try {
        const info = await api.getThreadInfo(g.threadID);
        // if this succeeds, bot can see the thread -> likely present
        validGroups.push({
          threadID: g.threadID,
          name: info?.threadName || g.name || "Unnamed Group"
        });
      } catch (e) {
        // bot not in thread / no permission -> skip
      }
    }

    if (!validGroups.length) {
      return message.reply("❌ No valid groups found (bot may not be in any group).");
    }

    let msg = `📋 Group List (Bot Present)\n\n`;
    validGroups.forEach((g, i) => {
      msg += `${i + 1}. ${g.name}\n   🆔 ${g.threadID}\n\n`;
    });

    message.reply(msg, (err, info) => {
      if (err) return;
      global.GoatBot.onReply.set(info.messageID, {
        commandName: "calladgc",
        step: "choose_group",
        author: event.senderID,
        inboxThreadID: INBOX_THREAD_ID,
        groups: validGroups
      });
    });
  },

  onReply: async function ({ message, event, api, usersData, Reply }) {
    if (!Reply || Reply.commandName !== "calladgc") return;

    const INBOX_THREAD_ID = String(Reply.inboxThreadID || "1480449516759776");

    if (Reply.step === "choose_group") {
      if (String(event.threadID) !== INBOX_THREAD_ID) return;
      if (String(event.senderID) !== String(Reply.author)) {
        return message.reply("❌ Only the command sender can reply.");
      }

      const index = parseInt((event.body || "").trim(), 10);
      if (isNaN(index) || index < 1 || index > Reply.groups.length) {
        return message.reply("❌ Invalid number.");
      }

      const chosen = Reply.groups[index - 1];

      return message.reply(
        `✅ Selected: ${chosen.name}\n🆔 ${chosen.threadID}\n\nPlease write the text message to send this gc`,
        (err, info) => {
          if (err) return;
          global.GoatBot.onReply.set(info.messageID, {
            commandName: "calladgc",
            step: "write_message",
            author: Reply.author,
            inboxThreadID: INBOX_THREAD_ID,
            targetThreadID: chosen.threadID
          });
        }
      );
    }

    if (Reply.step === "write_message") {
      if (String(event.threadID) !== INBOX_THREAD_ID) return;
      if (String(event.senderID) !== String(Reply.author)) {
        return message.reply("❌ Only the command sender can reply.");
      }

      const text = (event.body || "").trim();
      if (!text) return message.reply("❌ Please write something to send.");

      const ownerName = await usersData.getName(Reply.author).catch(() => "Owner");

      const bodyToGroup =
        `📩 Message from ${ownerName}\n\n` +
        `${text}\n\n` +
        `↩️ Reply to this message to respond`;

      return api.sendMessage({ body: bodyToGroup }, Reply.targetThreadID, (err, info) => {
        if (err) return message.reply("❌ Failed to send message to that group.");

        global.GoatBot.onReply.set(info.messageID, {
          commandName: "calladgc",
          step: "group_to_inbox",
          ownerID: Reply.author,
          inboxThreadID: INBOX_THREAD_ID,
          targetThreadID: Reply.targetThreadID
        });

        return message.reply("✅ Message sent. Replies will come here (Inbox Group).");
      });
    }

    if (Reply.step === "group_to_inbox") {
      const groupUserID = event.senderID;
      const groupText = (event.body || "").trim();
      if (!groupText) return;

      const groupUserName = await usersData.getName(groupUserID).catch(() => "User");

      const forwardBody =
        `💬 Reply from GC\n\n` +
        `👤 ${groupUserName}\n` +
        `🆔 ${groupUserID}\n\n` +
        `📩 Message:\n${groupText}\n\n` +
        `↩️ Reply to this message to respond`;

      return api.sendMessage({ body: forwardBody }, INBOX_THREAD_ID, (err, info) => {
        if (err) return;

        global.GoatBot.onReply.set(info.messageID, {
          commandName: "calladgc",
          step: "inbox_to_group",
          ownerID: Reply.ownerID,
          inboxThreadID: INBOX_THREAD_ID,
          targetThreadID: Reply.targetThreadID,
          replyToGroupMsgID: event.messageID
        });
      });
    }

    if (Reply.step === "inbox_to_group") {
      if (String(event.threadID) !== INBOX_THREAD_ID) return;
      if (String(event.senderID) !== String(Reply.ownerID)) {
        return message.reply("❌ Only owner can reply here.");
      }

      const text = (event.body || "").trim();
      if (!text) return;

      const ownerName = await usersData.getName(Reply.ownerID).catch(() => "Owner");

      const bodyToGroup =
        `📩 Reply from ${ownerName}\n\n` +
        `${text}\n\n` +
        `↩️ Reply to continue`;

      return api.sendMessage(
        { body: bodyToGroup },
        Reply.targetThreadID,
        (err, info) => {
          if (err) return;

          global.GoatBot.onReply.set(info.messageID, {
            commandName: "calladgc",
            step: "group_to_inbox",
            ownerID: Reply.ownerID,
            inboxThreadID: INBOX_THREAD_ID,
            targetThreadID: Reply.targetThreadID
          });
        },
        Reply.replyToGroupMsgID
      );
    }
  }
};
