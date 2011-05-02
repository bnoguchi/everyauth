var everyModule = require('./everymodule')
  , OAuth = require('oauth').OAuth
  , url = require('url');

var oauth = module.exports =
everyModule.submodule('oauth')
  .configurable({
      apiHost: 'e.g., https://api.twitter.com'
    , oauthHost: 'the host for the OAuth provider'
    , requestTokenPath: "the path on the OAuth provider's domain where we request the request token, e.g., /oauth/request_token"
    , accessTokenPath: "the path on the OAuth provider's domain where we request the access token, e.g., /oauth/access_token"
    , authorizePath: 'the path on the OAuth provider where you direct a visitor to login, e.g., /oauth/authorize'
    , consumerKey: 'the api key provided by the OAuth provider'
    , consumerSecret: 'the api secret provided by the OAuth provider'
    , myHostname: 'e.g., http://localhost:3000 . Notice no trailing slash'
    , redirectPath: 'Where to redirect to after a failed or successful OAuth authorization'
    , convertErr: 'a function (data) that extracts an error message from data arg, where `data` is what is returned from a failed OAuth request'
  })
  .definit( function () {
    this.oauth = new OAuth(
        this.oauthHost() + this.requestTokenPath()
      , this.oauthHost() + this.accessTokenPath()
      , this.consumerKey()
      , this.consumerSecret()
      , '1.0', null, 'HMAC-SHA1');
  })
  .get('entryPath',
       'the link a user follows, whereupon you redirect them to the 3rd party OAuth provider dialog - e.g., "/auth/twitter"')
    .step('getRequestToken')
      .description('asks OAuth Provider for a request token')
      .accepts('req res')
      .promises('token tokenSecret')
    .step('storeRequestToken')
      .description('stores the request token and secret in the session')
      .accepts('req token tokenSecret')
      .promises(null)
    .step('redirectToProviderAuth')
      .description('sends the user to authorization on the OAuth provider site')
      .accepts('res token')
      .promises(null)
  .get('callbackPath',
       'the callback path that the 3rd party OAuth provider redirects to after an OAuth authorization result - e.g., "/auth/twitter/callback"')
    .step('extractTokenAndVerifier')
      .description('extracts the request token and verifier from the url query')
      .accepts('req res')
      .promises('requestToken verifier')
    .step('getSession')
      .accepts('req')
      .promises('session')
    .step('rememberTokenSecret')
      .description('retrieves the request token secret from the session')
      .accepts('session')
      .promises('requestTokenSecret')
    .step('getAccessToken')
      .description('requests an access token from the OAuth provider')
      .accepts('requestToken requestTokenSecret verifier')
      .promises('accessToken accessTokenSecret params')
    .step('fetchOAuthUser')
      .accepts('accessToken accessTokenSecret params')
      .promises('oauthUser')
      .stepTimeout(8000)
    .step('findOrCreateUser')
      .accepts('session accessToken accessTokenSecret oauthUser')
      .promises('user')
    .step('compileAuth')
      .accepts('accessToken accessTokenSecret oauthUser user')
      .promises('auth')
    .step('addToSession')
      .accepts('session auth')
      .promises(null)
    .step('sendResponse')
      .accepts('res')
      .promises(null)
  .getRequestToken( function (req, res) {
    var p = this.Promise();
    this.oauth.getOAuthRequestToken( function (err, token, tokenSecret, authUrl, params) {
      if (err) return p.fail(err);
      p.fulfill(token, tokenSecret);
    });
    return p;
  })
  .storeRequestToken( function (req, token, tokenSecret) {
    var sess = req.session
      , _auth = sess.auth || (sess.auth = {})
      , _provider = _auth[this.name] || (_auth[this.name] = {});
    _provider.token = token;
    _provider.tokenSecret = tokenSecret;
  })
  .redirectToProviderAuth( function (res, token) {
    res.writeHead(303, { 'Location': this.oauthHost() + this.authorizePath() + '?oauth_token=' + token });
    res.end();
  })

  // Steps for GET `callbackPath`
  .extractTokenAndVerifier( function (req, res) {
    var parsedUrl = url.parse(req.url, true)
      , requestToken = parsedUrl.query && parsedUrl.query.oauth_token
      , verifier = parsedUrl.query && parsedUrl.query.oauth_verifier;
    return [requestToken, verifier];
  })
  .getSession( function(req) {
    return req.session;
  })
  .rememberTokenSecret( function (sess) {
    return sess.auth && sess.auth[this.name] && sess.auth[this.name].tokenSecret;
  })
  .getAccessToken( function (reqToken, reqTokenSecret, verifier) {
    var promise = this.Promise();
    this.oauth.getOAuthAccessToken(reqToken, reqTokenSecret, verifier, function (err, accessToken, accessTokenSecret, params) {
      if (err) return promise.fail(err);
      promise.fulfill(accessToken, accessTokenSecret, params);
    });
    return promise;
  })
  .compileAuth( function (accessToken, accessTokenSecret, oauthUser, user) {
    return {
        accessToken: accessToken
      , accessTokenSecret: accessTokenSecret
      , oauthUser: oauthUser
      , user: user
    };
  })
  .addToSession( function (sess, auth) {
    var _auth = sess.auth || (sess.auth = {})
      , mod = _auth[this.name] || (_auth[this.name] = {});
    _auth.loggedIn = true;
    _auth.userId || (_auth.userId = auth.user.id);
    mod.user = auth.oauthUser;
    mod.accessToken = auth.accessToken;
    mod.accessTokenSecret = auth.accessTokenSecret;
    // this._super() ?
  })
  .sendResponse( function (res) {
    var redirectTo = this.redirectPath();
    if (!redirectTo)
      throw new Error('You must configure a redirectPath');
    res.writeHead(303, {'Location': redirectTo});
    res.end();
  });

// Defaults inherited by submodules
oauth
  .requestTokenPath('/oauth/request_token')
  .authorizePath('/oauth/authorize')
  .accessTokenPath('/oauth/access_token');
