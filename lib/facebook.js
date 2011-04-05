var oauthModule = require('./oauth')
  , Promise = require('./promise');

var fb = module.exports =
oauthModule.submodule('facebook')
  .configurable('scope')
  .apiHost('https://graph.facebook.com')
  .entryPath('/auth/facebook')
  .callbackPath('/auth/facebook/callback')
  // Over-ride oauth's default getAuthUri to include Facebook's
  // configurable scope parameter
  .getAuthUri( function (req, res) {
    var oauth = this.oauth
      , authUri = oauth.getAuthorizeUrl({
            redirect_uri: this.myHostname() + this.callbackPath()
          , scope: this.scope()});
    return authUri;
  })
  .fetchOAuthUser( function (accessToken) {
    var p = new Promise();
    this.oauth.getProtectedResource(this.apiHost() + '/me', accessToken, function (err, data, response) {
      if (err) return p.error(err);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    })
    return p;
  });
