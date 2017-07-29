var mongoose = require('mongoose'),
	Link = require('../models/link'),
	Status = require('../models/status'),
	filesizeConvert = require('file-size'),
	request = require('request'),
	mime = require('mime-types'),
	config = require('../../config/'),
	_ = require('lodash')

var downloadController = {};

downloadController.show = function(req, res) {

	var fileId = req.params.fileId
	Link.findOne({"_id": fileId}, function(err, link) {
		if (err)
			return res.send(err)

		if (!link)
			return res.send("404")

		var streamLink = config.site_url + 'stream-' + link._id;
		res.render('download', {
			file: {
				name: link.file.name,
				size: link.file.size,
				type: link.file.type
			},
			url: link.url,
			stream_link: link.is_stream ? streamLink : link.direct_link,
			preview_link: link.html ? config.site_url + 'preview-' + link._id : ''
		});
	})
}

downloadController.preview = function(req, res) {
	var fileId = req.params.fileId
	Link.findOne({"_id": fileId}, function(err, link) {
		if (err)
			return res.send(err.message)

		if (!link)
			return res.send('Không tồn tại')

		var streamLink = config.site_url + 'stream-' + link._id + '/inline';
		res.render('preview', {
			file: {
				name: link.file.name,
				size: link.file.size,
				type: link.file.type
			},
			url: link.url,
			html: link.html,
			download_link: config.site_url + 'download-' + link._id,
			stream_link: link.is_stream ? streamLink : link.direct_link
		});
	})
}

downloadController.stream = function(req, res) {
	var fileId = req.params.fileId
	Link.findOne({"_id": fileId}, function(err, link) {
		if (err)
			return res.send(err)

		if (!link)
			return res.send('Không tồn tại')

		var opts = {
			uri: link.direct_link,
			method: 'GET'
		}

		opts.headers = {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:47.0) Gecko/20100101 Firefox/47.0",
			"Accept": "*/*"
		}

		if (req.headers['range']) {
			opts.headers["Range"] = req.headers['range']
		}

		if (req.headers['if-range']) {
			opts.headers["If-Range"] = req.headers['if-range']
		}

		res.set({
			"Accept-Ranges": "bytes"
		})

		var startTime  = Date.now(),
    		totalBytes = 0;

		function calcReqDelay(targetSpeed) {
	    	var timePassed = Date.now() - startTime;
	    	var expected = targetSpeed * timePassed / 1000;
	    	return expected;
		}

		var r = request(opts).on('error', function(err) {

		}).on('response', function(res) {
			/*Status.findOneAndUpdate({"host": "streaming"}, {$inc: { count: 1 }}, {
				upsert: true,
			}).exec()*/
			if (req.params.fileName == 'inline') {
				res.headers['content-type'] = mime.lookup(link.file.type)
				res.headers['content-disposition'] = 'inline'
			}
		}).on('end', function() {
			//console.log('end')
		}).on('data', function(chunk) {
    		/*totalBytes += chunk.length
    		var expected = calcReqDelay(1024 * 1024)
    		if (totalBytes > expected) {
				var remainder = totalBytes - expected
				var sleepTime = Math.round(remainder / (1024 * 1024) * 1000)
				if (sleepTime > 100) {
	        		r.pause()
	        		setTimeout(function() {
						r.resume()
					}, sleepTime)
				}
    		}*/
		})

		var stream = r.pipe(res)

		stream.on('finish', function() {
			r.abort()
			//Status.findOneAndUpdate({"host": "streaming"}, {$inc: { count: -1 }}).exec()
		})
		.on('error', function(err) {
			r.abort()
			//Status.findOneAndUpdate({"host": "streaming"}, {$inc: { count: -1 }}).exec()
		})
		.on('close', function () {
			r.abort()
			//Status.findOneAndUpdate({"host": "streaming"}, {$inc: { count: -1 }}).exec()
		})
	})
}

module.exports = downloadController;
