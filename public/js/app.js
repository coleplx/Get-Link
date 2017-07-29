var myApp = angular.module('myApp', ['ngAnimate','ui.bootstrap', 'ui.router', 'LocalStorageModule', 'yaru22.angular-timeago']);

myApp.config(function($locationProvider, $stateProvider, $urlRouterProvider) {

    $stateProvider
      .state('home', {
      	url: '/',
        templateUrl: 'views/home.html',
        controller: 'mainController',
        pageTitle: 'Get link siêu tốc'
      })
      .state('tutorial', {
      	url: '/tutorial',
        templateUrl: 'views/tutorial.html',
        controller: 'tutorialController',
        pageTitle: 'Hướng dẫn'
      })
      .state('donate', {
      	url: '/donate',
        templateUrl: 'views/donate.html',
        controller: 'donateController',
        pageTitle: 'Tài trợ'
      })
      .state('getlink', {
      	url: '/{url:.+}',
      	templateUrl: 'views/home.html',
        controller: 'mainController',
        pageTitle: 'Get link siêu tốc'
      })

     $locationProvider.html5Mode(true);
});

myApp.config(function (timeAgoSettings) {
  timeAgoSettings.overrideLang = 'vi_VN';
});

myApp.run(['$rootScope', '$state', '$stateParams', function ($rootScope, $state, $stateParams) {
  	$rootScope.$on('$stateChangeSuccess', function(event, toState) {
  		$rootScope.$state = toState;
  	});
}]);

myApp.filter('bytes', function() {
	return function(bytes, precision) {
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
		if (typeof precision === 'undefined') precision = 1;
        if (bytes <= 0) return 'Unknow';
		var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	}
});

myApp.controller('mainController', ['$scope', '$http', 'localStorageService', '$stateParams', '$uibModal', function($scope, $http, localStorageService, $stateParams, $uibModal) {
	$scope.getLink = function() {
		$scope.error = false;

		if (!$scope.url) {
			$scope.error = "Vui lòng nhập URL";
			return;
		}

		if ($scope.url.substring(0, 4) != "http") {
			$scope.url = 'http://' + $scope.url;
		}

		if (!ValidURL($scope.url)) {
			$scope.error = "Đường dẫn URL không hợp lệ";
			return;
		}

        for (var i = 0; i < $scope.results.length; i++) {
            if ($scope.results[i].url == $scope.url) {
                $scope.error = "Link đã được get thành công";
    			return;
            }
        }

		$scope.loading = true;

		var parameter = JSON.stringify({
			link: $scope.url,
			password: $scope.password
		});

		$http.post('/api/v1/get', parameter).
		    success(function(data, status, headers, config) {
		        if (data.success) {
        			$scope.results.unshift(data.data);
		        	$scope.reset();
		        } else {
		        	$scope.error = data.message;
		    	}
		    	$scope.loading = false;
		    }).
		    error(function(data, status, headers, config) {
		    	$scope.loading = false;
		    	$scope.error = "Lỗi truy vấn mạng";
		    });
	}

    $scope.find_file = function(keyword) {
        if (ValidURL(keyword))
            return [];
        return $http.post('/api/v1/find_file', { keyword: $scope.url }).then(function(response){
            if (response.data.success) {
                return response.data.data;
            }
        });
    };

    $scope.onFileSelect = function ($item, $model, $label) {
        $scope.url = $item.url;
    };

	$scope.reset = function() {
		$scope.url = $scope.password = '';
	}

    $scope.pageCount = function () {
        return Math.ceil($scope.results.length / $scope.itemsPerPage);
    };

    $scope.closeAt = function(index) {
        index = (($scope.currentPage - 1) * $scope.itemsPerPage) + index;
        $scope.results.splice(index, 1);
    }

    $scope.closeAll = function() {
        $scope.results = [];
    }

    $scope.pastedLink = function(event) {
        var item = event.clipboardData.items[0]
        item.getAsString(function (data) {
            $scope.url = data
            $scope.getLink()
        });
    }

    $scope.open = function (index) {
        var modalInstance = $uibModal.open({
          animation: true,
          templateUrl: 'closeModalContent.html',
          controller: 'closeModalController',
          resolve: {
              index: function() {
                  return index;
              }
          }
        });

        modalInstance.result.then(function (result) {
            if (result == 'all')
                $scope.closeAll();
            else
                $scope.closeAt(result);
        }, function () {
        });
	};

    // Get from local storage
    $scope.results = new Array()
    $scope.totalItems = 0
    $scope.currentPage = 1
    $scope.itemsPerPage = 5
    $scope.ctrlDown = false

    $scope.$watch('currentPage + totalItems + results', function() {
      $scope.totalItems = $scope.results.length;
      var begin = (($scope.currentPage - 1) * $scope.itemsPerPage),
        end = begin + $scope.itemsPerPage;

      $scope.filteredResults = $scope.results.slice(begin, end);
      localStorageService.set('results', JSON.stringify($scope.results));
    });

    var resultsStorage = localStorageService.get('results');
    if (resultsStorage)
        $scope.results = JSON.parse(resultsStorage);

	if ($stateParams.url) {
		if (!ValidURL($stateParams.url)) {
			return;
		}
		$scope.url = $stateParams.url;
		if ($stateParams.password) {
			$scope.password = $stateParams.password;
		}
		$scope.getLink();
	}
}]);

