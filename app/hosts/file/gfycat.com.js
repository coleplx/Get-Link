var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
	S = require('string')

var re = /https?:\/\/gfycat\.com\/(detail)?\/([a-zA-Z0-9]+)(\?tagname.+)?/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link);
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[2]
	result.host = hostEnum.GFYCAT

	async.waterfall([
		function (callback) {
			download(function(err, direct_link) {
				if (err)
					return callback(err)

				if (!direct_link)
					return callback(new Error('Lỗi bất thường'))

				result.direct_link = direct_link
				result.is_stream = false
				result.html = "<iframe src='https://gfycat.com/ifr/"+result.uid+"' frameborder='0' scrolling='no' width='660' height='400' allowfullscreen></iframe>"
				callback(null, result)
			})
		}
	],
		callback
	)
}

var download = function(callback) {
	var options = {
		uri: 'https://gfycat.com/cajax/get/' + result.uid,
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

        body = JSON.parse(body)
        if (body == null)
            return callback(new Error('Lỗi khi parse dữ liệu'))

        if (body.error)
            return callback(new Error(body.error))

        var filename = body.gfyItem.title || body.gfyItem.gfyName

		result.file = {
			name: filename,
            size: body.gfyItem.gifSize,
			type: 'gif'
		}
		result.image = body.gfyItem.mobilePosterUrl
        result.direct_link = body.gfyItem.gifUrl

        result.sub_link = []
        result.sub_link.push({
            name: 'MP4',
            size: body.gfyItem.mp4Size,
            direct_link: body.gfyItem.mp4Url
        })
        result.sub_link.push({
            name: 'WEBM',
            size: body.gfyItem.webmSize,
            direct_link: body.gfyItem.webmUrl
        })

		callback(null, result.direct_link)
	})
}
