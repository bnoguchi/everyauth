var oauthModule = require('./oauth')
  , Promise = require('./promise');

var twitter = module.exports =
oauthModule.submodule('twitter')
  .apiHost('https://api.twitter.com')
  .oauthHost('https://api.twitter.com')
  .entryPath('/auth/twitter')
  .callbackPath('/auth/twitter/callback')
  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var promise = new Promise();
    this.oauth.get(this.apiHost() + '/users/show.json?user_id=' + params.user_id, accessToken, accessTokenSecret, function (err, data) {
      if (err) return promise.fail(err);
      var oauthUser = JSON.parse(data);
      promise.fulfill(oauthUser);
    });
    return promise;
  })
