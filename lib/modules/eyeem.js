var oauthModule = require('./oauth2');

module.exports = oauthModule.submodule('eyeem')
  .oauthHost('https://www.eyeem.com')
  .apiHost('https://www.eyeem.com/api/v2')
  .entryPath('/auth/eyeem')
  .callbackPath('/auth/eyeem/callback')
  .authQueryParam('response_type', 'code')
  .accessTokenPath('/api/v2/oauth/token')
  .accessTokenParam('grant_type', 'authorization_code')

  .fetchOAuthUser( function (accessToken) {
    var promise = this.Promise();

    this.oauth.get(this.apiHost() + '/users/me', accessToken, function (err, data) {
      var oauthUser;

      if (err) return promise.fail(err.error_message);

      oauthUser = JSON.parse(data).user;
      promise.fulfill(oauthUser);
    });
    return promise;
  });
