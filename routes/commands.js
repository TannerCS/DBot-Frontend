const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
const jwt = require('jsonwebtoken');
const CONFIG = require('../config.json');
const crypto = require('../constants/crypto');

const guild = require('../models/guild');

router.get('/guild/:uid/commands', (async (req, res) => {
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
	//If user isn't logged in, force them to log in.
	if(!req.cookies.access_token){
		res.redirect('/login');
		return;
	}

	let guildID = req.params.uid;

	if(!guildID || !req.body) return res.sendStatus(401);

	let jwt_token = req.cookies.access_token;
	let access_token = null;

	jwt.verify(jwt_token, CONFIG.jwt_secret, (err, token) => {
		if(err) {
			res.clearCookie('access_token');
			return res.sendStatus(401);
		}

		access_token = token;
	});

	if(!access_token) return;
	

	//Get database guild info
	let guildSchema = await guild.findOne({guild_id: guildID, owner_id: access_token.user_id});

	if(!guildSchema) return res.sendStatus(404);

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