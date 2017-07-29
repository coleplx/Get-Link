var express = require('express'),
	mongoose = require('mongoose'),
	db = require('./config/database'),
	swig = require('swig'),
	routes = require('./app/routes')

global.__root = __dirname + '/'

var app = express(),
	port = process.env.PORT | 6996

mongoose.Promise = global.Promise
mongoose.connect(db.url, function(err) {
	if (err)
		throw err
})

app.engine('html', swig.renderFile)
app.set('view engine', 'html')
app.set('views', __dirname + '/public')
app.set('view cache', true)

routes(app)

app.listen(port, function(err) {
	if (err)
		console.log(err)
	else
		console.log('Server running on port %d', port)
})
