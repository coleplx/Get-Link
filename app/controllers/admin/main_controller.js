
var mainController = {
	index: function(req, res) {
		res.sendFile('public/admin/index.html', {root: __root});
	}
};

exports = module.exports = mainController;
