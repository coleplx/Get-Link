var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring')

var re = /https?:\/\/(www\.)?youtube\.com\/watch\?v=(.+)/
var result = {}

var DECODE_RULE=[]
var STORAGE_URL='download-youtube-script-url'
var STORAGE_CODE='download-youtube-signature-code'

module.exports.getLink = function(link, callback) {

	var match = re.exec(link);
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = match[2]
	result.host = hostEnum.YOUTUBE

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

				var uid = _.random(1, 9999)
				result.html = '<div class="instant-view" id="video-content-'+uid+'"></div>\
				<script type="text/javascript">\
				  jwplayer("video-content-'+uid+'").setup({\
				    "file": "'+result.url+'",\
				    "aspectratio": "16:9",\
				    "width": "100%",\
					"skin": {\
				       "name": "bekle",\
				       "active": "red",\
				       "inactive": "white",\
				       "background": "black"\
				   },\
				   "abouttext": "Getlink Pro",\
				   "autostart": true\
				});\
				</script>'

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
			return callback(new Error('Lỗi server code ' + response.statusCode))

		body = S(body).between('ytplayer.config = ', ';ytplayer.load').s
        body = JSON.parse(body)
        if (!body)
            return callback(new Error('Lỗi khi parse dữ liệu'))

		STORAGE_URL = body.assets.js
		if (STORAGE_URL.indexOf('http') === -1)
			STORAGE_URL = 'http:' + STORAGE_URL

		result.file = {
			name: body.args.title,
			type: 'mp4'
		}
		result.image = body.args.iurlmq
		result.sub_link = []

		var streamMap = body.args.url_encoded_fmt_stream_map
		streamMap = _.split(streamMap, ',')
		
		fetchSignatureScript(STORAGE_URL, function(err, response, body) {
			if (err)
				return callback(err)

			findSignatureCode(body)

			for (var i = 0; i < streamMap.length; i++) {
				var item = streamMap[i]
				item = querystring.parse(item)
				var dataUrl = unescape(unescape(item.url)).replace(/\\\//g,'/').replace(/\\u0026/g,'&')

				var sig = item.sig || item.signature
				if (sig) {
					dataUrl = dataUrl + '&signature=' + sig
				} else if (item.s) {
					dataUrl = dataUrl + '&signature=' + decryptSignature(item.s);
				}
				if (dataUrl.toLowerCase().indexOf('ratebypass')==-1) { // speed up download for dash
					dataUrl = dataUrl + '&ratebypass=yes'
				}

				result.sub_link.push({
					name: item.quality.toUpperCase(),
					direct_link: dataUrl
				})
			}

			result.direct_link = result.sub_link[0].direct_link

			callback(null)
		})
	})
}

function fetchSignatureScript(scriptURL, callback) {
	var options = {
		uri: scriptURL,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true
	}

	request(options, callback)
}

