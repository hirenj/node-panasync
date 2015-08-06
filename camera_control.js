var parseString = require('xml2js').parseString;
var path = require('path');
var fs = require('fs');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var request = require('request');


var watchHost = require('./host_test');

// enabled flag
// host
// target directory
// newest

// Events for successful sync of a picture
// Expose number of remaining pictures to sync
// Expose camera host status

var Camera = function(conf) {
  var self = this;
  this.host = conf.host;
  this.path = conf.path;
  this.latest = conf.latest;
  watchHost(this.host,60606,function(ip,up) {
    properties['available'][self] = up;

    self.emit('available',up);

    if (self.auto) {
      self.sync();      
    }
  });
};

util.inherits(Camera,EventEmitter);

var properties = {
  'enabled' : new WeakMap(),
  'auto' : new WeakMap(),
  'available' : new WeakMap()
};

Object.defineProperty(Camera.prototype, 'enabled', {
  get: function() { return properties['enabled'][this] || false; },
  set: function(enabled) { properties['enabled'][this] = enabled; this.sync(); },
  enumerable: true
});

Object.defineProperty(Camera.prototype, 'auto', {
  get: function() { return properties['auto'][this]; },
  set: function(auto) { properties['auto'][this] = auto; this.sync(); },
  enumerable: true
});

Object.defineProperty(Camera.prototype, 'available', {
  get: function() { return properties['available'][this]; },
  enumerable: true
});


Camera.prototype.sync = function() {
  var self = this;
  if (this.syncing) {
    return;
  }
  if ( ! this.enabled || ! this.available ) {
    return;
  }
  this.syncing = true;

  self.emit('syncstart');

  // Repeat until there are no errors?

  camera_init(self.host,function() {
    get_photo_list(self.host,function(error,total_count) {
      filterPhotos.bind(self)([],total_count,downloadPhotos.bind(self));
    });
  });
};

var camera_init = function(host,callback) {
  var camera_init_url = 'http://'+host+'/cam.cgi?mode=camcmd&value=playmode';
  request(camera_init_url, function (error, response, body) {
    callback(error,body);
  });
};

var get_photo_list = function(host,callback) {
  var camera_init_url = 'http://'+host+'/cam.cgi?mode=get_content_info';
  request(camera_init_url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      parseString(body,function(err,result) {
        callback(null,parseInt(result.camrply.total_content_number));
      });
    }
  });
};

var get_soap_body = function(index) {
return '<?xml version="1.0" encoding="utf-8"?> \
    <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">\
    <s:Body>\
    <u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1" xmlns:pana="urn:schemas-panasonic-com:pana">\
    <ObjectID>0</ObjectID>\
    <BrowseFlag>BrowseDirectChildren</BrowseFlag>\
    <Filter>*</Filter>\
    <StartingIndex>'+index+'</StartingIndex>\
    <RequestedCount>50</RequestedCount>\
    <SortCriteria></SortCriteria>\
    <pana:X_FromCP>LumixLink2.0</pana:X_FromCP>\
    </u:Browse>\
    </s:Body>\
    </s:Envelope>';
};

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
};

var convert_items = function(urls) {
  var cleaned_urls = urls.map(function(url) {
    return url.split('/').reverse()[0].replace(/^D[OLT]/,'');
  });
  var file_index = cleaned_urls[0].replace(/\..*/,'');
  var extensions = cleaned_urls.map(function(url) {
    return url.split('.')[1];
  }).filter(onlyUnique);
  return { 'index' : file_index, 'extensions': extensions};
};

var filterPhotos = function(new_photos,total,callback) {
  var self = this;
  var host = this.host;
  if (total > 0) {
    var curr_idx = total - 50;
    if (curr_idx < 0) {
      curr_idx = 0;
    }
    request.post( {
      'uri': 'http://'+host+':60606/Server0/CDS_control',
      'headers' : {
        'SOAPACTION' : 'urn:schemas-upnp-org:service:ContentDirectory:1#Browse',
        'Content-Type' : 'text/xml; charset="UTF-8"'
      },
      'body' : get_soap_body(curr_idx)
      }, function(err,resp,body) {
        parseString(body,function(err,result) {
          var images = result['s:Envelope']['s:Body'][0]['u:BrowseResponse'][0].Result[0];
          parseString(images,function(err,result) {
            var items = result['DIDL-Lite'].item;
            var new_items = items.map(function(item) {
              return convert_items(item.res.map(function(re) { return re['_']; }));
            }).reverse();
            while (new_items.length > 0) {
              if (new_items[0].index == self.latest) {
                callback(new_photos);
                return;
              }
              new_photos.unshift(new_items.shift());
            }
            filterPhotos.bind(self)(new_photos,curr_idx,callback);
          })
        });
      });
  } else {
    callback(new_photos);
  }
};

var downloadPhotos = function(photos) {
  var self = this;
  if (photos.length == 0) {
    self.emit('syncend');
    self.syncing = false;
    return;
  }
  var photo = photos[0];
  var extension = photos[0].extensions[0];
  var host = this.host;
  var len = 0;
  var timestamp = new Date();
  var cur = 0;
  self.emit('downloadStart',photo.index+'.'+extension);
  // Emit event saying we are starting a batch / photo

  var dst = path.join(self.path,'P'+photo.index+'.'+extension);

  self.current = photo.index+'.'+extension;

  var writer = fs.createWriteStream(dst);
  request
  .get('http://'+host+':50001/DO'+photo.index+'.'+extension)
  .on('response', function(response) {
    timestamp = new Date(response.headers['x-rec_date_time']);
    len = parseInt(response.headers['x-file_size']);
  }).on('data',function(chunk) {
    cur += chunk.length;
    self.current_complete = (100.0 * cur / len).toFixed(2);
    console.log("Downloading " + self.current_complete + "% ");
  })
  .pipe(writer);

  writer.on('finish',function() {
    fs.utimes(dst,timestamp,timestamp,function() {
      // Emit event saying this photo is done
      self.emit('complete',photo.index+"."+extension);
      self.current = null;
      console.log("Done "+photo.index+"."+extension);
    });
    photos[0].extensions.shift();
    if (photos[0].extensions.length < 1) {
      self.emit('batchcomplete',photo.index);
      // Emit event saying that we have all the data for this photo batch
      photos.shift();
    }
    if (photos.length > 0) {
      downloadPhotos.bind(self)(photos);      
    } else {
      self.emit('syncend');
      self.syncing = false;
    }
  });
};

module.exports = Camera;
