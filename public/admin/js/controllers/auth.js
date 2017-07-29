'use strict';

var app = angular.module('myApp');
app.controller('authController', ['$scope', '$http', 'localStorageService', '$location', function($scope, $http, localStorageService, $location) {
    $scope.login = function() {

        var parameter = JSON.stringify({
			username: $scope.username,
			password: $scope.password
		});

		$http.post('/admin/login', parameter).
		    success(function(data, status, headers) {

                if (!data.success) {
                    $scope.error = data.message;
                    return;
                }

                if (!data.data.is_admin) {
                    $scope.error = 'Bạn không có quyền truy cập';
                    return;
                }

                localStorageService.set('token', data.data.token);
                localStorageService.set('username', data.data.username);
                localStorageService.set('is_admin', data.data.is_admin);
                $location.path('/admin');
            });
    }
}]);
