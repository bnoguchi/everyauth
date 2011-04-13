var oauthModule = require('./oauth2')
  , Promise = require('./promise');

var fb = module.exports =
oauthModule.submodule('facebook')
  .configurable({
      scope: 'specify types of access: See http://developers.facebook.com/docs/authentication/permissions/'
  })

  .apiHost('https://graph.facebook.com')
  .oauthHost('https://graph.facebook.com')

  .authPath('https://www.facebook.com/dialog/oauth')

  .entryPath('/auth/facebook')
  .callbackPath('/auth/facebook/callback')

  .authQueryParam('scope', function () {
    return this._scope && this.scope();
  })

  .fetchOAuthUser( function (accessToken) {
    var p = new Promise();
    this.oauth.get(this.apiHost() + '/me', accessToken, function (err, data) {
      if (err)
        return p.fail(err);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    })
    return p;
  })
  .convertErr( function (data) {
    return new Error(JSON.parse(data.data).error.message);
  });
