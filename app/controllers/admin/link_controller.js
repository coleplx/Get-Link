var Link = require('../../models/link'),
    _ = require('lodash'),
    api_response = require('../../helper/api_response'),
    filesize = require('file-size');

var linkController = {};

linkController.list_link = function(req, res, next) {
    Link.find().sort({'_id': -1}).limit(10).exec(function(err, list) {
        if (err)
            return res.json(new api_response(false, err.message))

        res.json(new api_response(true, 'Successful', list))
    })
}

exports = module.exports = linkController;
