var	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	express = require('express'),
	api_response = require('./helper/api_response'),
	RateLimit = require('express-rate-limit');

var indexController = require('./controllers/index_controller'),
	authController = require('./controllers/auth_controller'),
	getController = require('./controllers/get_controller'),
	downloadController = require('./controllers/download_controller'),
	donateController = require('./controllers/donate_controller'),
	fileController = require('./controllers/file_controller');

var authMiddleware = require('./middleware/auth_middleware');

var limiter = new RateLimit({
	windowMs: 30*60*1000, // 1 hour window
	delayAfter: 0, // begin slowing down responses after the first request
	delayMs: 0, // slow down subsequent responses by 3 seconds per request
	max: 10, // start blocking after 5 requests
	message: "Too many download from this IP, please try again after an hour"
});

var router = function(app) {

	// Express route hanlder
	app.use(bodyParser.json());
	app.use('/', express.static('public'));

	// Authentication middleware
	//app.use(authMiddleware.verify);

	app.post('/api/v1/get', getController.index);
	app.get('/api/v1/list_file', getController.listFile);
	app.post('/api/v1/find_file', fileController.find_file);
	app.get('/download-:fileId', downloadController.show);
	app.get('/preview-:fileId', downloadController.preview);
	app.get('/stream-:fileId/:fileName?', downloadController.stream);
	app.post('/api/v1/add_donate', donateController.add);
	app.get('/api/v1/get_status', getController.getStatus);

	// Admin Router
	app.use('/admin1461994', require('./admin_routes'));

	// Index route
	app.get('*', indexController.index);

	// Error handlder
	var isDebug = require('../config').debug;
	if (isDebug) {
		app.use(function(err, req, res, next) {
			console.log(err);
    		res.status(err.status || 500);
    		res.json(new api_response(false, err));
		});
	}

	app.use(function(err, req, res, next) {
    	res.status(err.status || 500);
    	res.json(new api_response(false, err.message));
	});
};

module.exports = router;
