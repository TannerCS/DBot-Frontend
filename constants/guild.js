const fetch = require('node-fetch');
const guildSchema = require('../models/guild');

const getGuildInfo = async (access_token) => {
	//Get guild information from discord
	let guildInfos = await fetch('https://discordapp.com/api/users/@me/guilds', {headers: { Authorization: `Bearer ${access_token}` } });
	let guildJson = await guildInfos.json();

	//Filter owned guilds
	let ownedGuilds = await guildJson.filter(guild => guild.owner === true);


	//filter out guilds that the bot is not in
	for (let i = 0; i < ownedGuilds.length; i++) {
		let ownedGuild = ownedGuilds[i];
		let guildSchem = await guildSchema.findOne({guild_id: ownedGuild.id});

		if(!guildSchem){
			ownedGuilds.splice(i, 1);
		}
	}

	//Get profile pictures from guilds that have them
	ownedGuilds.forEach(element => {
		if(element.icon != null){
			element.icon = `<img src="https://cdn.discordapp.com/icons/${element.id}/${element.icon}.webp?size=64" style="border-radius: 50%" alt="" />`;
		}
	});
    
	return ownedGuilds;
};

module.exports = {
	getGuildInfo
};