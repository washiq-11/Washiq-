const fs = require("fs-extra");
const path = require("path");

const balanceFile = path.join(__dirname, "coinxbalance.json");

module.exports = {
    config: {
        name: "send",
        aliases: ["pay", "transfer"],
        version: "1.0.5",
        author: "Washiq Adnan",
        countDown: 5,
        role: 0,
        description: "Transfer Rcash to another user like Bkash",
        category: "economy",
        guide: "{pn} @tag amount"
    },

    onStart: async function ({ message, event, args }) {
        const { senderID, mentions } = event;

        if (!fs.existsSync(balanceFile)) {
            return message.reply("Error: Balance database not found!");
        }

        let userData = JSON.parse(fs.readFileSync(balanceFile, "utf8"));

        const mentionIDs = Object.keys(mentions);
        const amount = parseInt(args[args.length - 1]);

        if (mentionIDs.length === 0 || isNaN(amount) || amount <= 0) {
            return message.reply("Usage: !send @user 500");
        }

        const receiverID = mentionIDs[0];

        if (receiverID === senderID) {
            return message.reply("You cannot send money to yourself!");
        }

        if (!userData[senderID] || userData[senderID].balance < amount) {
            return message.reply(`Insufficient balance! Your current balance: $${userData[senderID] ? userData[senderID].balance : 0}`);
        }

        if (!userData[receiverID]) {
            userData[receiverID] = { balance: 0 };
        }

        // Process Transfer
        userData[senderID].balance -= amount;
        userData[receiverID].balance += amount;

        // Save Data
        fs.writeFileSync(balanceFile, JSON.stringify(userData, null, 4));

        const receiverName = mentions[receiverID].replace("@", "");
        message.reply(`✅ Successfully sent $${amount} Rcash!\n👤 Receiver: ${receiverName}\n💰 Your New Balance: $${userData[senderID].balance}`);
    }
};
              
