var everyModule = require('./everymodule')
  , oid = require('openid')
  , OAuth = require('oauth').OAuth
  , url = require('url');

var openid = module.exports =
everyModule.submodule('openid')
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
    this.relyingParty = new oid.RelyingParty(this.myHostname() + this.callbackPath(), null, false, false, [
      new oid.AttributeExchange({
        "http://axschema.org/contact/email": "required",
        "http://axschema.org/namePerson/first": "required",
        "http://axschema.org/namePerson/last": "required"
      })
    ]);
  })
  .get('entryPath',
       'the link a user follows, whereupon you redirect them to the 3rd party OAuth provider dialog - e.g., "/auth/twitter"')
    .step('sendToAuthenticationUri')
      .description('sends the user to the providers openid authUrl')
      .accepts('req res')
      .promises(null)
  .get('callbackPath',
       'the callback path that the 3rd party OAuth provider redirects to after an OAuth authorization result - e.g., "/auth/twitter/callback"')
    .step('verifyAttributes')
      .description('verifies the return attributes')
      .accepts('req res')
      .promises('userAttributes')
    .step('getSession')
      .accepts('req')
      .promises('session')
    .step('findOrCreateUser')
      .accepts('session userAttributes')
      .promises('user')
    .step('addToSession')
      .accepts('session user')
      .promises(null)
    .step('sendResponse')
      .accepts('res')
      .promises(null)
  .sendToAuthenticationUri(function(req,res) {
    this.relyingParty.authenticate('https://www.google.com/accounts/o8/id', false, function(authenticationUrl){
      if(authenticationUrl) {
        res.writeHead(302, { Location: authenticationUrl });
        res.end();
      }
    });
  })
  .getSession( function(req) {
    return req.session;
  })
  .verifyAttributes(function(req,res) {
    var p = this.Promise();
    this.relyingParty.verifyAssertion(req, function (userAttributes) {
      p.fulfill(userAttributes)
    });
    return p;
  })
  .addToSession( function (sess, user) {
    var _auth = sess.auth || (sess.auth = {})
      , mod = _auth[this.name] || (_auth[this.name] = {});
    _auth.loggedIn = true;
    _auth.userId = user.id;
    mod.user = user;
  })
  .sendResponse( function (res) {
    var redirectTo = this.redirectPath();
    if (!redirectTo)
      throw new Error('You must configure a redirectPath');
    res.writeHead(303, {'Location': redirectTo});
    res.end();
  })
  .entryPath('/auth/openid')
  .callbackPath('/auth/openid/callback');

// Defaults inherited by submodules
openid
  .requestTokenPath('/oauth/request_token')
  .authorizePath('/oauth/authorize')
  .accessTokenPath('/oauth/access_token');
