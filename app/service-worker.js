'use strict';

function get(url) {
  // Return a new promise.
  return new Promise(function(resolve, reject) {
    // Do the usual XHR stuff
    var req = new XMLHttpRequest();
    req.open('GET', url);

    req.onload = function() {
      // This is called even on 404 etc
      // so check the status
      if (req.status == 200) {
        // Resolve the promise with the response text
        resolve(req.response);
      }
      else {
        // Otherwise reject with the status text
        // which will hopefully be a meaningful error
        reject(Error(req.statusText));
      }
    };

    // Handle network errors
    req.onerror = function() {
      reject(Error("Network Error"));
    };

    // Make the request
    req.send();
  });
};

function get_body(data) {
  if (data.syncing) {
    return "Transferring "+data.current+" ("+data.current_complete+"%) "+data.remaining+" batches remaining";
  } else {
    return "Not syncing";
  }
};

function get_title(data) {
  return "Photo sync";
}

self.addEventListener('push', function(event) {
  console.log('Received a push message', event);
  var title = 'Yay a message.';  
  var body = 'We have received a push message.';  
  var icon = '/images/icon-192x192.png';  
  var tag = 'simple-push-demo-notification-tag';

  event.waitUntil(
    get('/status.json').then(function(body) {
      var data = JSON.parse(body);
      return self.registration.showNotification(get_title(data), {
        body: get_body(data),
        icon: icon,
        tag: tag
      });
    })
  );
});