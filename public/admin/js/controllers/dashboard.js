'use strict';

angular.module('myApp').controller('dashboardCtrl', ['$scope', '$http', function($scope, $http) {
    $scope.init = function() {
        $http.get('/admin/statastic')
            .success(function(data) {
                if (data.success) {
                    $scope.data = data.data
                }
            })
    }
}])
