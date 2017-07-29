var request = require('request'),
    _ = require('lodash'),
    config = require('../../config')

var helper = {}

helper.checkSafeUrl = function(url, callback) {
    var requestUrl = 'https://safebrowsing.googleapis.com/v4/threatMatches:find?key=' + config.GOOGLE_API
    var options = {
		uri: requestUrl,
		method: 'POST',
        json: {
            "client": {
                "clientId":      "Getlink",
                "clientVersion": "1.0"
            },
            "threatInfo": {
                "threatTypes":      ["MALWARE", "SOCIAL_ENGINEERING"],
                "platformTypes":    ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [
                    {"url": url}
                ]
            }
        },
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
        followRedirect: true
	}

	request(options, function (error, response, body) {
		if (error)
            return callback(error)

        if (response.statusCode !== 200)
            return callback(new Error('Lỗi bất thường'))

        if (_.isEmpty(body))
            return callback(null, true)
        callback(null, false)
    })
}

module.exports = helper
