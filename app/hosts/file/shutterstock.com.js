var Account = require('../../models/account'),
    hostEnum = require('../../helper/host'),
    request = require('request'),
    _ = require('lodash'),
    async = require('async'),
    S = require('string'),
    querystring = require('querystring')

var re = /https?:\/\/(www\.)?shutterstock\.com\/((cs|da|de|en|es|fr|it|hu|nl|nb|pl|pt|fi|sv|tr|ru|th|ko|zh|ja)\/)?([a-z-]+)\/([a-z-]+)-([0-9]+)(\?src.+)?/
var fb_access_token = 'EAAI4BG12pyIBAJ5dMw9n8ZBWKaMHZAv6tvuUgAUilDcq6RrylGugnfdY061ADPiaaoL7ZBcPd9CJWazV21H3ZAyScpANVDJECjH5gpMCsZBjERZAJJAH5ZC22iEZC77Yvgt7J5pN75ddEKbzJ03Wa14VgwOGzW0sGkZBZC437WbUDCkqdaTjfHOK3k9ZCXyKNPxODcZD'
var result = {}

module.exports.getLink = function(link, callback) {

    var match = re.exec(link)
    if (match === null)
        return callback(new Error('Đường link không hợp lệ'))

    // Default value
    result.url = link
    result.uid = match[6]
    result.host = hostEnum.SHUTTERSTOCK

    async.waterfall([
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
            return callback(new Error('Ảnh không hợp lệ hoặc đã bị xóa'))

        result.file = {
            name: S(body).between('og:title" content="', '"').s,
            type: 'jpg'
        }

        callback(null)
    })
}

var download = function(callback) {
    var requestUrl = 'https://graph.facebook.com/v2.8/ssimg_' + result.uid + '?access_token=' + fb_access_token
    var options = {
        uri: requestUrl,
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
            return callback(new Error('Ảnh không hợp lệ hoặc đã bị xóa'))

        body = JSON.parse(body)
        if (!body)
            return callback(new Error('Không thể truy vấn dữ liệu'))

        var preview_url = body.preview_url
        if (!preview_url)
            return callback(new Error('Không thể lấy đường dẫn ảnh'))

        var download_link = S(preview_url).between('&url=', '&_nc_hash').s
        download_link = unescape(download_link)

        getFileSize(download_link, function(err, size) {
            if (err)
                return callback(error)

            result.image = download_link
            result.file.size = size

            callback(null, download_link)
        })
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

    request(options, function (err, response, body) {
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
