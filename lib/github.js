var oauthModule = require('./oauth2')
  , Promise = require('./promise');

var github = module.exports =
oauthModule.submodule('github')
  .configurable({
      scope: 'specify types of access: (no scope), user, public_repo, repo, gist'
  })
  .oauthHost('https://github.com')
  .apiHost('https://github.com/api/v2/json')
  .authPath('/login/oauth/authorize')
  .accessTokenPath('/login/oauth/access_token')
  .entryPath('/auth/github')
  .callbackPath('/auth/github/callback')
  // Over-rides oauth's default getAuthUri to 
  // include Facebook's configurable scope parameter
  .getAuthUri( function (req, res) {
    var oauth = this.oauth
      , authUri = oauth.getAuthorizeUrl({
            redirect_uri: this.myHostname() + this.callbackPath()
          , scope: this.scope()});
    return authUri;
  })
  .fetchOAuthUser( function (accessToken) {
    var p = new Promise();
    this.oauth.get(this.apiHost() + '/user/show', accessToken, function (err, data) {
      if (err) return p.fail(err);
      var oauthUser = JSON.parse(data).user;
      p.fulfill(oauthUser);
    })
    return p;
  });
