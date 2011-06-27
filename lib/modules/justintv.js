<<<<<<< HEAD
var oauthModule = require('./oauth')
  , OAuth = require('oauth').OAuth;

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
=======
var oauthModule = require('./oauth');

var justintv = module.exports =
oauthModule.submodule('justintv')
>>>>>>> master

  .apiHost('http://api.justin.tv')
  .oauthHost('http://api.justin.tv')

<<<<<<< HEAD
  .requestTokenPath('/oauth/request_token')
  .authorizePath('/oauth/authorize')
  .accessTokenPath('/oauth/access_token')

=======
>>>>>>> master
  .entryPath('/auth/justintv')
  .callbackPath('/auth/justintv/callback')

  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var promise = this.Promise();
    this.oauth.get(this.apiHost() + '/api/account/whoami.json', accessToken, accessTokenSecret, function (err, data) {
      if (err) return promise.fail(err);
      var oauthUser = JSON.parse(data);
      return promise.fulfill(oauthUser);
    });
    return promise;
  });
