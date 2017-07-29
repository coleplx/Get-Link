var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
	S = require('string')

var re = /http:\/\/www\.deezer\.com\/(track)\/([0-9]+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link);
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[2]
	result.host = hostEnum.DEEZER

	async.waterfall([
		function checkFile(callback) {
			getFileInfo(callback)
		},
		function(callback) {
			download(function(err) {
				if (err)
					return callback(err)

				result.is_stream = false
                result.html = '<iframe scrolling="no" frameborder="0" allowTransparency="true" src="http://www.deezer.com/plugins/player?format=classic&autoplay=false&playlist=true&color=007FEB&layout=dark&size=medium&type=tracks&id='+result.uid+'&app_id=1&autoplay=true" width="100%" ></iframe>'
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
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Bài hát ko tồn tại'))

        if (_.includes(body, 'Page not found'))
            return callback(new Error('Bài hát ko tồn tại'))

		var file_name = S(body).between('twitter:title" content="', '"').s
        if (!file_name)
            return callback(new Error('Lỗi khi lấy tên tệp tin'))

		result.file = {
			name: file_name,
            type: 'mp3'
		}
        result.image = S(body).between('twitter:image" content="', '"').s

        var direct_link = S(body).between('music:preview_url:url" content="', '"').s
		if (direct_link)
			return callback(new Error('Lỗi khi lấy direct link'))

		result.direct_link = direct_link
		callback(null)
	})
}

var download = function(callback) {
	getFileSize(result.direct_link, function(err, size) {
		if (err)
			return callback(err)

		result.file.size = size;
		callback(null)
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