var download = function(callback) {
	if (_.isEmpty(result.sub_link))
		return callback(new Error('Lỗi khi lấy thông tin file'))

	async.forEach(result.sub_link, function(subLink, callback) {
		getFileSize(subLink.direct_link, function(err, size) {
			if (err)
				return callback(err)

			subLink.size = size
			callback(null)
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

function decryptSignature(sig) {
    function swap(a, b) {
        var c = a[0];
        a[0] = a[b % a.length];
        a[b] = c;
        return a
    };

    function decode(sig, arr) { // encoded decryption
        if (!_.isString(sig)) return null;
        var sigA = sig.split('');
        for (var i = 0; i < arr.length; i++) {
            var act = arr[i];
            if (!_.isInteger(act)) return null;
            sigA = (act > 0) ? swap(sigA, act) : ((act == 0) ? sigA.reverse() : sigA.slice(-act));
        }
        var result = sigA.join('');
        return result;
    }

    if (sig == null) return '';
    var arr = DECODE_RULE;
    if (arr) {
        var sig2 = decode(sig, arr);
        if (sig2) return sig2;
    }
    return sig;
}

function isValidSignatureCode(arr) { // valid values: '5,-3,0,2,5', 'error'
    if (!arr) return false;
    if (arr == 'error') return true;
    arr = arr.split(',');
    for (var i = 0; i < arr.length; i++) {
        if (!_.isInteger(parseInt(arr[i], 10))) return false;
    }
    return true;
}

function findSignatureCode(sourceCode) {
    var signatureFunctionName =
        findMatch(sourceCode,
            /\.set\s*\("signature"\s*,\s*([a-zA-Z0-9_$][\w$]*)\(/) ||
        findMatch(sourceCode,
            /\.sig\s*\|\|\s*([a-zA-Z0-9_$][\w$]*)\(/) ||
        findMatch(sourceCode,
            /\.signature\s*=\s*([a-zA-Z_$][\w$]*)\([a-zA-Z_$][\w$]*\)/); //old
    if (signatureFunctionName == null) return setPref(STORAGE_CODE, 'error');
    signatureFunctionName = signatureFunctionName.replace('$', '\\$');
    var regCode = new RegExp(signatureFunctionName + '\\s*=\\s*function' +
        '\\s*\\([\\w$]*\\)\\s*{[\\w$]*=[\\w$]*\\.split\\(""\\);\n*(.+);return [\\w$]*\\.join');
    var regCode2 = new RegExp('function \\s*' + signatureFunctionName +
        '\\s*\\([\\w$]*\\)\\s*{[\\w$]*=[\\w$]*\\.split\\(""\\);\n*(.+);return [\\w$]*\\.join');
    var functionCode = findMatch(sourceCode, regCode) || findMatch(sourceCode, regCode2);
    if (functionCode == null) return setPref(STORAGE_CODE, 'error');

    var reverseFunctionName = findMatch(sourceCode,
        /([\w$]*)\s*:\s*function\s*\(\s*[\w$]*\s*\)\s*{\s*(?:return\s*)?[\w$]*\.reverse\s*\(\s*\)\s*}/);
    if (reverseFunctionName) reverseFunctionName = reverseFunctionName.replace('$', '\\$');
    var sliceFunctionName = findMatch(sourceCode,
        /([\w$]*)\s*:\s*function\s*\(\s*[\w$]*\s*,\s*[\w$]*\s*\)\s*{\s*(?:return\s*)?[\w$]*\.(?:slice|splice)\(.+\)\s*}/);
    if (sliceFunctionName) sliceFunctionName = sliceFunctionName.replace('$', '\\$');

    var regSlice = new RegExp('\\.(?:' + 'slice' + (sliceFunctionName ? '|' + sliceFunctionName : '') +
        ')\\s*\\(\\s*(?:[a-zA-Z_$][\\w$]*\\s*,)?\\s*([0-9]+)\\s*\\)'); // .slice(5) sau .Hf(a,5)
    var regReverse = new RegExp('\\.(?:' + 'reverse' + (reverseFunctionName ? '|' + reverseFunctionName : '') +
        ')\\s*\\([^\\)]*\\)'); // .reverse() sau .Gf(a,45)
    var regSwap = new RegExp('[\\w$]+\\s*\\(\\s*[\\w$]+\\s*,\\s*([0-9]+)\\s*\\)');
    var regInline = new RegExp('[\\w$]+\\[0\\]\\s*=\\s*[\\w$]+\\[([0-9]+)\\s*%\\s*[\\w$]+\\.length\\]');
    var functionCodePieces = functionCode.split(';');
    var decodeArray = [];
    for (var i = 0; i < functionCodePieces.length; i++) {
        functionCodePieces[i] = functionCodePieces[i].trim();
        var codeLine = functionCodePieces[i];
        if (codeLine.length > 0) {
            var arrSlice = codeLine.match(regSlice);
            var arrReverse = codeLine.match(regReverse);
            if (arrSlice && arrSlice.length >= 2) { // slice
                var slice = parseInt(arrSlice[1], 10);
                if (_.isInteger(slice)) {
                    decodeArray.push(-slice);
                } else return setPref(STORAGE_CODE, 'error');
            } else if (arrReverse && arrReverse.length >= 1) { // reverse
                decodeArray.push(0);
            } else if (codeLine.indexOf('[0]') >= 0) { // inline swap
                if (i + 2 < functionCodePieces.length &&
                    functionCodePieces[i + 1].indexOf('.length') >= 0 &&
                    functionCodePieces[i + 1].indexOf('[0]') >= 0) {
                    var inline = findMatch(functionCodePieces[i + 1], regInline);
                    inline = parseInt(inline, 10);
                    decodeArray.push(inline);
                    i += 2;
                } else return setPref(STORAGE_CODE, 'error');
            } else if (codeLine.indexOf(',') >= 0) { // swap
                var swap = findMatch(codeLine, regSwap);
                swap = parseInt(swap, 10);
                if (_.isInteger(swap) && swap > 0) {
                    decodeArray.push(swap);
                } else return setPref(STORAGE_CODE, 'error');
            } else return setPref(STORAGE_CODE, 'error');
        }
    }

    if (decodeArray) {
        setPref(STORAGE_CODE, decodeArray.toString());
        DECODE_RULE = decodeArray;
    }
}

function getPref(name) {
	return name;
}

function setPref(a, b) {
	a = b;
}

function findMatch(text, regexp) {
    var matches=text.match(regexp);
    return (matches)?matches[1]:null;
  }
