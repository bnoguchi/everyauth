var oauthModule = require('./oauth')
  , OAuth = require('oauth').OAuth;

var inspect = require('util').inspect, fs = require('fs');

var justintv = module.exports =
oauthModule.submodule('justintv')
  .definit( function () {
    this.oauth = new OAuth(
        this.oauthHost() + this.requestTokenPath()
      , this.oauthHost() + this.accessTokenPath()
      , this.consumerKey()
      , this.consumerSecret()
      , '1.0', null, 'HMAC-SHA1', null
      );
  })

  .apiHost('http://api.justin.tv')
  .oauthHost('http://api.justin.tv')

  .requestTokenPath('/oauth/request_token')
  .authorizePath('/oauth/authorize')
  .accessTokenPath('/oauth/access_token')

  .entryPath('/auth/justintv')
  .callbackPath('/auth/justintv/callback')

  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var promise = this.Promise();
    console.log(params, accessToken, accessTokenSecret);
    this.oauth.get(this.apiHost() + '/api/account/whoami.json', accessToken, accessTokenSecret, function (err, data) {
      if (err) return promise.fail(err);
      var oauthUser = JSON.parse(data);
      return promise.fulfill(oauthUser);
    });
    return promise;
  });
