var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string')

var re = /https:\/\/github\.com\/(.+)\/(.+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[2]
	result.host = hostEnum.GITHUB

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
		uri: result.url,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Lỗi server code ' + response.statusCode))

		if (_.includes(body, 'Page not found'))
			return callback(new Error('File không tồn tại'))

		result.file = {
			name: S(body).between('card" /><meta content="', '"'),
			size: S(body).between('bytes": ', ',').s,
			type: 'zip'
		}
		result.image = 'https://avatars' + S(body).between('content="https://avatars', '"')

		callback(null)
	})
}

var download = function(callback) {
	getLocation(result.url + '/archive/master.zip', function(err, direct_link) {
		if (err)
			return callback(err)

		getFileSize(direct_link, function(err, size) {
			if (err)
				return callback(err)

			result.file.size = size
			callback(null, direct_link)
		})
	})
}

var getLocation = function(link, callback) {
	var options = {
		uri: link,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
		followRedirect: false
	}

	request(options, function (error, response) {
		if (error)
			return callback(error)

		if (response.statusCode !== 301 && response.statusCode !== 302)
			return callback(new Error('Lỗi khi lấy direct link'))
		callback(null, response.headers['location'])
	})
}

var getFileSize = function(link, callback) {
	var r = request({uri: link}).on('response', function(res) {
		r.abort()
        if (!res.headers['content-length'])
			return callback(new Error('Lỗi khi lấy dung lượng file'))
		callback(null, parseInt(res.headers['content-length']))
    })
}
