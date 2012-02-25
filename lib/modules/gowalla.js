var oauthModule = require('./oauth2')
  , rest = require('restler');

var gowalla = module.exports =
oauthModule.submodule('gowalla')
  .apiHost('https://api.gowalla.com')
  .oauthHost('https://gowalla.com')

  .authPath('/api/oauth/new')
  .accessTokenPath('https://api.gowalla.com/api/oauth/token')

  .entryPath('/auth/gowalla')
  .callbackPath('/auth/gowalla/callback')

  .accessTokenHttpMethod('post')
  .postAccessTokenParamsVia('data')
  .accessTokenParam('grant_type', 'authorization_code')

  .fetchOAuthUser( function (accessToken) {
    var promise = this.Promise();
    rest.get(this._apiHost + '/users/me', {
      query: { oauth_token: accessToken },
      headers: { 
        "X-Gowalla-API-Key": this.appId(),
        "Accept": "application/json"
      }
    }).on('success', function (data, res) {
      promise.fulfill(data);
    }).on('error', function (data, res) {
      promise.fail(data);
    });

    return promise;
  })

  .convertErr( function (data) {
    return new Error(data);
  });
