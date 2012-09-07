var oauthModule = require('./oauth')
  , Parser = require('xml2js').Parser;

var twitter = module.exports =
oauthModule.submodule('tumblr')
  .apiHost('http://api.tumblr.com/v2')
  .oauthHost('http://www.tumblr.com')
  .entryPath('/auth/tumblr')
  .callbackPath('/auth/tumblr/callback')
  .sendCallbackWithAuthorize(false)
  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var promise = this.Promise();
    this.oauth.get(this.apiHost() + '/user/info', accessToken, accessTokenSecret, function (err, data) {
      if (err) return promise.fail(err);
      
      try {
        data = JSON.parse(data);
        promise.fulfill(data.response.user);
      } catch (e) {
        promise.fail(e);
      }
    });

    return promise;
  })
  .convertErr( function (data) {
    return data.data;
  });
