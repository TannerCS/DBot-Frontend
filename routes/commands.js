const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const guild = require('../models/guild');

router.get('/guild/:uid/commands', (async (req, res) => {
	let guildID = req.params.uid;
	let access_token = req.cookies.access_token;
    
	if(!guildID || !access_token) return res.send('something went wrong.');
	
	//Get guild information from discord
	let guildInfos = await fetch('https://discordapp.com/api/users/@me/guilds', {headers: { Authorization: `Bearer ${access_token}` } });
	let guildJson = await guildInfos.json();
	
	//Filter owned guilds
	let ownedGuilds = await guildJson.filter(guild => guild.owner === true);
	
	if(!ownedGuilds.find(guild => guild.id == guildID)) return res.send('You don\'t have access.');
	
	//filter out guilds that the bot is not in
	for (let i = 0; i < ownedGuilds.length; i++) {
		const ownedGuild = ownedGuilds[i];
		const guildSchem = await guild.findOne({guild_id: ownedGuild.id});
		
		if(!guildSchem){
			ownedGuilds.splice(i, 1);
		}
	}

	//Get database guild info
	let guildSchema = await guild.findOne({guild_id: guildID});

	//Get profile pictures from guilds that have them
	ownedGuilds.forEach(element => {
		if(element.icon != null){
			element.icon = `<img src="https://cdn.discordapp.com/icons/${element.id}/${element.icon}.webp?size=64" style="border-radius: 50%" />`;
		}
	});

	res.render('commands', {guildSchema: guildSchema, ownedGuilds: ownedGuilds, currentGuild:  ownedGuilds.find(guild => guild.id == guildID)});
}));

router.post('/guild/:uid/commands', (async (req, res) => {
	let guildID = req.params.uid;
	let access_token = req.cookies.access_token;

	if(!guildID || !access_token || !req.body) return res.sendStatus(401);

	//Get database guild info
	let guildSchema = await guild.findOne({guild_id: guildID});
	let commandKey = Object.keys(req.body);

	//If the command.Name is not found
	if(commandKey.length !== 1) return res.sendStatus(404);
	commandKey = commandKey[0];

	//Find command to be modified
	let command = await guildSchema.commands.find(command => command.Name == commandKey);
	let oldComm = command;

	//disable/enable command
	let enabled = parseBool(req.body[commandKey]);
	command.Enabled = enabled;
	guildSchema.commands[oldComm] = command;
	guildSchema.markModified('commands');

	await guildSchema.save();

	return res.sendStatus(200);
}));

function parseBool(b) {
	return !(/^(false|0)$/i).test(b) && !!b;
}

module.exports = router;