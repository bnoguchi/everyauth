var everyModule = require('./everymodule')
  , OAuth = require('oauth').OAuth2
  , url = require('url')
  , querystring = require('querystring')
  , Promise = require('./promise')
  , rest = require('restler');

// Steps define a sequence of logic that pipes data through
// a chain of promises. A new chain of promises is generated
// every time the set of steps is started.

var oauth2 = module.exports = 
everyModule.submodule('oauth2')
  .definit( function () {
    this.oauth = new OAuth(this.appId(), this.appSecret(), this.oauthHost(), this.authPath(), this.accessTokenPath());
  })
  .configurable({
      apiHost: 'e.g., https://graph.facebook.com'
    , oauthHost: 'the host for the OAuth provider'
    , appId: 'the OAuth app id provided by the host'
    , appSecret: 'the OAuth secret provided by the host'
    , authPath: "the path on the OAuth provider's domain where " + 
                "we direct the user for authentication, e.g., /oauth/authorize"
    , accessTokenPath: "the path on the OAuth provider's domain " + 
                "where we request the access token, e.g., /oauth/access_token"
    , postAccessTokenParamsVia: '"query" to POST the params to the access ' + 
                'token endpoint as a querysting; "data" to POST the params to ' +
                'the access token endpoint in the request body'
    , myHostname: 'e.g., http://local.host:3000 . Notice no trailing slash'
    , redirectPath: 'Where to redirect to after a failed or successful OAuth authorization'
    , convertErr: 'a function (data) that extracts an error message from data arg, where `data` is what is returned from a failed OAuth request'
  })

  // Declares a GET route that is aliased
  // as 'entryPath'. The handler for this route
  // triggers the series of steps that you see
  // indented below it.
  .get('entryPath', 
       'the link a user follows, whereupon you redirect them to the 3rd party OAuth provider dialog - e.g., "/auth/facebook"')          
    .step('getAuthUri')
      .accepts('req res')
      .promises('authUri')
    .step('requestAuthUri')
      .accepts('res authUri')
      .promises(null)
  .get('callbackPath',
       'the callback path that the 3rd party OAuth provider redirects to after an OAuth authorization result - e.g., "/auth/facebook/callback"')
    .step('getCode')
      .description('retrieves a verifier code from the url query')
      .accepts('req res')
      .promises('code')
    .step('getAccessToken')
      .accepts('code')
      .promises('accessToken extra')
    .step('fetchOAuthUser')
      .accepts('accessToken')
      .promises('oauthUser')
    .step('getSession')
      .accepts('req')
      .promises('session')
    .step('findOrCreateUser')
      //.optional()
      .accepts('session accessToken extra oauthUser')
      .promises('user')
    .step('compile')
      .accepts('accessToken extra oauthUser user')
      .promises('auth')
    .step('addToSession')
      .accepts('session auth')
      .promises(null)
    .step('sendResponse')
      .accepts('res')
      .promises(null)
  .getAuthUri( function (req, res) {
    var params = {
            client_id: this.appId()
          , redirect_uri: this.myHostname() + this.callbackPath()
        }
      , authPath = this.authPath()
      , url = (/^http/.test(authPath))
            ? authPath
            : (this.oauthHost() + authPath)
      , additionalParams = this.moreAuthQueryParams;
    
    if (additionalParams) for (var k in additionalParams) {
      params[k] = additionalParams[k];
    }
    return url + '?' + querystring.stringify(params);
  })
  .requestAuthUri( function (res, authUri) {
    res.writeHead(303, {'Location': authUri});
    res.end();
  })
  .getCode( function (req, res) {
    var parsedUrl = url.parse(req.url, true);
    return parsedUrl.query && parsedUrl.query.code;
  })
  .getAccessToken( function (code) {
    var p = new Promise()
      , params = {
            client_id: this.appId()
          , redirect_uri: this.myHostname() + this.callbackPath()
          , code: code
          , client_secret: this.appSecret()
        }
      , url = this.oauthHost() + this.accessTokenPath()
      , additionalParams = this.moreAccessTokenParams;

    if (additionalParams) for (var k in additionalParams) {
      params[k] = additionalParams[k];
    }

    var opts = {};
    opts[this.postAccessTokenParamsVia()] = params;
    rest.post(url, opts)
      .on('success', function (data, res) {
        if ('string' === typeof data) {
          data = querystring.parse(data);
        }
        var aToken = data.access_token;
        delete data.access_token;
        p.fulfill(aToken, data);
      }).on('error', function (data, res) {
        p.fail(data);
      });
    return p;
  })
  .compile( function (accessToken, extra, oauthUser, user) {
    var compiled = {
        accessToken: accessToken
      , oauthUser: oauthUser
      , user: user
    };
    // extra is any extra params returned by the
    // oauth provider in response to the access token
    // POST request
    for (var k in extra) {
      compiled[k] = extra[k];
    }
    return compiled;
  })
  .getSession( function (req) {
    return req.session;
  })
  .addToSession( function (sess, auth) {
//    if (!sess.auth) sess.auth = {};
//    if (!sess.auth.userId) sess.auth.userId = user.id;
//    if (!sess.auth.fb) sess.auth.fb = {};
//    if (!sess.auth.fb.user) sess.auth.fb.user = fbData;
//    sess.auth.fb.access_token = cred.accessToken;
//    if (cred.refreshToken) sess.auth.fb.refresh_token = cred.refreshToken;

    var _auth = sess.auth || (sess.auth = {})
      , mod = _auth[this.name] || (_auth[this.name] = {});
    _auth.loggedIn = true;
    mod.user = auth.oauthUser;
    mod.accessToken = auth.accessToken;
    // this._super() ?
  })
  .sendResponse( function (res) {
    var redirectTo = this.redirectPath();
    if (!redirectTo)
      throw new Error('You must configure a redirectPath');
    res.writeHead(303, {'Location': redirectTo});
    res.end();
  });

oauth2.moreAuthQueryParams = {};
oauth2.moreAccessTokenParams = {};
oauth2.cloneOnSubmodule.push('moreAuthQueryParams', 'moreAccessTokenParams');

oauth2
  .authPath('/oauth/authorize')
  .accessTokenPath('/oauth/access_token')
  .postAccessTokenParamsVia('query');

// Add or over-write existing query params that
// get tacked onto the oauth authorize url.
oauth2.authQueryParam = function (key, val) {
  if (arguments.length === 1 && key.constructor == Object) {
    for (var k in key) {
      this.authQueryParam(k, key[k]);
    }
    return this;
  }
  if ('function' === typeof val)
    val = val();
  if (val)
    this.moreAuthQueryParams[key] = val;
  return this;
};

// Add or over-write existing params that
// get sent with the oauth access token request.
oauth2.accessTokenParam = function (key, val) {
  if (arguments.length === 1 && key.constructor == Object) {
    for (var k in key) {
      this.accessTokenParam(k, key[k]);
    }
    return this;
  }
  if ('function' === typeof val)
    val = val();
  if (val)
    this.moreAccessTokenParams[key] = val;
  return this;
};

// removeConfigurable
// removeStep
// undefinedSteps -> []
// How about module specific and more generic addToSession? Perhaps just do addToSession with null
