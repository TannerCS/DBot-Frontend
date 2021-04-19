const express = require('express');
const fetch = require('node-fetch');
const guild = require('../models/guild');
const jwt = require('jsonwebtoken');
const CONFIG = require('../config.json');
const crypto = require('../constants/crypto');

const router = express.Router();

router.get('/guild/:uid',  (async (req, res) => {
	//If user isn't logged in, force them to log in.
	if(!req.cookies.access_token){
		res.redirect('/login');
		return;
	}

	if(!req.params.uid) return res.send('something went wrong.');

	let guildID = req.params.uid;
	let jwt_token = req.cookies.access_token;
	let access_token = null;

	jwt.verify(jwt_token, CONFIG.jwt_secret, (err, token) => {
		if(err) {
			res.clearCookie('access_token');
			return res.send('something went wrong.');
		}

		access_token = token;
	});

	if(!access_token) return;

	access_token = crypto.decrypt(access_token.access_token);

	//Get guild information from discord
	let guildInfos = await fetch('https://discordapp.com/api/users/@me/guilds', {headers: { Authorization: `Bearer ${access_token}` } });
	let guildJson = await guildInfos.json();
	if(guildJson.message) return res.send('something went wrong.');

	//Get user information
	let userInfo = await fetch('https://discordapp.com/api/users/@me', {headers: { Authorization: `Bearer ${access_token}` } });
	let userJson = await userInfo.json();
	if(userJson.message) return res.send('something went wrong.');
    
	//Get database guild info
	let guildSchema = await guild.findOne({guild_id: guildID, owner_id: userJson.id});
	guildSchema = JSON.parse(JSON.stringify(guildSchema));
    
	//Filter owned guilds
	let ownedGuilds = await guildJson.filter(guild => guild.owner == true);

	if(!ownedGuilds.find(guild => guild.id == guildID)) return res.send('you don\'t have access.');

	//filter out guilds that the bot is not in
	for (let i = 0; i < ownedGuilds.length; i++) {
		const ownedGuild = ownedGuilds[i];
		const guildSchem = await guild.findOne({guild_id: ownedGuild.id});
        
		if(!guildSchem){
			ownedGuilds.splice(i, 1);
		}
	}
    
	//Get profile pictures from guilds that have them
	ownedGuilds.forEach(element => {
		if(element.icon != null){
			element.icon = `<img src="https://cdn.discordapp.com/icons/${element.id}/${element.icon}.webp?size=64" style="border-radius: 50%" />`;
		}
	});

	if(guildSchema.analytics.messages_received.length > 1){
		guildSchema.analytics.messagePercent = `Message Count: ${(guildSchema.analytics.messages_received[guildSchema.analytics.messages_received.length - 1].Count - guildSchema.analytics.messages_received[guildSchema.analytics.messages_received.length - 2].Count) / guildSchema.analytics.messages_received[guildSchema.analytics.messages_received.length - 1].Count * 100}%`;
	}else{
		guildSchema.analytics.messagePercent = 'Not enough data.';
	}

	if(guildSchema.analytics.users_joined.length > 1){
		guildSchema.analytics.userJoinedPercent = `Message Count: ${(guildSchema.analytics.users_joined[guildSchema.analytics.messages_received.length - 1].Count - guildSchema.analytics.users_joined[guildSchema.analytics.messages_received.length - 2].Count) / guildSchema.analytics.users_joined[guildSchema.analytics.messages_received.length - 1].Count * 100}%`;
	}else{
		guildSchema.analytics.userJoinedPercent = 'Not enough data.';
	}

	if(guildSchema.analytics.users_left.length > 1){
		guildSchema.analytics.userLeftPercent = `Message Count: ${(guildSchema.analytics.users_left[guildSchema.analytics.messages_received.length - 1].Count - guildSchema.analytics.users_left[guildSchema.analytics.messages_received.length - 2].Count) / guildSchema.analytics.users_left[guildSchema.analytics.messages_received.length - 1].Count * 100}%`;
	}else{
		guildSchema.analytics.userLeftPercent = 'Not enough data.';
	}

	guildSchema.analytics.messages_received = guildSchema.analytics.messages_received.slice(0, 14);
	guildSchema.analytics.messages_deleted = guildSchema.analytics.messages_deleted.slice(0, 14);
	guildSchema.analytics.users_joined = guildSchema.analytics.messages_deleted.slice(0, 14);
	guildSchema.analytics.users_left = guildSchema.analytics.messages_deleted.slice(0, 14);

	let guildInfo = await fetch(`https://discordapp.com/api/guilds/${guildID}?with_counts=true`, {headers: { Authorization: `Bot ${CONFIG.bot_token}` } });
	guildInfo = await guildInfo.json();


	res.render('dashboard', { userInfo: userJson, ownedGuilds: ownedGuilds, guildSchema: guildSchema, currentGuild:  ownedGuilds.find(guild => guild.id == guildID), guildInfo: guildInfo});
}));

module.exports = router;