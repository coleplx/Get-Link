var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async')

var re = /https?:\/\/(www.)?aphim.co\/phim\/([a-z0-9-]+)(\/play)?/
var token
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[2]
	result.host = hostEnum.APHIM

	async.waterfall([
		function (callback) {
			getFileInfo(callback)
		},
		function(callback) {
			download(result.url, function(err, direct_link) {
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
	    uri: 'https://aphim.co/api/movie/' + result.uid,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
        gzip: true
	}

	request(options, function (error, response, body) {
		if (error)
            return callback(error)

        if (response.statusCode !== 200)
			return callback(new Error('Phim không tồn tại'))

        body = JSON.parse(body)
        if (!body)
            return callback(new Error('Lỗi khi parse dữ liệu'))

		result.file = {
			name: body.name_vi + ' (' + body.name + ') Full HD',
            type: 'mp4'
		}
        result.image = body.poster.original
        result.movie_id = body.id
        result.uid = body.episodes[0].contents[0].id

		callback(null)
	})
}

var download = function(link, callback) {
	var options = {
		uri: 'https://aphim.co/player/get_file?type=watch&movie_id=' + result.movie_id + '&episode_id=' + result.uid + '&server=',
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36",
            "X-Requested-With": "XMLHttpRequest"
		},
		jar: true,
        gzip: true
	}

	request(options, function (error, response, body) {
		if (error)
            return callback(error)

        if (response.statusCode !== 200)
			return callback(new Error('Lỗi server code ' + response.statusCode))

        body = JSON.parse(body)
        if (!body)
            return callback(new Error('Lỗi ko thể parse dữ liệu'))

        if (!body.file)
            return callback(new Error('Lỗi khi lấy direct link'))

        getFileSize(body.file, function(err, size) {
            if (error)
                return callback(error)

            result.file.size = size
            callback(null, body.file)
        })
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
