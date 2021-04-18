const express = require('express');
const cookieParser = require('cookie-parser');

const loginRouter = require('./routes/login');
const logoutRouter = require('./routes/logout');
const commandRouter = require('./routes/commands');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const mongoose = require('mongoose');
const CONFIG = require('./config.json');

mongoose.connect(CONFIG.mongodb_url, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', function (err) {
	if (err) // couldn't connect
	// hack the driver to allow re-opening after initial network error
		db.db.close();
	connect();
});
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
app.use(commandRouter);
app.use(dashboardRouter);

app.get('/', (async (req, res) => {
	return res.render('index');
}));


app.listen(5000);