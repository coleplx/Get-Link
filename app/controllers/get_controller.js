var url = require('url'),
	validUrl = require('valid-url'),
	mongoose = require('mongoose'),
	apiResponse = require('../helper/api_response'),
	Link = require('../models/link'),
	Status = require('../models/status'),
	fs = require('fs'),
	config = require('../../config/index'),
	filesizeConvert = require('file-size'),
	_ = require('lodash'),
	async = require('async')

var getController = {}

getController.index = function(req, res) {
	var type = req.body.type || 'host'
	var link = req.body.link.trim()
	if (!link)
		return res.json(new apiResponse(false, "Đường link không hợp lệ"))

	if (link.indexOf('\n') > -1)
		link = link.split('\n')[0]

	if (!validUrl.isWebUri(link))
		return res.json(new apiResponse(false, "Đường link không hợp lệ"))

	var host = url.parse(link).hostname

	if (host.indexOf('www.') > -1)
		host = host.replace('www.', '')

	if (host.indexOf('www') > -1)
		host = host.replace(/www\d{1,3}\./, '')

	var hostPath = [
			__root + 'app/hosts/file/' + host + '.js',
			__root + 'app/hosts/shortlink/' + host + '.js'
		]

	async.waterfall([
		function(callback) {
			// Check file exist ?
			async.detect(hostPath, function(filePath, callback) {
			    fs.access(filePath, function(err) {
			        callback(null, !err)
			    })
			}, function(err, result) {
			    if (err)
					return callback(err)

				if (result == undefined)
					return callback(new Error("Host " + host + " chưa hỗ trợ"))

				hostPath = result
				callback(null)
			})
		},
		/*function checkServerLoad(callback) {
			Status.findOne({"host": "streaming"}).select('count').exec(function(err, status) {
				if (err)
					return callback(new Error('Lỗi truy vấn'))
				if (status.count >= config.max_connection)
					return callback(new Error('Server quá tải. Hãy chờ đến lượt'))
				callback(null)
			})
		},*/
		function(callback) {
			var hostObj = require(hostPath)
			hostObj.getLink(link, function(err, link) {
				if (err) {
					console.log('Link: ' + req.body.link.trim() + ' | ' + err.message + '\n')
					return callback(err)
				}

				link.type = link.type || 'file'

				switch (link.type) {
					case 'file':
						link = new Link(link)
						link.genId()
						link.ip = req.headers['x-real-ip'] || req.ip
						link.file.type = link.file.type || getFileExtension(link.file.name)

						if (!link.html) {
							link.html = htmlPreview(link)
						}

						link.save(callback)
						break

					case 'shortlink':
						return callback(null, link)
						break

					default:
						return callback(new Error('Lỗi hệ thống bất thường'))
				}
			})
		}
	],
		function(err, result) {
			if (err)
				return res.json(new apiResponse(false, err.message))

			res.json(new apiResponse(true, 'Successful', toOutput(result)))
	})
}

var toOutput = function(linkModel) {
	if (linkModel instanceof Link)
		linkModel = linkModel.toObject()

	switch (linkModel.type) {
		case 'file':
			var downloadLink = config.site_url + 'download-' + linkModel._id,
				previewLink = linkModel.html ? config.site_url + 'preview-' + linkModel._id : '',
				streamLink = config.site_url + 'stream-' + linkModel._id + '/inline'

			return {
				"_id": linkModel._id,
				"url": linkModel.url,
				"uid": linkModel.uid,
				"type": "file",
				"host": linkModel.host,
				"file": {
					"name": linkModel.file.name,
					"size": linkModel.file.size,
					"type": linkModel.file.type
				},
				"image": linkModel.image || '',
				"download_link": downloadLink,
				"preview_link": previewLink,
				"stream_link": linkModel.is_stream ? streamLink : linkModel.direct_link,
				"sub_link": linkModel.sub_link || [],
				"html": linkModel.html || ''
			}
			break;

		case 'shortlink':

			return {
				"url": linkModel.url,
				"type": "shortlink",
				"host": linkModel.host,
				"file": {
					name: linkModel.file.name
				},
				"safe": linkModel.safe,
				"image": 'http://mini.s-shot.ru/?' + linkModel.direct_link,
				"download_link": linkModel.direct_link,
				"html": '<iframe src="'+linkModel.direct_link+'" width="100%" height="660px"></iframe>'
			}
			break;
	}
}

