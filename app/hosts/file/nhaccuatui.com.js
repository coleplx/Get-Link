var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
	S = require('string')

var re = /http:\/\/www\.nhaccuatui\.com\/(bai\-hat|video)\/(.+)\.([a-zA-Z0-9]+)\.html/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[3]
	result.host = hostEnum.NHACCUATUI

	async.waterfall([
		function checkFile(callback) {
			if (match[1] === 'bai-hat')
				getFileInfo(callback)
			else if (match[1] === 'video')
				getVideoInfo(callback)
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
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
        followRedirect: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Lỗi server code ' + response.statusCode))

		if (_.includes(body, 'Không tìm thấy'))
			return callback(new Error('Bài hát không tồn tại'))

		result.file = {
			name: S(body).between('og:title" content="', '"').s,
			type: 'mp3'
		}
		result.image = S(body).between('og:image" content="', '"').s
		result.html = '<iframe src="http://www.nhaccuatui.com/mh/auto/'+result.uid+'" width="100%" height="330" frameborder="0" allowfullscreen></iframe>'

		getLocation('http://m.nhaccuatui.com/song-download?songkey=' + result.uid, function(err, direct_link) {
			if (err)
				return callback(err)

			result.direct_link = direct_link
			callback(null)
		})
	})
}

var getVideoInfo = function(callback) {
	var options = {
		uri: result.url,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
        followRedirect: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Lỗi server code ' + response.statusCode))

		if (_.includes(body, 'Không tìm thấy'))
			return callback(new Error('Bài hát không tồn tại'))

		result.file = {
			name: S(body).between('og:title" content="', '"').s,
			type: 'mp4'
		}
		result.image = S(body).between('og:image" content="', '"').s

		var xml_url = S(body).between('player.peConfig.xmlURL = "', '"').s
		if (!xml_url)
			return callback(new Error('Lỗi khi lấy đường dẫn XML'))

		processXml(xml_url, callback)
	})
}

var processXml = function(xml_url, callback) {
	var options = {
		uri: xml_url,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
        followRedirect: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Lỗi server code ' + response.statusCode))

		var parseString = require('xml2js').parseString
        parseString(body, function (err, data) {
            if (err)
                return callback(err)

			if (!data.tracklist.track[0].item[0])
				return callback(new Error('Lỗi khi lấy thông tin video'))

			result.direct_link = data.tracklist.track[0].item[0].location[0]

			callback(null)
		})
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
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
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
	request.head(link, function (err, response, body) {
		if (err)
			return callback(err)

		if (!response.headers['content-length'])
			return callback(new Error('Lỗi khi lấy dung lượng file'))

		callback(null, parseInt(response.headers['content-length']))
	})
}
