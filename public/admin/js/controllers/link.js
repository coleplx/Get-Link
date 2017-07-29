'use strict';

angular.module('myApp').controller('linkCtrl', ['$scope', '$http', '$uibModal', function($scope, $http, $uibModal) {
    $scope.init = function() {
        $http.get('/admin/list_link')
            .success(function(data) {
                if (data.success) {
		        	if (data.data.length > 0) {
		        		$scope.data = data.data
		        	}
		        }
            })
    }

    $scope.view = function(item) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'modalView.html',
            controller: 'modalInstanceCtrl',
            size: 'lg',
            scope: $scope,
            resolve: {
                item: function () {
                    return item;
                }
            }
        })

        modalInstance.result.then(function (ok) {

        })
    }
}])

angular.module('myApp').controller('modalInstanceCtrl', function ($scope, $uibModalInstance, item) {

  $scope.item = item;

  $scope.ok = function () {
    $uibModalInstance.close('ok');
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});
