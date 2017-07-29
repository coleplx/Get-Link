var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring'),
	unserialize = require("php-serialization").unserialize

var re = /https?:\/\/play\.google\.com\/store\/apps\/details\?id=(\S+)/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[1]
	result.host = hostEnum.GOOGLEPLAY

	async.waterfall([
		function getAccFromDatabase(callback) {
			Account.find({"host": hostEnum.APPVN, "active": true}).limit(1).exec(function(err, acc) {
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

var login = function(username, password, callback) {
	var url = 'https://id.appota.com/oauth/request_token?response_type=code&client_id=2b737d0e6de869eb73252049788e21e6051512297&scope=user.info&redirect_uri=http://appvn.com/android/loging&state=test&lang=vniclass='
	request({
		uri: url,
		method: 'GET',
		jar: true
	}, function(err, response, body) {
		if (err)
			return callback(err)

		url = S(body).between('<form id="acc-login-form" method="post" action="', '"').s
		if (!url)
			return callback(new Error('Lỗi khi parse dữ liệu'))

		var options = {
	  		uri: url,
	  		method: 'POST',
	  		form: {
	    		"login": "Login",
	    		"username": username,
	    		"password": password
	  		},
	  		headers: {
	    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
	  		},
	  		jar: true,
			followAllRedirects: true,
			gzip: true
		}

		request(options, function (error, response, body) {
	  		if (error)
				return callback(error)

			if (!_.includes(body, 'parent.window.location'))
				return callback(new Error('Tài khoản VIP bị sida. Vui lòng báo quản trị'))

	  		callback(null)
		})
	})
}

var getFileInfo = function(callback) {
	var options = {
  		uri: 'http://appvn.com/android/details?id=' + result.uid,
  		method: 'GET',
  		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
  		},
  		jar: true,
		gzip: true,
		followRedirect: false
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Lỗi server code ' + response.statusCode))

        result.file = {
			name: S(body).between('titleCard">', '</h1>').trim().s,
			type: 'apk'
		}
		result.image = S(body).between('pvt_image?src=', '"').s
		result.sub_link = []

		var version = S(body).between('var versions = \'', '\'').s

		try {
			version = unserialize(version)
		} catch (err) {
			return callback(err)
		}

		_.forOwn(version.__attr__, function(value, key) {
			result.sub_link.push({
				name: value.get().__attr__.version.get(),
				direct_link: value.get().__attr__.app_version_id.get()
			})
			result.app_id = value.get().__attr__.app_id.get()
		})
		callback(null)
	})

}

var download = function(callback) {
	async.forEach(result.sub_link, function(subLink, callback) {
		var options = {
	  		uri: 'http://appvn.com/android/pcDownload',
	  		method: 'POST',
			form: {
				image_wall: '',
				app_id: result.app_id,
				app_version_id: subLink.direct_link
			},
	  		headers: {
	    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36",
				"Referer": "http://appvn.com/android/details?id=" + result.uid
	  		},
	  		jar: true,
			gzip: true
		}

		request(options, function (error, response, body) {
			if (error)
				return callback(error)

			if (response.statusCode !== 200)
				return callback(new Error('Lỗi server code ' + response.statusCode))

			body = JSON.parse(body)
			if (!body)
				return callback(new Error('Lỗi khi parse dữ liệu'))

			if (!body.status)
				return callback(new Error('Lỗi khi lấy thông tin file'))

			subLink.direct_link = body.data.link_download

			getFileSize(subLink.direct_link, function(err, size) {
				if (err)
					return callback(err)

				subLink.size = size
				callback(null)
			})
		})
	}, function(err) {
		result.direct_link = result.sub_link[0].direct_link
		result.file.size = result.sub_link[0].size
		callback(null, result.direct_link)
	})
}

var getLocation = function(link, callback) {
	var options = {
  		uri: link,
  		method: 'GET',
  		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
  		},
  		jar: true,
		followRedirect: false
	}

	request(options, function (err, response) {
		if (err)
			return callback(err)

		if (response.statusCode !== 301 && response.statusCode !== 302)
			return callback(new Error('Lỗi khi lấy direct link'))
		callback(null, response.headers['location'])
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
