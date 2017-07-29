var mongoose = require('mongoose'),
	Link = require('../models/link'),
	Status = require('../models/status'),
	filesizeConvert = require('file-size'),
	request = require('request'),
	mime = require('mime-types'),
	config = require('../../config/'),
	_ = require('lodash'),
	api_response = require('../helper/api_response');

var fileController = {};

fileController.find_file = function(req, res) {
	var keyword = req.body.keyword || '';
	if (_.isEmpty(keyword))
		return res.json(new api_response(true, 'Empty', []));

	Link.aggregate([
		{ '$match': { '$text': { '$search': keyword}}},
		{ '$sort': { score: { $meta: 'textScore' } } },
		{ '$group': {_id: '$url', host: { '$first': '$host'}, file: { '$first': '$file'}}},
		{ '$project': { _id: 0, host: 1, file: 1, url: '$_id'}},
		{ '$limit' : 8 }
	]).exec(function(err, result) {
		if (err)
			return res.json(new api_response(false, err.message));

		res.json(new api_response(true, 'Success', result));
	})
}

module.exports = fileController;
