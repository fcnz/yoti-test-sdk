# Yoti SDK test

This is a small app that demonstrates the usage of the Yoti Node.js SDK

### Usage

To run the app:
* Clone and navigate to this repository
* Run $ npm install
* Run $ node index.js
* Navigate to https://localhost:7362 in your favourite browser

The only dependency is a relatively recent Node.js version (The Yoti SDK specifies > 8.x but the application code should be compatible back to 6.14 according to node green)

Once the app is open, you will find 7 randomly generated, fake posts. You can add posts as an anonymous user right away or login with Yoti to post as yourself. Restarting the node server will reset a new set of 7 randomly generated posts. Refreshing the page will log you out.
