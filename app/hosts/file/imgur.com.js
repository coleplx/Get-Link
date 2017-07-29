var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
	S = require('string')

var re = /https?:\/\/imgur\.com\/(a|gallery)\/([a-zA-Z0-9]+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link);
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[2]
	result.host = hostEnum.IMGUR

	async.waterfall([
		function checkFile(callback) {
			getFileInfo(callback)
		},
		function(is_album, callback) {
			download(is_album, function(err, direct_link) {
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
		jar: true,
        followRedirect: true
	};

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Lỗi server code ' + response.statusCode))

        if (_.includes(body, 'You\'ve taken a wrong turn'))
            return callback(new Error('Album không tồn tại'))

		var file_name = S(body).between('og:title" content="', '"').decodeHTMLEntities().s
        if (!file_name)
            return callback(new Error('Lỗi khi lấy thông tin file'))

		result.file = {
			name: file_name
		}
		result.image = S(body).between('twitter:image"       content="', '"').s
		var isAlbum = S(body).between('\'isAlbum\': ', ',').s
		if (!isAlbum)
			return callback(new Error('Lỗi khi lấy thông tin album'))

		callback(null, isAlbum)
	})
}

var download = function(is_album, callback) {
	if (!is_album)
		return callback(new Error('Lỗi khi lấy thông tin album'))

	if (is_album == 'true') {
		var direct_link = 'http://s.imgur.com/a/' + result.uid + '/zip'
	    getFileSize(direct_link, function(err, size) {
			if (err)
				return callback(err)

			result.file.size = size
			result.file.type = 'zip'
			result.html = '<blockquote class="imgur-embed-pub" lang="en" data-id="a/'+result.uid+'"><a href="//imgur.com/'+result.uid+'">'+result.file.name+'</a></blockquote><script async src="//s.imgur.com/min/embed.js" charset="utf-8"></script>'

			callback(null, direct_link)
		})
	} else {
		var direct_link = 'http://i.imgur.com/' + result.uid + '.jpg'
	    getFileSize(direct_link, function(err, size) {
			if (err)
				return callback(err)

			result.file.size = size
			result.file.type = 'jpg'
			callback(null, direct_link)
		})
	}
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
