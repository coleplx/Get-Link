var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring'),
	helper = require('../../helper/helper')

var re = /https?:\/\/cur\.lv\/(.+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[1]
	result.host = hostEnum.COINURL
	result.type = 'shortlink'

	async.waterfall([
		function(callback) {
			getIFrame(callback)
		},
		function(iframe, callback) {
			skip(iframe, callback)
		},
		function(callback) {
			helper.checkSafeUrl(result.direct_link, function(err, safe) {
				if (err)
					return callback(err)

				result.safe = safe
				callback(null, result)
			})
		}
	],
		callback
	)
}

var getIFrame = function(callback) {
	var options = {
		uri: 'http://cur.lv/redirect_curlv.php?code=' + result.uid,
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
			return callback(new Error('Gián đoạn. Vui lòng thử lại sau'))

        if (_.includes(body, 'does not exists'))
            return callback(new Error('Đường dẫn không hợp lệ hoặc đã bị xóa'))

        var iframe = 'http://cur.lv/ntop.php' + S(body).between('http://cur.lv/ntop.php', '"').s

		callback(null, iframe)
	})
}

var skip = function(iframe, callback) {
	var options = {
		uri: iframe,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
            return callback(error)

        var direct_link = S(body).between('font-weight: bolder;">', '</span>').s
		getTitle(direct_link, function(err, title) {
			if (err)
				title = 'COINURL.COM'

			result.file = {
				name: title
			}
			result.direct_link = direct_link

			callback(null)
		})
	})
}

var getTitle = function(url, callback) {
	var options = {
		uri: url,
		method: 'HEAD',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
        followRedirect: true
	}

	request(options, function (error, response, body) {
		if (error)
            return callback(error)

        if (!_.includes(response.headers['content-type'], 'text/html'))
            return callback(new Error('Không thể lấy Tittle'))

        options.method = 'GET'
        request(options, function (error, response, body) {
            if (error)
                return callback(error)

            var title = S(body).between('<title>', '</title>').s
            if (!title)
                return callback(new Error('Không thể lấy Tittle'))

            callback(null, title)
        })
	})
}
