const express = require('express');
const router = express.Router();
const crypto = require('../constants/crypto');

const guildSchema = require('../models/guild');
const guild = require('../constants/guild');

router.get('/guild/:uid/commands', (async (req, res) => {
	//If user isn't logged in, force them to log in.
	if(!req.cookies.access_token) return res.redirect('/login');

	//Verify and decrypt jwt token
	let jwt_token = crypto.verifyJwt(req.cookies.access_token);
	let guildID = req.params.uid;
	if(!guildID || !jwt_token) return res.send('something went wrong.');

	//Get guild information from Discord
	let ownedGuilds = await guild.getGuildInfo(jwt_token.access_token);
	if(!ownedGuilds.find(guild => guild.id === guildID)) return res.send('something went wrong.');

	//Get database guildSchema info
	let currentGuildSchema = await guildSchema.findOne({guild_id: guildID});

	currentGuildSchema.commands = currentGuildSchema.commands.sort((a, b) => {
		var nameA = a.Category.toUpperCase(); // ignore upper and lowercase
		var nameB = b.Category.toUpperCase(); // ignore upper and lowercase

		if (nameA < nameB) {
			return -1;
		}
		if (nameA > nameB) {
			return 1;
		}
		
		// names must be equal
		return 0;
	});

	let categories = [];
	
	currentGuildSchema.commands.forEach(command => {
		if(!categories.includes(command.Category)) {
			categories.push(command.Category);
		}
	});
	
	res.locals.commands = {
		isAtCommandsPage: true,
		categories: categories
	};

	res.render('commands', {guildSchema: currentGuildSchema, ownedGuilds: ownedGuilds, currentGuild:  ownedGuilds.find(guildSchema => guildSchema.id === guildID)});
}));

router.post('/guild/:uid/commands', (async (req, res) => {
	//If user isn't logged in, force them to log in.
	if(!req.cookies.access_token) return res.sendStatus(401);

	let guildID = req.params.uid;
	if(!guildID || !req.body) return res.sendStatus(401);

	//Verify and decrypt jwt token
	let jwt_token = crypto.verifyJwt(req.cookies.access_token);
	if(!jwt_token) return res.sendStatus(401);

	//Get database guildSchema info
	let guild = await guildSchema.findOne({guild_id: guildID, owner_id: jwt_token.user_id});
	if(!guild) return res.sendStatus(404);

	let commandKey = Object.keys(req.body);

	//If the command.Name is not found
	if(commandKey.length !== 1) return res.sendStatus(404);
	commandKey = commandKey[0];

	//Find command to be modified
	let command = await guild.commands.find(command => command.Name === commandKey);
	let oldComm = command;

	//disable/enable command
	command.Enabled = parseBool(req.body[commandKey]);
	guild.commands[oldComm] = command;
	guild.markModified('commands');

	await guild.save();

	return res.sendStatus(200);
}));

function parseBool(b) {
	return !(/^(false|0)$/i).test(b) && !!b;
}

module.exports = router;