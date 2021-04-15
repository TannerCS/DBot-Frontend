const express = require('express');
const cookieParser = require('cookie-parser');

const loginRouter = require('./routes/login');
const logoutRouter = require('./routes/logout');

const fetch = require('node-fetch');
const app = express();
const guild = require('./models/guild');
const mongoose = require('mongoose');
const CONFIG = require('./config.json');

mongoose.connect(CONFIG.mongodb_url, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async () => {
	console.log('Database Connected');
});

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));
app.use((req, res, next) => {
	const render = res.render;
	const send = res.send;
	res.render = function renderWrapper(...args) {
		Error.captureStackTrace(this);
		return render.apply(this, args);
	};
	res.send = function sendWrapper(...args) {
		try {
			send.apply(this, args);
		} catch (err) {
			console.error(`Error in res.send | ${err.code} | ${err.message} | ${res.stack}`);
		}
	};
	next();
});
app.use(loginRouter);
app.use(logoutRouter);

app.get('/', (async (req, res) => {
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
    
	if(guildSchema == null){
		console.log('can\'t find guild');
		res.send('something went wrong.');
		return;
	}

	res.redirect(`/guild/${guildSchema[0].guild_id}`);
	return;
}));

app.get('/guild/:uid',  (async (req, res) => {
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

	res.render('index', { userInfo: userJson, ownedGuilds: ownedGuilds, guildSchema: guildSchema, currentGuild:  ownedGuilds.find(guild => guild.id == guildID)});
}));


app.listen(5000);