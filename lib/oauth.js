var EventEmitter = require('events').EventEmitter
  , OAuth = require('oauth').OAuth2
  , url = require('url');

// facebook, twitter, and other OAuth2-dependent modules
// inherit from this
var OAuthModule = module.exports = function (apiHost) {
  EventEmitter.call(this);
  this._apiHost = apiHost;
  this.routes = {get: {}, post: {}};
};

OAuthModule.prototype.__proto__ = EventEmitter.prototype;

OAuthModule.prototype.appId = function (appId) {
  this._appId = appId;
  return this;
};

OAuthModule.prototype.appSecret = function (appSecret) {
  this._appSecret = appSecret;
  return this;
};

OAuthModule.prototype.authTimeout = function (timeout) {
  this._authTimeout = timeout;
  return this;
};

OAuthModule.prototype.callbackUri = function (uri) {
  var self = this;
  this._callbackUri = uri;
  this.routes.get[callbackUri] = function (req, res) {
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
  return this;
};

OAuthModule.prototype.routeApp = function (app) {
  this.oauth = new OAuth(this._appId, this._appSecret, this._apiHost);
  for (var method in this.routes) {
    for (var route in this.routes[method]) {
      app[method](route, this.routes[method][route]);
    }
  }
};
