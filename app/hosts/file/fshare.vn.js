var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
	S = require('string')

var re = /https?:\/\/(www.)?fshare.vn\/(file)\/(\w+)/
var token
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	return callback(new Error('FShare đang bảo trì. Các bác thông cảm ạ !'))

	// Default value
	result.url = link
	result.uid = match[3]
	result.host = hostEnum.FSHARE

	async.waterfall([
		function getAccFromDatabase(callback) {
			Account.find({"host": hostEnum.FSHARE, "active": true}).limit(1).exec(function(err, acc) {
				if (err)
					return callback(err)

				if (_.isEmpty(acc))
					return callback(new Error('Không có tài khoản VIP'))

				callback(null, acc[0])
			})
		},
		function accLogin(acc, callback) {
			/*console.log(global.fshare_token)
			if (global.fshare_token) {
				token = global.fshare_token
				return callback(null)
			}*/

			login2(acc.username, acc.password, function(err, result) {
				if (err)
					return callback(err)

				token = result
				global.fshare_token = token
				callback(null)
			})
		},
		function (callback) {
			getFileInfo2(callback)
		},
		function(callback) {
			download2(result.url, function(err, direct_link) {
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

var login = function(username, password, callback) {
	var options = {
		uri: 'https://api.fshare.vn/api/user/login',
		method: 'POST',
		json: {
    		"app_key": "L2S7R6ZMagggC5wWkQhX2+aDi467PPuftWUMRFSn",
    		"user_email": username,
    		"password": password
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
			return callback(new Error('Tài khoản VIP bị sida. Vui lòng báo quản trị'))
		callback(null, body.token)
	})
}

var login2 = function(username, password, callback) {
	var options = {
		uri: 'https://www.fshare.vn',
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
			return callback(new Error('Không truy cập được vào fshare.vn'))

		if (_.includes(body, 'Thoát'))
			return callback(null)

		var fs_csrf = S(body).between('fs_csrf:\'', '\'').s

		options = {
			uri: 'https://www.fshare.vn/login',
			method: 'POST',
			form: {
				'fs_csrf': fs_csrf,
				'LoginForm[email]': username,
				'LoginForm[password]': password,
				'LoginForm[checkloginpopup]': '',
				'LoginForm[rememberMe]': '',
				'yt0': 'Đăng nhập'
			},
			headers: {
	    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
			},
			jar: true,
			followRedirect: false
		}

		request(options, function (error, response, body) {
			if (error)
				return callback(error)

			if (response.statusCode !== 302 && response.statusCode !== 301)
				return callback(new Error('Tài khoản VIP bị sida. Vui lòng báo quản trị'))

			callback(null, response.headers['set-cookie'])
		})
	})
}

var parseSize = function(str) {
	var arr = str.split(/[ ,]+/)
	var unit = arr[1].toLowerCase()
	var bits = 1
	if (unit === 'kb')
		bits = 1024
	else if (unit === 'mb')
		bits = 1024 * 1024
	else if (unit === 'gb')
		bits = 1024 * 1024 * 1024

	return Math.round(parseFloat(arr[0]) * bits)
}

var getFileInfo2 = function(callback) {
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
			return callback(new Error('File không tồn tại hoặc đã bị xóa'))

		var size = S(body).between('fa-hdd-o"></i>', '</div>').trim().s

		result.file = {
			name: S(body).between('<title>Fshare - ', '</title>').s,
			size: parseSize(size)
		}
		result.fs_csrf = S(body).between('fs_csrf:\'', '\'').s
		callback(null)
	})
}

var getFileInfo = function(callback) {
	var options = {
		uri: 'https://api.fshare.vn/api/fileops/get',
		method: 'POST',
		json: {
    		"token": token,
    		"url": result.url
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
			return callback(new Error('File không tồn tại hoặc đã bị xóa'))

		result.file = {
			name: body.name,
			size: body.size
		}
		callback(null)
	})
}

var download = function(link, callback) {
	var options = {
		uri: 'https://api.fshare.vn/api/session/download',
		method: 'POST',
		json: {
    		"token": token,
    		"url": link
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
			return callback(new Error('Lỗi khi lấy direct link'))

		callback(null, body.location)
	})
}

var download2 = function(link, callback) {
	var options = {
		uri: 'https://www.fshare.vn/download/get',
		method: 'POST',
		form: {
    		'fs_csrf': result.fs_csrf,
    		'DownloadForm[pwd]': '',
			'DownloadForm[linkcode]': result.uid,
			'ajax': 'download-form',
			'undefined': 'undefined'
		},
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		body = JSON.parse(body)
		if (!body)
			return callback(new Error('Lỗi khi lấy direct link'))

		if (!body.url)
			return callback(new Error('Lỗi khi lấy direct link'))

		callback(null, body.url)
	})
}
