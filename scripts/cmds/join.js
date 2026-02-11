const axios = require("axios");
const fs = require("fs-extra");
const request = require("request");

module.exports = {
	config: {
		name: "join",
		version: "3.0",
        author: "Kshitiz + Fixed by Ullash",
		countDown: 5,
		role: 2,
		shortDescription: "Join the group that bot is in",
        longDescription: "",
		category: "owner",
		guide: {
			en: "{p}{n}",
		},
	},

	onStart: async function ({ api, event }) {
		try {

			const groupList = await api.getThreadList(20, null, ['INBOX']);

			const filteredList = groupList.filter(group => group.isGroup === true);

			if (filteredList.length === 0) {
				return api.sendMessage('No group chats found.', event.threadID);
			}

			let result = "╭─╮\n│𝐋𝐢𝐬𝐭 𝐨𝐟 𝐠𝐫𝐨𝐮𝐩 𝐜𝐡𝐚𝐭𝐬:\n";

			for (let i = 0; i < filteredList.length; i++) {
				let g = filteredList[i];

				const info = await api.getThreadInfo(g.threadID);

				let name = info.threadName || "No Name";
				let approval = info.approvalMode ? "ON" : "OFF";

				result += `│${i + 1}. ${name}\n`;
				result += `│𝐓𝐈𝐃: ${g.threadID}\n`;
				result += `│𝐓𝐨𝐭𝐚𝐥 𝐦𝐞𝐦𝐛𝐞𝐫𝐬: ${info.participantIDs.length}\n`;
				result += `│Approval: ${approval}\n│\n`;
			}

			result += "╰───────────ꔪ\n𝐌𝐚𝐱𝐢𝐦𝐮𝐦 𝐌𝐞𝐦𝐛𝐞𝐫𝐬 = 250\n\nReply to this message with the number of the group you want to join...";

			const sent = await api.sendMessage(result, event.threadID);

			global.GoatBot.onReply.set(sent.messageID, {
				commandName: 'join',
				messageID: sent.messageID,
				author: event.senderID
			});

		} catch (err) {
			console.error(err);
			api.sendMessage("Error fetching group list.", event.threadID);
		}
	},

	onReply: async function ({ api, event, Reply, args }) {

		if (event.senderID !== Reply.author) return;

		const index = parseInt(args[0]);

		if (isNaN(index) || index <= 0) {
			return api.sendMessage("Invalid input! Provide a valid number.", event.threadID, event.messageID);
		}

		try {
			const groupList = await api.getThreadList(20, null, ['INBOX']);
			const filteredList = groupList.filter(group => group.isGroup === true);

			if (index > filteredList.length) {
				return api.sendMessage("Invalid group number!", event.threadID, event.messageID);
			}

			let selected = filteredList[index - 1];
			let info = await api.getThreadInfo(selected.threadID);

			if (info.participantIDs.includes(event.senderID)) {
				return api.sendMessage(`You are already a member of:\n${info.threadName}`, event.threadID, event.messageID);
			}

			if (info.participantIDs.length >= 250) {
				return api.sendMessage(`Group is full:\n${info.threadName}`, event.threadID, event.messageID);
			}

			await api.addUserToGroup(event.senderID, selected.threadID);
			api.sendMessage(`You have been added to:\n${info.threadName}`, event.threadID, event.messageID);

		} catch (err) {
			console.error(err);
			api.sendMessage("Failed to join the group!", event.threadID, event.messageID);
		}

		global.GoatBot.onReply.delete(event.messageID);
	},
};
