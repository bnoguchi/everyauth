var oauthModule = require('./oauth2');
var rest = require('../restler');

var dwolla = module.exports =
oauthModule.submodule('dwolla')
  .configurable({
    scope: 'specify types of access: accountinfofull|request|contacts|balance|send|transactions'
  })

  .oauthHost('https://www.dwolla.com')
  .apiHost('https://www.dwolla.com/oauth/rest')

  .authPath('/oauth/v2/authenticate')
  .accessTokenPath('/oauth/v2/token')
  .accessTokenParam('grant_type', 'authorization_code')

  .entryPath('/auth/dwolla')
  .callbackPath('/auth/dwolla/callback')

  .authQueryParam('scope', function () {
    return this._scope && this.scope();
  })

  .authQueryParam('response_type', 'code')

  .fetchOAuthUser( function (accessToken) {
    var promise = this.Promise();
    rest.get(this.apiHost() + '/accountapi/accountinformation', {
      query: { oauth_token: accessToken, alt: 'json' }
    }).on('success', function (data, res) {
      var oauthUser = data;
      promise.fulfill(oauthUser);
    }).on('error', function (data, res) {
      promise.fail(data);
    });
    return promise;
  });
