const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

const QUIZ_URL = "https://raw.githubusercontent.com/washik02/Washiq-/0f620bc71d05e0d67912470c044bd49eaaa84827/quiz.json";
const CACHE_PATH = path.join(__dirname, "cache", "quiz_cache.json");
const REWARD_AMOUNT = 200;

/**
 * Clean options to prevent "A. A. Answer" formatting issues
 */
function formatOption(text) {
    if (!text) return "N/A";
    return String(text).replace(/^\s*[A-D]\s*\.\s*/i, "").trim();
}

/**
 * Generate a unique ID for each question to track usage
 */
function getQuestionId(q) {
    const hashData = `${q.question}${JSON.stringify(q.options)}`;
    return crypto.createHash("sha1").update(hashData).digest("hex");
}

async function getQuestions() {
    try {
        const response = await axios.get(QUIZ_URL, { timeout: 10000 });
        const data = response.data;
        if (Array.isArray(data)) {
            await fs.ensureDir(path.dirname(CACHE_PATH));
            await fs.writeJson(CACHE_PATH, data);
            return data;
        }
    } catch (error) {
        if (await fs.pathExists(CACHE_PATH)) {
            return await fs.readJson(CACHE_PATH);
        }
    }
    return null;
}

module.exports = {
    config: {
        name: "qz",
        aliases: ["quiz", "trivia"],
        version: "6.1.0",
        author: "Washiq Adnan",
        countDown: 5,
        role: 0,
        description: "Intelligent quiz system with anti-duplicate logic",
        category: "entertainment",
        guide: { en: "{pn}" }
    },

    onStart: async function ({ message, event, usersData }) {
        const questions = await getQuestions();
        if (!questions) return message.reply("Failed to load quiz data. Please try again later.");

        const userData = await usersData.get(event.senderID);
        const state = userData.data?.quizState || { used: [] };
        
        // Filter out questions the user has already answered
        let pool = questions.filter(q => !state.used.includes(getQuestionId(q)));
        
        // Reset pool if all questions are finished
        if (pool.length === 0) {
            state.used = [];
            pool = questions;
        }

        const selected = pool[Math.floor(Math.random() * pool.length)];
        const qid = getQuestionId(selected);
        
        state.used.push(qid);
        await usersData.set(event.senderID, {
            data: { ...userData.data, quizState: state }
        });

        const opts = (selected.options || []).map(formatOption);
        const quizUI = [
            "🧠 𝗤𝗨𝗜𝗭 𝗧𝗜𝗠𝗘",
            "━━━━━━━━━━━━━━━━━━",
            `❓ ${selected.question}`,
            "",
            `🄰. ${opts[0] || "—"}`,
            `🄱. ${opts[1] || "—"}`,
            `🄲. ${opts[2] || "—"}`,
            `🄳. ${opts[3] || "—"}`,
            "━━━━━━━━━━━━━━━━━━",
            "💬 Reply with A, B, C, or D"
        ].join("\n");

        return message.reply(quizUI, (err, info) => {
            if (err) return;
            global.GoatBot.onReply.set(info.messageID, {
                commandName: this.config.name,
                author: event.senderID,
                answer: String(selected.answer).toLowerCase().trim(),
                reward: REWARD_AMOUNT
            });
        });
    },

    onReply: async function ({ message, event, Reply, usersData }) {
        const { author, answer, reward } = Reply;

        if (event.senderID !== author) {
            return message.reply("This session belongs to someone else. Type 'qz' to start your own!");
        }

        const input = event.body.trim().toLowerCase();
        const validInputs = { "1": "a", "2": "b", "3": "c", "4": "d", "a": "a", "b": "b", "c": "c", "d": "d" };
        const userAnswer = validInputs[input];

        if (!userAnswer) {
            return message.reply("Invalid choice! Please reply with A, B, C, or D.");
        }

        // Clean up the reply listener
        global.GoatBot.onReply.delete(event.messageReply.messageID);

        if (userAnswer === answer) {
            const currentMoney = await usersData.get(event.senderID, "money") || 0;
            const newBalance = Number(currentMoney) + reward;
            
            await usersData.set(event.senderID, { money: newBalance });
            return message.reply(`✅ Correct!\n💰 Reward: +$${reward}\n💳 New Balance: $${newBalance}`);
        } else {
            return message.reply(`❌ Wrong answer!\n💡 The correct one was: ${answer.toUpperCase()}`);
        }
    }
};
  
