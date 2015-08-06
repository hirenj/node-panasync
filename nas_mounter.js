var watchHost = require('./host_test');

var tryMounting = function(host,path,mount_path,username,password,callback) {
  require('./osx-mountutils').mount('//'+username+':'+password+'@'+host+'/'+path,mount_path,{'fstype':'smbfs'},callback);
};

var tryUnmounting = function(mount_path,callback) {
  require('./osx-mountutils').umount(mount_path,false,null,callback);
};

var autoMount = function(host,path,mount_path,username,password,callback) {
	var host_up = false;
	watchHost(host,445,function(host_port,up) {
		host_up = up;
		if (up) {
			var tries = 0;
			tryMounting(host,path,mount_path,username,password,function(err,ok) {
				var result_func = arguments.callee;
				// We should check the err
				if (err) {
					tries += 1;
					if (tries <= 5 && host_up) {
						setTimeout(function() {
							tryMounting(host,path,mount_path,username,password,result_func);
						},1000);
					} else {
						callback(false);
					}
				} else {
					callback(true);
				}
			});
		} else {
			tryUnmounting(mount_path,function(err,ok) {
				callback(false);
			});
		}
	});
};