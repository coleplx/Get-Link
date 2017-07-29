var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
	crypto = require('crypto')

var re = /http:\/\/tv\.zing\.vn\/(video)\/(.+)\/([A-Z0-9]+)\.html/
var token
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link);
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'), null);

	// Default value
	result.url = link
	result.uid = match[3]
	result.host = hostEnum.ZINGTV

	async.waterfall([
		function checkFile(callback) {
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

var getVideoInfo = function(callback) {
	var options = {
		uri: 'http://api.tv.zing.vn/2.0/media/info?api_key=d04210a70026ad9323076716781c223f&media_id=' + result.uid,
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

		body = JSON.parse(body)
		if (!body)
			return callback(new Error('Lỗi khi parse dữ liệu'))
		
        if (_.isEmpty(body.response)) {
            return callback(new Error('Video không tồn tại hoặc đã bị xóa'))
        }

		result.file = {
			name: body.response.full_name,
			type: 'mp4'
		}
		result.image = 'http://image.mp3.zdn.vn/tv_media_225_126/' + body.response.thumbnail

		result.sub_link = []
        _.forEach(body.response.other_url, function(value, key) {
            result.sub_link.push({
                name: key,
                direct_link: 'http://' + value
            })
        });

		callback(null)
	})
}

var download = function(callback) {
	async.forEach(result.sub_link, function(subLink, callback) {
		getFileSize(subLink.direct_link, function(err, size) {
			if (err)
				return callback(err)

			subLink.size = size
			callback()
		})
	}, function(err) {
		if (err)
			return callback(err)

		result.direct_link = result.sub_link[0].direct_link
		result.file.size = result.sub_link[0].size
		callback(null, result.direct_link)
	})
}

var getLocation = function(link, callback) {
	if (token)
		link = link + '?requestdata={"token":"'+token+'"}'

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

		if (response.statusCode !== 301 && response.statusCode !== 302)
			return callback(new Error('Lỗi khi lấy direct link'))
		callback(null, response.headers['location'])
	})
}

var getFileSize = function(link, callback) {
	var r = request({uri: link}).on('response', function(res) {
		r.abort()
        if (!res.headers['content-length'])
			return callback(new Error('Lỗi khi lấy dung lượng file'))
		callback(null, parseInt(res.headers['content-length']));
    })
}
