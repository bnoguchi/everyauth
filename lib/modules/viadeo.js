var oauthModule = require('./oauth2')
  , rest = require('../restler');

var viadeo = module.exports =
oauthModule.submodule('viadeo')
  .apiHost('https://secure.viadeo.com')
  .oauthHost('https://secure.viadeo.com')

  .authPath("/oauth-provider/authorize2")
  .authQueryParam('response_type', 'code')

  .accessTokenPath('/oauth-provider/access_token2')
  .accessTokenParam('grant_type', 'authorization_code')
  .accessTokenHttpMethod('post')

  .entryPath('/auth/viadeo')
  .callbackPath('/auth/viadeo/callback')

  .fetchOAuthUser( function (accessToken) {
    var promise = this.Promise();
    rest.get('https://api.viadeo.com/me', {
      query: { access_token: accessToken }
    }).on('success', function (data, res) {
      promise.fulfill(data);
    }).on('error', function (data, res) {
      promise.fail(data);
    });
    return promise;
  })
