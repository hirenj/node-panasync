var watchHost = require('./host_test');
var mountutils = require('./osx-mountutils');


var tryMounting = function(host,path,mount_path,username,password,callback) {
	if ( ! mountutils.isMounted(mount_path).mounted ) {
		mountutils.mount('//'+username+':'+password+'@'+host+'/'+path,mount_path,{'fstype':'smbfs'},callback);
	} else {
		callback({'OK':true});
	}
};

var tryUnmounting = function(mount_path,callback) {
  mountutils.umount(mount_path,false,null,callback);
};

var autoMount = function(config,callback) {
	var host_up = false;
	watchHost(config.host,445,function(host_port,up) {
		host_up = up;
		if (up) {
			var tries = 0;
			tryMounting(config.host,config.path,config.mount_path,config.username,config.password,function(ok) {
				var result_func = arguments.callee;
				if (! ok.OK) {
					tries += 1;
					if (tries <= 5 && host_up) {
						setTimeout(function() {
							tryMounting(config.host,config.path,config.mount_path,config.username,config.password,result_func);
						},1000);
					} else {
						callback(false);
					}
				} else {
					callback(true);
				}
			});
		} else {
			tryUnmounting(config.mount_path,function(err,ok) {
				callback(false);
			});
		}
	});
};

module.exports.autoMount = autoMount;