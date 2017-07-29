var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring')

var re = /https?:\/\/www(\d{1,3})\.zippyshare\.com\/v\/([a-zA-Z0-9]+)\/file\.html/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[2]
    result.wid = match[1]
	result.host = hostEnum.ZIPPYSHARE

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

				result.is_stream = true
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
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Lỗi server code ' + response.statusCode))

        if (_.includes(body, 'File does not exist on this server'))
            return callback(new Error('File không hợp lệ hoặc đã bị xóa'))

		result.file = {
			name: S(body).between('og:title" content="', '"').s
		}

        var a = S(body).between('lang-one\').a = ', ';').toInt()
        var b = 1234567
		var e = function(a, b) {
			return ((a+3)*3)%b + 3
		}

        result.direct_link = 'http://www' + result.wid + '.zippyshare.com/d/' + result.uid + '/' + e(a, b) + '/' + result.file.name

		callback(null)
	})
}

var download = function(callback) {
	getFileSize(result.direct_link, function(err, size) {
        if (err)
            return callback(err)

		result.file.size = size
		callback(null, result.direct_link)
	})
}

var getFileSize = function(link, callback) {
	request.head(link, function (error, response, body) {
		if (error)
			return callback(error)

		if (!response.headers['content-length'])
			return callback(new Error('Lỗi khi lấy dung lượng file'))

		callback(null, parseInt(response.headers['content-length']))
	})
}
