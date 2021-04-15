const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const router = express.Router();
const CONFIG = require('../config.json');

router.get('/login', (req, res) => {
	res.redirect('https://discord.com/api/oauth2/authorize?client_id=388799511621009408&permissions=8&redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fauth&response_type=code&scope=identify%20email%20guilds%20guilds.join%20applications.commands%20bot');
});

router.get('/auth', (async (req, res) => {
	if(!req.query.code || !req.query.guild_id){
		res.send('Code not found.');
		return;
	}

	const data = new FormData();
	data.append('client_id', CONFIG.client_id);
	data.append('client_secret', CONFIG.client_secret);
    
	data.append('grant_type', 'authorization_code');
	data.append('redirect_uri', CONFIG.redirect_uri);
	data.append('scope', 'identify');
	data.append('code', req.query.code);

	let resp = await fetch('https://discordapp.com/api/oauth2/token', {
		method: 'POST',
		body: data
	})
		.catch(e => {
			console.log(e);
			res.send('Something went wrong.');
		});

	var json = await resp.json();
    
	res.cookie('access_token', json.access_token, {expires: new Date(Date.now() + (parseInt(json.expires_in) * 1000)), httpOnly: true});
	res.redirect(`/guild/${req.query.guild_id}`);
}));

module.exports = router;