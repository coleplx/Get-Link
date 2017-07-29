var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring')

var re = /https?:\/\/(www\.)?ge\.tt\/([a-zA-Z0-9]+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[2]
	result.host = hostEnum.GETT

	async.waterfall([
		function checkFile(callback) {
			getFileInfo(callback)
		},
		function(callback) {
			download(function(err, direct_link) {
				if (err)
					return callback(err)

				if (!direct_link)
					return callback(new Error('Lỗi bất thường'))

				result.direct_link = direct_link
				result.is_stream = false
				callback(null, result)
			})
		}
	],
		callback
	)
}

var getFileInfo = function(callback) {
	var options = {
		uri: 'http://api.ge.tt/1/shares/' + result.uid,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

        if (response.statusCode !== 200)
            return callback(new Error('Tệp tin không hợp lệ hoặc đã bị xóa'))

        body = JSON.parse(body)
        if (!body)
            return callback(new Error('Lỗi khi parse dữ liệu'))

        if (!body.files.length)
            return callback(new Error('Lỗi khi lấy thông tin file'))

		result.file = {
			name: body.files[0].filename,
			size: body.files[0].size
		}

		callback(null)
	})
}

var download = function(callback) {
	getLocation('http://proxy.ge.tt/1/files/' + result.uid + '/0/blob?download', function(err, direct_link) {
        if (err)
            return callback(err)

        callback(null, direct_link)
    })
}

var getLocation = function(link, callback) {
	var options = {
		uri: link,
		method: 'HEAD',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
		followRedirect: false
	}

	request(options, function (err, response, body) {
		if (err)
			return callback(err)

		if (response.statusCode !== 301 && response.statusCode !== 302)
			return callback(new Error('Lỗi khi lấy direct link'))
		callback(null, response.headers['location'])
	})
}
