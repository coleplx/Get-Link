var jwt = require('jsonwebtoken'),
	db = require('../../config/database.js'),
	User = require('../models/user'),
	api_response = require('../helper/api_response'),
	_ = require('lodash');

var authController = {
	login: function(req, res) {
		var username = req.body.username || '',
			password = req.body.password || '';

		User.find({username: username}).limit(1).exec(function(err, user) {
			if (err)
				return res.json(new api_response(false, err.message)).end();

			if (_.isEmpty(user))
				return res.json(new api_response(false, 'Tải khoản không hợp lệ')).end();

			if (!user[0].validPassword(password))
				return res.json(new api_response(false, 'Mật khẩu không đúng')).end();

			jwt.sign(user[0].toObject(), db.secret, {
	        	expiresIn: 1440
	        }, function(err, token) {
	        	if (err)
	        		return res.json(new api_response(false, err.message)).end();

	        	res.json(new api_response(true, 'Success', {
					token: token,
					username: username,
					is_admin: user[0].is_admin
				}));
	        });
		});
	},

	showLogin: function(req, res) {
		res.sendFile('/public/admin/login.html', {root: __root});
	}
}

module.exports = authController
