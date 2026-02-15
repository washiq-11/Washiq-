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
  const m = s.match(/^[abcd]/);
  return m ? m[0] : "";
}

function cleanOptionText(opt) {
  // remove leading "A." "B." etc from inside option text
  return String(opt || "").replace(/^\s*[ABCD]\.\s*/i, "").trim();
}

async function fetchQuizData() {
  await fs.ensureDir(cacheDir);
  try {
    const res = await axios.get(QUIZ_URL, { timeout: 12000 });
    const data = res.data;
    if (!Array.isArray(data) || data.length === 0) throw new Error("Quiz JSON invalid/empty");
    await fs.writeJson(cacheFile, data, { spaces: 2 });
    return { data, source: "remote" };
  } catch (e) {
    if (await fs.pathExists(cacheFile)) {
      const cached = await fs.readJson(cacheFile);
      if (Array.isArray(cached) && cached.length > 0) return { data: cached, source: "cache" };
    }
    throw e;
  }
}

function pickRandomQuestion(list) {
  const q = list[Math.floor(Math.random() * list.length)] || {};
  const question = q.question ?? "";
  const optionsRaw = Array.isArray(q.options) ? q.options : [];
  const options = optionsRaw.map(cleanOptionText);
  const answer = normalizeAnswer(q.answer ?? "");
  return { question, options, answer };
}

// robust reply store for different GoatBot setups
function setReplyHandler(messageID, payload) {
  if (global.GoatBot?.onReply?.set) return global.GoatBot.onReply.set(messageID, payload);
  if (global.client?.onReply?.set) return global.client.onReply.set(messageID, payload);
  global.GoatBot = global.GoatBot || {};
  global.GoatBot.onReply = global.GoatBot.onReply || new Map();
  return global.GoatBot.onReply.set(messageID, payload);
}

module.exports = {
  config: {
    name: "quiz",
    aliases: ["q", "mcq"],
    version: "2.1.0",
    author: "Washiq (fixed)",
    countDown: 5,
    role: 0,
    description: "Remote quiz.json থেকে প্রশ্ন এনে কুইজ; correct হলে money add হয়",
    category: "fun",
    guide: "{pn}  |  reply: a/b/c/d"
  },

  onStart: async function ({ message, event }) {
    try {
      const { data, source } = await fetchQuizData();
      const q = pickRandomQuestion(data);

      if (!q.question || q.options.length < 2 || !q.answer) {
        return message.reply("Quiz data format error (question/options/answer missing).");
      }

      const lines = [];
      lines.push(`🧠 QUIZ (${source})`);
      lines.push(`\n❓ ${q.question}\n`);
      q.options.forEach((opt, i) => {
        const letter = ["A", "B", "C", "D"][i] || String(i + 1);
        lines.push(`${letter}. ${opt}`);
      });
      lines.push(`\n✅ Reply with: a/b/c/d (or 1/2/3/4)`);

      const sent = await message.reply(lines.join("\n"));

      setReplyHandler(sent.messageID, {
        commandName: "quiz",
        author: event.senderID,
        correct: q.answer,
        reward: REWARD
      });
    } catch (e) {
      console.error("QUIZ start error:", e?.message || e);
      message.reply("❌ Quiz load failed. Check raw URL / axios / internet.");
    }
  },

  onReply: async function ({ message, event, Reply, usersData }) {
    try {
      if (event.senderID !== Reply.author) return;

      const userAns = normalizeAnswer(event.body);
      if (!userAns) return message.reply("Reply with a/b/c/d or 1/2/3/4.");

      if (userAns === Reply.correct) {
        const reward = Number(Reply.reward) || REWARD;

        let money = await usersData.get(event.senderID, "money");
        if (typeof money !== "number") money = 0;

        const newMoney = money + reward;

        // ✅ this is the must-have line
        await usersData.set(event.senderID, { money: newMoney });

        return message.reply(
          `✅ Transfer Successful!\n\nCorrect Answer: ${Reply.correct.toUpperCase()}\nReward: +${reward}$\nNew Balance: ${newMoney}$`
        );
      }

      return message.reply(`❌ Wrong!\nCorrect Answer: ${Reply.correct.toUpperCase()}`);
    } catch (e) {
      console.error("QUIZ reply error:", e?.message || e);
      message.reply("❌ Error while checking answer.");
    }
  }
};
