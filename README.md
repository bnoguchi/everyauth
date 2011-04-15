everyauth
==========

Authentication and authorization (password, facebook, & more) for your node.js Connect and Express apps.

So far, `everyauth` enables you to login via:

- `password`
- `facebook`
- `twitter`
- `github`
- `instagram`
- `foursquare`
- `linkedin`

`everyauth` is:

- **Modular** - We have you covered with Facebook and Twitter 
  OAuth logins, basic login/password support, and modules 
  coming soon for beta invitation support and more.
- **Easily Configurable** - everyauth was built with powerful
  configuration needs in mind. Configure an authorization strategy 
  in a straightforward, easy-to-read & easy-to-write approach, 
  with as much granularity as you want over the steps and 
  logic of your authorization strategy.
- **Idiomatic** - The syntax for configuring and extending your authorization strategies are
  idiomatic and chainable.


## Installation
    $ npm install everyauth


## Quick Start
Using everyauth comes down to just 2 simple steps if using Connect
or 3 simple steps if using Express:

1. **Choose and Configure Auth Strategies** - Find the authentication strategy
   you desire in one of the sections below. Follow the configuration
   instructions.
2. **Add the Middleware to Connect**
        
        var everyauth = require('everyauth');
        // Step 1 code goes here
        
        // Step 2 code
        var connect = require('connect');
        var app = connect(
            connect.bodyParser()
          , connect.cookieParser()
          , connect.session({secret: 'mr ripley'})
          , everyauth.middleware()
          , connect.router(routes)
        );
3. **Add View Helpers to Express**
        
        // Step 1 code
        // ...
        // Step 2 code
        // ...
        
        // Step 3 code
        everyauth.helpExpress(app);
        
        app.listen(3000);

## Logging Out

If you integrate `everyauth` with `connect`, then `everyauth` automatically
sets up a `logoutPath` at `GET` `/logout` for your app. It also
sets a default handler for your logout route that clears your session
of auth information and redirects them to '/'.

To over-write the logout path:

    everyauth.everymodule.logoutPath('/bye');

To over-write the logout redirect path:

    everyauth.everymodule.logoutRedirectPath('/navigate/to/after/logout');

To over-write the logout handler:

    everyauth.everymodule.handleLogout( function (req, res) {
      // Put you extra logic here
      
      req.logout(); // The logout method is added for you by everyauth, too
      
      // And/or put your extra logic here
      
      res.writeHead(303, { 'Location': this.logoutRedirectPath() });
      res.end();
    });

## Setting up Facebook Connect

    var everyauth = require('everyauth')
      , connect = require('connect');
    
    everyauth.facebook
      .myHostname('http://localhost:3000')
      .appId('YOUR APP ID HERE')
      .appSecret('YOUR APP SECRET HERE')
      .findOrCreateUser( function (session, accessToken, fbUserMetadata) {
        // find or create user logic goes here
      })
      .redirectPath('/');
    
    var routes = function (app) {
      // Define your routes here
    };
    
    connect(
        connect.bodyParser()
      , connect.cookieParser()
      , connect.session({secret: 'whodunnit'})
      , everyauth.middleware()
      , connect.router(routes);
    ).listen(3000);

You can also configure more parameters (most are set to defaults) via
the same chainable API:
    
    everyauth.facebook
      .entryPath('/auth/facebook')
      .callbackPath('/auth/facebook/callback')
      .scope('email')                // Defaults to undefined

If you want to see what the current value of a
configured parameter is, you can do so via:

    everyauth.facebook.scope(); // undefined
    everyauth.facebook.entryPath(); // '/auth/facebook'

To see all parameters that are configurable, the following will return an
object whose parameter name keys map to description values:

    everyauth.facebook.configurable();


## Setting up Twitter OAuth

    var everyauth = require('everyauth')
      , connect = require('connect');
    
    everyauth.twitter
      .myHostname('http://localhost:3000')
      .consumerKey('YOUR CONSUMER ID HERE')
      .consumerSecret('YOUR CONSUMER SECRET HERE')
      .findOrCreateUser( function (session, accessToken, accessTokenSecret, twitterUserMetadata) {
        // find or create user logic goes here
      })
      .redirectPath('/');
    
    var routes = function (app) {
      // Define your routes here
    };
    
    connect(
        connect.bodyParser()
      , connect.cookieParser()
      , connect.session({secret: 'whodunnit'})
      , everyauth.middleware()
      , connect.router(routes);
    ).listen(3000);
      

## Setting up Password Authentication
    var everyauth = require('everyauth')
      , connect = require('connect');
    
    everyauth.password
      .getLoginPath('/login') // Page with the login form
      .postLoginPath('/login') // What you POST to
      .loginView('a string of html; OR the name of the jade/etc-view-engine view')
      .redirectPath('/') // Where to redirect to after a login
      .authenticate( function (login, password) {
        // Returns a user if we can authenticate with the login + password.
        // If we cannot, returns null/undefined
      });
    
    var routes = function (app) {
      // Define your routes here
    };
    
    connect(
        connect.bodyParser()
      , connect.cookieParser()
      , connect.session({secret: 'whodunnit'})
      , everyauth.middleware()
      , connect.router(routes);
    ).listen(3000);

