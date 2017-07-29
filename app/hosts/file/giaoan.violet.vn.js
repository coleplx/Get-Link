var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string')

var re = /http:\/\/giaoan.violet.vn\/present\/show\/entry_id\/(\d+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[1]
	result.host = hostEnum.VIOLET

	async.waterfall([
		function getAccFromDatabase(callback) {
			Account.find({"host": hostEnum.VIOLET, "active": true}).limit(1).exec(function(err, acc) {
				if (err)
					return callback(err)

				if (_.isEmpty(acc))
					return callback(new Error('Không có tài khoản'))

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
		function (callback) {
			getFileInfo(callback)
		},
		function(callback) {
			download(function(err, direct_link) {
				if (err)
					return callback(err)

				if (!direct_link)
					return callback(new Error('Lỗi bất thường'))

                var path = url.parse(direct_link, true).query.path
                var ext = require('path').extname(path)
                if (ext.length)
                    result.file.type = S(ext).strip('.').s
                else
                    result.file.type = 'unknow'

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
		uri: 'http://giaoan.violet.vn/user/login',
		method: 'POST',
		form: {
    		"_": "",
    		"username": username,
    		"password": password,
            "remember": 0,
            "commit": "Đăng nhập"
		},
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

        if (!_.includes(body, "Đăng nhập thành công"))
		    return callback(new Error('Tài khoản VIP bị sida. Vui lòng báo quản trị'))

        callback(null)
	})
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

        if (_.includes(body, 'Lỗi 404'))
            return callback(new Error('Tài liệu không tồn tại'))

		result.file = {
			name: S(body).between('<div style="width:425px; float:left">', '</div>').trim().s
		}
        result.download_id = S(body).between('Modalbox.show(\'http://giaoan.violet.vn/present/predownload/pr_id/', '/modalbox').s

		callback(null)
	})
}

var download = function(callback) {
	var options = {
		uri: 'http://giaoan.violet.vn/present/download/pr_id/' + result.download_id,
		method: 'HEAD',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
        followRedirect: false
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

        if (response.statusCode !== 301 && response.statusCode !== 302)
            return callback(new Error('Lỗi server code ' + response.statusCode))

        getFileSize(response.headers["location"], function(err, size) {
            if (err)
                return callback(err)

            result.file.size = size
            callback(null, response.headers["location"])
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
