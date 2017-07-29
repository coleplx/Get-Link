var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring')

var re = /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9-]+)(\/.+)?/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[1]
	result.host = hostEnum.GOOGLEDOC

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
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

        if (response.statusCode !== 200)
            return callback(new Error('Tệp tin không hợp lệ hoặc đã bị xóa'))

		result.file = {
			name: S(body).between('og:title" content="', '"').s,
            size: 0
		}

		callback(null)
	})
}

var download = function(callback) {

    var options = {
		uri: 'https://docs.google.com/uc?export=download&id=' + result.uid,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
        followRedirect: false
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

        if (response.statusCode === 301 || response.statusCode === 302)
            return callback(null, response.headers['location'])

        if (_.includes(body, 'uc-download-link')) {
            var url = 'https://docs.google.com/uc?export=' + S(body).between('/uc?export=', '"').decodeHTMLEntities().s
            getLocation(url, function(err, direct_link) {
                if (error)
        			return callback(error)

                callback(null, direct_link)
            })
        } else
            callback(new Error('Lỗi ko thể xác nhận tải file'))
	})
}

var getFileSize = function(link, callback) {
	var r = request({uri: link, gzip: true}).on('response', function(res) {
		r.abort()
        if (!res.headers['content-length'])
			return callback(new Error('Lỗi khi lấy dung lượng file'))
		callback(null, parseInt(res.headers['content-length']));
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
