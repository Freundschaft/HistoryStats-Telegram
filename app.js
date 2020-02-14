const fs = require('fs');
const R = require('ramda');
const Sqrl = require('squirrelly');

const chatInterval = 15.0;

let obj;
fs.readFile('result.json', 'utf8', function (err, data) {
    if (err) throw err;
    try {
        obj = JSON.parse(data);

        let statisticsResult = {
            chats: [],
            personalInformation: obj['personal_information'],
        };
        let singleChat = R.find(R.whereEq({
            name: 'Laura'
        }), obj.chats.list);

        R.forEach(function (chat) {
            let messagesByParticipant = R.countBy(R.prop('from'), chat.messages);
            let messagesByWeekDay = R.countBy(function (message) {
                let messageDate = new Date(message.date);
                return messageDate.getDay();
            }, chat.messages);

            let maxWeekDay = R.reduce(R.max, -Infinity, R.values(messagesByWeekDay));

            let messagesByWeekDayPixelOffsets = R.map(function (entry) {
                return 50.0 - Math.round((entry / maxWeekDay * 50.0));
            }, R.values(messagesByWeekDay));

            let totalChatDurationInMiliseconds = 0.0;
            let currentChatStartDate = new Date(chat.messages[0].date);

            R.addIndex(R.forEach)(function (message, index) {
                if (chat.messages[index - 1]) {
                    let currentMessageDate = new Date(message.date);
                    let previousMessageDate = new Date(chat.messages[index - 1].date);
                    let differenceInMinutes = Math.round((((currentMessageDate - previousMessageDate) % 86400000) % 3600000) / 60000);
                    if (differenceInMinutes >= chatInterval) {
                        //new chat
                        totalChatDurationInMiliseconds += (previousMessageDate - currentChatStartDate);
                        currentChatStartDate = currentMessageDate;
                        convertMiliseconds(totalChatDurationInMiliseconds);
                    }
                }
            }, chat.messages);

            let totalChatDuration = convertMiliseconds(totalChatDurationInMiliseconds);

            let totalChats = 1 + R.addIndex(R.reduce)(function (acc, message, index) {
                if (chat.messages[index - 1]) {
                    let currentMessageDate = new Date(message.date);
                    let previousMessageDate = new Date(chat.messages[index - 1].date);
                    let differenceInMinutes = Math.round((((currentMessageDate - previousMessageDate) % 86400000) % 3600000) / 60000);
                    return acc + (differenceInMinutes >= chatInterval ? 1 : 0);
                }
                return acc;
            }, 0, chat.messages);

            let sentChats = 1 + R.addIndex(R.reduce)(function (acc, message, index) {
                if (chat.messages[index - 1]) {
                    let currentMessageDate = new Date(message.date);
                    let previousMessageDate = new Date(chat.messages[index - 1].date);
                    let differenceInMinutes = Math.round((((currentMessageDate - previousMessageDate) % 86400000) % 3600000) / 60000);
                    return acc + (differenceInMinutes >= chatInterval ? (message['from_id'] === statisticsResult.personalInformation['user_id'] ? 1 : 0) : 0);
                }
                return acc;
            }, 0, chat.messages);

            let receivedChats = 1 + R.addIndex(R.reduce)(function (acc, message, index) {
                if (chat.messages[index - 1]) {
                    let currentMessageDate = new Date(message.date);
                    let previousMessageDate = new Date(chat.messages[index - 1].date);
                    let differenceInMinutes = Math.round((((currentMessageDate - previousMessageDate) % 86400000) % 3600000) / 60000);
                    return acc + (differenceInMinutes >= chatInterval ? (message['from_id'] !== statisticsResult.personalInformation['user_id'] ? 1 : 0) : 0);
                }
                return acc;
            }, 0, chat.messages);

            let sentMessages = R.reduce(function (acc, value) {
                return acc + (value['from_id'] === statisticsResult.personalInformation['user_id'] ? 1 : 0);
            }, 0, chat.messages);

            let receivedMessages = R.reduce(function (acc, value) {
                return acc + (value['from_id'] !== statisticsResult.personalInformation['user_id'] ? 1 : 0);
            }, 0, chat.messages);

            let totalCharacters = R.reduce(function (acc, value) {
                return acc + R.path(['text', 'length'], value);
            }, 0, chat.messages);

            let totalWords = R.reduce(function (acc, value) {
                return acc + (!!value.text.split ? value.text.split(' ').length : 0);
            }, 0, chat.messages);

            let sentCharacters = R.reduce(function (acc, value) {
                return acc + (value['from_id'] === statisticsResult.personalInformation['user_id'] ? R.path(['text', 'length'], value) : 0);
            }, 0, chat.messages);

            let receivedCharacters = R.reduce(function (acc, value) {
                return acc + (value['from_id'] !== statisticsResult.personalInformation['user_id'] ? R.path(['text', 'length'], value) : 0);
            }, 0, chat.messages);

            let totalMessages = chat.messages.length;

            let messagesPercentages = largestRemainderRound([(sentMessages / totalMessages) * 100.0, (receivedMessages / totalMessages) * 100.0], 100);
            let sentMessagesPercentage = messagesPercentages[0];
            let receivedMessagesPercentage = messagesPercentages[1];

            let charactersPercentages = largestRemainderRound([(sentCharacters / totalCharacters) * 100.0, (receivedCharacters / totalCharacters) * 100.0], 100);
            let sentCharactersPercentage = charactersPercentages[0];
            let receivedCharactersPercentage = charactersPercentages[1];

            let chatsPercentages = largestRemainderRound([(sentChats / totalChats) * 100.0, (receivedChats / totalChats) * 100.0], 100);
            let sentChatsPercentage = chatsPercentages[0];
            let receivedChatsPercentage = chatsPercentages[1];

            statisticsResult.chats.push({
                name: chat.name,
                totalCharacters: totalCharacters,
                totalWords: totalWords,
                totalMessages: totalMessages,
                messagesByParticipant: messagesByParticipant,
                messagesByWeekDay: messagesByWeekDay,
                messagesByWeekDayPixelOffsets: messagesByWeekDayPixelOffsets,
                sentMessages: sentMessages,
                receivedMessages: receivedMessages,
                sentMessagesPercentage: sentMessagesPercentage,
                receivedMessagesPercentage: receivedMessagesPercentage,
                sentCharacters: sentCharacters,
                receivedCharacters: receivedCharacters,
                sentCharactersPercentage: sentCharactersPercentage,
                receivedCharactersPercentage: receivedCharactersPercentage,
                totalChats: totalChats,
                sentChats: sentChats,
                receivedChats: receivedChats,
                sentChatsPercentage: sentChatsPercentage,
                receivedChatsPercentage: receivedChatsPercentage,
                totalChatDuration: totalChatDuration,
                totalChatDurationInMiliseconds: totalChatDurationInMiliseconds
            })
        }, obj.chats.list);

        statisticsResult.maxChatDurationInMiliseconds = R.reduce(R.max, -Infinity, R.map(R.prop('totalChatDurationInMiliseconds'), statisticsResult.chats));
        statisticsResult.chats = R.map(function(chat){
            chat.chatDurationWidth = Math.round((chat.totalChatDurationInMiliseconds / statisticsResult.maxChatDurationInMiliseconds) * 70.0);
            return chat;
        }, statisticsResult.chats);
        statisticsResult.chats = R.sortWith([R.descend(R.prop('totalCharacters'))], statisticsResult.chats);
        statisticsResult.date = new Date();


        let template = fs.readFileSync('template.html', 'utf8');
        let result = Sqrl.Render(template, statisticsResult);
        fs.writeFileSync('output.html', result);

    } catch (e) {
        console.error(e);
    }
});