getController.listFile = function(req, res) {
	Link.find().limit(10).sort({createdAt: -1}).exec(function(err, links) {
		if (err)
			return res.json(new apiResponse(false, 'Lỗi truy vấn'))

		var data = new Array()
		links.forEach(function(link) {
			var downloadLink = config.site_url + 'download-' + link._id
			var ipArr = link.ip.split('.')
			data.unshift({
				file: {
					name: link.file.name,
					size: link.file.size,
					type: link.file.type
				},
				url: link.url,
				host: link.host,
				time: link.createdAt,
				ip: ipArr[0] + '.' + ipArr[1] + '.***.***' ,
				download_link: downloadLink
			})
		})

		res.json(new apiResponse(true, 'Lastest file', data))
	})
}

getController.getStatus = function(req, res) {
	Status.find().select('host status count -_id').exec(function(err, status) {
		if (err)
			return res.json(new apiResponse(false, 'Lỗi truy vấn'))

		res.json(new apiResponse(true, 'OK', status))
	})
}

var htmlPreview = function(link) {

	var stream_link = link.is_stream ? (config.site_url + 'stream-' + link._id + '/inline') : link.direct_link

	var videoExt = 	['mp4'],
		divxVideoExt = ['avi', 'mkv'],
		pdfExt =	['pdf'],
		docExt = 	['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'],
		musicExt = 	['mp3', 'acc'],
		imageExt =	['jpg', 'jpeg', 'gif', 'png']

	var uid = _.random(1, 9999)

	if (_.includes(videoExt, link.file.type)) {
		return '<div class="instant-view" id="video-content-'+uid+'"></div>\
		<script type="text/javascript">\
		  jwplayer("video-content-'+uid+'").setup({\
		    "title": "'+link.file.name+'",\
		    "type": "'+link.file.type+'",\
		    "file": "'+stream_link+'",\
		    "image": "'+(link.image || '/images/video-poster.jpg') +'",\
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
	}

	else if (_.includes(divxVideoExt, link.file.type)) {
		return '<object classid="clsid:67DABFBF-D0AB-41fa-9C46-CC0F21721616" width="100%"\ height="500" codebase="http://go.divx.com/plugin/DivXBrowserPlugin.cab">\
			<param name="custommode" value="none" />\
			<param name="autoPlay" value="true">\
			<param name="mode" value="zero" />\
			<param name="src" value="'+stream_link+'" />\
			<param name="disableDimmer" value="true">\
			<param name="previewImage" value="'+link.image+'">\
			<embed type="video/divx" src="'+stream_link+'" custommode="none" width="100%" height="500" disabledimmer="true" pluginspage="http://go.divx.com/plugin/download/" previewimage="'+link.image+'" align="middle"></embed>\
		</object>\
		<br />Để xem được Video này, bạn cần tải và cài đặt <a href="http://www.divx.com/software/divx-plus/web-player"\ target="_blank">DivX Plus Web Player tại đây</a>.'
	}

	else if (_.includes(pdfExt, link.file.type)) {
		return '<iframe src="./pdf_viewer/web/viewer.html?file='+stream_link+'" width="100%" height="660px" frameborder="0"></iframe>'
	}

	else if (_.includes(docExt, link.file.type)) {
		return "<iframe src='https://view.officeapps.live.com/op/embed.aspx?src="+stream_link+"&wdAr=1.7777777777777777&wdEaa=0' width='100%' height='660px' frameborder='0'>Đây là một tài liệu <a target='_blank' href='https://office.com'>Microsoft Office</a> đã nhúng, được cung cấp bởi <a target='_blank' href='https://office.com/webapps'>Office Online</a>.</iframe>"
	}

	else if (_.includes(musicExt, link.file.type)) {
		return '<div class="instant-view" id="video-content-'+uid+'"></div>\
		<script type="text/javascript">\
		  jwplayer("video-content-'+uid+'").setup({\
		    "file": "'+stream_link+'",\
		    "width": "610",\
			"height": "40",\
			"autostart": "true"\
		});\
		</script>'
	}

	else if (_.includes(imageExt, link.file.type)) {
		return '<img class="img-thumbnail" src="'+stream_link+'" style="max-width:100%"/>'
	}

	return ''
}

var getFileExtension = function(filename) {
	if (!filename)
		return ''
	return filename.substring((~-filename.lastIndexOf(".") >>> 0) + 2).toLowerCase()
}

module.exports = getController
