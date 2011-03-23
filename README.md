everyauth
==========

Authentication and authorization (password, facebook, & more) for your node.js Connect and Express apps.

`everyauth` is:

- *Modular* - We have you covered with Facebook and Twitter logins, basic login/password
  support, and modules for beta invitation support and more.
- *Event-driven* - Applications each handle in their own unique way how they want to
  respond to successful or failed authorizations, logins, and logouts. We expose these
  events for you to empower you to handle these events exactly how you want to handle them.
- *Simple* - If you want to peek under the hood at its implementation, it is
  straightforward to figure out what is going on.

## Installation
    $ npm install everyauth

## Design

To implement a minimally complete authorization strategy, applications need to

- Set up a complete set of routes exposing the one or more steps involved for a given
  authorization strategy.
- Expose important events, general to authorization and specific to the given authorization
  strategy, so the developer can define exactly how (s)he wants the app to handle each event.

We encapsulate each authorization strategy along with its routing and event logic
into everyauth modules.

The module system provides an easy entry point for developers to include not only a mix of
authorization strategies but also a mix of other desired, rich authorization features such as:

- Registration confirmation
- Password recovery
- Lockouts after X failed logins
- Timeouts to logout a user who has not been active
- Tracking login activity
- Allowing the user to have rememberable sessions

## General Auth Events
    everyauth.on('logout', function (req, res) {
    });

## Facebook Auth
    var everyauth = require('everyauth')
      , connect = require('connect');

    var app = connect(
        connect.bodyParser()
      , connect.cookieParser()
      , connect.session()
    );

    everyauth
      .facebook
        .appId('')
        .appSecret('')
        .authTimeout(2000);

    everyauth.facebook.on('authorize.succeed', function (req, res, token) {
      if (!req.loggedIn) {
        everyauth.facebook.emit('login', req, res, fbData);
      } else {
        res.redirect('/invite-facebook-friends');
      }
    });

    everyauth.facebook.on('authorize.fail', function (req, res, err) {
    });
    
    everyauth.facebook.on('authorize.timeout', function (req, res) {
    });
    
    everyauth.facebook.on('revoke', function (req, res, err) {
    });

    everyauth(app);

    // You can introspect everyauth modules to see what routes they have added or will add
    console.log(everyauth.facebook.routes);

    // You can use introspection to add routes to a module, too
    everyauth.facebook.routes['/some/new/path'] = function () {
    });
    everyauth.refresh(); // Refresh to load new route into app

## Password Auth
    everyauth.password.on('authorize.succeed', function (req, res, accessToken) {
      if (!req.loggedIn) {
        everyauth.facebook.emit('login', req, res, fbData);
      } else {
        res.redirect('/invite-facebook-friends');
      }
    });

    everyauth.password.on('authorize.fail', function (req, res, err) {
    });
    
    everyauth(app);

## Twitter Auth
    everyauth
      .twitter
        .appId('')
        .appSecret('')
        .authTimeout(2000);

    everyauth.twitter.on('authorize.succeed', function (req, res, accessToken) {
    });

    everyauth.twitter.on('authorize.fail', function (req, res, err) {
    });
    
    everyauth.facebook.on('authorize.timeout', function (req, res) {
    });
    
    everyauth.facebook.on('revoke', function (req, res, err) {
    });

    everyauth(app);
