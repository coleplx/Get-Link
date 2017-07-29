var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring')

var re = /https?:\/\/vimeo\.com\/([0-9]+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[1]
	result.host = hostEnum.VIMEO

	async.waterfall([
		function checkFile(callback) {
			getVileInfo(callback)
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

var getVileInfo = function(callback) {
	var options = {
  		uri: 'https://player.vimeo.com/video/'+ result.uid +'/config',
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

        if (_.includes(body, 'does not exist') || _.includes(body, 'Oops!'))
            return callback('Video không tồn tại')

        body = JSON.parse(body)
        if (!body)
            return callback(new Error('Lỗi khi parse dữ liệu'))

		result.file = {
			name: body.video.title,
			type: 'mp4'
		}
		result.image = body.video.thumbs.base
		result.sub_link = []

        streamMap = body.request.files.progressive;
        if (_.isEmpty(streamMap))
            return callback(new Error('Lỗi khi lấy thông tin file'))

        for (var i = 0; i < streamMap.length; i++) {
            var item = streamMap[i]

            result.sub_link.push({
                name: item.quality.toUpperCase(),
                direct_link: item.url
            })
        }

  		callback(null)
	})
}

var download = function(callback) {
	if (_.isEmpty(result.sub_link))
		return callback(new Error('Lỗi khi lấy thông tin file'))

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
