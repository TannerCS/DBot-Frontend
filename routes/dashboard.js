const express = require('express');
const fetch = require('node-fetch');
const guild = require('../models/guild');

const router = express.Router();

router.get('/guild/:uid',  (async (req, res) => {
	//If user isn't logged in, force them to log in.
	if(!req.cookies.access_token){
		res.redirect('/login');
		return;
	}

	if(!req.params.uid) return res.send('something went wrong.');

	let guildID = req.params.uid;
	let access_token = req.cookies.access_token;

	//Get guild information from discord
	let guildInfos = await fetch('https://discordapp.com/api/users/@me/guilds', {headers: { Authorization: `Bearer ${access_token}` } });
	let guildJson = await guildInfos.json();
	if(guildJson.message) return res.send('something went wrong.');

	//Get user information
	let userInfo = await fetch('https://discordapp.com/api/users/@me', {headers: { Authorization: `Bearer ${access_token}` } });
	let userJson = await userInfo.json();
	if(userJson.message) return res.send('something went wrong.');
    
	//Get database guild info
	let guildSchema = await guild.findOne({owner_id: userJson.id});
    
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

	res.render('dashboard', { userInfo: userJson, ownedGuilds: ownedGuilds, guildSchema: guildSchema, currentGuild:  ownedGuilds.find(guild => guild.id == guildID)});
}));

module.exports = router;