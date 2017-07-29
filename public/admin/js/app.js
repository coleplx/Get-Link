'use strict';

var myApp = angular.module('myApp', ['ui.bootstrap', 'ui.router', 'ui.select', 'LocalStorageModule', 'yaru22.angular-timeago']);

myApp.config(function (timeAgoSettings) {
  timeAgoSettings.overrideLang = 'vi_VN';
});

myApp.config(function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/dashboard');

    $stateProvider
        .state('dashboard', {
            url: '/dashboard',
            templateUrl: './views/dashboard.html',
            controller: 'dashboardCtrl'
        })
        .state('account', {
            url: '/account',
            templateUrl: './views/account.html',
            controller: 'accountCtrl'
        })
        .state('status', {
            url: '/status',
            templateUrl: './views/status.html',
            controller: 'statusCtrl'
        })
        .state('news', {
            url: '/news',
            templateUrl: './views/news.html',
            controller: 'statusCtrl'
        })
        .state('link', {
            url: '/link',
            templateUrl: './views/link.html',
            controller: 'linkCtrl'
        })
        .state('donate', {
            url: '/donate',
            templateUrl: './views/donate.html',
            controller: 'statusCtrl'
        })
        .state('message', {
            url: '/message',
            templateUrl: './views/message.html',
            controller: 'statusCtrl'
        })
})

myApp.filter('bytes', function() {
	return function(bytes, precision) {
        if (bytes === 0) return 'Không xác định'
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
		if (typeof precision === 'undefined') precision = 1;
		var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	}
});
