var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring')

var re = /http:\/\/(www\.)?phimmoi\.net\/phim\/([a-z0-9-]+)(\/(download|xem-phim|tap-\d-\d+)\.html)?/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[2]
	result.host = hostEnum.PHIMMOI

    if (match[4] == 'download')
        result.url = _.replace(result.url, 'download.html', 'xem-phim.html')
    if (!match[3])
        result.url = result.url + '/xem-phim.html'

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
			return callback(new Error('Phim không hợp lệ'))

		result.file = {
			name: S(body).between('<title>', '</title>').strip('Xem phim ').s,
			type: 'mp4'
		}
		result.image = S(body).between('og:image" content="', '"').s
		result.sub_link = []

        result.ep_info = 'http://www.phimmoi.net/episodeinfo2.php' + S(body).between('episodeinfo2.php', '"').s

		callback(null)
	})
}

var download = function(callback) {

    var options = {
		uri: result.ep_info,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

        var responseJson = S(body).between('responseJson=\'', '\'').s
        responseJson = JSON.parse(responseJson)

        if (!responseJson)
            return callback(new Error('Lỗi khi parse dữ liệu'))

        var episodes = responseJson.medias
        if (!episodes.length)
            return callback(new Error('Lỗi khi lấy thông tin file'))

        for (var i = episodes.length-1; i >= 0; i--) {
            result.sub_link.push({
                name: episodes[i].resolution,
                direct_link: episodes[i].url
            })
        }

        async.forEach(result.sub_link, function(subLink, callback) {
    		getFileSize(subLink.direct_link, function(err, size) {
    			subLink.size = size
    			callback(null)
    		})
    	}, function(err) {
    		result.file.size = result.sub_link[0].size
    		callback(null, result.sub_link[0].direct_link)
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
