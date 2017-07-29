var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring')

var re = /https?:\/\/www\.dailymotion\.com\/video\/([a-z0-9]+)_(.+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[1]
	result.host = hostEnum.DAILYMOTION

	async.waterfall([
		function checkFile(callback) {
			getFileInfo(callback)
		},
		function(callback) {
			download(function(err) {
				if (err)
					return callback(err)

				result.is_stream = true
				result.html = '<iframe frameborder="0" width="100%" height="660px" src="//www.dailymotion.com/embed/video/' + result.uid + '?autoPlay=1" allowfullscreen></iframe>'

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
			return callback(new Error('Video không hợp lệ'))

        if (_.includes(body, 'error404'))
            return callback(new Error('Video không tồn tại'))

		body = S(body).between('buildPlayer(', ');').s
        body = JSON.parse(body)
        if (!body)
            return callback(new Error('Lỗi bất thường (63)'))

		result.file = {
			name: body.metadata.title,
			type: 'mp4'
		}
		result.image = body.metadata.poster_url
		result.sub_link = []

        var streamMap = body.metadata.qualities
        if (_.isEmpty(streamMap))
            return callback(new Error('Lỗi bất thường (74)'))

        _.forEachRight(streamMap, function(value, key) {
			if (key.toLowerCase() !== 'auto' && !_.isEmpty(value)) {
				result.direct_link = value[0].url
				return false
			}
        })

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

			result.direct_link = direct_link
			result.file.size = size
			callback(null)
		})
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

		if (response.statusCode !== 302 && response.statusCode !== 301)
			return callback(new Error('Lỗi khi lấy direct link'))
		callback(null, response.headers['location'])
	})
}

var getFileSize = function(link, callback) {
	var options = {
		uri: link,
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

		if (!response.headers['content-length'])
			return callback(new Error('Lỗi khi lấy dung lượng file'))

		callback(null, parseInt(response.headers['content-length']))
	})
}
