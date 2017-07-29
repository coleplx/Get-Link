var Account = require('../../models/account'),
    api_response = require('../../helper/api_response'),
    _ = require('lodash'),
    ObjectId = require('mongoose').Types.ObjectId;

var accountController = {};

accountController.list_account = function(req, res, next) {
    Account.find().exec(function(err, list) {
        if (err)
            return res.json(new api_response(false, err.message))

        res.json(new api_response(true, 'OK', list))
    })
}

accountController.add_account = function(req, res, next) {
    var host = req.body.host || '',
        username = req.body.username || '',
        password = req.body.password || '',
        active = req.body.active || false;

        if (!host || !username || !password)
            return res.json(new api_response(false, 'Tham số không hợp lệ'))

        var account = new Account({
            host: host,
            username: username,
            password: password,
            active: active
        })

        account.save(function(err) {
            if (err)
                return res.json(new api_response(false, err.message))

            res.json(new api_response(true, 'Successful'))
        });
}

accountController.update_account = function(req, res, next) {
    var id = req.body.id || '',
        host = req.body.host || '',
        username = req.body.username || '',
        password = req.body.password || '',
        active = req.body.active || false;

        if (!ObjectId.isValid(id) || !host || !username || !password)
            return res.json(new api_response(false, 'Tham số không hợp lệ'))

        var newAccount = {
            host: host,
            username: username,
            password: password,
            active: active
        }

        Account.findOneAndUpdate({'_id': new ObjectId(id)}, {$set: newAccount}).exec(function(err) {
            if (err)
                return res.json(new api_response(false, err.message))

            res.json(new api_response(true, 'Successful'))
        })
}

accountController.delete_account = function(req, res, next) {
    var id = req.body.id || ''

    Account.findOneAndRemove({_id: id}).exec(function(err, account) {
        if (err)
            return json.json(new api_response(false, err.message))

        res.json(new api_response(true, 'Success'))
    })
}

exports = module.exports = accountController;
