var oauthModule = require('./oauth');

var fb = module.exports =
oauthModule.submodule('facebook')
  .apiHost('https://graph.facebook.com')
  .configurable('scope')
  .entryPath('/auth/facebook')
  .callbackPath('/auth/facebook/callback')
  // Over-ride oauth's default getAuthUri to include Facebook's
  // configurable scope parameter
  .getAuthUri( function (req, res) {
    var oauth = this.oauth
      , authUri = oauth.getAuthorizeUrl({
            redirect_uri: this.myHostname() + this.callbackUri()
          , scope: this.scope()});
    return authUri;
  })
  .fetchOAuthUser( function (accessToken) {
    this.oauth.getProtectedResource(this.apiHost() + '/me', accessToken, function (err, data, response) {
      if (err) return p.error(err);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    })
  });
