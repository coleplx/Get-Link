var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring')

var re = /https?:\/\/openload\.co\/f\/([a-zA-Z0-9_]+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[1]
	result.host = hostEnum.OPENLOAD

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
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Lỗi server code ' + response.statusCode))

        if (_.includes(body, 'File not found'))
            return callback(new Error('Video không hợp lệ hoặc đã bị xóa'))

		result.file = {
			name: S(body).between('other-title-bold">', '</h3>').s
		}

        var x = S(body).between('hiddenurl">', '</span>').decodeHTMLEntities().s
        var s = [];
        for (var i = 0; i < x.length; i++) {
            var j = x.charCodeAt(i);
            if ((j >= 33) && (j <= 126)) {
                s[i] = String.fromCharCode(33 + ((j + 14) % 94));
            } else {
                s[i] = String.fromCharCode(j);
            }
        }

        result.direct_link = 'https://openload.co/stream/' + s.join('')
		callback(null)
	})
}

var download = function(callback) {
    getLocation(result.direct_link, function(err, direct_link) {
        if (err)
            return callback(err)

        getFileSize(direct_link, function(err, size) {
            if (err)
                return callback(err)

            result.file.size = size
            result.direct_link = direct_link
            callback(null, direct_link)
        })
    })
}

var getLocation = function(link, callback) {
	var options = {
		uri: link,
		method: 'GET',
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

var getFileSize = function(link, callback) {
	request.head(link, function (error, response, body) {
		if (error)
			return callback(error)

		if (!response.headers['content-length'])
			return callback(new Error('Lỗi khi lấy dung lượng file'))

		callback(null, parseInt(response.headers['content-length']))
	})
}
