var config = require('../../config/database'),
	jwt = require('jsonwebtoken'),
	api_response = require('../helper/api_response');

var authMiddleware = {
	verify: function(req, res, next) {
		var token = req.body.token || '';

		if (token) {
			jwt.verify(token, config.secret, function(err, decoded) {
		    	if (err) {
		        	return res.status(403).json({ success: false, message: 'Invalid token' });
		      	} else {
		        	req.auth = decoded;
		        	next();
		      	}
		    });
		} else {
		    return res.status(403).json({
		        success: false,
		        message: 'No token provided'
		    });
		}
	}
};

exports = module.exports = authMiddleware;
