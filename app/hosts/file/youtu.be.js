var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring')

var re = /https?:\/\/(www\.)?youtu\.be\/(.+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link);
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[2]
	result.host = hostEnum.YOUTUBE

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
			return callback(new Error('Lỗi server code ' + response.statusCode))

		body = S(body).between('ytplayer.config = ', ';ytplayer.load').s
        body = JSON.parse(body)
        if (!body)
            return callback(new Error('Lỗi khi parse dữ liệu'))

		result.file = {
			name: body.args.title,
			type: 'mp4'
		}
        result.image = body.args.iurlmq
		result.sub_link = []

        var streamMap = body.args.url_encoded_fmt_stream_map
        streamMap = _.split(streamMap, ',')
        for (var i = 0; i < streamMap.length; i++) {
            var item = streamMap[i]
            item = unescape(item)
            item = querystring.parse(item)
            var dataUrl = item.url
            item.url = ''
            if (_.isArray(item.itag))
                item.itag = item.itag[0]
            dataUrl = dataUrl + '&' + unescape(querystring.stringify(item))

            result.sub_link.push({
                name: item.quality.toUpperCase(),
                direct_link: dataUrl
            })
        }

        result.direct_link = result.sub_link[0].direct_link

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
