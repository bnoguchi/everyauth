var oauthModule = require('./oauth2')
  , querystring= require('querystring');

var meetup = module.exports =
oauthModule.submodule('meetup')

  .oauthHost('https://secure.meetup.com')
  .apiHost('https://api.meetup.com/2')

  .entryPath('/auth/meetup')
  .callbackPath('/auth/meetup/callback')

  .authPath('/oauth2/authorize')
  .authQueryParam('response_type', 'code')

  .accessTokenHttpMethod('post')
  .accessTokenPath('/oauth2/access')
  .postAccessTokenParamsVia('data')
  .accessTokenParam('grant_type', 'authorization_code')

  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise();
    this.oauth.get(this.apiHost() + '/member/self', accessToken, function (err, data) {
      if (err) return p.fail(err.error_message);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    })
    return p;
  })
  .convertErr( function (data) {
    return new Error(data.error_message);
  });
