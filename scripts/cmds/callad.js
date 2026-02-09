const { getStreamsFromAttachment, log } = global.utils;

const mediaTypes = ["photo", "png", "animated_image", "video", "audio"];
const SUPPORT_GROUP_ID = "1480449516759776";

module.exports = {
  config: {
    name: "callad",
    aliases: ["call", "called"],
    version: "4.1",
    author: "Washiq",
    countDown: 5,
    role: 0,
    category: "contacts admin",
    description: { en: "Relay messages to support group with continuous reply chain" },
    guide: { en: "{pn} <your message>" }
  },

  langs: {
    en: {
      missingMessage: "❗ Please write a message to send",
      sent: "✅your message successfully send it to bot Admin✅",
      noPermReply: "❌ Only bot main staff can reply from support group.",
      err: "❌ Error: %1"
    }
  },

  onStart: async function ({
    args, message, event, usersData, threadsData, api, commandName, getLang
  }) {
    if (!args[0]) return message.reply(getLang("missingMessage"));

    try {
      const { senderID, threadID, isGroup } = event;
      const senderName = await usersData.getName(senderID);

      // ✅ Support group-এ source (group নাম/ID) দেখাবে
      let sourceLine = "";
      if (isGroup) {
        let groupName = "Unknown Group";
        try {
          const tData = await threadsData.get(threadID);
          groupName = tData?.threadName || groupName;
        } catch (_) {}
        sourceLine = `👥 From Group: ${groupName}\n🧵 Thread ID: ${threadID}`;
      } else {
        sourceLine = `👤 From Private Chat\n🧵 Thread ID: ${threadID}`;
      }

      const body =
        "📞 CALL ADMIN\n\n" +
        `👤 User: ${senderName}\n` +
        `🆔 User ID: ${senderID}\n` +
        `${sourceLine}\n\n` +
        `📩 Message:\n${args.join(" ")}\n\n` +
        "↩️ Reply to respond";

      const attachment = await getStreamsFromAttachment(
        [...event.attachments, ...(event.messageReply?.attachments || [])]
          .filter(item => mediaTypes.includes(item.type))
      );

      api.sendMessage(
        {
          body,
          mentions: [{ id: senderID, tag: senderName }],
          attachment
        },
        SUPPORT_GROUP_ID,
        (err, info) => {
          if (err) {
            log.err("CALLAD_SEND_SUPPORT_GROUP", err);
            return message.reply(getLang("err", err.message || err));
          }

          const rootSupportMsgID = info.messageID;

          // staff reply (support group) -> user thread
          global.GoatBot.onReply.set(rootSupportMsgID, {
            commandName,
            type: "support_to_user",
            userThreadID: threadID,
            rootSupportMsgID
          });

          // ✅ ইউজারকে শুধু তোমার টেক্সটটাই দেখাবে (support group mention নাই)
          return message.reply(getLang("sent"));
        }
      );
    } catch (e) {
      log.err("CALLAD", e);
      return message.reply(getLang("err", e.message || e));
    }
  },

  onReply: async function ({
    args, event, api, message, Reply, usersData, threadsData, commandName, getLang
  }) {
    const cfg = global?.GoatBot?.config || {};
    const adminBot = (cfg.adminBot || []).map(String);
    const devUsers = (cfg.devUsers || []).map(String);
    const premiumUsers = (cfg.premiumUsers || []).map(String);

    const staff = new Set([...adminBot, ...devUsers, ...premiumUsers]);

    // 1) staff reply in support group -> user thread
    if (Reply.type === "support_to_user") {
      if (String(event.threadID) !== SUPPORT_GROUP_ID) return;

      if (!staff.has(String(event.senderID))) {
        return message.reply(getLang("noPermReply"));
      }

      try {
        const staffName = await usersData.getName(event.senderID);
        const replyText = args.join(" ").trim();

        api.sendMessage(
          { body: `👤 ${staffName}:\n${replyText}\n\n↩️ Reply to continue` },
          Reply.userThreadID,
          (err, info) => {
            if (err) return;

            // user replies to this -> goes back to support group
            global.GoatBot.onReply.set(info.messageID, {
              commandName,
              type: "user_to_support",
              userThreadID: Reply.userThreadID,
              rootSupportMsgID: Reply.rootSupportMsgID
            });
          }
        );
      } catch (e) {
        log.err("CALLAD_SUPPORT_TO_USER", e);
        return message.reply(getLang("err", e.message || e));
      }
      return;
    }

    // 2) user reply in their thread -> support group (include source info আবারও)
    if (Reply.type === "user_to_support") {
      if (String(event.threadID) !== String(Reply.userThreadID)) return;

      try {
        const senderName = await usersData.getName(event.senderID);
        const text = args.join(" ").trim();

        // source info for support group
        let sourceLine = "";
        try {
          const isGroup = !!event.isGroup;
          if (isGroup) {
            let groupName = "Unknown Group";
            try {
              const tData = await threadsData.get(event.threadID);
              groupName = tData?.threadName || groupName;
            } catch (_) {}
            sourceLine = `👥 From Group: ${groupName}\n🧵 Thread ID: ${event.threadID}`;
          } else {
            sourceLine = `👤 From Private Chat\n🧵 Thread ID: ${event.threadID}`;
          }
        } catch (_) {}

        const attachment = await getStreamsFromAttachment(
          [...event.attachments, ...(event.messageReply?.attachments || [])]
            .filter(item => mediaTypes.includes(item.type))
        );

        api.sendMessage(
          {
            body:
              "📩 USER REPLY\n\n" +
              `👤 User: ${senderName}\n` +
              `🆔 User ID: ${event.senderID}\n` +
              `${sourceLine}\n\n` +
              `💬 Reply:\n${text}\n\n` +
              "↩️ Reply to respond",
            mentions: [{ id: event.senderID, tag: senderName }],
            attachment
          },
          SUPPORT_GROUP_ID,
          (err, info) => {
            if (err) return;

            global.GoatBot.onReply.set(info.messageID, {
              commandName,
              type: "support_to_user",
              userThreadID: Reply.userThreadID,
              rootSupportMsgID: Reply.rootSupportMsgID
            });

            // root ticket active রাখি
            global.GoatBot.onReply.set(Reply.rootSupportMsgID, {
              commandName,
              type: "support_to_user",
              userThreadID: Reply.userThreadID,
              rootSupportMsgID: Reply.rootSupportMsgID
            });
          },
          Reply.rootSupportMsgID
        );
      } catch (e) {
        log.err("CALLAD_USER_TO_SUPPORT", e);
        return message.reply(getLang("err", e.message || e));
      }
      return;
    }
  }
};
