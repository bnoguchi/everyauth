var everyModule = require('./everymodule')
  , OAuth = require('oauth').OAuth2
  , url = require('url');

// Steps define a sequence of logic that pipes data through
// a chain of promises. A new chain of promises is generated
// every time the set of steps is started.

var oauth = module.exports = 
everyModule.submodule('oauth')
  .init( function () {
    this.oauth = new OAuth(this.appId(), this.appSecret(), this.apiHost());
  })
  .configurable('apiHost appId appSecret myHostname')
  .get('entryPath')
    .step('getAuthUri')
      .accepts('req res')
      .promises('authUri')
    .step('requestAuthUri')
      .accepts('res authUri')
      .promises(null)
  .get('callbackPath')
    .step('getCode')
      .accepts('req res')
      .promises('code')
    .step('getTokens')
      .accepts('code')
      .promises('accessToken refreshToken')
    .step('fetchOAuthUser')
      .accepts('accessToken refreshToken')
      .promises('user')
    .step('getSession')
      .accepts('req')
      .promises('session')
    .step('addToSession')
      .accepts('session')
      .promises(null)
    .step('compile')
      .accepts('accessToken refreshToken user')
      .promises('auth')
    .step('sendResponse')
      .accepts('req res auth')
      .promises(null)
  .getAuthUri( function (req, res) {
    var oauth = this._oauth
      , authUri = oauth.getAuthorizeUrl({
            redirect_uri: this._myHostname + this._callbackUri
          , scope: scope});
    return authUri;
  })
  .requestAuthUri( function (res, authUri) {
    res.writeHead(303, {'Location': authUri});
    res.end();
  })
  .getCode( function (req, res) {
    var parsedUrl = url.parse(req.url, true);
    return parsedUrl.query && parsedUrl.query.code;
  })
  .getTokens( function (code) {
    var p = new Promise();
    this.oauth.getOAuthAccessToken(code,
      {redirect_uri: this.myHostname() + this.callbackUri()},
      function (err, accessToken, refreshToken) {
        if (err) return p.error(err);
        p.fulfill(accessToken, refreshToken);
      });
    return p;
  })
  .getSession( function (req) {
    return req.session;
  })
  .compile( function (accessToken, refreshToken, user) {
    return {
        accessToken
      , refreshToken
      , user
    };
  });

// removeConfigurable
// removeStep
// undefinedSteps -> []
// How about module specific and more generic addToSession? Perhaps just do addToSession with null



var oauth = module.exports =
everyModule.submodule('oauth')
  .setters('apiHost entryUri callbackUri')
  .setupRoutes( function (mod, app) {
    app.get(mod._entryUri, mod.start('/auth/facebook'));
    // mod.start() creates a new instantiation of the promise chain
    // and returns the `trigger` of the first step
    app.get(mod._callbackUri, mod.start('auth/facebook/callback'));
  })
  // Define a sequence of steps named 'auth/facebook'
  .sequence('/auth/facebook')
    .step('requestAuthUri', function (substep) {
      substep('determineScope')
        .accepts('req res')
        .promises('scope')
        .define(fn)
        .error(fn);
      substep('generateAuthUri')
        .accepts('scope')
        .promises('authUri');
      substep('requestAuthUri')
        .accepts('authUri')
        .promises(null);
    })
    // reset vs bridge
    // bridge should create a hook for
    // instantiating a new chain of steps
  .sequence('/auth/facebook/callback')
    .step('retrieveCode')
      .accepts('req res')
      .promises('code')
    .step('retrieveAccessToken')
      .accepts('code')
      .promises('accessToken refreshToken')
    .step('getAuth')
      .accepts('accessToken refreshToken')
      .promises('auth');
    // define can define the step function
    // OR it can be the entry point for defining
    // the sub steps it is composed of
    .define( function (authRequest) {
      authRequest
    })
  .step('authCallback')
    .accepts('req res auth')
    .promises(null);

oauth.step('authRequest/determineScope').define( function (req, res) {
  var scope = this._scope;
  if ('function' === typeof scope) {
    return scope(req);
  }
  return scope;
});

oauth.step('authRequest/generateAuthUri').define( function (scope) {
  var oauth = this._oauth
    , authUri = oauth.getAuthorizeUrl({
          redirect_uri: this._myHostname + this._callbackUri
        , scope: scope});
  return authUri;
});

oauth.step('authRequest/retrieveCode').define( function (authUri) {
  var res = this.cache.res;
  res.writeHead(303, {'Location': authUri});
  res.end();
});


// How to add steps to a module or to a composed step

// Adds a series of steps
oauth.step('authCallback', function (step) {
  step('addCronJob');
});

// Adds a single step
oauth.step('authCallback');

// Over-rides a sequence of substeps
// composedOf vs override
oauth.step('authCallback').override(function (step) {
  step(...);
});

oauth.step('authCallback').order('...');

oauth.step('authCallback').addStep('addCronJob');

oauth.step('authCallback').steps.order(...);

oauth.step('authCallback').steps.add('addCronJob', {before: ''});

oauth.step('authCallback').steps.add('addCronJob', {after: ''});

