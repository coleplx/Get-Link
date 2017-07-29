var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    crypto = require('crypto'),
    S = require('string'),
	filesizeConvert = require('file-size')

var re = /https?:\/\/(www.)?tenlua.vn\/.+\/(.+)\/([a-zA-Z0-9-.]+)/
request = request.defaults({jar: true})
var sizeLimit = 1024 * 1024 * 1024
var token
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[2]
	result.host = hostEnum.TENLUA

	async.waterfall([
		function getAccFromDatabase(callback) {
			Account.find({"host": hostEnum.TENLUA}).limit(1).exec(function(err, acc) {
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
					return callback(err)

				token = result
				callback(null)
			})
		},
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
		uri: 'https://api2.tenlua.vn/',
		method: 'POST',
		json: [{
    		"a": "user_login",
    		"user": username,
    		"password": password,
            "permanent": true
		}],
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Tài khoản VIP bị sida. Vui lòng báo BQT'))
		callback(null, body[0])
	})
}

var getFileInfo = function(callback) {
	var options = {
		uri: "https://api2.tenlua.vn/",
		method: 'POST',
        json: [{
            "a": "filemanager_builddownload_getinfo",
            "n": result.uid
        }],
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

        if (!body[0].dlink)
            return callback('File không tồn tại')

		//if (body[0].real_size > sizeLimit)
		//	return callback(new Error('Đang tiến hành chạy thử nghiệm Tenlua. File vượt dung lượng tối đa cho phép 1GB. Các bạn thông cảm !'))

		result.file = {
			name: body[0].n,
			size: body[0].real_size
		}
		result.direct_link = body[0].dlink
		callback(null)
	})
}

var download = function(callback) {

	var options = {
		uri: result.direct_link,
		method: 'HEAD',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	};

	request(options, function (error, response) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Lỗi server code ' + response.statusCode))

		callback(null, response.request.uri.href)
	})
}
