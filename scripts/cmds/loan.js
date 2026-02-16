const fs = require("fs-extra");

// ================== CONFIG ==================
const MAX_LOAN_CAP = 50000;               // সর্বোচ্চ ঋণ
const MINIMUM_BORROW = 100;               // মিনিমাম লোন
const DAILY_INTEREST_RATE = 0.01;         // 1% / day
const LOAN_COOLDOWN = 7 * 24 * 60 * 60 * 1000;   // 7 days borrow cooldown
const SEIZE_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days repay deadline

const FEE_RATE = 0.002; // 0.20% = 0.002 (loan বাকি থাকলে প্রতিবার খরচে admin fee)

// ================== HELPERS ==================
const formatCurrency = (val) => Number(val || 0).toLocaleString("en-US");

function parseAmount(input) {
  if (!input) return NaN;
  const clean = String(input).toLowerCase().replace(/\s+/g, "");
  const m = clean.match(/^([\d.]+)([kmbt]?)$/);
  if (!m) return NaN;

  let n = parseFloat(m[1]);
  if (Number.isNaN(n)) return NaN;

  const u = m[2];
  if (u === "k") n *= 1e3;
  if (u === "m") n *= 1e6;
  if (u === "b") n *= 1e9;
  if (u === "t") n *= 1e12;

  return Math.floor(n);
}

function nowMs() {
  return Date.now();
}

function calcDebtWithInterest(loan) {
  if (!loan || !loan.debt || !loan.lastSync) return loan?.debt || 0;

  const days = Math.floor((nowMs() - loan.lastSync) / (24 * 60 * 60 * 1000));
  if (days <= 0) return loan.debt;

  return Math.floor(loan.debt * Math.pow(1 + DAILY_INTEREST_RATE, days));
}

function getAdminID() {
  return global.GoatBot?.config?.adminBot?.[0] || null;
}

// ================== GLOBAL HOOKS ==================
// 1) loanGuard: user কিছু করলেই 7 days overdue হলে seize করে admin এ পাঠায়
// 2) applyLoanFee: user যদি debt নিয়ে game এ খরচ করে, তার amount এর 0.20% admin এ যায়

if (!global.GoatBot) global.GoatBot = {};

if (typeof global.GoatBot.loanGuard !== "function") {
  global.GoatBot.loanGuard = async ({ usersData, uid }) => {
    const adminID = getAdminID();
    if (!adminID) return { seized: false };

    const user = await usersData.get(uid);
    const money = Number(user.money || 0);
    const data = user.data || {};
    const loan = data.loan;

    if (!loan || !loan.debt || loan.debt <= 0 || !loan.lastBorrowedAt) return { seized: false };

    // update interest first
    loan.debt = calcDebtWithInterest(loan);
    loan.lastSync = nowMs();

    const overdueMs = nowMs() - loan.lastBorrowedAt;
    if (overdueMs > SEIZE_THRESHOLD && money > 0) {
      const adminMoney = (await usersData.get(adminID, "money")) || 0;

      // seize all balance
      await usersData.set(adminID, { money: adminMoney + money });

      // reset user money + loan
      loan.debt = 0;
      loan.lastBorrowedAt = 0;
      loan.lastSync = nowMs();

      await usersData.set(uid, { money: 0, data: { ...data, loan } });

      return { seized: true, seizedAmount: money };
    }

    // just save interest update (no seize)
    await usersData.set(uid, { data: { ...data, loan } });
    return { seized: false };
  };
}

if (typeof global.GoatBot.applyLoanFee !== "function") {
  global.GoatBot.applyLoanFee = async ({ usersData, senderID, amount }) => {
    const adminID = getAdminID();
    if (!adminID) return { fee: 0, applied: false };

    amount = Math.floor(Number(amount) || 0);
    if (amount <= 0) return { fee: 0, applied: false };

    // Guard check first (overdue হলে seize হবে)
    await global.GoatBot.loanGuard({ usersData, uid: senderID });

    const user = await usersData.get(senderID);
    const data = user.data || {};
    const loan = data.loan;

    if (!loan || !loan.debt || loan.debt <= 0) return { fee: 0, applied: false };

    // update interest
    loan.debt = calcDebtWithInterest(loan);
    loan.lastSync = nowMs();

    const senderMoney = Number(user.money || 0);
    if (senderMoney <= 0) {
      await usersData.set(senderID, { data: { ...data, loan } });
      return { fee: 0, applied: false };
    }

    let fee = Math.floor(amount * FEE_RATE);
    if (fee < 1) fee = 1; // minimum 1 coin fee
    if (fee > senderMoney) fee = senderMoney;

    const adminMoney = (await usersData.get(adminID, "money")) || 0;

    await usersData.set(senderID, {
      money: senderMoney - fee,
      data: { ...data, loan }
    });

    await usersData.set(adminID, {
      money: adminMoney + fee
    });

    return { fee, applied: true };
  };
}

