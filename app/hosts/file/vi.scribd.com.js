var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
	S = require('string')

var re = /https?:\/\/([a-z]{2})?\.scribd\.com\/(document|doc)\/([0-9]+)(\/.+)?/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link);
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[3]
	result.host = hostEnum.SCRIBD

	async.waterfall([
		function getAccFromDatabase(callback) {
			Account.find({"host": hostEnum.SCRIBD}).limit(1).exec(function(err, acc) {
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

				result.is_stream = false
				result.html = '<iframe class="scribd_iframe_embed" src="https://www.scribd.com/embeds/'+result.uid+'/content?start_page=1&view_mode=slideshow&access_key=key-uX1XYnqktarXYKdCroFa&show_recommendations=false" data-auto-height="true" data-aspect-ratio="0.7729220222793488" scrolling="no" id="doc_92582" width="100%" height="600" frameborder="0"></iframe>'
				callback(null, result)
			})
		}
	],
		callback
	)
}

var login = function(username, password, callback) {
	var options = {
		uri: 'https://www.scribd.com/login',
		method: 'POST',
		form: {
    		"login_params[next_url]": "https://www.scribd.com/",
    		"login_params[context]": "join2",
    		"login_or_email": username,
			"login_password": password,
			"rememberme": "on"
		},
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36",
			"X-Requested-With": "XMLHttpRequest",
			"Accept": "application/json"
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Lỗi server code ' + response.statusCode))

		if (_.includes(body, '"success":true'))
			return callback(null)
		callback(new Error('Lỗi khi đăng nhập'))
	})
}

var getFileInfo = function(callback) {
	request({
		uri: result.url,
		jar: true
	}, function(err, response, body) {
		if (err)
			return callback(err)

		var csrf_token = S(body).between('csrf-token" content="', '"').s
		var options = {
			uri: 'https://www.scribd.com/read/download_dialog?id='+result.uid+'&template=pdfs',
			method: 'POST',
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36",
				"X-Requested-With": "XMLHttpRequest",
				"X-CSRF-Token": csrf_token
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
			//console.log(body)
			if (_.isEmpty(body.props.formats))
				return callback(new Error('Lỗi khi lấy thông tin file'))

			result.file = {
				name: body.props.document.title,
				type: body.props.formats[0].extension
			}
			result.secret = body.props.document.secret_password
			result.sub_link = []

			body.props.formats.forEach(function(format) {
				result.sub_link.push({
					name: format.extension
				})
			})

			callback(null)
		})
	})
}

var download = function(callback) {
	if (!result.sub_link)
		return callback(new Error('Lỗi khi lấy thông tin file'))

	async.forEach(result.sub_link, function(subLink, callback) {
		var newUrl = 'https://www.scribd.com/document_downloads/'+result.uid+'?extension='+subLink.name+'&secret_password=' + result.secret
		getLocation(newUrl, function(err, directLink) {
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

		result.file.size = result.sub_link[0].size;
		result.direct_link = result.sub_link[0].direct_link
		callback(null, result.direct_link)
	})
}

var getLocation = function(link, callback) {
	var options = {
		uri: link,
		method: 'HEAD',
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
	request({
		uri: link,
		method: 'HEAD',
		jar: true
	}, function (error, response, body) {
		if (error)
			return callback(error)

		if (!response.headers['content-length'])
			return callback(new Error('Lỗi khi lấy dung lượng file'))

		callback(null, parseInt(response.headers['content-length']))
	})
}