/**
 * largestRemainderRound will round each number in an array to the nearest
 * integer but make sure that the the sum of all the numbers still equals
 * desiredTotal. Uses Largest Remainder Method.  Returns numbers in order they
 * came.
 *
 * @param {number[]} numbers - numbers to round
 * @param {number} desiredTotal - total that sum of the return list must equal
 * @return {number[]} the list of rounded numbers
 * @example
 *
 * var numbers = [13.6263, 47.9896, 9.59600 28.7880]
 * largestRemainderRound(numbers, 100)
 *
 * // => [14, 48, 9, 29]
 *
 */
function largestRemainderRound(numbers, desiredTotal) {
    var result = numbers.map(function (number, index) {
        return {
            floor: Math.floor(number),
            remainder: getRemainder(number),
            index: index,
        };
    }).sort(function (a, b) {
        return b.remainder - a.remainder;
    });

    var lowerSum = result.reduce(function (sum, current) {
        return sum + current.floor;
    }, 0);

    var delta = desiredTotal - lowerSum;
    for (var i = 0; i < delta; i++) {
        result[i].floor++;
    }

    return result.sort(function (a, b) {
        return a.index - b.index;
    }).map(function (result) {
        return result.floor;
    });
}

function getRemainder(number) {
    var remainder = number - Math.floor(number);
    return remainder.toFixed(4);
}

function convertMiliseconds(miliseconds, format) {
    var days, hours, minutes, seconds, total_hours, total_minutes, total_seconds;

    total_seconds = parseInt(Math.floor(miliseconds / 1000));
    total_minutes = parseInt(Math.floor(total_seconds / 60));
    total_hours = parseInt(Math.floor(total_minutes / 60));
    days = parseInt(Math.floor(total_hours / 24));

    seconds = parseInt(total_seconds % 60);
    minutes = parseInt(total_minutes % 60);
    hours = parseInt(total_hours % 24);

    switch (format) {
        case 's':
            return total_seconds;
        case 'm':
            return total_minutes;
        case 'h':
            return total_hours;
        case 'd':
            return days;
        default:
            return {d: days, h: hours, m: minutes, s: seconds};
    }
};