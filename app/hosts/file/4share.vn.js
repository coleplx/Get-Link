var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    filesizeConvert = require('file-size'),
	S = require('string')

var re = /https?:\/\/(www.)?4share.vn\/(f)\/(.+)(\/.*)?/
var sizeLimit = 1024 * 1024 * 1024
var token
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[3]
	result.host = hostEnum._4SHARE

	async.waterfall([
		function getAccFromDatabase(callback) {
			Account.find({"host": hostEnum._4SHARE}).limit(1).exec(function(err, acc) {
				if (err)
					return callback(new Error('Hệ thống truy vấn lỗi'))

				if (_.isEmpty(acc))
					return callback(new Error('Không có tài khoản VIP'))

				callback(null, acc[0])
			})
		},
		function accLogin(acc, callback) {
			login(acc.username, acc.password, function(err) {
				if (err)
					return callback(err)
				callback(null)
			})
		},
		function fileInfo(callback) {
			getFileInfo(callback)
		},
		function(callback) {
			download(function(err, direct_link) {
				if (err)
					return callback(err)

				if (!direct_link)
					return callback(new Error('Lỗi bất thường'))

				result.is_stream = true
				callback(null, result)
			})
		}
	],
		callback
	)
}

var login = function(username, password, callback) {
	var options = {
		uri: 'https://4share.vn/default/index/login',
		method: 'POST',
		formData: {
    		"username": username,
    		"password": password
		},
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, function (error, response) {
		if (error || (response.statusCode !== 302 && response.statusCode !== 301))
			return callback(new Error('Tài khoản VIP bị sida. Vui lòng báo BQT'))
		callback(null)
	})
}

var getFileInfo = function(callback) {
	var options = {
		uri: result.url,
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
			return callback(new Error('File không tồn tại hoặc đã bị xóa'))

        var filename = S(body).between('<title> 4Share.vn -', '</title>').trim().s
		if (!filename)
			return callback(new Error('Lỗi khi lấy tên file'))

		result.file = {
			name: filename
		}

		callback(null)
	})
}

var download = function(callback) {
	var options = {
		uri: result.url,
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

        var match = body.match(/(http:\/\/sv\d{1,2}\.4share\.vn\/.+)'>/)
        if (match == null)
            return callback(new Error('Lỗi ko thể parse dữ liệu'))

		result.direct_link = match[1]
		getFileSize(result.direct_link, function(err, size) {
			if (err)
				return callback(err)

			//if (size > sizeLimit)
			//	return callback(new Error('Đang tiến hành chạy thử nghiệm 4Share. File vượt dung lượng tối đa cho phép 1GB. Các bạn thông cảm !'))

			result.file.size = size

			callback(null, result.direct_link)
		})
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