myApp.controller('historyController', ['$scope', '$http', '$interval', function($scope, $http, $interval) {
	$scope.loading = true;
	$scope.loadListFile = function() {

		$http.get('/api/v1/list_file').
			success(function(data, status, headers, config) {
			    if (data.success) {
			        if (data.data.length > 0) {
			        	var list = new Array();
			        	data.data.forEach(function(result) {
			        		list.unshift(result);
			        	});
			        	$scope.listFiles = list;
			        }
			    } else {
			        $interval.cancel($scope.reload);
			    }
			    $scope.loading = false;
			}).
			error(function(data, status, headers, config) {
			    $scope.loading = false;
			    $interval.cancel($scope.reload);
			});
	};

	$scope.listFiles = new Array();
	$scope.loadListFile();
	$scope.reload = $interval($scope.loadListFile, 10000);

}]);

myApp.controller('tutorialController', ['$scope', function($scope) {

}]);

myApp.controller('donateController', ['$scope', '$uibModal', '$http', function($scope, $uibModal, $http) {
	$scope.type = 'Card';
	$scope.data = {};

	$scope.add_donate = function() {
		if ($scope.type === 'Card') {
			if (!$scope.data.net || !$scope.data.serial || !$scope.data.number) {
				$scope.success = false;
				$scope.message = 'Không thể gửi vì thiếu tham số !';
				$scope.open();
				return;
			}

			$http.post('/api/v1/add_donate', JSON.stringify({
				people: $scope.data.people,
				comment: $scope.data.comment,
				type: 'Card',
				net: $scope.data.net,
				serial: $scope.data.serial,
				number: $scope.data.number
			})).
			    success(function(data, status, headers, config) {
			        if (data.success) {
			        	$scope.success = true;
						$scope.message = data.message;
			        	$scope.open();
			        	$scope.data = {};
			        } else {
			        	$scope.success = false;
						$scope.message = data.message;
						$scope.open();
			    	}
			    }).
			    error(function(data, status, headers, config) {
			    	$scope.success = false;
					$scope.message = 'Kiểm tra kết nối mạng !';
					$scope.open();
			    });
		} else if ($scope.type === 'Account') {
			if (!$scope.data.host || !$scope.data.account || !$scope.data.password) {
				$scope.success = false;
				$scope.message = 'Không thể gửi vì thiếu tham số !';
				$scope.open();
				return;
			}

			$http.post('/api/v1/add_donate', JSON.stringify({
				people: $scope.data.people,
				comment: $scope.data.comment,
				type: 'Account',
				host: $scope.data.host,
				account: $scope.data.account,
				password: $scope.data.password
			})).
			    success(function(data, status, headers, config) {
			        if (data.success) {
			        	$scope.success = true;
						$scope.message = data.message;
			        	$scope.open();
			        } else {
			        	$scope.success = false;
						$scope.message = data.message;
						$scope.open();
			    	}
			    }).
			    error(function(data, status, headers, config) {
			    	$scope.success = false;
					$scope.message = 'Kiểm tra kết nối mạng !';
					$scope.open();
			    });
		}
	};

	$scope.open = function (size) {
        var modalInstance = $uibModal.open({
          animation: true,
          templateUrl: 'myModalContent.html',
          controller: 'modalController',
          size: size,
          resolve: {
            success: function () {
              return $scope.success;
            },
            message: function() {
            	return $scope.message;
            }
          }
        });
	};
}]);

myApp.controller('modalController', function ($scope, $uibModalInstance, success, message) {
	$scope.success = success;
	$scope.message = message;

  	$scope.close = function () {
    	$uibModalInstance.dismiss();
  	};
});

