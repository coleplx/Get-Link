
var indexController = {
	index: function(req, res) {
		res.sendFile('public/index.html', {root: __root});
	}
}

module.exports = indexController
