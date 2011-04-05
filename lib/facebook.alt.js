var oauthModule = require('./oauth');

var fb = module.exports =
oauthModule.submodule('facebook')
  .apiHost('https://graph.facebook.com')
  .configurable('scope')
  .entryPath('/auth/facebook')
  .callbackPath('/auth/facebook/callback')
  .fetchOAuthUser( function (accessToken) {
    this.oauth.getProtectedResource(this.apiHost() + '/me', accessToken, function (err, data, response) {
      if (err) return p.error(err);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    })
  })

var fb = module.exports =
oauthModule.submodule('facebook')
  // TODO submodule should
  // set fb.name = 'facebook'
  .apiHost('https://graph.facebook.com')
  .setters('scope')
  .routeStep('authRequest')
    .uri('/auth/facebook')
  .step('authRequest')
    .accepts('req res abc')
    .returns('*')
    .get('/auth/facebook')
    // Should be able to access module
    // properties from within a step
    // definition
  .step('authCallback')
    .get('/auth/facebook/callback')
  .step('addToSession')
    .define( function (sess, auth) {

    })
