var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    crypto = require('crypto'),
    S = require('string')

var re = /http:\/\/www\.slideshare\.net\/(.+)\/(.+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.host = hostEnum.SLIDESHARE

    var api_key = 'B8eitH1d',
        ts = new Date().getTime() / 1000,
        hash = crypto.createHash('sha1')
    hash.update("JiL8JktK" + ts)
    var api_request = 'https://www.slideshare.net/api/2/get_slideshow?slideshow_url='+link+'&api_key='+api_key+'&hash='+hash.digest('hex')+'&ts=' + ts

    var options = {
		uri: api_request,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Lỗi server code ' + response.statusCode))

		if (_.includes(body, 'SlideShareServiceError'))
			return callback(new Error('Tài liệu không tồn tại hoặc đã bị xóa'))

        var isDownload = S(body).between('<Download>', '</Download>').s
        if (isDownload != '1')
            return callback(new Error('Tài liệu này ko thể Download'))

        var file_name = S(body).between('<Title>', '</Title>').s + '.' + S(body).between('<Format>', '</Format>').s
            directLink = S(body).between('<DownloadUrl>', '</DownloadUrl>').s
            directLink = S(directLink).decodeHTMLEntities().s

        getFileSize(directLink, function(err, size) {
            if (err)
                return callback(err)

			result.uid = S(body).between('<ID>', '</ID').s
			result.file = {
				name: file_name,
				size: size
			}
			result.image = 'http:' + S(body).between('<ThumbnailURL>', '</ThumbnailURL>')
			result.direct_link = directLink
			result.is_stream = false
			result.html = S(body).between('<Embed>', '</Embed>').decodeHTMLEntities().s

            callback(null, result)
        })
	})
}

var getFileSize = function(link, callback) {
    var options = {
        uri: link,
        method: 'GET',
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
        }
    }

	var r = request(options).on('response', function(res) {
        r.abort()
        if (!res.headers['content-length'])
			return callback(new Error('Lỗi khi lấy dung lượng file'))
		callback(null, parseInt(res.headers['content-length']))
    })
}
