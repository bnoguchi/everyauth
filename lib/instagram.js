var oauthModule = require('./oauth2')
  , Promise = require('./promise')
  , querystring= require('querystring')
  , rest = require('restler');

var instagram = module.exports =
oauthModule.submodule('instagram')
  .configurable({
      display: 'set to "touch" if you want users to see a mobile optimized version of the auth page'
    , scope: 'specify types of access (space separated if > 1): basic (default), comments, relationships, likes'
  })
  .oauthHost('https://api.instagram.com')
  .apiHost('https://api.instagram.com/v1')
  .entryPath('/auth/instagram')
  .callbackPath('/auth/instagram/callback')
  // Over-rides oauth's default getAuthUri to 
  // include Facebook's configurable scope parameter
  .getAuthUri( function (req, res) {
    var oauth = this.oauth
      , opts = {
            redirect_uri: this.myHostname() + this.callbackPath()
          , response_type: 'code'
        };
    if (this._display) opts.display = this.display();
    if (this._scope) opts.scope = this.scope();
    var authUri = oauth.getAuthorizeUrl(opts);

    // hack - remove 'type=web_server' from uri query that
    //        is added in by oauth npm module's oauth2 :P
    authUri = authUri.substring(0, authUri.length-16);
    return authUri;
  })
  .getTokens( function (code) {
    var p = new Promise();
    rest.post('https://api.instagram.com/oauth/access_token', {
        data: {
            code: code
          , redirect_uri: this.myHostname() + this.callbackPath()
          , grant_type: 'authorization_code'
          , client_id: this.oauth._clientId
          , client_secret: this.oauth._clientSecret
        }
    }).on('success', function (data, res) {
      p.fulfill(data.access_token, data.refresh_token);
    }).on('error', function (data, res) {
      p.fail(data);
    });
    return p;
  })
  .fetchOAuthUser( function (accessToken) {
    var p = new Promise();
    this.oauth.get(this.apiHost() + '/users/self', accessToken, function (err, data) {
      if (err) return p.fail(err);
      var oauthUser = JSON.parse(data).data;
      p.fulfill(oauthUser);
    })
    return p;
  });
