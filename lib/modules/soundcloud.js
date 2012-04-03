var oauthModule = require('./oauth2')
  , rest = require('restler');

var soundcloud = module.exports =
oauthModule.submodule('soundcloud')
  .configurable({
      scope: 'specify types of access: (no scope), non-expiring'
    , display: 'specify type of auth dialog: (no display), popup'
  })
  .apiHost('https://api.soundcloud.com')
  .oauthHost('https://api.soundcloud.com')
  .authPath('/connect')
  .accessTokenPath('/oauth2/token')
  .entryPath('/auth/soundcloud')
  .callbackPath('/auth/soundcloud/callback')
  .authQueryParam('response_type', 'code')
  .authQueryParam('scope', function () {
    return this._scope && this.scope();
  })
  .authQueryParam('display', function () {
    return this._display && this.display();
  })
  .accessTokenHttpMethod('post')
  .postAccessTokenParamsVia('data')
  .accessTokenParam('grant_type', 'authorization_code')
  .fetchOAuthUser(function (accessToken) {
    var promise = this.Promise();
    rest.get(this._apiHost + '/me', {
      query: { oauth_token: accessToken }
    }).on('success', function (data, res) {
      promise.fulfill(data);
    }).on('error', function (data, res) {
      promise.fail(data);
    });

    return promise;
  });
