module.exports = {
  config: {
    name: "ownerPrefix",
    version: "1.0",
    author: "Washiq"
  },

  onChat: async function ({ event }) {
    const cfg = global?.GoatBot?.config || {};
    const secretPrefix = cfg.ownerSecretPrefix;

    // feature off
    if (!secretPrefix) return;
    if (cfg.ownerSecretPrefixEnable === false) return;

    const body = (event.body || "").trim();
    if (!body.startsWith(secretPrefix)) return;

    const senderID = String(event.senderID);

    // Only staff can use secret prefix
    const allowed = new Set([
      ...(cfg.adminBot || []),
      ...(cfg.devUsers || []),
      ...(cfg.premiumUsers || [])
    ].map(String));

    if (!allowed.has(senderID)) {
      event.body = ""; // block
      return;
    }

    // Convert secret prefix -> normal prefix
    const normalPrefix = cfg.prefix || "?";
    event.body = normalPrefix + body.slice(secretPrefix.length);
  }
};
