#!/usr/bin/env node

const redisModule = require('async-redis');
const Discord = require('discord.js');

// Config
const redisURL = process.env.REDIS_URL;
const redisPrefix = process.env.REDIS_PREFIX || 'XPBOT_';
const telegramToken = process.env.TELEGRAM_TOKEN;
const botChannel = process.env.BOT_CHANNEL;
const ignoredChannels = (process.env.IGNORED_CHANNELS || '')
    .split(',').map(e => e.trim());
const groupId = process.env.GROUP_ID;
const rateLimit = parseInt(process.env.RATE_LIMIT) || 15;
const key = redisPrefix + groupId;

if (!groupId) {
    console.error("No GROUP_ID specified");
    process.exit(1);
}

// APIs
const client = new Discord.Client();
const redis = redisModule.createClient(redisURL);

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (!msg.guild)
        return;
    
    if (msg.channel.name == botChannel)
        handleCommand(msg);
    else if (!ignoredChannels.find(e => e.name == msg.channel.name))
        incrementXP(msg);
});

async function incrementXP(msg) {
    const uid = msg.author.id;
    
    if (rateLimit) {
        const ukey = redisPrefix + "_DCUSER_" + uid;

        if (await redis.exists(ukey))
            return;

        await redis.set(ukey, 1);
        await redis.expire(ukey, rateLimit);
    }

    await redis.zincrby(key, 1, uid);
}

async function handleCommand(msg) {
    if (msg.content.match(/!xp($|\s)/))
        await displayRank(msg);
    else if (msg.content.match(/!ranks($|\s)/))
        await displayTopRanks(msg);
}

async function displayRank(msg) {
    const uid = msg.author.id;

    const score = await redis.zscore(key, uid);
    if (!score) {
        msg.channel.send(`${mention(msg)}, you're not ranked yet 👶`);
        return;
    }

    const rank = (await redis.zrevrank(key, uid)) + 1;
    const total = await redis.zcard(key);

    const next = await redis.zrangebyscore(key, parseInt(score) + 2, '+inf', 'withscores', 'limit', 0, 1);
    
    let message = '';
    message += `${mention(msg)}, `;
    message += `you have ${score} XP`;
    message += '  ◎  ';
    message += `Rank ${rank} / ${total}`;
    message += '  ◎  ';

    if (!next || next.length == 0) {
        message += '𝙺𝚒𝚗𝚐 𝙽𝙸𝙼𝙸𝚀 👑';
    } else {
        message += `${next[1]-score} to beat `;

        const member = await client.fetchUser(next[0]);
        if (member)
            message += withUser(member.user);
        else
            message += 'the next user';
    }

    msg.channel.send(message);
}

async function displayTopRanks(msg, match) {
    const total = await redis.zcard(key);
    if (total < 3)
        return;

    const scores = await redis.zrevrange(key, 0, 3, "withscores");
    let users = [];
    for (let i = 0; i < 3; i++) {
        const user = await client.fetchUser(scores[i*2]);
        if (user)
            users[i] = user.username;
        else
            users[i] = {username: 'A ghost'};
    }

    msg.channel.send(gid,
        `🥇 ${users[0]}: ${scores[1]} XP \n` +
        `🥈 ${users[1]}: ${scores[3]} XP \n` +
        `🥉 ${users[2]}: ${scores[5]} XP`,
        { parse_mode: 'Markdown', disable_notification: true },
        msg);
}

function mention(msg) {
    return `${msg.author.username}#${msg.author.discriminator}`;
}

client.login(telegramToken)
    .catch(e => {
        console.error(e.message);
        process.exit(1);
    });
