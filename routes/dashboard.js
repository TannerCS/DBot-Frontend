const express = require('express');
const fetch = require('node-fetch');
const guild = require('../models/guild');

const router = express.Router();

router.get('/guild/:uid/dashboard', (async (req, res) => {
    //If user isn't logged in, force them to log in.
	if(!req.cookies.access_token){
		res.redirect('/login');
		return;
	}
    let access_token = req.cookies.access_token;

    //Get user information
	let userInfo = await fetch('https://discordapp.com/api/users/@me', {headers: { Authorization: `Bearer ${access_token}` } });
	let userJson = await userInfo.json();
    
	//Get database guild info
	let guildSchema = await guild.find({owner_id: userJson.id});

	res.redirect(`/guild/${guildSchema[0].guild_id}`);
}));

router.get('/guild/:uid',  (async (req, res) => {
    //If user isn't logged in, force them to log in.
	if(!req.cookies.access_token){
		res.redirect('/login');
		return;
	}

	let guildID = req.params.uid;
	let access_token = req.cookies.access_token;

	//Get guild information from discord
	let guildInfos = await fetch('https://discordapp.com/api/users/@me/guilds', {headers: { Authorization: `Bearer ${access_token}` } });
	let guildJson = await guildInfos.json();
    
	//Get user information
	let userInfo = await fetch('https://discordapp.com/api/users/@me', {headers: { Authorization: `Bearer ${access_token}` } });
	let userJson = await userInfo.json();
    
	//Get database guild info
	let guildSchema = await guild.find({owner_id: userJson.id});
    
	//Filter owned guilds
	let ownedGuilds = await guildJson.filter(guild => guild.owner == true);

	for (let i = 0; i < ownedGuilds.length; i++) {
		const ownedGuild = ownedGuilds[i];
		const guildSchem = await guild.find({guild_id: ownedGuild.id});
        
		if(guildSchem.length < 1){
			ownedGuilds.splice(i, 1);
		}
	}

	if(!ownedGuilds.find(guild => guild.id == guildID)){
		res.send('You don\'t have access.');
		return;
	}

	guildSchema.forEach(element => {
		element.commands = JSON.parse(JSON.stringify(element.commands));
	});
    
	//Get profile pictures from guilds that have them
	ownedGuilds.forEach(element => {
		if(element.icon != null){
			element.icon = `<img src="https://cdn.discordapp.com/icons/${element.id}/${element.icon}.webp?size=64" style="border-radius: 50%" />`;
		}
	});

	res.render('dashboard', { userInfo: userJson, ownedGuilds: ownedGuilds, guildSchema: guildSchema, currentGuild:  ownedGuilds.find(guild => guild.id == guildID)});
}));

module.exports = router;