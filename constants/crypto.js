const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const algorithm = 'aes-256-ctr';
const iv = crypto.randomBytes(16);
const CONFIG = require('../config.json');

const encrypt = (text) => {

	const cipher = crypto.createCipheriv(algorithm, CONFIG.crypto_secret, iv);

	const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

	return {
		iv: iv.toString('hex'),
		content: encrypted.toString('hex')
	};
};

const decrypt = (hash) => {
	const decipher = crypto.createDecipheriv(algorithm, CONFIG.crypto_secret, Buffer.from(hash.iv, 'hex'));

	const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);

	return decrpyted.toString();
};

const verifyJwt = (token) => {
	let verifiedToken = jwt.verify(token, CONFIG.jwt_secret, (err, token) => {
		if(err)  {
			console.log(err);
			return null;
		}
		token.access_token = decrypt(token.access_token);
		return token;
	});

	return verifiedToken;
};

module.exports = {
	encrypt,
	decrypt,
	verifyJwt
};