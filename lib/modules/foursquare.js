var oauthModule = require('./oauth2')
  , rest = require('../restler');

var foursquare = module.exports =
oauthModule.submodule('foursquare')
  .apiHost('https://api.foursquare.com/v2')
  .oauthHost('https://foursquare.com')

  .authPath('/oauth2/authenticate')
  .accessTokenPath('/oauth2/access_token')

  .entryPath('/auth/foursquare')
  .callbackPath('/auth/foursquare/callback')

  .authQueryParam('response_type', 'code')

  .accessTokenHttpMethod('get')
  .accessTokenParam('grant_type', 'authorization_code')

  .fetchOAuthUser( function (accessToken) {
    var promise = this.Promise();
    rest.get(this.apiHost() + '/users/self', {
      query: { oauth_token: accessToken }
    }).on('success', function (data, res) {
      var oauthUser = data.response.user;
      promise.fulfill(oauthUser);
    }).on('error', function (data, res) {
      promise.fail(data);
    });
    return promise;
  })

  .convertErr( function (data) {
    var errMsg = JSON.parse(data.data).meta.errorDetail;
    return new Error(errMsg);
  });
