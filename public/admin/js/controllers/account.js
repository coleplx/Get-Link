'use strict';

angular.module('myApp').controller('accountCtrl', ['$scope', '$http', '$uibModal', function($scope, $http, $uibModal) {

    $scope.hostArray = [
        'fshare.vn',
        'mp3.zing.vn'
    ];

    $scope.init = function() {
        $http.get('/admin/list_account')
        .success(function(data) {
		        if (data.success) {
		        	if (data.data.length > 0) {
		        		$scope.data = data.data
		        	}
		        }
		    	$scope.loading = false
		})
    }

    $scope.add = function() {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'modalEdit.html',
            controller: 'modalInstanceCtrl',
            size: 'md',
            scope: $scope,
            resolve: {
                item: function () {
                    return {type: 'add'};
                }
            }
        })

        modalInstance.result.then(function (item) {
            if (!item)
                return;

            var parameter = JSON.stringify({
                host: item.host,
                username: item.username,
                password: item.password,
                active: item.active
            })

            $http.post('/admin/add_account', parameter)
            .success(function(data) {
                if (data.success) {
                    $scope.init()
                }
            })
        })
    }

    $scope.delete = function(account) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'modalDelete.html',
            controller: 'modalInstanceCtrl',
            size: 'md',
            resolve: {
                item: function () {
                    return account;
                }
            }
        });

        modalInstance.result.then(function (item) {
            if (item) {
                var parameter = JSON.stringify({
                    id: item._id
                })

                $http.post('/admin/delete_account', parameter)
                .success(function(data) {
                    if (data.success) {
                        $scope.init()
                    }
                })
            }
        });
    }

    $scope.edit = function(account) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'modalEdit.html',
            controller: 'modalInstanceCtrl',
            size: 'md',
            scope: $scope,
            resolve: {
                item: function () {
                    account.type = 'edit'
                    return account;
                }
            }
        })

        modalInstance.result.then(function (item) {
            if (item) {
                var parameter = JSON.stringify({
        			id: item._id,
                    host: item.host,
                    username: item.username,
                    password: item.password,
                    active: item.active
        		})

                $http.post('/admin/update_account', parameter)
                .success(function(data) {
        		    if (data.success) {
                        $scope.init()
        		    }
        		})
            }
        })
    }
}])

angular.module('myApp').controller('modalInstanceCtrl', function ($scope, $uibModalInstance, item) {

  $scope.item = item;
  $scope.newItem = angular.copy(item)

  $scope.ok = function () {
    $uibModalInstance.close($scope.newItem);
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});
