var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    crypto = require('crypto'),
    S = require('string'),
	filesizeConvert = require('file-size')

var re = /http?:\/\/upfile.vn\/(.+)\/([a-zA-Z0-9-]+)\.html/
request = request.defaults({jar: true})
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[2]
	result.host = hostEnum.UPFILE

	async.waterfall([
		function getAccFromDatabase(callback) {
			Account.find({"host": hostEnum.UPFILE}).limit(1).exec(function(err, acc) {
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
    var new_password = crypto.createHash('sha256').update('UpFile.VN').digest('hex')
    new_password = crypto.createHash('sha256').update(new_password + password).digest('hex').toUpperCase()

    var options = {
		uri: 'http://upfile.vn/',
		method: 'POST',
		form: {
    		"Act": "Login",
    		"Email": username,
    		"Password": new_password
		},
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

    async.waterfall([
        function(callback) {
            request({
                uri: 'http://upfile.vn',
                method: 'GET',
                jar: true
            }, function(err, response) {
                if (err)
                    return callback(err)
                callback(null)
            })
        },
        function(callback) {
            request(options, function (error, response, body) {
				if (error)
					return callback(error)

				if (response.statusCode !== 200)
                    return callback(new Error('Không thể đăng nhập'))

				body = JSON.parse(body)
				if (!body)
					return callback(new Error('Lỗi khi parse dữ liệu'))

				if (body.Status)
					return callback(null)
                callback(new Error('Tài khoản VIP bị sida. Vui lòng báo cho BQT'))
            })
        }],
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
			return callback(new Error('File không tồn tại'))

        if (body.indexOf("data-count='3'") < 0)
            return callback(new Error('Lỗi khi lấy thông tin file'))

        body = S(body).between('<title>', '</title>').s
        var match = body.match(/(.+) \(([0-9.]+)([BKMGTPEZY]{2})\) - UpFile\.vn/)
		if (match == null)
			return callback(new Error('Lỗi khi parse dữ liệu'))

		result.file = {
			name: match[1],
			size: filesizeConvert(parseFloat(match[2])).toByte(match[3])
		}

		callback(null)
	})
}

var download = function(callback) {
	var token = result.url.split('://')[1].split('/')[1]+'7891'
	token = crypto.createHash('sha256').update(token).digest('hex')
	token = token.toUpperCase()

	var options = {
		uri: result.url,
		method: 'POST',
		form: {
    		"Token": token
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

		body = body.substr(1)
		body = JSON.parse(body)
		if (!body)
			return callback(new Error('Lỗi khi parse dữ liệu'))

		callback(null, body.Link)
	})
}
