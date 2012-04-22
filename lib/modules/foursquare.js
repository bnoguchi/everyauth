var oauthModule = require('./oauth2')
  , request = require('request');

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
    var promise = this.Promise()
      , userUrl = this.apiHost() + '/users/self'
      , queryParams = { oauth_token: accessToken }
    request.get({ url: userUrl, qs: queryParams}, function (err, res, body) {
      if (err) {
        return promise.fail(err);
      }
      if (res.statusCode !== 200) {
        return promise.fail(body);
      }
      var oauthUser = JSON.parse(body).response.user;
      return promise.fulfill(oauthUser);
    });
    return promise;
  })

  .convertErr( function (data) {
    var errMsg = JSON.parse(data.data).meta.errorDetail;
    return new Error(errMsg);
  });
