'use strict';

var mongoose = require('mongoose'),
	Donate = require('../models/donate'),
	apiResponse = require('../helper/api_response');

var donateController = {};

donateController.add = function(req, res) {
	var type = req.body.type || '';
	var typeSupport = ['Card', 'Account', 'Paypal'];
	if (typeSupport.indexOf(type) === -1)
		return res.json(new apiResponse(false, 'Donate type not support'));

	var people = req.body.people || 'Anonymous',
		comment = req.body.comment || '';

	var donate = new Donate();
	donate.type = type;
	donate.people = people;
	donate.comment = comment;

	switch (type) {
		case 'Card':
			if (!req.body.net || !req.body.serial || !req.body.number)
				return res.json(new apiResponse(false, 'Thiếu tham số'));

			donate.card.net = req.body.net;
			donate.card.serial = req.body.serial;
			donate.card.number = req.body.number;
			break;
		case 'Account':
			if (!req.body.host || !req.body.account || !req.body.password)
				return res.json(new apiResponse(false, 'Thiếu tham số'));

			donate.account.host = req.body.host;
			donate.account.account = req.body.account;
			donate.account.password = req.body.password;
			break;
		case 'Paypal':
			if (!req.body.email || !req.body.amount)
				return res.json(new apiResponse(false, 'Thiếu tham số'));

			donate.paypal.email = req.body.email;
			donate.paypal.amount = req.body.amount;
			break;
	}

	donate.save(function(err, result) {
		if (err)
			return res.json(new apiResponse(false, 'Lỗi truy vấn'));

		res.json(new apiResponse(true, 'Donate thành công. Cám ơn bạn'));
	});
}

module.exports = donateController
