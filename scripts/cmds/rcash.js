module.exports = {
  config: {
    name: "Rcash",
    aliases: ["rcash", "rc", "sendcash", "transfer"],
    version: "2.3.0",
    author: "Washiq",
    countDown: 5,
    role: 0,
    description: "Transfer money via reply / mention / UID (auto prefix detect)",
    category: "economy",
    guide: "{pn} 100 (reply)\n{pn} @mention 100\n{pn} @mention-100\n{pn} 100 <uid>"
  },

  onStart: async function ({ message, event, args, usersData }) {
    const senderID = event.senderID;

    // ✅ Auto prefix detect
    const getPrefix = (threadID) => {
      // If bot has helper
      try {
        if (global.utils && typeof global.utils.getPrefix === "function") {
          return global.utils.getPrefix(threadID) || "";
        }
      } catch (_) {}

      // Common config locations
      const cfg = global.GoatBot?.config || global.config || {};
      const p =
        cfg.prefix ??
        cfg.PREFIX ??
        global.GoatBot?.prefix ??
        global.PREFIX ??
        "";

      if (Array.isArray(p) && p.length) return String(p[0]);
      return String(p || "");
    };

    const prefix = getPrefix(event.threadID) || "";

    // ---------- Find receiver ----------
    let receiverID = null;

    // 1) Reply mode
    if (event.messageReply?.senderID) receiverID = event.messageReply.senderID;

    // 2) Mention mode
    if (!receiverID && event.mentions && Object.keys(event.mentions).length > 0) {
      receiverID = Object.keys(event.mentions)[0];
    }

    // 3) UID mode (any long number in args)
    if (!receiverID) {
      // Prefer last numeric chunk like a UID (>= 6 digits)
      const possibleUID = [...args].reverse().find((a) => /^\d{6,}$/.test(a));
      if (possibleUID) receiverID = possibleUID;
    }

    if (!receiverID) {
      return message.reply(
        "Usage:\n" +
          `- Reply someone: ${prefix}Rcash 100\n` +
          `- Mention: ${prefix}Rcash @user 100  OR  ${prefix}Rcash @user-100\n` +
          `- UID: ${prefix}Rcash 100 <uid>`
      );
    }

    if (receiverID === senderID) {
      return message.reply("You can't transfer money to yourself.");
    }

    // ---------- Parse amount ----------
    // support "@user-100"
    let amount = null;
    const body = event.body || "";

    const dashMatch = body.match(/-(\d+)\b/);
    if (dashMatch) amount = parseInt(dashMatch[1], 10);

    // otherwise: first pure number in args
    if (!amount) {
      const numArg = args.find((a) => /^\d+$/.test(a));
      if (numArg) amount = parseInt(numArg, 10);
    }

    if (!amount || amount <= 0) {
      return message.reply(
        "Please provide a valid amount.\n" +
          `Example: ${prefix}Rcash @user-100`
      );
    }

    // ---------- Load balances ----------
    let senderMoney = await usersData.get(senderID, "money");
    let receiverMoney = await usersData.get(receiverID, "money");

    if (typeof senderMoney !== "number") senderMoney = 0;
    if (typeof receiverMoney !== "number") receiverMoney = 0;

    if (amount > senderMoney) {
      return message.reply(
        `Transfer failed: insufficient balance.\nYour balance: ${senderMoney}$`
      );
    }

    // ---------- Transfer ----------
    const newSenderMoney = senderMoney - amount;
    const newReceiverMoney = receiverMoney + amount;

    await usersData.set(senderID, { money: newSenderMoney });
    await usersData.set(receiverID, { money: newReceiverMoney });

    // ---------- Success message (English) ----------
    return message.reply(
      "✅ Transfer Successful!\n\n" +
        `Sent: ${amount}$\n` +
        `Your New Balance: ${newSenderMoney}$`
    );
  }
};
