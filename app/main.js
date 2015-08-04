window.addEventListener('load',function() {
  console.log("Loaded");
  if ('serviceWorker' in navigator) {  
    navigator.serviceWorker.register('/service-worker.js').then(initialiseState);  
  } else {  
    console.warn('Service workers aren\'t supported in this browser.');  
  }
});

function initialiseState() {  
  console.log(navigator.serviceWorker);
  // Are Notifications supported in the service worker?  
  if (!('showNotification' in ServiceWorkerRegistration.prototype)) {  
    console.warn('Notifications aren\'t supported.');  
    return;  
  }

  // Check the current Notification permission.  
  // If its denied, it's a permanent block until the  
  // user changes the permission  
  if (Notification.permission === 'denied') {  
    console.warn('The user has blocked notifications.');  
    return;  
  }

  // Check if push messaging is supported  
  if (!('PushManager' in window)) {  
    console.warn('Push messaging isn\'t supported.');  
    return;  
  }

  // We need the service worker registration to check for a subscription  
  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {  
    console.log("Registered worker");
    // Do we already have a push message subscription?  
    serviceWorkerRegistration.pushManager.getSubscription()  
      .then(function(subscription) {  
        console.log(subscription);
        // Enable any UI which subscribes / unsubscribes from  
        // push messages.  
        // var pushButton = document.querySelector('.js-push-button');  
        // pushButton.disabled = false;

        if (!subscription) {  
          // We aren't subscribed to push, so set UI  
          // to allow the user to enable push  
          return;  
        }
        
        // Keep your server in sync with the latest subscriptionId
        sendSubscriptionToServer(subscription);

        // Set your UI to show they have subscribed for  
        // push messages  
        // pushButton.textContent = 'Disable Push Messages';  
        // isPushEnabled = true;  
      })  
      .catch(function(err) {  
        console.warn('Error during getSubscription()', err);  
      });  
  });  
};

function sendSubscriptionToServer(subscription) {
  console.log(subscription.endpoint);
};

function subscribe() {

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true})
      .then(function(subscription) {
        console.log(subscription);
        // The subscription was successful
        isPushEnabled = true;

        pushButton.textContent = 'Disable Push Messages';
        pushButton.disabled = false;

        // TODO: Send the subscription subscription.endpoint
        // to your server and save it to send a push message
        // at a later date
        return sendSubscriptionToServer(subscription);
      })
      .catch(function(e) {
        if (Notification.permission === 'denied') {
          console.log('Permission for Notifications was denied');
        } else {
          console.error(e);
        }
      });
  });
};