const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
	guild_id: {
		type: String,
		required: true
	},
	owner_id: {
		type: String,
		required: true
	},
	commands: {
		type: Array,
		required: false
	},
	prefix: {
		type: String,
		required: true
	},
	analytics: {
		type: Object,
		required: true
	},
});

module.exports = mongoose.model('guild-information', guildSchema, 'guild-information');