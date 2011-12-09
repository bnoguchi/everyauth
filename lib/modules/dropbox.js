var oauthModule = require('./oauth');

var dropbox = module.exports =
oauthModule.submodule('dropbox')
  .apiHost('https://api.dropbox.com/1')
  .oauthHost('https://www.dropbox.com/1')
  .entryPath('/auth/dropbox')
  .callbackPath('/auth/dropbox/callback')
  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var p = this.Promise();
    this.oauth.get(this.apiHost() + '/account/info', accessToken, accessTokenSecret, function (err, data) {
      if (err) return p.fail(err);
      var oauthUser = JSON.parse(data);
      oauthUser.id = oauthUser.uid;
      p.fulfill(oauthUser);
    });
    return p;
  });
