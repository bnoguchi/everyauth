var oauthModule = require('./oauth2');

module.exports =
oauthModule.submodule('37signals')
  .configurable({
      scope: 'specify types of access: (no scope), user, public_repo, repo, gist'
  })

  .oauthHost('https://launchpad.37signals.com')
  .apiHost('https://launchpad.37signals.com')

  .authPath('/authorization/new')
  .authQueryParam('type', 'web_server')

  .accessTokenPath('/authorization/token')
  .accessTokenParam('type', 'web_server')

  .postAccessTokenParamsVia('data')

  .entryPath('/auth/37signals')
  .callbackPath('/auth/37signals/callback')

  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise();
    this.oauth.get(this.apiHost() + '/authorization.json', accessToken, function (err, data) {
      if (err) return p.fail(err);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    })
    return p;
  })
  
  .convertErr( function (err) {
    return new Error(err.data);
  });
