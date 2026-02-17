const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const QUIZ_URL = "https://raw.githubusercontent.com/washik02/Washiq-/main/cartoon.json";
const CACHE_DIR = path.join(__dirname, "cache");
const REWARD_AMOUNT = 200;

module.exports = {
    config: {
        name: "cartoon", // আপনি যেটা চাইলেন, একদম সিম্পল নাম
        aliases: ["cq", "cquiz"],
        version: "12.0.0",
        author: "Washiq Adnan",
        countDown: 5,
        role: 0,
        description: "Guess the cartoon character and win money",
        category: "game",
        guide: { en: "{pn}" }
    },

    onStart: async function ({ api, message, event }) {
        try {
            // ১. লোডিং রিঅ্যাকশন (⏳)
            api.setMessageReaction("⏳", event.messageID, () => {}, true);

            const response = await axios.get(`${QUIZ_URL}?t=${Date.now()}`);
            const quizzes = response.data;

            if (!Array.isArray(quizzes)) return message.reply("❌ সার্ভার থেকে ডাটা পাওয়া যায়নি।");

            const selected = quizzes[Math.floor(Math.random() * quizzes.length)];
            const imgExt = path.extname(selected.image) || ".png";
            const imgPath = path.join(CACHE_DIR, `cartoon_${event.senderID}${imgExt}`);
            await fs.ensureDir(CACHE_DIR);

            // ২. ইমেজ ডাউনলোড
            const imgRes = await axios.get(selected.image, { responseType: "arraybuffer" });
            await fs.writeFile(imgPath, Buffer.from(imgRes.data));

            const quizUI = [
                "🖼️ 𝗚𝗨𝗘𝗦𝗦 𝗧𝗛𝗘 𝗖𝗔𝗥𝗧𝗢𝗢𝗡",
                "━━━━━━━━━━━━━━━━━━",
                `❓ ${selected.question}`,
                "",
                `${selected.options[0]}`,
                `${selected.options[1]}`,
                `${selected.options[2]}`,
                `${selected.options[3]}`,
                "━━━━━━━━━━━━━━━━━━",
                `💰 Reward: $${REWARD_AMOUNT}`,
                "💬 Reply with A, B, C, or D!"
            ].join("\n");

            // ৩. ইমেজ পাঠানো সফল হলে রিঅ্যাকশন (🖼️)
            api.setMessageReaction("🖼️", event.messageID, () => {}, true);

            return message.reply({
                body: quizUI,
                attachment: fs.createReadStream(imgPath)
            }, (err, info) => {
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
                if (err) return;

                global.GoatBot.onReply.set(info.messageID, {
                    commandName: this.config.name,
                    author: event.senderID,
                    answer: selected.answer.toLowerCase().trim()
                });
            });

        } catch (error) {
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            console.error(error);
            return message.reply("❌ ইমেজ লোড করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
        }
    },

    onReply: async function ({ api, message, event, Reply, usersData }) {
        const { author, answer } = Reply;

        if (event.senderID !== author) return;

        const input = event.body.trim().toLowerCase();
        if (!["a", "b", "c", "d"].includes(input)) return;

        global.GoatBot.onReply.delete(Reply.messageID);

        if (input === answer) {
            try {
                // ৪. ব্যালেন্স যোগ করা
                const currentMoney = await usersData.get(event.senderID, "money") || 0;
                const newBalance = Number(currentMoney) + REWARD_AMOUNT;
                await usersData.set(event.senderID, { money: newBalance });

                api.setMessageReaction("✅", event.messageID, () => {}, true);
                return message.reply(`✅ Correct Answer!\n💰 Reward: +$${REWARD_AMOUNT}\n💳 Balance: $${newBalance}`);
            } catch (e) {
                return message.reply("✅ Correct! (Money update failed)");
            }
        } else {
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            return message.reply(`❌ Wrong Answer!\n💡 The correct was: ${answer.toUpperCase()}`);
        }
    }
};
    
