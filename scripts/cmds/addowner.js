module.exports = {
  config: {
    name: "addowner",
    aliases: ["addow", "owneradd"],
    version: "1.0",
    author: "Washiq",
    countDown: 5,
    role: 0,
    category: "group",
    shortDescription: "Add bot owner to this group",
    longDescription: "Anyone can request to add bot owner to the current group (owner ID is auto-detected from config).",
    guide: "{pn}"
  },

  onStart: async function ({ message, api, event }) {
    try {
      // Must be a group
      if (!event.isGroup) return message.reply("❌ This command only works in groups.");

      const ownerID = findOwnerId();
      if (!ownerID) return message.reply("❌ Owner ID not found in config.");

      // Add owner to current group
      await api.addUserToGroup(ownerID, event.threadID);

      return message.reply("✅ Owner added to this group.");
    } catch (e) {
      console.error(e);
      return message.reply("❌ Failed to add owner. Make sure the bot has permission to add members.");
    }
  }
};

// Owner id auto-detect (no hardcode)
function findOwnerId() {
  const cfg = global?.GoatBot?.config || {};
  const pickFirst = (arr) => (Array.isArray(arr) && arr.length ? String(arr[0]) : null);

  // Common places in your config
  return (
    pickFirst(cfg.adminBot) ||
    pickFirst(cfg.devUsers) ||
    pickFirst(cfg.premiumUsers) ||
    pickFirst(cfg.whiteListMode?.whiteListIds) ||
    null
  );
                           }
