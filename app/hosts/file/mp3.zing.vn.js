var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
	crypto = require('crypto')

var re = /http:\/\/mp3\.zing\.vn\/(bai\-hat|video\-clip)\/(.+)\/([A-Z0-9]+)\.html/
var token
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'), null)

	// Default value
	result.url = link
	result.uid = match[3]
	result.host = hostEnum.MP3ZING

	async.waterfall([
		function checkAccDatabase(callback) {
			Account.find({"host": hostEnum.MP3ZING}).limit(1).exec(function(err, acc) {
				if (err)
					return callback(new Error('Hệ thống truy vấn lỗi'))

				if (_.isEmpty(acc))
					return callback(new Error('Không có tài khoản VIP'))

				callback(null, acc[0])
			})
		},
		function accLogin(acc, callback) {
			login(acc.username, acc.password, function(err, result) {
				if (err)
					return callback(new Error('Tài khoản bị sida. Vui lòng báo quản trị'))

                if (result)
				    token = result
				callback(null)
			})
		},
		function checkFile(callback) {
			if (match[1] === 'bai-hat')
				getFileInfo(callback)
			else if (match[1] === 'video-clip')
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

var login = function(username, password, callback) {
	var hash = crypto.createHash('md5')
	password = hash.update(password).digest('hex')
	var url = 'http://api.mp3.zing.vn/api/mobile/auth/usertoken?requestdata={"user":"'+username+'","device_id":"1df3c1b148ed2e4","pwd":"'+password+'"}&fromvn=true'

	var options = {
		uri: url,
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

		body = JSON.parse(body)
		if (!body)
			return callback(new Error('Lỗi khi parse dữ liệu'))

        if (!body.profile.is_vip)
            return callback(null)

		callback(null, body.token)
	})
}

var getFileInfo = function(callback) {
	var url
	if (token)
		url = 'http://api.mp3.zing.vn/api/mobile/song/getsonginfo?requestdata={"id":"'+result.uid+'","token":"'+token+'"}'
	else
		url = 'http://api.mp3.zing.vn/api/mobile/song/getsonginfo?requestdata={"id":"'+result.uid+'"}'

	var options = {
		uri: url,
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

		body = JSON.parse(body)
		if (!body)
			return callback(new Error('Lỗi khi parse dữ liệu'))

		if (!body.source["320"])
			return callback(new Error('Bài hát không có chất lượng 320kBps'))

		result.file = {
			name: body.title,
			type: 'mp3'
		}
		result.image = 'http://image.mp3.zdn.vn/' + body.thumbnail
		result.sub_link = [
			{
				name: '320 Kbps',
				direct_link: body.source["320"]
			},
			{
				name: '128 Kbps',
				direct_link: body.source["128"]
			}]

		if (token && body.link_download["lossless"]) {
			result.sub_link.push({
				name: 'Lossless',
				direct_link: body.link_download["lossless"]
			})
		}
		result.html = '<iframe scrolling="no" width="640" height="180" src="http://mp3.zing.vn/embed/song/'+result.uid+'?start=true" frameborder="0" allowfullscreen="true"></iframe>'

		callback(null)
	})
}

var getVideoInfo = function(callback) {
    var url
	if (token)
		url = 'http://api.mp3.zing.vn/api/mobile/video/getvideoinfo?requestdata={"id":"'+result.uid+'","token":"'+token+'"}'
	else
		url = 'http://api.mp3.zing.vn/api/mobile/video/getvideoinfo?requestdata={"id":"'+result.uid+'"}'

	var options = {
		uri: url,
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

		body = JSON.parse(body)
		if (!body)
			return callback(new Error('Lỗi khi parse dữ liệu'))

		result.file = {
			name: body.title,
			type: 'mp4'
		}
		result.image = 'http://image.mp3.zdn.vn/' + body.thumbnail
		result.sub_link = []
		if (body.source["1080"]) {
			result.sub_link.push({
				name: '1080p',
				direct_link: body.source["1080"]
			})
		}
		if (body.source["720"]) {
			result.sub_link.push({
				name: '720p',
				direct_link: body.source["720"]
			})
		}
		if (body.source["480"]) {
			result.sub_link.push({
				name: '480p',
				direct_link: body.source["480"]
			})
		}
		if (body.source["360"]) {
			result.sub_link.push({
				name: '360p',
				direct_link: body.source["360"]
			})
		}

		callback(null)
	})
}

var download = function(callback) {
	async.forEach(result.sub_link, function(subLink, callback) {
		getLocation(subLink.direct_link, function(err, directLink) {
			if (err)
				return callback(err)

			subLink.direct_link = directLink
			getFileSize(directLink, function(err, size) {
				if (err)
					return callback(err)

				subLink.size = size
				callback()
			})
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
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
		followRedirect: false
	}

	request(options, function (err, response, body) {
		if (err)
			return callback(err)

		if (!response.headers['location'])
			return callback(new Error('Lỗi khi lấy direct link'))
		callback(null, response.headers['location'])
	})
}

var getFileSize = function(link, callback) {
	var r = request({uri: link}).on('response', function(res) {
		r.abort()
        if (!res.headers['content-length'])
			return callback(new Error('Lỗi khi lấy dung lượng file'))
		callback(null, parseInt(res.headers['content-length']))
    })
}
