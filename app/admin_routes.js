var	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	express = require('express'),
    Router = express.Router(),

    authController = require('./controllers/auth_controller'),
    mainController = require('./controllers/admin/main_controller'),
	accountController = require('./controllers/admin/account_controller'),
	linkController = require('./controllers/admin/link_controller'),
	dashboardCtrl = require('./controllers/admin/dashboard_controller');

Router.get('/login', authController.showLogin);
Router.post('/login', authController.login);

// Account module
Router.get('/list_account', accountController.list_account);
Router.post('/add_account', accountController.add_account);
Router.post('/update_account', accountController.update_account);
Router.post('/delete_account', accountController.delete_account);

// Link module
Router.get('/list_link', linkController.list_link)

// Dashboard
Router.get('/statastic', dashboardCtrl.statastic)

Router.get('*', mainController.index);

module.exports = Router;
