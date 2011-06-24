var oauthModule = require('./oauth')
  , OAuth = require('oauth').OAuth;

var vimeo = module.exports =
oauthModule.submodule('vimeo')
  .definit( function () {
    this.oauth = new OAuth(
        this.oauthHost() + this.requestTokenPath()
      , this.oauthHost() + this.accessTokenPath()
      , this.consumerKey()
      , this.consumerSecret()
      , '1.0', null, 'HMAC-SHA1', null
      );
  })

  .apiHost('http://vimeo.com/api/rest/v2')
  .oauthHost('http://vimeo.com')

  .requestTokenPath('/oauth/request_token')
  .authorizePath('/oauth/authorize')
  .accessTokenPath('/oauth/access_token')

  .entryPath('/auth/vimeo')
  .callbackPath('/auth/vimeo/callback')

  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var promise = this.Promise();
    this.oauth.get(this.apiHost() + '?format=json&method=vimeo.people.getInfo&user_id=' + accessTokenSecret, accessToken, accessTokenSecret, function (err, data) {
      if (err) return promise.fail(err);
      var oauthUser = JSON.parse(data);
      return promise.fulfill(oauthUser.person);
    });
    return promise;
  });
