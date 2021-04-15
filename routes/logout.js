const express = require('express');
const router = express.Router();

router.get('/logout', (req, res) => {
	res.clearCookie('access_token');
	res.render('logout');
});

module.exports = router;