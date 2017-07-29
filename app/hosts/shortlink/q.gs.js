var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring'),
	helper = require('../../helper/helper')

var re = /https?:\/\/q\.gs\/.+/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = 0
	result.host = hostEnum.ADFLY
	result.type = 'shortlink'

	async.waterfall([
		function(callback) {
			skip(callback)
		},
		function(callback) {
			helper.checkSafeUrl(result.direct_link, function(err, safe) {
				if (err)
					return callback(err)

				result.safe = safe
				callback(null, result)
			})
		}
	],
		callback
	)
}

var skip = function(callback) {
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
			return callback(new Error('Gián đoạn. Vui lòng thử lại sau'))

        if (_.includes(body, 'not found'))
            return callback(new Error('Đường dẫn không hợp lệ hoặc đã bị xóa'))

        var ysmm = S(body).between('ysmm = \'', '\'').s
		var direct_link = crack(ysum)
        getTitle(direct_link, function(err, title) {
            if (err)
                title = 'ADF.LY'

            result.file = {
    			name: title
    		}
            result.direct_link = direct_link

    		callback(null)
        })
	})
}

var crack = function(code) {
	var N = '';
	var M = '';

	for(var i = 0; i < code.length; i++) {
		if(i%2 == 0) {
			N += code[i];
		} else {
			M = code[i] + M;
		}
	}

	var key = N + M;

    var atob = require('atob');
	key = atob(key);
	key = key.substring(2);

	return key;
}

var getTitle = function(url, callback) {
	var options = {
		uri: url,
		method: 'HEAD',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
        followRedirect: true
	}

	request(options, function (error, response, body) {
		if (error)
            return callback(error)

        if (!_.includes(response.headers['content-type'], 'text/html'))
            return callback(new Error('Không thể lấy Tittle'))

        options.method = 'GET'
        request(options, function (error, response, body) {
            if (error)
                return callback(error)

            var title = S(body).between('<title>', '</title>').s
            if (!title)
                return callback(new Error('Không thể lấy Tittle'))

            callback(null, title)
        })
	})
}
