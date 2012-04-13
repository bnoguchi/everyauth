var oauthModule = require('./oauth2')
  , querystring= require('querystring')
  , util = require('util');

var getUserIdUrlFormat ="%s/2/account/get_uid.json?access_token=%s";
var getUserInformationUrlFormat = "%s/2/users/show.json?access_token=%s&uid=%s";

var weibo = module.exports =
oauthModule.submodule('weibo')
  .configurable({
      display: ''
    , scope: ''
  })

  .oauthHost('https://api.weibo.com')
  .apiHost('https://api.weibo.com')

  .authPath('/oauth2/authorize')
  .accessTokenPath('/oauth2/access_token')

  .entryPath('/auth/weibo')
  .callbackPath('/auth/weibo/callback')

  .authQueryParam('response_type', 'code')
  .authQueryParam('display', function () {
    return this._display && this.display();
  })
  .authQueryParam('scope', function () {
    return this._scope && this.scope();
  })

  .accessTokenParam('grant_type', '')
  .postAccessTokenParamsVia('data')

  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise();
    var oauth = this.oauth;
    var apiHost = this.apiHost();
    var getUserIdUrl = util.format(getUserIdUrlFormat, apiHost, accessToken);

    oauth.get(getUserIdUrl, accessToken, function (err, data) {
      if (err) {
        return p.fail(err.error_message);
      }
      var uid = JSON.parse(data).uid;
      var getUserInformationUrl = util.format(getUserInformationUrlFormat, apiHost, accessToken, uid);

      oauth.get(getUserInformationUrl, accessToken, function (err, data) {
        if (err) {
          return p.fail(err.error_message);
        }
        var oauthUser = JSON.parse(data);
        p.fulfill(oauthUser);
      });
    });
    return p;
  })
  .convertErr( function (data) {
    return new Error(data.error_message);
  })
  .handleAuthCallbackError( function(req, req) {
    return new Error('Could not fulfill the authentication flow.');
  });
