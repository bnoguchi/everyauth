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
  });
