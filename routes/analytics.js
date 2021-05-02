const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
const jwt = require('jsonwebtoken');
const CONFIG = require('../config.json');
const crypto = require('../constants/crypto');
const guild = require('../models/guild');

router.get('/guild/:uid/analytics', async (req, res) => {
	//If user isn't logged in, force them to log in.
	if(!req.cookies.access_token){
		res.redirect('/login');
		return;
	}
	
	let guildID = req.params.uid;
    
	if(!guildID) return res.send('something went wrong.');
	
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
	
	//Filter owned guilds
	let ownedGuilds = await guildJson.filter(guild => guild.owner === true);
	
	if(!ownedGuilds.find(guild => guild.id === guildID)) return res.send('You don\'t have access.');
	
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
			element.icon = `<img src="https://cdn.discordapp.com/icons/${element.id}/${element.icon}.webp?size=64" style="border-radius: 50%"/>`;
		}
	});

	res.render('analytics', {ownedGuilds: ownedGuilds, currentGuild:  ownedGuilds.find(guild => guild.id === guildID)});
});

module.exports = router;