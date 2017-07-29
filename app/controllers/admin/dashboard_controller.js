var Link = require('../../models/link'),
    _ = require('lodash'),
    async = require('async'),
    api_response = require('../../helper/api_response'),
    filesize = require('file-size'),
    pusage = require('pidusage');

var dashboardController = {};

dashboardController.statastic = function(req, res, next) {
    async.parallel({
        cpu: function(callback) {
            pusage.stat(process.pid, function(err, stat) {
                if (err)
                    return callback(err)
                callback(null, stat.cpu)
            })
        },
        total_link: function(callback) {
            Link.count({}).exec(function(err, count) {
                if (err)
                    return callback(err)
                callback(null, count)
            })
        },
        visitor: function(callback) {
            callback(null, 100)
        },
        online: function(callback) {
            callback(null, 5)
        }
    }, function(err, results) {
        res.json(new api_response(true, 'OK', results))
    })
}

exports = module.exports = dashboardController;
