var oauthModule = require('./oauth2')
  , querystring= require('querystring');

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
//    var url = this.apiHost() + '/2/users/show.json';

    var getUserIdUrl = this.apiHost() + "/2/account/get_uid.json?access_token={{access_token}}".replace("{{access_token", accessToken);
    var getUserInformationUrl = this.apiHost() + "/2/users/show.json?access_token={{access_token}}&uid={{uid}}";

    console.log("Access token: " + accessToken);
    console.log("Userid url: " + getUserIdUrl);

    // /2/account/get_uid.json?access_token=2.00txXjrCs_o9MBb60c455d077xyvgD

    // /2/users/show.json?access_token=2.00txXjrCs_o9MBb60c455d077xyvgD&uid=2626266797
    var oauth = this.oauth;
    oauth.get(getUserIdUrl, accessToken, function (err, data) {
      if (err) {
        return p.fail(err.error_message);
      }
      var uid = JSON.parse(data).uid;
      getUserInformationUrl = getUserInformationUrl
        .replace("{{access_token}}", accessToken)
        .replace("{{uid}}", uid);

      console.log("Userinfo url: " + getUserInformationUrl);

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
    console.log('handleAuthCallbackError');
  });