## Setting up GitHub OAuth

    var everyauth = require('everyauth')
      , connect = require('connect');
    
    everyauth.github
      .myHostname('http://localhost:3000')
      .appId('YOUR CLIENT ID HERE')
      .appSecret('YOUR CLIENT SECRET HERE')
      .findOrCreateUser( function (session, accessToken, githubUserMetadata) {
        // find or create user logic goes here
      })
      .redirectPath('/');
    
    var routes = function (app) {
      // Define your routes here
    };
    
    connect(
        connect.bodyParser()
      , connect.cookieParser()
      , connect.session({secret: 'whodunnit'})
      , everyauth.middleware()
      , connect.router(routes);
    ).listen(3000);

You can also configure more parameters (most are set to defaults) via
the same chainable API:
    
    everyauth.github
      .entryPath('/auth/github')
      .callbackPath('/auth/github/callback')
      .scope('repo'); // Defaults to undefined
                      // Can be set to a combination of: 'user', 'public_repo', 'repo', 'gist'
                      // For more details, see http://develop.github.com/p/oauth.html

If you want to see what the current value of a
configured parameter is, you can do so via:

    everyauth.github.scope(); // undefined
    everyauth.github.entryPath(); // '/auth/github'

To see all parameters that are configurable, the following will return an
object whose parameter name keys map to description values:

    everyauth.github.configurable();

## Setting up Instagram OAuth

    var everyauth = require('everyauth')
      , connect = require('connect');
    
    everyauth.instagram
      .myHostname('http://localhost:3000')
      .appId('YOUR CLIENT ID HERE')
      .appSecret('YOUR CLIENT SECRET HERE')
      .findOrCreateUser( function (session, accessToken, instagramUserMetadata) {
        // find or create user logic goes here
      })
      .redirectPath('/');
    
    var routes = function (app) {
      // Define your routes here
    };
    
    connect(
        connect.bodyParser()
      , connect.cookieParser()
      , connect.session({secret: 'whodunnit'})
      , everyauth.middleware()
      , connect.router(routes);
    ).listen(3000);

You can also configure more parameters (most are set to defaults) via
the same chainable API:
    
    everyauth.instagram
      .entryPath('/auth/instagram')
      .callbackPath('/auth/instagram/callback')
      .scope('basic') // Defaults to 'basic'
                      // Can be set to a combination of: 'basic', 'comments', 'relationships', 'likes'
                      // For more details, see http://instagram.com/developer/auth/#scope
      .display(undefined); // Defaults to undefined; Set to 'touch' to see a mobile optimized version
                           // of the instagram auth page

If you want to see what the current value of a
configured parameter is, you can do so via:

    everyauth.instagram.callbackPath(); // '/auth/instagram/callback'
    everyauth.instagram.entryPath(); // '/auth/instagram'

To see all parameters that are configurable, the following will return an
object whose parameter name keys map to description values:

    everyauth.instagram.configurable();

## Setting up Foursquare OAuth

    var everyauth = require('everyauth')
      , connect = require('connect');
    
    everyauth.foursquare
      .myHostname('http://localhost:3000')
      .appId('YOUR CLIENT ID HERE')
      .appSecret('YOUR CLIENT SECRET HERE')
      .findOrCreateUser( function (session, accessToken, foursquareUserMetadata) {
        // find or create user logic goes here
      })
      .redirectPath('/');
    
    var routes = function (app) {
      // Define your routes here
    };
    
    connect(
        connect.bodyParser()
      , connect.cookieParser()
      , connect.session({secret: 'whodunnit'})
      , everyauth.middleware()
      , connect.router(routes);
    ).listen(3000);

You can also configure more parameters (most are set to defaults) via
the same chainable API:
    
    everyauth.foursquare
      .entryPath('/auth/foursquare')
      .callbackPath('/auth/foursquare/callback');

If you want to see what the current value of a
configured parameter is, you can do so via:

    everyauth.foursquare.callbackPath(); // '/auth/foursquare/callback'
    everyauth.foursquare.entryPath(); // '/auth/foursquare'

To see all parameters that are configurable, the following will return an
object whose parameter name keys map to description values:

    everyauth.foursquare.configurable();

## Setting up LinkedIn OAuth

    var everyauth = require('everyauth')
      , connect = require('connect');
    
    everyauth.linkedin
      .myHostname('http://localhost:3000')
      .consumerKey('YOUR CONSUMER ID HERE')
      .consumerSecret('YOUR CONSUMER SECRET HERE')
      .findOrCreateUser( function (session, accessToken, accessTokenSecret, linkedinUserMetadata) {
        // find or create user logic goes here
      })
      .redirectPath('/');
    
    var routes = function (app) {
      // Define your routes here
    };
    
    connect(
        connect.bodyParser()
      , connect.cookieParser()
      , connect.session({secret: 'whodunnit'})
      , everyauth.middleware()
      , connect.router(routes);
    ).listen(3000);


You can also configure more parameters (most are set to defaults) via
the same chainable API:
    
    everyauth.linkedin
      .entryPath('/auth/linkedin')
      .callbackPath('/auth/linkedin/callback');

