var oauthModule = require('./oauth');

module.exports =
oauthModule.submodule('flickr')
  .apiHost('http://api.flickr.com/services/rest')
  .oauthHost('http://www.flickr.com/services/oauth')
  .entryPath('/auth/flickr')

  .requestTokenPath('/request_token')
  .accessTokenPath('/access_token')
  .authorizePath('/authorize')

  .callbackPath('/auth/flickr/callback')
  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var p = this.Promise();
    this.oauth.get(this.apiHost() + '?nojsoncallback=1&format=json&method=flickr.test.login', accessToken, accessTokenSecret, function (err, data) {
      if (err) { return p.fail(err); }
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    });
    return p;
  });
