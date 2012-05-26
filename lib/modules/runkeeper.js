var oauthModule = require('./oauth2')
  , request = require('request');

var runkeeper = module.exports =
oauthModule.submodule('runkeeper')
  .configurable({
      scope: 'specify types of access: (no scope), non-expiring'
  })
  .apiHost('https://api.runkeeper.com')
  .oauthHost('https://runkeeper.com')
  .authPath('/apps/authorize')
  .accessTokenPath('/apps/token')
  .entryPath('/auth/runkeeper')
  .callbackPath('/auth/runkeeper/callback')
  .authQueryParam('response_type', 'code')
  .authQueryParam('scope', function () {
    return this._scope && this.scope();
  })
  .accessTokenHttpMethod('post')
  .postAccessTokenParamsVia('data')
  .accessTokenParam('grant_type', 'authorization_code')
  .fetchOAuthUser(function (accessToken) {
    console.log("Access Token: ", accessToken);
    var promise = this.Promise();
    request.get({
        url: this.apiHost() + '/user'
      , headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    }, function (err, res, body) {
      if (err) return promise.fail(err);
      if (parseInt(res.statusCode / 100, 10) !== 2) {
        return promise.fail(body);
      }
      return promise.fulfill(JSON.parse(body));
    });

    return promise;
  });
