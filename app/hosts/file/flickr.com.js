var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
	S = require('string')

var re = /https?:\/\/www\.flickr\.com\/photos\/([a-zA-Z0-9@-_]+)\/((sets|albums\/([0-9]+))|(([0-9]+)\/in\/\w+-.+))/
var result = {}
var token

module.exports.getLink = function(link, callback) {

	var match = re.exec(link);
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[4] || match[6]
	result.host = hostEnum.FLICKR

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
				result.html = '<a data-flickr-embed="true" data-header="true"  href="'+result.url+'" title="Minhas favoritas/My favorites"><img src="'+result.image+'" width="640" height="429" alt="'+result.file.name+'"></a><script async src="//embedr.flickr.com/assets/client-code.js" charset="utf-8"></script>'
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

        if (_.includes(body, 'error-404-page-view'))
            return callback(new Error('Album không tồn tại'))

		var file_name = S(body).between('og:title" content="', '"').s;
        if (!file_name)
            return callback(new Error('Lỗi khi lấy tên file'))

		result.token = S(body).between('flickr.api.site_key = "', '"').s
		result.file = {
			name: file_name,
			size: 0,
			type: 'zip'
		}
		result.image = S(body).between('og:image" content="', '"').s
		callback(null)
	})
}

var download = function(callback) {
    var options = {
		uri: 'https://api.flickr.com/services/rest',
		method: 'POST',
		form: {
    		"set_id": result.uid,
    		"viewerNSID": "",
            "method": "flickr.download.archives.create",
            "csrf": "",
            "api_key": result.token,
            "format": "json",
            "hermes": 1,
            "hermesClient": 1,
            "nojsoncallback": 1,
            "reqId": ""
		},
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

		if (body.stat === 'fail')
			return callback(new Error(body.message || 'Lỗi khi lấy direct link'))

        var directLink = body.archive.urls[0]
        if (!directLink)
            return callback(new Error('Lỗi khi lấy direct link 2'))

    	callback(null, directLink)
	})
}
