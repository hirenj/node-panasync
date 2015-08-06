function testPort(port, host, cb) {
  require('net').createConnection(port, host).on("connect", function(e) {
    cb("success", e); 
  }).on("error", function(e) {
    cb("failure", e);
  });
};

var hosts_up = {};

var testHost = function(host,callback) {
  if ( ! hosts_up[host] ) {
    hosts_up[host] = false;
  }
  var bits = host.split(':');
  var ip = bits[0];
  var port = parseInt(bits[1]);
  testPort(port,ip,function(state,error) {
    if (state == "success") {
      if (! hosts_up[host] ) {
        console.log("Host now is online ",state);
        callback(host,true);
      }
      hosts_up[host] = true;      
    } else {
      if ( hosts_up[host] ) {
        console.log("Host now offline ",state);
        callback(host,false);
      }
      hosts_up[host] = false;
    }
  });
  return hosts_up[host];
};

var merge_callbacks = function(callbacks) {
  return function(ip,up) {
    callbacks.forEach(function(cb) {
      setTimeout(function() {
        cb(ip,up);
      },0);
    });
  };
}

var host_tester = function() {
  setTimeout(function() {
    var host;
    for (host in hosts_to_watch) {
      var cbs = hosts_to_watch[host];
      testHost(host,merge_callbacks(cbs));
    }
    setTimeout(arguments.callee,5000);
  },5000);
};

host_tester();

var hosts_to_watch = {};

var watchHost = function(host,port,callback) {
  if ( ! hosts_to_watch[host+":"+port] ) {
    hosts_to_watch[host+":"+port] = [];
  }
  hosts_to_watch[host+":"+port].push(callback);
};


module.exports = watchHost;