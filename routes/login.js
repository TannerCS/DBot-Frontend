const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const jwt = require('jsonwebtoken');

const router = express.Router();
const jsonwebtoken = require('jsonwebtoken');
const CONFIG = require('../config.json');
const guild = require('../models/guild');
const crypto = require('../constants/crypto');

router.get('/login', async (req, res) => {
	//If user isn't logged in, force them to log in.
	if(!req.cookies.access_token){
		res.redirect('https://discord.com/api/oauth2/authorize?client_id=388799511621009408&permissions=2416127046&redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fauth&response_type=code&scope=identify%20email%20guilds%20bot%20applications.commands');
		return;
	}

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

	//Get user information
	let userInfo = await fetch('https://discordapp.com/api/users/@me', {headers: { Authorization: `Bearer ${access_token}` } });
	let userJson = await userInfo.json();
	if(userJson.message) return res.send('something went wrong.');
    
	//Get database guild info
	let guildSchema = await guild.findOne({owner_id: userJson.id});
    
	if(!guildSchema) return res.send('something went wrong.');

	res.redirect(`/guild/${guildSchema.guild_id}`);
});

router.get('/auth', (async (req, res) => {
	if(!req.query.code || !req.query.guild_id){
		res.send('Code not found.');
		return;
	}

	let data = new FormData();
	data.append('client_id', CONFIG.client_id);
	data.append('client_secret', CONFIG.client_secret);
    
	data.append('grant_type', 'authorization_code');
	data.append('redirect_uri', CONFIG.redirect_uri);
	data.append('scope', 'identify');
	data.append('code', req.query.code);

	let resp = await fetch('https://discordapp.com/api/oauth2/token', {
		method: 'POST',
		body: data
	});

	let json = await resp.json();
	if(json.message) return res.send('something went wrong.');

	let userInfo = await fetch('https://discordapp.com/api/users/@me', {headers: { Authorization: `Bearer ${json.access_token}` } });
	let userJson = await userInfo.json();
	if(userJson.message) return res.send('something went wrong.');

	let expiresIn = json.expires_in;

	let jwt = jsonwebtoken.sign({ 
		access_token: crypto.encrypt(json.access_token),
		user_id: userJson.id
	}, CONFIG.jwt_secret, {expiresIn: expiresIn});

	res.cookie('access_token', jwt, {expires: new Date(Date.now() + (expiresIn * 1000)), httpOnly: true});
	res.redirect(`/guild/${req.query.guild_id}`);
}));

module.exports = router;