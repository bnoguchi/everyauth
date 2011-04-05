var everyModule = require('./everymodule')
  , OAuth = require('oauth').OAuth2
  , url = require('url');

// Steps define a sequence of logic that pipes data through
// a chain of promises. A new chain of promises is generated
// every time the set of steps is started.

var oauth = module.exports = 
everyModule.submodule('oauth')
  .definit( function () {
    this.oauth = new OAuth(this.appId(), this.appSecret(), this.apiHost());
  })
  .configurable('apiHost appId appSecret myHostname redirectPath')
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
        if (err) return p.error(err);
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

    var _auth = session.auth || (session.auth = {})
      , mod = _auth[this.name] || (_auth[this.name] = {});
    _auth.loggedIn = true;
    for (var k in auth) {
      mod[k] = auth[k];
    }
    // this._super() ?
  })
  .sendResponse( function (res) {
    var redirectTo = this.redirectPath();
    if (!redirectTo)
      throw new Error('You must configure a redirectPath');
    res.writeHead(303, redirectTo);
    res.end();
  })

// removeConfigurable
// removeStep
// undefinedSteps -> []
// How about module specific and more generic addToSession? Perhaps just do addToSession with null
