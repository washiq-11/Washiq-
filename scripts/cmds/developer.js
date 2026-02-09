const fs = require("fs-extra");

module.exports = {
  config: {
    name: "developer",
    aliases: ["dev"],
    version: "1.1",
    author: "Washiq",
    countDown: 5,
    role: 0, // role systemে সমস্যা থাকলে 0 রাখাই safe, permission আমরা নিচে নিজে চেক করছি
    description: {
      vi: "Thêm, xóa, sửa quyền developer",
      en: "Add, remove, edit developer role"
    },
    category: "owner",
    guide: {
      vi:
        "   {pn} [add | -a] <uid | @tag | reply>: Thêm quyền developer\n" +
        "   {pn} [remove | -r] <uid | @tag | reply>: Xóa quyền developer\n" +
        "   {pn} [list | -l]: Danh sách developers",
      en:
        "   {pn} [add | -a] <uid | @tag | reply>: Add developer role\n" +
        "   {pn} [remove | -r] <uid | @tag | reply>: Remove developer role\n" +
        "   {pn} [list | -l]: List all developers"
    }
  },

  langs: {
    vi: {
      added: "✓ | Đã thêm quyền developer cho %1 người dùng:\n%2",
      alreadyDev: "\n⚠ | %1 người dùng đã có quyền developer từ trước rồi:\n%2",
      missingIdAdd: "⚠ | Vui lòng tag/reply hoặc nhập UID để thêm developer",
      removed: "✓ | Đã xóa quyền developer của %1 người dùng:\n%2",
      notDev: "⚠ | %1 người dùng không có quyền developer:\n%2",
      missingIdRemove: "⚠ | Vui lòng tag/reply hoặc nhập UID để xóa developer",
      listDev: "⚙ | Danh sách developers:\n%1",
      noPerm: "❌ Bạn không có quyền dùng lệnh này"
    },
    en: {
      added: "✓ | Added developer role for %1 users:\n%2",
      alreadyDev: "\n⚠ | %1 users already have developer role:\n%2",
      missingIdAdd: "⚠ | Please tag/reply or provide UID to add developer role",
      removed: "✓ | Removed developer role of %1 users:\n%2",
      notDev: "⚠ | %1 users don't have developer role:\n%2",
      missingIdRemove: "⚠ | Please tag/reply or provide UID to remove developer role",
      listDev: "⚙ | List of developers:\n%1",
      noPerm: "❌ You don’t have permission to use this command"
    }
  },

  onStart: async function ({ message, args, usersData, event, getLang }) {
    // ===== permission: only admin/dev/owner-like =====
    const cfg = global?.GoatBot?.config || {};
    const senderID = String(event.senderID);

    const staff = new Set([
      ...(Array.isArray(cfg.adminBot) ? cfg.adminBot : []),
      ...(Array.isArray(cfg.devUsers) ? cfg.devUsers : []),
      ...(Array.isArray(cfg.premiumUsers) ? cfg.premiumUsers : [])
    ].map(String));

    if (!staff.has(senderID)) {
      return message.reply(getLang("noPerm"));
    }
    // ==============================================

    if (!Array.isArray(cfg.devUsers)) cfg.devUsers = [];

    const sub = (args[0] || "").toLowerCase();

    if (sub === "list" || sub === "-l") {
      const getNames = await Promise.all(
        cfg.devUsers.map(uid => usersData.getName(uid).then(name => ({ uid, name })))
      );
      return message.reply(getLang("listDev", getNames.map(({ uid, name }) => `• ${name} (${uid})`).join("\n")));
    }

    const uids = collectTargetUids(args, event);
    if ((sub === "add" || sub === "-a")) {
      if (uids.length === 0) return message.reply(getLang("missingIdAdd"));

      const toAdd = [];
      const already = [];

      for (const uid of uids) {
        if (cfg.devUsers.map(String).includes(String(uid))) already.push(String(uid));
        else toAdd.push(String(uid));
      }

      cfg.devUsers.push(...toAdd);

      await saveConfig(cfg);

      const addedNames = await Promise.all(
        toAdd.map(uid => usersData.getName(uid).then(name => ({ uid, name })))
      );

      return message.reply(
        (toAdd.length ? getLang("added", toAdd.length, addedNames.map(x => `• ${x.name} (${x.uid})`).join("\n")) : "") +
        (already.length ? getLang("alreadyDev", already.length, already.map(uid => `• ${uid}`).join("\n")) : "")
      );
    }

    if ((sub === "remove" || sub === "-r")) {
      if (uids.length === 0) return message.reply(getLang("missingIdRemove"));

      const removed = [];
      const notDev = [];

      for (const uid of uids.map(String)) {
        const idx = cfg.devUsers.map(String).indexOf(uid);
        if (idx !== -1) {
          removed.push(uid);
          cfg.devUsers.splice(idx, 1);
        } else {
          notDev.push(uid);
        }
      }

      await saveConfig(cfg);

      const removedNames = await Promise.all(
        removed.map(uid => usersData.getName(uid).then(name => ({ uid, name })))
      );

      return message.reply(
        (removed.length ? getLang("removed", removed.length, removedNames.map(x => `• ${x.name} (${x.uid})`).join("\n")) : "") +
        (notDev.length ? getLang("notDev", notDev.length, notDev.map(uid => `• ${uid}`).join("\n")) : "")
      );
    }

    return message.SyntaxError();
  }
};

function collectTargetUids(args, event) {
  // Priority: mention > reply > numeric args
  const mentionIds = event?.mentions ? Object.keys(event.mentions) : [];
  if (mentionIds.length) return mentionIds.map(String);

  if (event?.messageReply?.senderID) return [String(event.messageReply.senderID)];

  // collect all numeric-looking tokens (UIDs)
  return (args || []).filter(x => /^\d+$/.test(x)).map(String);
}

async function saveConfig(configObj) {
  // Try to save to the bot's config path, fallback to ./config.json
  const path =
    global?.client?.dirConfig ||
    global?.client?.dirConfigFile ||
    global?.GoatBot?.dirConfig ||
    "config.json";

  await fs.writeJson(path, configObj, { spaces: 2 });
                }
