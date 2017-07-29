var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
	S = require('string')

var re = /https?:\/\/(www\.)?tevi\.com\/(channel)\/.+\.([a-zA-Z0-9]+)\.html\?key=([a-zA-Z0-9]+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[4]
	result.host = hostEnum.TEVI

	async.waterfall([
		function checkFile(callback) {
			getPlayKey(callback)
		},
        function (callback) {
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

var getPlayKey = function(callback) {
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
			return callback(new Error('Gián đoạn. Thử lại sau'))

		if (_.includes(body, 'not_found'))
			return callback(new Error('Video không tồn tại'))

        var re = new RegExp('playVideo_' + result.uid + '" index="\\d{1,3}" play_key="([a-f0-9]+)"', "")
        var match = body.match(re)
        if (match == null)
            return callback(new Error('Lỗi khi lấy thông tin file'))

        result.play_key = match[1]
		callback(null)
	})
}

var getFileInfo = function(callback) {
    var options = {
		uri: 'https://www.tevi.com/flash/xml?key5=' + result.play_key,
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

        var parseString = require('xml2js').parseString
        parseString(body, function (err, data) {
            if (err)
                return callback(err)

            var tracklist = data.tracklist.track
            if (_.isEmpty(tracklist))
                return callback(new Error('Video không tồn tại'))

            async.detect(tracklist[0].item, function(item, callback) {
                if (item.key[0] == result.uid) {
                    callback(null, true)
                } else
                    callback(null, false)
            }, function(err, item) {
                if (!item)
                    return callback(new Error('Lỗi khi parse dữ liệu'))

                result.file = {
                    name: item.title[0],
                    type: 'mp4'
                }
                result.image = item.image[0]

                result.sub_link = []
                if (item.highquality[0])
                    result.sub_link.push({
                        name: 'Bản đẹp',
                        direct_link: item.highquality[0]
                    })
                if (item.location[0])
                    result.sub_link.push({
                        name: 'Trung bình',
                        direct_link: item.location[0]
                    })
                if (item.lowquality[0])
                    result.sub_link.push({
                        name: 'Bản xấu',
                        direct_link: item.lowquality[0]
                    })

                return callback(null)
            })
        })
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

		result.file.size = result.sub_link[0].size
		callback(null, result.sub_link[0].direct_link)
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
