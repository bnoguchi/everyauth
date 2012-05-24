var oauthModule = require('./oauth2')
  , querystring= require('querystring');

var smarterer = module.exports =
oauthModule.submodule('smarterer')
  .oauthHost('https://smarterer.com')
  .apiHost('https://smarterer.com')

  .entryPath('/auth/smarterer')
  .callbackPath('/auth/smarterer/callback')

  .authQueryParam('callback_url', function() {
    return this._myHostname + this._callbackPath;
  })

  .accessTokenParam('grant_type', 'authorization_code')


  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise();
    this.oauth.get(this.apiHost() + '/api/badges', accessToken, function (err, data) {
      if (err) return p.fail(err.error_message);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    })
    return p;
  })
  .convertErr( function (data) {
    return new Error(data.error_message);
  });
