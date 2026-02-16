const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

module.exports = {
        config: {
                name: "admin",
                version: "1.6",
                author: "NTKhang",
                countDown: 5,
                role: 2,
                description: {
                        vi: "Thêm, xóa, sửa quyền admin",
                        en: "Add, remove, edit admin role"
                },
                category: "box chat",
                guide: {
                        vi: '   {pn} [add | -a] <uid | @tag>: Thêm quyền admin cho người dùng'
                                + '\n     {pn} [remove | -r] <uid | @tag>: Xóa quyền admin của người dùng'
                                + '\n     {pn} [list | -l]: Liệt kê danh sách admin',
                        en: '   {pn} [add | -a] <uid | @tag | reply>: Add admin role for user'
                                + '\n     {pn} [remove | -r] <uid | @tag | reply>: Remove admin role of user'
                                + '\n     {pn} [list | -l]: List all admins'
                }
        },

        langs: {
                vi: {
                        added: "✓ | Đã thêm quyền admin cho %1 người dùng:\n%2",
                        alreadyAdmin: "\n⚠ | %1 người dùng đã có quyền admin từ trước rồi:\n%2",
                        missingIdAdd: "⚠ | Vui lòng nhập ID hoặc tag người dùng muốn thêm quyền admin",
                        removed: "✓ | Đã xóa quyền admin của %1 người dùng:\n%2",
                        notAdmin: "⚠ | %1 người dùng không có quyền admin:\n%2",
                        missingIdRemove: "⚠ | Vui lòng nhập ID hoặc tag người dùng muốn xóa quyền admin",
                        listAdmin: "♔ | Danh sách admin:\n%1"
                },
                en: {
                        added: "✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n" +
                               "👑✨ 𝗔𝗱𝗺𝗶𝗻 𝗔𝗱𝗱𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 ✨👑\n\n" +
                               "%s\n\n" +
                               "🍭 𝐌𝐲 𝐟𝐚𝐯𝐨𝐫𝐢𝐭𝐞 𝐡𝐮𝐦𝐚𝐧𝐬 𝐞𝐯𝐞𝐫, 𝐛𝐛𝐲! 🧸\n" +
                               "✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄",
                        
                        alreadyAdmin: "\n━━━━━━━━━━━━━━━━━━━━\n⚠️ 𝐀𝐥𝐫𝐞𝐚𝐝𝐲 𝐀𝐝𝐦𝐢𝐧:\n%s\n━━━━━━━━━━━━━━━━━━━━",
                        
                        missingIdAdd: "❌ | 𝐏𝐥𝐞𝐚𝐬𝐞 𝐞𝐧𝐭𝐞𝐫 𝐈𝐃, 𝐭𝐚𝐠 𝐮𝐬𝐞𝐫 𝐨𝐫 𝐫𝐞𝐩𝐥𝐲 𝐭𝐨 𝐚 𝐦𝐞𝐬𝐬𝐚𝐠𝐞 𝐭𝐨 𝐚𝐝𝐝 𝐚𝐝𝐦𝐢𝐧 𝐫𝐨𝐥𝐞",
                        
                        removed: "✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n" +
                                 "👑✨ 𝗔𝗱𝗺𝗶𝗻 𝗥𝗲𝗺𝗼𝘃𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 ✨👑\n\n" +
                                 "%s\n\n" +
                                 "🍭 𝐌𝐲 𝐟𝐚𝐯𝐨𝐫𝐢𝐭𝐞 𝐡𝐮𝐦𝐚𝐧𝐬 𝐞𝐯𝐞𝐫, 𝐛𝐛𝐲! 🧸\n" +
                                 "✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄",
                        
                        notAdmin: "\n━━━━━━━━━━━━━━━━━━━━\n⚠️ 𝐍𝐨𝐭 𝐀𝐝𝐦𝐢𝐧:\n%s\n━━━━━━━━━━━━━━━━━━━━",
                        
                        missingIdRemove: "❌ | 𝐏𝐥𝐞𝐚𝐬𝐞 𝐞𝐧𝐭𝐞𝐫 𝐈𝐃, 𝐭𝐚𝐠 𝐮𝐬𝐞𝐫 𝐨𝐫 𝐫𝐞𝐩𝐥𝐲 𝐭𝐨 𝐚 𝐦𝐞𝐬𝐬𝐚𝐠𝐞 𝐭𝐨 𝐫𝐞𝐦𝐨𝐯𝐞 𝐚𝐝𝐦𝐢𝐧 𝐫𝐨𝐥𝐞",
                        
                        listAdmin: "✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n" +
                                   "👑✨ 𝗧𝗵𝗲 𝐀𝐝𝐦𝐢𝐧 𝗟𝗶𝘀𝘁 ✨👑\n\n" +
                                   "%s\n\n" +
                                   "🍭 𝐌𝐲 𝐟𝐚𝐯𝐨𝐫𝐢𝐭𝐞 𝐡𝐮𝐦𝐚𝐧𝐬 𝐞𝐯𝐞𝐫, 𝐛𝐛𝐲! 🧸\n" +
                                   "✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄",
                        
                        replyAddInstruction: "𝐑𝐞𝐩𝐥𝐲 𝐭𝐨 𝐭𝐡𝐢𝐬 𝐦𝐞𝐬𝐬𝐚𝐠𝐞 𝐰𝐢𝐭𝐡 𝐭𝐡𝐞 𝐰𝐨𝐫𝐝 '𝐚𝐝𝐝' 𝐭𝐨 𝐚𝐝𝐝 𝐭𝐡𝐞𝐦 𝐚𝐬 𝐚𝐝𝐦𝐢𝐧",
                        replyRemoveInstruction: "𝐑𝐞𝐩𝐥𝐲 𝐭𝐨 𝐭𝐡𝐢𝐬 𝐦𝐞𝐬𝐬𝐚𝐠𝐞 𝐰𝐢𝐭𝐡 𝐭𝐡𝐞 𝐰𝐨𝐫𝐝 '𝐫𝐞𝐦𝐨𝐯𝐞' 𝐭𝐨 𝐫𝐞𝐦𝐨𝐯𝐞 𝐭𝐡𝐞𝐦 𝐟𝐫𝐨𝐦 𝐚𝐝𝐦𝐢𝐧"
                }
        },

        onReply: async function ({ message, event, Reply, usersData, getLang }) {
                const { author, type, messageID } = Reply;
                if (event.senderID !== author) return;
                
                const { body, threadID } = event;
                const targetID = Reply.targetID;
                
                if (body.toLowerCase() === "add") {
                        if (type === "add") {
                                if (config.adminBot.includes(targetID)) {
                                        const name = await usersData.getName(targetID);
                                        return message.reply(
                                                "✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n" +
                                                "⚠️ 𝐀𝐥𝐫𝐞𝐚𝐝𝐲 𝐀𝐝𝐦𝐢𝐧 ⚠️\n\n" +
                                                `🍭 𝐓𝐚𝐠 𝐍𝐚𝐦𝐞 : ${name} ➻ ⁽${targetID}⁾ 👑\n\n` +
                                                "🍭 𝐓𝐡𝐢𝐬 𝐮𝐬𝐞𝐫 𝐢𝐬 𝐚𝐥𝐫𝐞𝐚𝐝𝐲 𝐚𝐧 𝐚𝐝𝐦𝐢𝐧! 🧸\n" +
                                                "✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄"
                                        );
                                }
                                
                                config.adminBot.push(targetID);
                                writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
                                
                                const name = await usersData.getName(targetID);
                                const addedMessage = 
                                        "✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n" +
                                        "👑✨ 𝗔𝗱𝗺𝗶𝗻 𝗔𝗱𝗱𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 ✨👑\n\n" +
                                        `🍭 𝐓𝐚𝐠 𝐍𝐚𝐦𝐞 : ${name} ➻ ⁽${targetID}⁾ 👑\n\n` +
                                        "🍭 𝐌𝐲 𝐟𝐚𝐯𝐨𝐫𝐢𝐭𝐞 𝐡𝐮𝐦𝐚𝐧𝐬 𝐞𝐯𝐞𝐫, 𝐛𝐛𝐲! 🧸\n" +
                                        "✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄";
                                
                                await message.reply(addedMessage);
                                await api.unsendMessage(messageID);
                        }
                }
                else if (body.toLowerCase() === "remove") {
                        if (type === "remove") {
                                if (!config.adminBot.includes(targetID)) {
                                        const name = await usersData.getName(targetID);
                                        return message.reply(
                                                "✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n" +
                                                "⚠️ 𝐍𝐨𝐭 𝐀𝐝𝐦𝐢𝐧 ⚠️\n\n" +
                                                `🍭 𝐓𝐚𝐠 𝐍𝐚𝐦𝐞 : ${name} ➻ ⁽${targetID}⁾\n\n` +
                                                "🍭 𝐓𝐡𝐢𝐬 𝐮𝐬𝐞𝐫 𝐢𝐬 𝐧𝐨𝐭 𝐚𝐧 𝐚𝐝𝐦𝐢𝐧! 🧸\n" +
                                                "✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄"
                                        );
                                }
                                
                                const index = config.adminBot.indexOf(targetID);
                                if (index > -1) {
                                        config.adminBot.splice(index, 1);
                                        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
                                }
                                
                                const name = await usersData.getName(targetID);
                                const removedMessage = 
                                        "✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n" +
                                        "👑✨ 𝗔𝗱𝗺𝗶𝗻 𝗥𝗲𝗺𝗼𝘃𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 ✨👑\n\n" +
                                        `🍭 𝐓𝐚𝐠 𝐍𝐚𝐦𝐞 : ${name} ➻ ⁽${targetID}⁾\n\n` +
                                        "🍭 𝐌𝐲 𝐟𝐚𝐯𝐨𝐫𝐢𝐭𝐞 𝐡𝐮𝐦𝐚𝐧𝐬 𝐞𝐯𝐞𝐫, 𝐛𝐛𝐲! 🧸\n" +
                                        "✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄";
                                
                                await message.reply(removedMessage);
                                await api.unsendMessage(messageID);
                        }
                }
        },

        onStart: async function ({ message, args, usersData, event, getLang }) {
                const { threadID, messageID, senderID, type: eventType, messageReply } = event;
                
                // If reply to a message
                if (eventType === "message_reply" && messageReply) {
                        const targetID = messageReply.senderID;
                        const targetName = await usersData.getName(targetID);
                        
                        if (!args[0]) {
                                return message.reply({
                                        body: "✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n" +
                                              "👑✨ 𝗔𝗱𝗺𝗶𝗻 𝗔𝗰𝘁𝗶𝗼𝗻 𝗥𝗲𝗾𝘂𝗶𝗿𝗲𝗱 ✨👑\n\n" +
                                              `🍭 𝐓𝐚𝐠 𝐍𝐚𝐦𝐞 : ${targetName} ➻ ⁽${targetID}⁾\n\n` +
                                              "📝 𝐏𝐥𝐞𝐚𝐬𝐞 𝐫𝐞𝐩𝐥𝐲 𝐰𝐢𝐭𝐡:\n" +
                                              "   • '𝐚𝐝𝐝' 𝐭𝐨 𝐚𝐝𝐝 𝐚𝐬 𝐚𝐝𝐦𝐢𝐧\n" +
                                              "   • '𝐫𝐞𝐦𝐨𝐯𝐞' 𝐭𝐨 𝐫𝐞𝐦𝐨𝐯𝐞 𝐟𝐫𝐨𝐦 𝐚𝐝𝐦𝐢𝐧\n\n" +
                                              "🍭 𝐌𝐲 𝐟𝐚𝐯𝐨𝐫𝐢𝐭𝐞 𝐡𝐮𝐦𝐚𝐧𝐬 𝐞𝐯𝐞𝐫, 𝐛𝐛𝐲! 🧸\n" +
                                              "✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄",
                                        mentions: [{
                                                                tag: targetName,
                                                                id: targetID
                                                        }]
                                }, (err, info) => {
                                        global.GoatBot.onReply.set(info.messageID, {
                                                commandName: this.config.name,
                                                messageID: info.messageID,
                                                author: senderID,
                                                targetID: targetID,
                                                type: args[0] || "unknown"
                                        });
                                });
                        }
                        
                        // If args[0] is provided with reply
                        if (args[0].toLowerCase() === "add" || args[0] === "-a") {
                                if (config.adminBot.includes(targetID)) {
                                        return message.reply(
                                                "✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n" +
                                                "⚠️ 𝐀𝐥𝐫𝐞𝐚𝐝𝐲 𝐀𝐝𝐦𝐢𝐧 ⚠️\n\n" +
                                                `🍭 𝐓𝐚𝐠 𝐍𝐚𝐦𝐞 : ${targetName} ➻ ⁽${targetID}⁾ 👑\n\n` +
                                                "🍭 𝐓𝐡𝐢𝐬 𝐮𝐬𝐞𝐫 𝐢𝐬 𝐚𝐥𝐫𝐞𝐚𝐝𝐲 𝐚𝐧 𝐚𝐝𝐦𝐢𝐧! 🧸\n" +
                                                "✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄"
                                        );
                                }
                                
                                config.adminBot.push(targetID);
                                writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
                                
                                return message.reply(
                                        "✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n" +
                                        "👑✨ 𝗔𝗱𝗺𝗶𝗻 𝗔𝗱𝗱𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 ✨👑\n\n" +
                                        `🍭 𝐓𝐚𝐠 𝐍𝐚𝐦𝐞 : ${targetName} ➻ ⁽${targetID}⁾ 👑\n\n` +
                                        "🍭 𝐌𝐲 𝐟𝐚𝐯𝐨𝐫𝐢𝐭𝐞 𝐡𝐮𝐦𝐚𝐧𝐬 𝐞𝐯𝐞𝐫, 𝐛𝐛𝐲! 🧸\n" +
                                        "✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄"
                                );
                        }
                        else if (args[0].toLowerCase() === "remove" || args[0] === "-r") {
                                if (!config.adminBot.includes(targetID)) {
                                        return message.reply(
                                                "✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n" +
                                                "⚠️ 𝐍𝐨𝐭 𝐀𝐝𝐦𝐢𝐧 ⚠️\n\n" +
                                                `🍭 𝐓𝐚𝐠 𝐍𝐚𝐦𝐞 : ${targetName} ➻ ⁽${targetID}⁾\n\n` +
                                                "🍭 𝐓𝐡𝐢𝐬 𝐮𝐬𝐞𝐫 𝐢𝐬 𝐧𝐨𝐭 𝐚𝐧 𝐚𝐝𝐦𝐢𝐧! 🧸\n" +
                                                "✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄"
                                        );
                                }
                                
                                const index = config.adminBot.indexOf(targetID);
                                if (index > -1) {
                                        config.adminBot.splice(index, 1);
                                        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
                                }
                                
                                return message.reply(
                                        "✧ ೃ༄ ──── ୨ ☁️ ୧ ──── ✧ ೃ༄\n" +
                                        "👑✨ 𝗔𝗱𝗺𝗶𝗻 𝗥𝗲𝗺𝗼𝘃𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 ✨👑\n\n" +
                                        `🍭 𝐓𝐚𝐠 𝐍𝐚𝐦𝐞 : ${targetName} ➻ ⁽${targetID}⁾\n\n` +
                                        "🍭 𝐌𝐲 𝐟𝐚𝐯𝐨𝐫𝐢𝐭𝐞 𝐡𝐮𝐦𝐚𝐧𝐬 𝐞𝐯𝐞𝐫, 𝐛𝐛𝐲! 🧸\n" +
                                        "✧ ೃ༄ ──── ୨ 🧸 ୧ ──── ✧ ೃ༄"
                                );
                        }
                        return;
                }
                
                // Regular command handling (without reply)
                switch (args[0]) {
                        case "add":
                        case "-a": {
                                if (args[1] || Object.keys(event.mentions).length > 0) {
                                        let uids = [];
                                        if (Object.keys(event.mentions).length > 0)
                                                uids = Object.keys(event.mentions);
                                        else
                                                uids = args.slice(1).filter(arg => !isNaN(arg));
                                        
                                        if (uids.length === 0)
                                                return message.reply(getLang("missingIdAdd"));
                                        
                                        const notAdminIds = [];
                                        const adminIds = [];
                                        
                                        for (const uid of uids) {
                                                if (config.adminBot.includes(uid))
                                                        adminIds.push(uid);
                                                else
                                                        notAdminIds.push(uid);
                                        }

                                        config.adminBot.push(...notAdminIds);
                                        const getNames = await Promise.all(uids.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
                                        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
                                        
                                        let addedUsers = "";
                                        if (notAdminIds.length > 0) {
                                                addedUsers = getNames
                                                        .filter(({ uid }) => notAdminIds.includes(uid))
                                                        .map(({ uid, name }) => `🍭 𝐓𝐚𝐠 𝐍𝐚𝐦𝐞 : ${name} ➻ ⁽${uid}⁾ 👑`)
                                                        .join("\n");
                                        }
                                        
                                        let alreadyAdmins = "";
                                        if (adminIds.length > 0) {
                                                alreadyAdmins = adminIds
                                                        .map((uid, index) => {
                                                                const name = getNames.find(n => n.uid === uid)?.name || "Unknown";
                                                                return `🍭 𝐓𝐚𝐠 𝐍𝐚𝐦𝐞 : ${name} ➻ ⁽${uid}⁾`;
                                                        })
                                                        .join("\n");
                                        }
                                        
                                        let response = getLang("added", notAdminIds.length, addedUsers);
                                        if (adminIds.length > 0) {
                                                response += getLang("alreadyAdmin", adminIds.length, alreadyAdmins);
                                        }
                                        
                                        return message.reply(response);
                                }
                                else
                                        return message.reply(getLang("missingIdAdd"));
                        }
                        
                        case "remove":
                        case "-r": {
                                if (args[1] || Object.keys(event.mentions).length > 0) {
                                        let uids = [];
                                        if (Object.keys(event.mentions).length > 0)
                                                uids = Object.keys(event.mentions);
                                        else
                                                uids = args.slice(1).filter(arg => !isNaN(arg));
                                        
                                        if (uids.length === 0)
                                                return message.reply(getLang("missingIdRemove"));
                                        
                                        const notAdminIds = [];
                                        const adminIds = [];
                                        
                                        for (const uid of uids) {
                                                if (config.adminBot.includes(uid))
                                                        adminIds.push(uid);
                                                else
                                                        notAdminIds.push(uid);
                                        }
                                        
                                        for (const uid of adminIds)
                                                config.adminBot.splice(config.adminBot.indexOf(uid), 1);
                                        
                                        const getNames = await Promise.all(adminIds.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
                                        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
                                        
                                        let removedUsers = "";
                                        if (adminIds.length > 0) {
                                                removedUsers = getNames
                                                        .map(({ uid, name }) => `🍭 𝐓𝐚𝐠 𝐍𝐚𝐦𝐞 : ${name} ➻ ⁽${uid}⁾`)
                            
