const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const QUIZ_URL =
  "https://raw.githubusercontent.com/washik02/Washiq-/0f620bc71d05e0d67912470c044bd49eaaa84827/quiz.json";

const cacheDir = path.join(__dirname, "cache");
const cacheFile = path.join(cacheDir, "quiz_cache.json");

const REWARD = 200;

function normalizeAnswer(input) {
  if (!input) return "";
  const s = String(input).trim().toLowerCase();
  if (["a", "b", "c", "d"].includes(s)) return s;
  if (["1", "2", "3", "4"].includes(s)) return ["a", "b", "c", "d"][Number(s) - 1];
  return "";
}

function cleanOptionText(opt) {
  return String(opt || "").replace(/^\s*[ABCD]\.\s*/i, "").trim();
}

async function fetchQuizData() {
  await fs.ensureDir(cacheDir);

  try {
    const res = await axios.get(QUIZ_URL, { timeout: 12000 });
    const data = res.data;

    if (!Array.isArray(data) || data.length === 0)
      throw new Error("Invalid quiz data");

    await fs.writeJson(cacheFile, data, { spaces: 2 });
    return data;
  } catch {
    if (await fs.pathExists(cacheFile)) {
      return await fs.readJson(cacheFile);
    }
    throw new Error("Quiz load failed");
  }
}

module.exports = {
  config: {
    name: "qz",          // 🔥 primary command
    aliases: ["quiz"],   // 🔥 quiz also works
    version: "5.0.0",
    author: "Washiq",
    countDown: 5,
    role: 0,
    description: "Quiz system (qz & quiz only)",
    category: "fun",
    guide: "{pn}"
  },

  onStart: async function ({ message, event }) {
    try {
      const questions = await fetchQuizData();
      const q = questions[Math.floor(Math.random() * questions.length)];

      const options = q.options.map(cleanOptionText);

      const text = [
        "🧠 QUIZ",
        `\n❓ ${q.question}\n`,
        `A. ${options[0]}`,
        `B. ${options[1]}`,
        `C. ${options[2]}`,
        `D. ${options[3]}`,
        "\nReply with: a/b/c/d"
      ].join("\n");

      const sent = await message.reply(text);

      global.GoatBot = global.GoatBot || {};
      global.GoatBot.onReply = global.GoatBot.onReply || new Map();

      global.GoatBot.onReply.set(sent.messageID, {
        commandName: "qz",
        author: event.senderID,
        correct: q.answer,
        reward: REWARD
      });

    } catch (err) {
      console.error(err);
      message.reply("Quiz failed to load.");
    }
  },

  onReply: async function ({ message, event, Reply, usersData }) {
    if (event.senderID !== Reply.author) return;

    const ans = normalizeAnswer(event.body);

    if (!ans) return message.reply("Reply with a/b/c/d.");

    if (ans === Reply.correct) {
      let money = await usersData.get(event.senderID, "money");
      if (typeof money !== "number") money = 0;

      const newMoney = money + Reply.reward;
      await usersData.set(event.senderID, { money: newMoney });

      return message.reply(
        `✅ Correct!\nReward: +${Reply.reward}$\nNew Balance: ${newMoney}$`
      );
    }

    return message.reply(
      `❌ Wrong!\nCorrect Answer: ${Reply.correct.toUpperCase()}`
    );
  }
};