If you want to see what the current value of a
configured parameter is, you can do so via:

    everyauth.linkedin.callbackPath(); // '/auth/linkedin/callback'
    everyauth.linkedin.entryPath(); // '/auth/linkedin'

To see all parameters that are configurable, the following will return an
object whose parameter name keys map to description values:

    everyauth.linkedin.configurable();

## Express Helpers

If you are using express, everyauth comes with some useful dynamic helpers.
To enable them:

    var express = require('express')
      , everyauth = require('everyauth')
      , app = express.createServer();
    
    everyauth.helpExpress(app);

Then, from within your views, you will have access to the following helpers methods
attached to the helper, `everyauth`:

- `everyauth.loggedIn`
- (more - we copy over req.session.auth keys/values to the everyauth helper)


## Configuring a Module

everyauth was built with powerful configuration needs in mind.

Every module comes with a set of parameters that you can configure
directly. To see a list of those parameters on a per module basis, 
with descriptions about what they do, enter the following into the 
node REPL (to access the REPL, just type `node` at the command line)

    > var ea = require('everyauth');
    > ea.facebook.configurable();

For example, you will see that one of the configuration parameters is
`moduleTimeout`, which is described to be `how long to wait per step
before timing out and invoking any timeout callbacks`

Every configuration parameter corresponds to a method of the same name
on the auth module under consideration (i.e., in this case
`ea.facebook`). To create or over-write that parameter, just
call that method with the new value as the argument:

    ea.facebook
      .moduleTimeout( 4000 ); // Wait 4 seconds before timing out any step
                              // involved in the facebook auth process

Configuration parameters can be scalars. But they can be anything. For
example, they can also be functions, too. The facebook module has a 
configurable step named `findOrCreateUser` that is described as 
"STEP FN [findOrCreateUser] function encapsulating the logic for the step
`fetchOAuthUser`.". What this means is that this configures the 
function (i.e., "FN") that encapsulates the logic of this step.

    ea.facebook
      .findOrCreateUser( function (session, accessToken, extra, oauthUser) {
        // find or create user logic goes here
      });

How do we know what arguments the function takes?
We elaborate more about step function configuration in our 
`Introspection` section below.


## Introspection

everyauth provides convenient methods and getters for finding out
about any module.

Show all configurable parameters with their descriptions:

    everyauth.facebook.configurable();

Show the value of a single configurable parameter:

    // Get the value of the configurable callbackPath parameter
    everyauth.facebook.callbackPath(); // => '/auth/facebook/callback'

Show the declared routes (pretty printed):

    everyauth.facebook.routes;

Show the steps initiated by a given route:

    everyauth.facebook.route.get.entryPath.steps; 
    everyauth.facebook.route.get.callbackPath.steps;

Sometimes you need to set up additional steps for a given auth
module, by defining that step in your app. For example, the
set of steps triggered when someone requests the facebook
module's `callbackPath` contains a step that you must define
in your app. To see what that step is, you can introspect
the `callbackPath` route with the facebook module.

    everyauth.facebook.route.get.callbackPath.steps.incomplete;
    // => [ { name: 'findOrCreateUser',
    //        error: 'is missing: its function' } ]

This tells you that you must define the function that defines the
logic for the `findOrCreateUser` step. To see what the function 
signature looks like for this step:

    var matchingStep =
    everyauth.facebook.route.get.callbackPath.steps.filter( function (step) {
      return step.name === 'findOrCreateUser';
    })[0];
    // { name: 'findOrCreateUser',
    //   accepts: [ 'session', 'accessToken', 'extra', 'oauthUser' ],
    //   promises: [ 'user' ] }

This tells you that the function should take the following 4 arguments:

    function (session, accessToken, extra, oauthUser) {
      ...
    }

And that the function should return a `user` that is a user object or
a Promise that promises a user object.

    function (session, accessToken, extra, oauthUser) {
      ...
      return { id: 'some user id', username: 'some user name' };
    }
    
    // OR
    
    function (session, accessToken, extra, oauthUser) {
      var promise = new everyauth.Promise();
      asyncFindUser( function (err, user) {
        if (err) return promise.fail(err);
        promise.fulfill(user);
      });
      return promise;
    }

You add this function as the block for the step `findOrCreateUser` just like
you configure any other configurable parameter in your auth module:

    everyauth.facebook
      .findOrCreateUser( function (session, accessToken, extra, oauthUser) {
        // Logic goes here
      });

There are also several other introspection tools at your disposal:

For example, to show the submodules of an auth module by name:

    everyauth.oauth2.submodules;


Other introspection tools to describe (explanations coming soon):

- *Invalid Steps*
        
        everyauth.facebook.routes.get.callbackPath.steps.invalid

## Modules and Projects that use everyauth

Currently, the following module uses everyauth. If you are using everyauth
in a project, app, or module, get in touch to get added to the list below:

- [mongoose-auth](https://github.com/bnoguchi/mongoose-auth) Authorization plugin
  for use with the node.js MongoDB orm.

### License
MIT License

---
### Author
Brian Noguchi
