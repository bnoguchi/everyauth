var everyModule = require('./everymodule')
  , url = require('url')
  , querystring = require('querystring')
  , rest = require('../restler')
  , Swt = require('swt')
  , xml2js = require('xml2js')
  , openId = require('openid')
  , extractHostname = require('../utils').extractHostname;

var azureacs = module.exports = 
everyModule.submodule('azureacs')
  .definit( function () {
  })
  .configurable({
      namespace      : ' the ACS namespace, e.g., myapp'
      , signingKey   : 'a 256-bit symmetric key for the namespace'
      , wtrealm      : 'the relying party application identifier, e.g., http://myapp.cloudapp.net'
      , redirectPath : 'the path to redirect once the user is authenticated'
      , tokenFormat  : 'the format used to parse the token'
      , whr          : 'the indentity provider'
      , authCallbackDidErr : 'Define the condition for the auth module determining if the auth callback url denotes a failure. Returns true/false.'
  })

  // Declares a GET route that is aliased
  // as 'entryPath'. The handler for this route
  // triggers the series of steps that you see
  // indented below it.
  .get('entryPath', 
       'the link a user follows, whereupon you redirect them to ACS url- e.g., "/auth/facebook"')          
    .step('getIdentityProviderSelectorUri')
      .accepts('req res')
      .promises('idenityProviderSelectorUri')
    .step('redirectToIdentityProviderSelector')
      .accepts('res idenityProviderSelectorUri')
      .promises(null)
      
  .post('callbackPath',
       'the callback path that the ACS redirects to after an authorization result - e.g., "/auth/facebook/callback"')
    .step('getToken')
      .description('retrieves a verifier code from the url query')
      .accepts('req res')
      .promises('token')
      .canBreakTo('authCallbackErrorSteps')
    .step('parseToken')
      .description('retrieves a verifier code from the url query')
      .accepts('req res token')
      .promises('claims')
      .canBreakTo('notValidTokenCallbackErrorSteps')
    .step('fetchUser')
      .accepts('claims')
      .promises('acsUser')
    .step('getSession')
      .accepts('req')
      .promises('session')      
    .step('findOrCreateUser')
      .accepts('session acsUser')
      .promises('user')
    .step('addToSession')
      .accepts('session acsUser token')
      .promises(null)
    .step('sendResponse')
      .accepts('res')
      .promises(null)

  .stepseq('authCallbackErrorSteps')
      .step('handleAuthCallbackError',
           'a request handler that intercepts a failed authorization message sent from the ACS provider to your service. e.g., the request handler for "/auth/facebook/callback?error_reason=user_denied&error=access_denied&error_description=The+user+denied+your+request."')
        .accepts('req res')
        .promises(null)

  .stepseq('notValidTokenCallbackErrorSteps')
      .step('handleNotValidTokenCallbackError',
           'the token is not valid"')
        .accepts('token')
        .promises(null)

  .getIdentityProviderSelectorUri( function (req, res) {
    if (this.whr() !== '')
    {
      return "https://" + this.namespace() + ".accesscontrol.windows.net/v2/wsfederation/?wtrealm=" + this.wtrealm() + "&wa=wsignin1.0&whr=" + this.whr();   
    }
    else
    {
      return "https://" + this.namespace() + ".accesscontrol.windows.net/v2/wsfederation/?wtrealm=" + this.wtrealm() + "&wa=wsignin1.0";
    } 
  })

  .redirectToIdentityProviderSelector( function (res, idenityProviderSelectorUri) {
    res.writeHead(303, {'Location': idenityProviderSelectorUri});
    res.end();
  })

  .getToken( function (req, res) {
    var promise = this.Promise();
    var parser = new xml2js.Parser();
    parser.on('end', function(result) {
      var str = result['t:RequestedSecurityToken']['wsse:BinarySecurityToken']['#'];
      var result = new Buffer(str, 'base64').toString('ascii');
      promise.fulfill(result);
    });
    parser.parseString(res.req.body['wresult']);
    if (this._authCallbackDidErr(req)) {
      return this.breakTo('authCallbackErrorSteps', req, res);
    }
    return promise;
  })

  .parseToken( function (req, res, token) {
    var swt = new Swt(token);
    if (!swt.isValid(token, this.wtrealm(), this.signingKey())) {
      return this.breakTo('notValidTokenCallbackErrorSteps', token);
    }
    return swt.claims;
  })

  .getSession( function (req) {
    return req.session;
  })

  .fetchUser( function (claims) {
     var user = {};
     user['id'] = 1;
     user['azureacs'] = claims;
     return user;
  })

  .addToSession( function (sess, acsUser, token) {
    var _auth = sess.auth || (sess.auth = {})
      , mod = _auth[this.name] || (_auth[this.name] = {});
    _auth.loggedIn = true;
    _auth.userId || (_auth.userId = acsUser.id);
    mod.user = acsUser;
    mod.accessToken = token; 
  })

  .sendResponse( function (res) {
    var redirectTo = this.redirectPath();
    if (!redirectTo)
      throw new Error('You must configure a redirectPath');
    res.writeHead(303, {'Location': redirectTo});
    res.end();
  })

  .authCallbackDidErr( function (req) {
    var parsedUrl = url.parse(req.url, true);
    return parsedUrl.query && !!parsedUrl.query.error;
  })

 .handleNotValidTokenCallbackError( function (token) {
    throw new Error("The token received is NOT valid");
  })

  .handleAuthCallbackError( function (req, res) {
    throw new Error("Authorization Error");
  })
