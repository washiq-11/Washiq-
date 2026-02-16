const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

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

function qidOf(questionObj) {
  const base = JSON.stringify({
    q: questionObj?.question || "",
    o: questionObj?.options || []
  });
  return crypto.createHash("sha1").update(base).digest("hex");
}

async function fetchQuizData() {
  await fs.ensureDir(cacheDir);
  try {
    const res = await axios.get(`${QUIZ_URL}?v=${Date.now()}`, { timeout: 12000 });
    const data = res.data;
    if (!Array.isArray(data) || data.length === 0) throw new Error("Invalid quiz data");
    await fs.writeJson(cacheFile, data, { spaces: 2 });
    return data;
  } catch {
    if (await fs.pathExists(cacheFile)) return await fs.readJson(cacheFile);
    throw new Error("Quiz load failed");
  }
}

function pickQuestionNoRepeat(questions, usedSet) {
  const unused = questions.filter(q => !usedSet.has(qidOf(q)));
  if (unused.length === 0) return null;
  return unused[Math.floor(Math.random() * unused.length)];
}

module.exports = {
  config: {
    name: "qz",
    aliases: ["quiz"],
    version: "6.0.1",
    author: "Washiq",
    countDown: 5,
    role: 0,
    description: "Quiz system (no repeat per-user until all used)",
    category: "fun",
    guide: "{pn}"
  },

  onStart: async function ({ message, event, usersData }) {
    try {
      const questions = await fetchQuizData();

      const user = await usersData.get(event.senderID);
      const data = user.data || {};
      const quizData = data.quizQz || {};
      let used = Array.isArray(quizData.used) ? quizData.used : [];

      const allIds = new Set(questions.map(qidOf));
      used = used.filter(id => allIds.has(id));
      const usedSet = new Set(used);

      let q = pickQuestionNoRepeat(questions, usedSet);
      if (!q) {
        used = [];
        usedSet.clear();
        q = questions[Math.floor(Math.random() * questions.length)];
      }

      const qid = qidOf(q);
      used.push(qid);

      await usersData.set(event.senderID, {
        data: {
          ...data,
          quizQz: { ...quizData, used }
        }
      });

      const options = (q.options || []).map(cleanOptionText);
      const text = [
        "🧠 QUIZ",
        `\n❓ ${q.question}\n`,
        `A. ${options[0] || "—"}`,
        `B. ${options[1] || "—"}`,
        `C. ${options[2] || "—"}`,
        `D. ${options[3] || "—"}`,
        "\nReply with: a/b/c/d (or 1/2/3/4)"
      ].join("\n");

      const sent = await message.reply(text);

      global.GoatBot = global.GoatBot || {};
      global.GoatBot.onReply = global.GoatBot.onReply || new Map();

      global.GoatBot.onReply.set(sent.messageID, {
        commandName: "qz",
        author: event.senderID,
        correct: String(q.answer || "").toLowerCase(),
        reward: REWARD
      });

    } catch (err) {
      console.error(err);
      message.reply("Quiz failed to load.");
    }
  },

  onReply: async function ({ message, event, Reply, usersData }) {
    if (event.senderID !== Reply.author) {
      return message.reply("Oops baby, this is not your quiz 🥺");
    }

    const ans = normalizeAnswer(event.body);
    if (!ans) return message.reply("Reply with a/b/c/d (or 1/2/3/4).");

    const correct = String(Reply.correct || "").toLowerCase();

    if (ans === correct) {
      let money = await usersData.get(event.senderID, "money");
      if (typeof money !== "number") money = 0;

      const newMoney = money + Number(Reply.reward || 0);
      await usersData.set(event.senderID, { money: newMoney });

      return message.reply(
        `✅ Correct!\nReward: +${Reply.reward}$\nNew Balance: ${newMoney}$`
      );
    }

    return message.reply(`❌ Wrong!\nCorrect Answer: ${correct.toUpperCase()}`);
  }
};
```0
