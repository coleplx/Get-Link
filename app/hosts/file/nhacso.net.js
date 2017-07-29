var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async')

var re = /http:\/\/nhacso\.net\/(nghe-nhac)\/([a-z-]+)\.([a-zA-Z0-9=]+)\.html/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link);
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[3]
	result.host = hostEnum.NHACSO

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
		uri: 'http://nhacso.net/songs/ajax-get-detail-song?dataId='+result.uid,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	};

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Lỗi server code ' + response.statusCode))

		body = JSON.parse(body)
		if (!body)
			return callback(new Error('Lỗi khi parse dữ liệu'))

        if (_.isEmpty(body.first_song))
            return callback(new Error('Bài hát không tồn tại'))

		result.file = {
			name: body.first_song.name,
			type: 'mp3'
		}
		result.image = body.first_song.link_image
		result.direct_link = body.first_song.link_mp3
		result.sub_link = []
		result.html = "<iframe src='http://nhacso.net/embed/song/"+result.uid+"' width='400' height='110' frameborder='0'></iframe>"

		async.parallel([
			function(callback) {
				getLossless(callback)
			},
			function(callback) {
				getHq(callback)
			}
		], function(err) {
			if (err)
				return callback(err)
			callback(null)
		})
	})
}

var getLossless = function(callback) {
	// Get Lossless
	var url = 'http://nhacso.net/songs/download-song-lossless?songId=' + result.uid
	request.head(url, function(err, response) {
		if (err)
			return callback(err)

		var content = response.headers['content-disposition']
		if (_.includes(content, '.flac')) {
			result.sub_link.push({
				name: 'Lossless',
				size: 0,
				direct_link: url
			})
		}
		callback(null)
	})
}

var getHq = function(callback) {
	// Get Lossless
	var url = 'http://nhacso.net/songs/download-song?songId=' + result.uid
	request.head(url, function(err, response) {
		if (err)
			return callback(err)

		var content = response.headers['content-disposition']
		if (_.includes(content, '.mp3')) {
			result.sub_link.push({
				name: '320Kbps',
				size: 0,
				direct_link: url
			})
		}
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
