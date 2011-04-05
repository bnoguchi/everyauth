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
      .accepts('accessToken refreshToken')
      .promises('user')
    .step('compile')
      .accepts('accessToken refreshToken user')
      .promises('auth')
    .step('getSession')
      .accepts('req')
      .promises('session')
    .step('addToSession')
      .accepts('session')
      .promises(null)
    .step('sendResponse')
      .accepts('res')
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
  .compile( function (accessToken, refreshToken, user) {
    return {
        accessToken: accessToken
      , refreshToken: refreshToken
      , user: user
    };
  })
  .getSession( function (req) {
    return req.session;
  })
  .addToSession( function (session, auth) {
    var _auth = session.auth || (session.auth = {})
      , mod = _auth[this.name] || (_auth[this.name] = {});
    for (var k in auth) {
      mod[k] = auth[k];
    }
    // this._super() ?
  })
  .sendResponse( function (res) {
    res.redirect(this.redirectPath());
  })

// removeConfigurable
// removeStep
// undefinedSteps -> []
// How about module specific and more generic addToSession? Perhaps just do addToSession with null
