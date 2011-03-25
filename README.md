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
- *Easily Configurable* - everyauth was built with powerful configuration needs in mind. One
  of the problems I found with existing `connect` solutions was that it offered configurability
  from options, but if you wanted to do anything more you had to dig into source and fork the
  codebase. `everyauth` allows you to over-ride specific hooks so that you can configure it to
  your auth needs.
- *Idiomatic* - The syntax for configuring and extending your authorization strategies are
  idiomatic and chainable.

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

In addition to adding routes and exposing events at the auth strategy level, at a global level
`everyauth` adds helper methods to the incoming `request` to check the request auth status 
(authorized, unauthorized, logged in, logged out) and to access the user associated with the
request.

## General Auth Events
    everyauth.on('login', function (user) {
    });
    everyauth.on('logout', function (user) {
    });

## Facebook Auth
    var everyauth = require('everyauth')
      , connect = require('connect');

    everyauth
      .facebook
        .appId('')
        .appSecret('')
        .myHostname('http://localhost:3000');

    everyauth.facebook.pre('succeed', function (req, res, uid, credentials, info) {
    });
    
    eveyauth.facebook.hook('succeed', function (req, res, uid, credentials, info) {
    });

    eveyauth.facebook.hook('fail', function (req, res, err) {
    });

    everyauth.facebook.on('oauth.access-token', function (req, accessToken, refreshToken) {
      console.log(accessToken);
      console.log(refreshToken);
      everyauth.facebook.oauth.getProtectedResource(everyauth.facebook._apiHost + '/me', accessToken, function (err, data, res) {
      });
    });
    
    everyauth.facebook.on('auth.succeed', function (req, res) {
      if (!req.loggedIn) {
        everyauth.facebook.emit('login', req, res, fbData);
      } else {
        res.redirect('/invite-facebook-friends');
      }
    });

    everyauth.facebook.on('auth.fail', function (req, res, err) {
    });
    
    everyauth.facebook.on('revoke', function (req, res, err) {
    });

    var app = connect(
        connect.bodyParser()
      , connect.cookieParser()
      , connect.session()
      , everyauth()
    );

    // You can introspect everyauth modules to see what routes they have added or will add
    console.log(everyauth.facebook.routes);

    // You can use introspection to add routes to a module, too
    everyauth.facebook.routes['/some/new/path'] = function () {
    });
    everyauth.refresh(); // Refresh to load new route into app

## OAuth Submodule Defaults

The Facebook module is a submodule of the OAuth module, which
comes with certain defaults. You can over-ride the following
defaults.
    everyauth.facebook
      .fetchOAuthUser(true);

Moreover, the Facebook module itself has the following
defaults, which you can also over-ride:
    everyauth.facebook
      .apiHost('https://graph.facebook.com')
      .callbackUri('/auth/facebook/callback')
      .get('/auth/facebook', function (req, res) {
        var fb = everyauth.facebook
          , authorizeUri = fb.oauth.getAuthorizeUrl({redirect_uri: fb._myHostname + fb._callbackUri, scope: 'email'});
        res.writeHead(303, { 'Location': authorizeUri });
        res.end();
      });

## Password Auth
    everyauth.password.on('auth.succeed', function (req, res) {
      if (!req.loggedIn) {
        everyauth.facebook.emit('login', req, res, fbData);
      } else {
        res.redirect('/invite-facebook-friends');
      }
    });

    everyauth.password.on('auth.fail', function (req, res, err) {
    });
    
    everyauth(app);

## Twitter Auth
    everyauth
      .twitter
        .appId('')
        .appSecret('');

    everyauth.twitter.on('auth.succeed', function (req, res, accessToken) {
    });

    everyauth.twitter.on('auth.fail', function (req, res, err) {
    });
    
    everyauth.facebook.on('revoke', function (req, res, err) {
    });

    everyauth(app);

## Creating Your Own Custom Authentication Strategies
Creating your own authentication strategies is a straightforward process.
You only need to:

1. Instantiate a new EveryModule or EveryModule subclass.
2. Define the routes required as part of your authentication strategy.
3. Specify the events you want exposed and the ones that require
   listeners.
4. Add any methods to the module instance for configuration.

TODO Note differentiation between bound and descendant strategies when handling 'set.*' events
