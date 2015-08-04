var mountutils = require('linux-mountutils');
var fs = require('fs');

if (require('os').platform() !== 'darwin') {
	exports.umount = mountutils.umount;
	exports.isMounted = mountutils.isMounted;
	exports.mount = function(dev,path,options,callback) {
		options = options || {};
		if (options.fstype == 'smbfs') {
			options.fstype = 'cifs';
			options.noSudo = true;
			var url_components = dev.split('@');
			if (url_components.length > 1) {
				dev = "//"+url_components[1];
				var credentials = url_components[0].replace('//','').split(':');
				options.fsopts = "user="+credentials[0]+",password="+credentials[1];
			}
		}
		return mountutils.mount(dev,path,options,callback);
	}
	exports.umount = function(path, isDevice, options, callback) {
		var self = this;
		options = options || {};
		options.noSudo = true;
		return mountutils.umount.call(self,path,isDevice,options,callback);
	};
} else {
	exports.mount = function(dev, path, options, callback) {
		options = options || {};
		options.mountPath = '/sbin/mount';
		options.noSudo = true;
		return mountutils.mount(dev,path,options,callback);
	};

	exports.umount = function(path, isDevice, options, callback) {
		var self = this;
		options = options || {};
		options.umountPath = '/sbin/umount';
		options.noSudo = true;
		return mountutils.umount.call(self,path,isDevice,options,callback);
	};

	exports.isMounted = function(path, isDevice) {
	  // Sanity checks - if we're looking for a filesystem path that doesn't 
	  // exist, it's probably not mounted...
	  var path = fs.realpathSync(path);
	  if (!isDevice && !fs.existsSync(path)) {
	    return({"mounted": false, "error": "Path does not exist"});
	  }
	  var mtab = require('child_process').execSync('/sbin/mount').toString().split("\n");
	  // Interate through and find the one we're looking for
	  for (i in mtab) {
	    var mountDetail = mtab[i].split(" ");
	    // Does the appropriate field match?  Exact match only.
	    if ((isDevice && (mountDetail[0]==path)) || (!isDevice && (mountDetail[2]==path))) {
	      return({
	        "mounted": true,
	        "device": mountDetail[0],
	        "mountpoint": mountDetail[2],
	        "fstype": mountDetail[3],
	        "fsopts": mountDetail[4]
	      });
	    }
	  }
	  // Didn't find it
	  return({"mounted":false});
	};

	exports.mountSmb = function(path,share,callback) {
		var options = {
			'fstype' : 'smbfs'
		};
		return exports.mount(share,path,options,callback);
	};	
}

