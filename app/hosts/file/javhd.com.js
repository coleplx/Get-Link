var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
	crypto = require('crypto')

var re = /http:\/\/javhd\.com\/en\/id\/([0-9]+)\/([a-z-]+)/
var token
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'), null)

	// Default value
	result.url = link
	result.uid = match[1]
	result.host = hostEnum.JAVHD

	async.waterfall([
		/*function checkAccDatabase(callback) {
			Account.find({"host": hostEnum.JAVHD}).limit(1).exec(function(err, acc) {
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
		},*/
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

				callback(null, result)
			})
		}
	],
		callback
	)
}

var login = function(username, password, callback) {

}

var getFileInfo = function(callback) {
	var options = {
		uri: result.url,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36",
            "Cookie": "locale=en; JAVSESSID=sco1phs98p04m79lh9svk7qnq3; uid=user37106; lt=1483193780; slt=06cebc922f75e0018f091a51daee06ef; t_sid=sco1phs98p04m79lh9svk7qnq3; t_scr=1483193763; user_lang=en; nats=MC4wLjIuMi4wLjAuMC4wLjA; nats_cookie=http%253A%252F%252Fjavhd.com%252Fen; nats_unique=MC4wLjIuMi4wLjAuMC4wLjA; nats_sess=7d5aa1ad021320194bc36c9c07e23188; form_prices_en=1; last_visited_set=19475; _ga=GA1.2.1135802169.1483193374; feid=34b27a376da4ed848dbf27c15b4d001e; fesid=e88fa2c1ab335bd2a45c1d049200e0aa; atas_uid="
		},
		jar: true
	}

	request(options, function (error, response, body) {
		if (error)
			return callback(error)

		if (response.statusCode !== 200)
			return callback(new Error('Phim không tồn tại hoặc đã bị xóa'))

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
