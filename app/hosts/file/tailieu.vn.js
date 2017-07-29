var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string')

var re = /http:\/\/tailieu.vn\/(doc|bst)\/(.+)\.html/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[2]
	result.host = hostEnum.TAILIEU

	async.waterfall([
		function checkFile(callback) {
            if (match[1] === 'doc')
    			getFileInfo(callback)
            else if (match[1] === 'bst')
                getBstInfo(callback)
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
			return callback(new Error('Tài liệu không tồn tại'))

		result.file = {
			name: S(body).between('DC.title" content="', '"').s,
			type: 'pdf'
		}
		result.direct_link = S(body).between('?f=', '?rand=').s

		callback(null)
	})
}

var getBstInfo = function(callback) {
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
		if (_.isEmpty(body))
			callback(new Error('Bộ sưu tập không tồn tại'))

        result.direct_link = S(body).between('?f=', '?rand=').s
		result.file.name = S(body).between('DC.title" content="', '"').s
		result.file.type = 'pdf'

        var re = /onclick=\"loadcoldoc\(\d{1,2},(\d+)\);\" title=\"([^"]*)\"/g
        var matchs,
            bstId = [], docTitle = []

        body = S(body).between('loaddivcoldoc', '</ul>\');').s
        while (matchs = re.exec(body)) {
            bstId.push(matchs[1])
            docTitle[matchs[1]] = matchs[2] + '.pdf'
        }

        async.map(_.drop(bstId), function(id, callback) {
            request(result.url + '?doc=' + id, function(error, response, body) {
                if (error)
                    return callback(error)

				result.sub_link.push({
					name: docTitle[id],
					direct_link: S(body).between('?f=', '?rand=').s
				})
                callback(null)
            })
        }, function(err, results) {
            if (err)
                return callback(err)

            callback(null)
        })
	})
}

var download = function(callback) {
	if (!result.sub_link) {
		getFileSize(result.direct_link, function(err, size) {
	        if (err)
	            return callback(err)

	        result.file.size = size
	        callback(null, result.direct_link)
	    })
		return
	}

	async.forEach(result.sub_link, function(subLink, callback) {
		getFileSize(subLink.direct_link, function(err, size) {
			if (err)
				return callback(err)

			subLink.size = size
			callback()
		})
	}, function(err) {
		if (err)
			return callback(err)

		result.direct_link = result.sub_link[0].direct_link
		result.file.size = result.sub_link[0].size
		callback(null, result.direct_link)
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
