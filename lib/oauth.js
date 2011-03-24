var EveryModule = require('./everymodule')
  , OAuth = require('oauth').OAuth2
  , url = require('url');

// facebook, twitter, and other OAuth2-dependent modules
// inherit from this
var OAuthModule = module.exports = EveryModule.submodule({
    init: function (apiHost) {
      this._apiHost = apiHost;
    }
  , setters: 'appId appSecret authTimeout callbackUri'
  , on: {
        'set.callbackUri': function (uri) {
          var self = this;
          this.routes.get[uri] = function (req, res) {
            var parsedUrl = url.parse(req.url, true);
            if (parsedUrl.query && parsedUrl.query.code) {
              self.oauth.getOAuthAccessToken(parsedUrl.query.code, {redirect_uri: uri}, function (err, accessToken, refreshToken) {
                if (err) return self.emit('auth.fail', err);
                self.emit('oauth.access-token', req, accessToken, refreshToken);
                self.emit('auth.succeed', req, res);
              });
            }
          };
          if (this.oauthAccessTokenListener)
            this.removeListener('oauth.access-token', this.oauthAccessTokenListener);
          this.on('oauth.access-token', this.oauthAccessTokenListener = function (req, accessToken, refreshToken) {
            req.session['access_token'] = accessToken;
            if (refreshToken) req.session['refresh_token'] = refreshToken;
          });
        }
      , 'routeApp': function () {
          this.oauth = new OAuth(this._appId, this._appSecret, this._apiHost);
        }
    }
});

var oauthModule = module.exports = everyModule.submodule({
    setters: 'apiHost appId appSecret authTimeout callbackUri'
  , on: {
        'set.callbackUri': function (uri) {
          var self = this;
          this.routes.get[uri] = function (req, res) {
            var parsedUrl = url.parse(req.url, true);
            if (parsedUrl.query && parsedUrl.query.code) {
              self.oauth.getOAuthAccessToken(parsedUrl.query.code, {redirect_uri: uri}, function (err, accessToken, refreshToken) {
                if (err) return self.emit('auth.fail', err);
                self.emit('oauth.access-token', req, accessToken, refreshToken);
                self.emit('auth.succeed', req, res);
              });
            }
          };
          if (this.oauthAccessTokenListener)
            this.removeListener('oauth.access-token', this.oauthAccessTokenListener);
          this.on('oauth.access-token', this.oauthAccessTokenListener = function (req, accessToken, refreshToken) {
            req.session['access_token'] = accessToken;
            if (refreshToken) req.session['refresh_token'] = refreshToken;
          });
        }
      , 'routeApp': function () {
          this.oauth = new OAuth(this._appId, this._appSecret, this._apiHost);
        }
    }
});
