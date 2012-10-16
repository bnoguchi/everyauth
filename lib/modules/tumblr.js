var oauthModule = require('./oauth')
  , url = require('url');

var tumblr = module.exports =
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
  .authCallbackDidErr( function (req) {
    var parsedUrl = url.parse(req.url, true);
    return !parsedUrl.query || !parsedUrl.query.oauth_token;
  })
  .handleAuthCallbackError( function (req, res) {
    if (res.render) {
      res.render(__dirname + '/../views/auth-fail.jade', {
        errorDescription: 'The user denied your request'
      });
    } else {
      // TODO Replace this with a nice fallback
      throw new Error("You must configure handleAuthCallbackError if you are not using express");
    }
  })
  .convertErr( function (data) {
    return new Error(data.data);
  });
