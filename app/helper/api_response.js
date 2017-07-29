var api_response = function(success, message, data) {
	this.success = success;
	this.message = message;
	if (data && success) {
		this.data = data;
	}
};

exports = module.exports = api_response;