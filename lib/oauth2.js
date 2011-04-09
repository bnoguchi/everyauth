var everyModule = require('./everymodule')
  , OAuth = require('oauth').OAuth2
  , url = require('url')
  , Promise = require('./promise');

// Steps define a sequence of logic that pipes data through
// a chain of promises. A new chain of promises is generated
// every time the set of steps is started.

var oauth = module.exports = 
everyModule.submodule('oauth2')
  .definit( function () {
    this.oauth = new OAuth(this.appId(), this.appSecret(), this.apiHost());
  })
  .configurable({
      apiHost: 'e.g., https://graph.facebook.com'
    , appId: 'the OAuth app id provided by the host'
    , appSecret: 'the OAuth secret provided by the host'
   ,  myHostname: 'e.g., http://local.host:3000 . Notice no trailing slash'
    , redirectPath: 'Where to redirect to after a failed or successful OAuth authorization'
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
      .accepts('req res')
      .promises('code')
    .step('getTokens')
      .accepts('code')
      .promises('accessToken refreshToken')
    .step('fetchOAuthUser')
      .accepts('accessToken')
      .promises('oauthUser')
    .step('getSession')
      .accepts('req')
      .promises('session')
    .step('findOrCreateUser')
      //.optional()
      .accepts('session accessToken oauthUser')
      .promises('user')
    .step('compile')
      .accepts('accessToken refreshToken oauthUser user')
      .promises('auth')
    .step('addToSession')
      .accepts('session auth')
      .promises(null)
    .step('sendResponse')
      .accepts('res')
      .promises(null)
  .getAuthUri( function (req, res) {
    var oauth = this.oauth
      , authUri = oauth.getAuthorizeUrl({
            redirect_uri: this.myHostname() + this.callbackPath()
        });
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
      {redirect_uri: this.myHostname() + this.callbackPath()},
      function (err, accessToken, refreshToken) {
        if (err) return p.fail(err);
        p.fulfill(accessToken, refreshToken);
      });
    return p;
  })
  .compile( function (accessToken, refreshToken, oauthUser, user) {
    return {
        accessToken: accessToken
      , refreshToken: refreshToken
      , oauthUser: oauthUser
      , user: user
    };
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
    if (auth.refreshToken) mod.refreshToken = auth.refreshToken;
    // this._super() ?
  })
  .sendResponse( function (res) {
    var redirectTo = this.redirectPath();
    if (!redirectTo)
      throw new Error('You must configure a redirectPath');
    res.writeHead(303, {'Location': redirectTo});
    res.end();
  })

// removeConfigurable
// removeStep
// undefinedSteps -> []
// How about module specific and more generic addToSession? Perhaps just do addToSession with null
