var oauthModule = require('./oauth')
  , Parser = require('xml2js').Parser;

var t = module.exports =
oauthModule.submodule('tumblr')
  .apiHost('https://api.tumblr.com/v2')
  .oauthHost('https://www.tumblr.com')
  .entryPath('/auth/tumblr')
  .callbackPath('/auth/tumblr/callback')
  .sendCallbackWithAuthorize(false)
  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var promise = this.Promise();
    this.oauth.get(this.apiHost() + '/user/info', accessToken, accessTokenSecret, function (err, data) {
      if (err) return promise.fail(err);
      var oauthUser = JSON.parse(data);
      promise.fulfill(oauthUser);
    });
    return promise;
  })
  .convertErr( function (data) {
    return data.data;
  });
