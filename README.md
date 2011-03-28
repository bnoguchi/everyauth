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

The basic flow of events is:

1. Request authentication
2. Authentication strategy calls back to the app via
   - `succeed`
   - `fail`
3. If `succeed`, then the strategy calls back to the app with
   credentials and possibly 3rd party user metadata (if configured, see below)
   and possibly the found or created user (if configured, see below).
    It is up to the app to decide what it wants to do with this information.
    Likely, you will want to store this information in a session.
4. If `fail`, then the strategy calls back to the app with the error.

Within an OAuth submodule, there are additional events relative to
`succeed`.
    fetchOAuthUserStep -> findOrCreateUserStep -> succeed

## General Auth Events
    everyauth.on('login', function (user) {
    });
    everyauth.on('logout', function (user) {
    });

## Facebook Auth
    var everyauth = require('everyauth')
      , connect = require('connect');

    // Easy chainable interface
    everyauth
      .facebook
        .appId('YOUR APP ID HERE')
        .appSecret('YOUR APP SECRET HERE')
        .myHostname('http://localhost:3000') // Note no trailing slash '/'
        .scope('email'); // Configurable scope

    // This anonymous function is invoked when Facebook OAuth succeeds
    eveyauth.facebook.hook('succeed', function (req, res, user, credentials, fbUserMetadata) {
      console.log(user); // The user retrieved from your database
      console.log(credentials.accessToken);
      console.log(credentials.refreshToken);
      console.log(fbUserMetadata);

      // You will want to save some of the function
      // parameters to the session. How you want to do it
      // is up to you.
      
      if (!req.loggedIn) {
        if (user) {
          // The user may not be logged in from a prior auth strategy (e.g., Twitter)
          res.writeHead(303, { Location: '/invite-facebook-friends' });
        } else {
          // The visitor has registered for the first time for your app via Facebook OAuth
          res.writeHead(303, { Location: '/app-tutorial' });
        }
      } else {
        // Or the user may already be logged in via another auth strategy
        res.writeHead(303, { Location: '/invite-facebook-friends' });
      }
      res.end();
    });

    // This anonymous function is invoked when Facebook OAuth fails
    eveyauth.facebook.hook('fail', function (req, res, err) {
      // You can write err to a flash notice if you want
      // or log it somewhere
      console.warn(err);
      res.writeHead(303, { Location: '/' });
      res.end();
    });
   
    // [Unimplemented] This anonymous function gets invoked when a user revokes
    // authorization for your app 
    everyauth.facebook.hook('revoke', function (req, res, err) {
    });

    var app = connect(
        connect.bodyParser()
      , connect.cookieParser()
      , connect.session()
      , everyauth.middleware() // everyauth gets inserted as connect middleware here
    );

    // You can introspect everyauth modules to see what routes they have added or will add
    console.log(everyauth.facebook.routes);


### Facebook Hooks

### Configuring Routes

By default, the facebook module comes with the following routes:

-   GET '/auth/facebook'
    When you click on a "Login with Facebook" link, it will take you to
    this uri. `everyauth` already has implemented the OAuth logic
    that happens after you GET '/auth/facebook'. If you would like
    to change the URI, you can do so via:
    
        var handler = everyauth.fb.routes.get['/auth/facebook'];
        delete everyauth.fb.routes.get['/auth/facebook'];
        everyauth.fb.GET('/some/new/uri/for/fb', handler);
    
    If you would like to change only the handler, you can do so via:
    
        everyauth.fb.GET('/auth/facebook', function (req, res) {
          // Your own custom logic here
        });
    
    If you would like to change the URI and the handler, then:
    
        delete everyauth.fb.routes.get['/auth/facebook'];
        everyauth.fb.GET('/some/new/uri/for/fb', function (req, res) {
        });

-   GET '/auth/facebook/callback'
    This is the callback URI that you provide to Facebook OAuth. When
    facebook is done with its OAuth logic, it redirects the user
    back to this callback.
    
    If you would like to change the URI, you can do so via:
    
        everyauth.fb.callbackUri('/auth/facebook/new_callback');

    // You can use introspection to remove routes to a module, too
    everyauth.facebook.routes['/some/new/path'] = function () {
    });

### Configuring Facebook Permissions Dynamically

It is recommended by Facebook that you only request
the permissions that you need at the time. So you may
start off requesting the default permissions and then
at a later point request more permissions. This implies
scope configuration that should vary dynamically based
on the current request session. Therefore, you can
specify a function that returns the appropriate scope
based on the current request:
    everyauth.facebook.scope( function (req) {
      if (req.session.additionalScopes)
        return req.session.additionalScopes;
    });

## Module Introspection

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
      .GET('/auth/facebook', function (req, res) {
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

1. Instantiate a new auth submodule.
2. Define the routes required as part of your authentication strategy.
3. Specify the relevant hooks that correspond to the steps of and state changes for
   the given authentication strategy.
4. Add any methods to the submodule configuration.

TODO Note differentiation between bound and descendant strategies when handling 'set.*' events

##

module.succeed -> everyauth.succeed