myApp.controller('closeModalController', function ($scope, $uibModalInstance, index) {

    $scope.index = index;

  	$scope.closeAt = function (index) {
    	$uibModalInstance.close(index);
  	};

    $scope.closeAll = function() {
        $uibModalInstance.close('all');
    }
});

myApp.controller('statusController', function ($scope, $sce, $http) {
	$http.get('/api/v1/get_status').
		success(function(data, status, headers, config) {
		    if (data.success) {
                $scope.lists = [];
		    	data.data.forEach(function(data) {
                    if (data.host != 'streaming')
                        $scope.lists.push(data);
                    else
                        $scope.serverLoad = data.count;
                });
		    	$scope.dynamicPopover = {
				    templateUrl: 'statusBox.html',
				  };
		    } else {

		    }
		}).
		error(function(data, status, headers, config) {

		});
});

myApp.directive('getResult', ['$http', function($http) {

	return {
		scope: {
        	item: '=getResult',
            open: '=open'
      	},
		retrict: 'EA',
		templateUrl: 'js/directives/get-result.html',
        controller: function($scope, $sce) {
            $scope.instantView = function($event) {
                $event.preventDefault()
                if ($scope.instantviewData) {
                    $scope.paddingCls = ''
                    $scope.instantviewData = ''
                    return;
                }

                if ($scope.item.html) {
                    $scope.paddingCls = 'instant-view'
                    $scope.instantviewData = $sce.trustAsHtml($scope.item.html);
                    return;
                }
            };

            $scope.openDownloader = function(url) {
                window.open(url, '_blank');
            };

            $scope.viewImage = function(e) {
                var image = angular.element('<p id="result-image" class="hidden-xs"><img class="img-thumbnail" src="'+ $scope.item.image +'"/></p>');
                var body = angular.element('body').eq(0)
                angular.element('#result-image')
        			.css("top",(e.pageY - 10) + "px")
        			.css("left",(e.pageX + 30) + "px")
                    .show()
                body.append(image)
            }

            $scope.viewImageMove = function(e) {
                angular.element('#result-image')
                    .css("top",(e.pageY - 10) + "px")
                    .css("left",(e.pageX + 30) + "px")
            }

            $scope.viewImageLeave = function() {
                angular.element('#result-image').remove()
            }
        }
	}
}]);

myApp.filter('escape', function() {
  return function(url) {
      return encodeURI(url);
  };
});

myApp.filter('fileicon', function() {

	var fileType2Icon = function(type) {

		for (var key in listType) {
		    if (!listType.hasOwnProperty(key)) continue;
		    if (include(listType[key], type)) {
		    	return key;
		    }
		}
		return 'fa-file-o';
	}

  	return function(type) {
    	return fileType2Icon(type);
  	}
});

function ValidURL(str) {
	if (str.substring(0, 4) != "http") {
			str = 'http://' + str;
		}
	var pattern = new RegExp('((http|https)(:\/\/))?([a-zA-Z0-9]+[.]{1}){1,2}[a-zA-z0-9]+(\/{1}[a-zA-Z0-9]+)*\/?', 'i'); // fragment locater
	if(!pattern.test(str)) {
	  return false;
	} else {
	  return true;
	}
}

function include(arr, obj) {
    return (arr.indexOf(obj) != -1);
}

var listType = {
			'fa-file-archive-o': ['zip','zipx','rar','7z','iso','tar','bz2','gz','tgz','apk','cab','dmg','jar','sfx','war','wim'],
			'fa-file-video-o': ['webm','mkv','flv','vob','avi','mov','wmv','rm','rmvb','mp4','m4p','m4v','mpg','mpeg','m2v','ogg','oga'],
			'fa-file-audio-o': ['aa','aac','aax','act','au','flac','m4a','m4b','m4p','mp3','mpc','wav','wma'],
			'fa-file-image-o': ['tif','tiff','gif','jpg','jpeg','png','psd'],
			'fa-file-text-o': ['srt','asc','ass','sub','conf','txt','text','nfo','log','rtx','err','readme'],
			'fa-file-excel-o': ['csv','xls','xlsb','xlsm','xlsx'],
			'fa-file-powerpoint-o': ['gslides','keynote','pps','ppt','pptx'],
			'fa-file-word-o': ['doc','docx','rtf'],
			'fa-file-pdf-o': ['pdf'],
			'fa-file-code-o': ['au3','bat','cmd','js','lua','m','php','pl','py','r','rb','rdp','sh','vb','vbs','c','cpp','cs','go','h','java','htm','html'],
}
