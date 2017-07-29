var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
	S = require('string')

var re = /https?:\/\/soundcloud\.com\/(.+)\/(.+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link);
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.host = hostEnum.SOUNDCLOUD

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
				result.html = '<iframe width="100%" height="166" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/'+result.uid+'&amp;color=00cc11&amp;auto_play=true&amp;hide_related=false&amp;show_comments=true&amp;show_user=true&amp;show_reposts=false"></iframe>'
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
		jar: true,
        followRedirect: true
	};

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('File không tồn tại'))

		var file_name = S(body).between('title":"', '"').s + '(' + S(body).between('username":"', '"').s + ')',
			image = S(body).between('artwork_url":"', '"').s,
            uid = S(body).between('soundcloud://sounds:', '"').s

		result.file = {
			name: file_name,
			type: 'mp3'
		}
		result.uid = uid
		result.image = image
		callback(null)
	})
}

var download = function(callback) {
    var options = {
		uri: 'https://api.soundcloud.com/i1/tracks/'+result.uid+'/streams?client_id=02gUJC0hH2ct1EGOcYXQIzRFU91c72Ea',
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

        body = JSON.parse(body);
        if (!body)
            return callback(new Error('Lỗi khi parse dữ liệu'))

		getFileSize(body.http_mp3_128_url, function(err, size) {
			if (err)
				return callback(err)

			result.file.size = size
			callback(null, body.http_mp3_128_url)
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

	request(options, function (err, response) {
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
