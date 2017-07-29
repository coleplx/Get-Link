$(document).ready(function () {

	$('[data-toggle="tooltip"]').tooltip();
	$('[data-toggle="popover"]').popover()
	$('.collapse').collapse()

	$('.bookmarklet').click(function(e) {
		var bookmarkURL = "javascript:(function(){window.open('http://lomdom.net/'+encodeURIComponent(location.href)+'')})();";
	    var bookmarkTitle = "GetLink Tool";

	    if ('addToHomescreen' in window && window.addToHomescreen.isCompatible) {
	      // Mobile browsers
	      addToHomescreen({ autostart: false, startDelay: 0 }).show(true);
	    } else if (window.sidebar && window.sidebar.addPanel) {
	      // Firefox version < 23
	      window.sidebar.addPanel(bookmarkTitle, bookmarkURL, '');
	    } else if ((window.sidebar && /Firefox/i.test(navigator.userAgent)) || (window.opera && window.print)) {
	      // Firefox version >= 23 and Opera Hotlist
	      $(this).attr({
	        href: bookmarkURL,
	        title: bookmarkTitle,
	        rel: 'sidebar'
	      }).off(e);
	      return true;
	    } else if (window.external && ('AddFavorite' in window.external)) {
	      // IE Favorite
	      window.external.AddFavorite(bookmarkURL, bookmarkTitle);
	    }

		return false;
	})

	$('#downloadLink').val(window.location.href)

	var humanSize = function (bytes, precision) {
		if (bytes === 0) return 'Không xác định'
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
		if (typeof precision === 'undefined') precision = 1;
		var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	}

	$('.filesize').text(humanSize($('.filesize').text()))
});
