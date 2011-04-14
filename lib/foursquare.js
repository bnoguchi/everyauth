var oauthModule = require('./oauth2')
  , Promise = require('./promise');

var foursquare = module.exports =
oauthModule.submodule('foursquare')
  .apiHost('https://api.foursquare.com/v2')
  .oauthHost('https://foursquare.com')

  .authPath('/oauth2/authenticate')
  .accessTokenPath('/oauth2/access_token')

  .entryPath('/auth/foursquare')
  .callbackPath('/auth/foursquare/callback')

  .authQueryParam('response_type', 'code')

  .accessTokenParam('grant_type', 'authorization_code')

  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var promise = new Promise();
    this.oauth.get(this.apiHost() + '/users/self', accessToken, accessTokenSecret, function (err, data) {
      if (err) return promise.fail(err);
      var oauthUser = JSON.parse(data).response.user;
      promise.fulfill(oauthUser);
    });
    return promise;
  })
