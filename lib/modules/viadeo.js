var oauthModule = require('./oauth2')
  , request = require('request');

var viadeo = module.exports =
oauthModule.submodule('viadeo')
  .apiHost('https://api.viadeo.com')
  .oauthHost('https://secure.viadeo.com')

  .entryPath('/auth/viadeo')
  .callbackPath('/auth/viadeo/callback')

  .authPath("/oauth-provider/authorize2")
  .authQueryParam('response_type', 'code')

  .accessTokenPath('/oauth-provider/access_token2')
  .accessTokenParam('grant_type', 'authorization_code')

  .fetchOAuthUser( function (accessToken) {
    var promise = this.Promise();
    request.get({
      url: 'https://api.viadeo.com/me',
      qs: { access_token: accessToken }
    }, function (err, res, body) {
      if (err) return promise.fail(err);
      if (parseInt(res.statusCode/100, 10) !== 2) {
        return promise.fail({extra: {data: body, res: res}});
      }
      promise.fulfill(JSON.parse(body));
    });
    return promise;
  });