// ================== COMMAND ==================
module.exports = {
  config: {
    name: "loan",
    aliases: ["bank", "credit"],
    version: "7.0.0",
    author: "Washiq Adnan",
    countDown: 5,
    role: 0,
    category: "economy",
    guide: {
      en:
        "loan (info)\n" +
        "loan borrow <amount>\n" +
        "loan repay <amount|all>\n" +
        "loan list [limit]\n" +
        "loan rules"
    }
  },

  onStart: async function ({ message, event, args, usersData }) {
    const senderID = event.senderID;
    const action = (args[0] || "").toLowerCase();
    const adminID = getAdminID();

    // Always guard on any loan command use
    await global.GoatBot.loanGuard({ usersData, uid: senderID });

    const user = await usersData.get(senderID);
    let money = Number(user.money || 0);
    const data = user.data || {};

    let loan = data.loan || {
      debt: 0,
      totalBorrowed: 0,
      lastSync: nowMs(),
      lastBorrowedAt: 0
    };

    // update interest for display + operations
    loan.debt = calcDebtWithInterest(loan);
    loan.lastSync = nowMs();

    // ---------- RULES ----------
    if (action === "rules") {
      return message.reply(
        `🏦 RAHA BANK RULES\n\n` +
          `• Max Loan: ${formatCurrency(MAX_LOAN_CAP)}\n` +
          `• Min Borrow: ${formatCurrency(MINIMUM_BORROW)}\n` +
          `• Interest: ${(DAILY_INTEREST_RATE * 100).toFixed(2)}% / day\n` +
          `• Borrow cooldown: 7 days\n` +
          `• Repay deadline: 7 days (overdue হলে balance seize)\n` +
          `• Fee on each spend while debt>0: ${(FEE_RATE * 100).toFixed(2)}% → Admin`
      );
    }

    // ---------- INFO ----------
    if (!action || action === "info") {
      // save interest updates
      await usersData.set(senderID, { data: { ...data, loan } });

      return message.reply(
        `🏦 --- RAHA BANK ---\n\n` +
          `💰 Balance: ${formatCurrency(money)}\n` +
          `💸 Debt: ${formatCurrency(loan.debt)}\n` +
          `📊 Total Borrowed: ${formatCurrency(loan.totalBorrowed)}\n\n` +
          `Use:\n` +
          `• loan borrow 1k\n` +
          `• loan repay 500\n` +
          `• loan repay all\n` +
          `• loan rules`
      );
    }

    // ---------- BORROW ----------
    if (action === "borrow") {
      const req = parseAmount(args[1]);
      if (!req || isNaN(req) || req < MINIMUM_BORROW)
        return message.reply(`❌ Invalid amount!\nExample: loan borrow 1k`);

      // cooldown check
      const lastBorrowedAt = loan.lastBorrowedAt || 0;
      if (lastBorrowedAt) {
        const remain = LOAN_COOLDOWN - (nowMs() - lastBorrowedAt);
        if (remain > 0) {
          const days = Math.ceil(remain / (24 * 60 * 60 * 1000));
          return message.reply(`⏳ You can borrow again in ${days} day(s).`);
        }
      }

      if (loan.debt + req > MAX_LOAN_CAP)
        return message.reply(`❌ Max debt cap: ${formatCurrency(MAX_LOAN_CAP)}`);

      loan.debt += req;
      loan.totalBorrowed += req;
      loan.lastBorrowedAt = nowMs();
      loan.lastSync = nowMs();

      await usersData.set(senderID, {
        money: money + req,
        data: { ...data, loan }
      });

      return message.reply(
        `✅ Loan approved!\n` +
          `+${formatCurrency(req)} added.\n` +
          `Debt: ${formatCurrency(loan.debt)}\n` +
          `⏳ Repay within 7 days to avoid seizure.`
      );
    }

    // ---------- REPAY ----------
    if (action === "repay") {
      if (loan.debt <= 0) return message.reply("✅ You have no debt.");

      let pay =
        (args[1] || "").toLowerCase() === "all" ? loan.debt : parseAmount(args[1]);

      if (!pay || isNaN(pay) || pay <= 0)
        return message.reply(`❌ Usage: loan repay <amount|all>`);

      pay = Math.min(pay, loan.debt);

      if (money < pay)
        return message.reply(`❌ Insufficient funds.\nBalance: ${formatCurrency(money)}`);

      loan.debt -= pay;
      loan.lastSync = nowMs();

      await usersData.set(senderID, {
        money: money - pay,
        data: { ...data, loan }
      });

      // money goes to admin/bank
      if (adminID) {
        const adminMoney = (await usersData.get(adminID, "money")) || 0;
        await usersData.set(adminID, { money: adminMoney + pay });
      }

      // if fully paid, clear lastBorrowedAt (optional clean)
      if (loan.debt <= 0) {
        loan.debt = 0;
        loan.lastBorrowedAt = 0;
        loan.lastSync = nowMs();
        await usersData.set(senderID, { data: { ...data, loan } });
      }

      return message.reply(
        `✅ Repayment successful!\n` +
          `Paid: ${formatCurrency(pay)}\n` +
          `Remaining Debt: ${formatCurrency(loan.debt)}`
      );
    }

    // ---------- LIST ----------
    if (action === "list") {
      const limit = Math.max(5, Math.min(50, parseInt(args[1]) || 10));

      if (typeof usersData.getAll !== "function")
        return message.reply("❌ This bot version does not support usersData.getAll().");

      try {
        const all = await usersData.getAll();

        const debtors = all
          .map(u => ({
            id: u.userID || u.id,
            name: u.name || "Unknown",
            debt: Number(u?.data?.loan?.debt || 0)
          }))
          .filter(x => x.debt > 0)
          .sort((a, b) => b.debt - a.debt)
          .slice(0, limit);

        if (!debtors.length) return message.reply("✅ No active debtors.");

        let msg = `📝 ACTIVE DEBTORS (Top ${debtors.length})\n\n`;
        debtors.forEach((d, i) => {
          msg += `${i + 1}. ${d.name}\n   UID: ${d.id}\n   Debt: ${formatCurrency(d.debt)}\n\n`;
        });

        return message.reply(msg.trim());
      } catch (e) {
        console.error("loan list error:", e);
        return message.reply("❌ Failed to fetch debtors list.");
      }
    }

    return message.reply("❌ Unknown action. Use: loan | loan borrow | loan repay | loan list | loan rules");
  }
};
