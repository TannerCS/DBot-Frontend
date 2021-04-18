const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const guild = require('../models/guild');

router.get('/guild/:uid/commands', (async (req, res) => {
	let guildID = req.params.uid;
	let access_token = req.cookies.access_token;
    
	if(!guildID || !access_token){
		res.send('something went wrong.');
		return;
	}

	//Get database guild info
	let guildSchema = await guild.find({guild_id: guildID});

	//TODO: CACHE THIS SOMEHOW. TOO MANY CALLS TO DISCORD
	//Get guild information from discord
	let guildInfos = await fetch('https://discordapp.com/api/users/@me/guilds', {headers: { Authorization: `Bearer ${access_token}` } });
	let guildJson = await guildInfos.json();

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

	let currentSchema = null;
	guildSchema.forEach(element => {
		element.commands = JSON.parse(JSON.stringify(element.commands));

		if(element.guild_id == guildID) currentSchema = element;
	});

	//Get profile pictures from guilds that have them
	ownedGuilds.forEach(element => {
		if(element.icon != null){
			element.icon = `<img src="https://cdn.discordapp.com/icons/${element.id}/${element.icon}.webp?size=64" style="border-radius: 50%" />`;
		}
	});

	res.render('commands', {guildSchema: currentSchema, ownedGuilds: ownedGuilds, currentGuild:  ownedGuilds.find(guild => guild.id == guildID)});
}));

router.post('/guild/:uid/commands', (async (req, res) => {
	let guildID = req.params.uid;
	let access_token = req.cookies.access_token;

	if(!guildID || !access_token || !req.body){
		res.send('something went wrong.');
		return;
	}

	//Get database guild info
	let guildSchema = await guild.find({guild_id: guildID});

	//Loop through all the commands and parse them into json. TODO: Fix this idiot.
	let currentSchema = null;
	guildSchema.forEach(element => {
		element.commands = JSON.parse(JSON.stringify(element.commands));

		if(element.guild_id == guildID) currentSchema = element;
	});

	
	let commandKey = Object.keys(req.body)[0];
	
	let commands = JSON.parse(JSON.stringify(currentSchema.commands));
	let comm = await commands.find(command => command.Name == commandKey);
	let commId = commands.indexOf(comm);

	if(comm === -1) return res.sendStatus(404);

	comm.Enabled = parseBool(req.body[commandKey]);
	commands[commId] = comm;
	currentSchema.commands = commands;

	await currentSchema.save();
	await res.sendStatus(200);
}));

function parseBool(b) {
	return !(/^(false|0)$/i).test(b) && !!b;
}

module.exports = router;