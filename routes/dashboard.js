const express = require('express');
const fetch = require('node-fetch');
const guildSchema = require('../models/guild');
const guild = require('../constants/guild');
const CONFIG = require('../config.json');
const crypto = require('../constants/crypto');

const router = express.Router();

router.get('/guild/:uid',  (async (req, res) => {
	//If user isn't logged in, force them to log in.
	if(!req.cookies.access_token) return res.redirect('/login');
	if(!req.params.uid) return res.send('something went wrong.');

	let guildID = req.params.uid;
	let jwt_token = crypto.verifyJwt(req.cookies.access_token);
	if(!jwt_token) return res.send('something went wrong.');

	let guildInfo = await guild.getGuildInfo(jwt_token.access_token);
	if(!guildInfo) return res.send('something went wrong.');

	//Get database guildSchema info
	let currentGuildSchema = await guildSchema.findOne({guild_id: guildID});
	currentGuildSchema = JSON.parse(JSON.stringify(currentGuildSchema));

	if(currentGuildSchema.analytics.messages_received.length > 1){
		let count = parseInt((currentGuildSchema.analytics.messages_received[currentGuildSchema.analytics.messages_received.length - 1].Count - currentGuildSchema.analytics.messages_received[currentGuildSchema.analytics.messages_received.length - 2].Count) / currentGuildSchema.analytics.messages_received[currentGuildSchema.analytics.messages_received.length - 1].Count * 100);
		if(isNaN(count)) count = 0;
		currentGuildSchema.analytics.messagePercent = `Message Count/24h: ${count}%`;
	}else{
		currentGuildSchema.analytics.messagePercent = 'Not enough data.';
	}

	if(currentGuildSchema.analytics.users_joined.length > 1){
		let count = parseInt((currentGuildSchema.analytics.users_joined[currentGuildSchema.analytics.messages_received.length - 1].Count - currentGuildSchema.analytics.users_joined[currentGuildSchema.analytics.messages_received.length - 2].Count) / currentGuildSchema.analytics.users_joined[currentGuildSchema.analytics.messages_received.length - 1].Count * 100);
		if(isNaN(count)) count = 0;
		currentGuildSchema.analytics.userJoinedPercent = `Users Joined/24h: ${count}%`;
	}else{
		currentGuildSchema.analytics.userJoinedPercent = 'Not enough data.';
	}

	if(currentGuildSchema.analytics.users_left.length > 1){
		let count = parseInt((currentGuildSchema.analytics.users_left[currentGuildSchema.analytics.messages_received.length - 1].Count - currentGuildSchema.analytics.users_left[currentGuildSchema.analytics.messages_received.length - 2].Count) / currentGuildSchema.analytics.users_left[currentGuildSchema.analytics.messages_received.length - 1].Count * 100);
		if(isNaN(count)) count = 0;
		currentGuildSchema.analytics.userLeftPercent = `Users Left/24h: ${count}%`;
	}else{
		currentGuildSchema.analytics.userLeftPercent = 'Not enough data.';
	}

	currentGuildSchema.analytics.messages_received = currentGuildSchema.analytics.messages_received.slice(0, 14);
	currentGuildSchema.analytics.messages_deleted = currentGuildSchema.analytics.messages_deleted.slice(0, 14);
	currentGuildSchema.analytics.users_joined = currentGuildSchema.analytics.messages_deleted.slice(0, 14);
	currentGuildSchema.analytics.users_left = currentGuildSchema.analytics.messages_deleted.slice(0, 14);

	let guildCountInfo = await fetch(`https://discordapp.com/api/guilds/${guildID}?with_counts=true`, {headers: { Authorization: `Bot ${CONFIG.bot_token}` } });
	guildCountInfo = await guildCountInfo.json();

	res.render('dashboard', { ownedGuilds: guildInfo, guildSchema: currentGuildSchema, currentGuild:  guildInfo.find(guild => guild.id == guildID), guildInfo: guildCountInfo});
}));

module.exports = router;