var connect = require('connect')
  , everyauth = module.exports = {};

everyauth.Promise = require('./lib/promise');

everyauth.helpExpress = require('./lib/expressHelper');

everyauth.debug = false;

// The connect middleware
// e.g.,
//     connect(
//         connect.bodyParser()
//       , connect.cookieParser()
//       , connect.session({secret: 'oreo'})
//       , everyauth.middleware()
//     )
everyauth.middleware = function () {
  var app = connect(
      function registerReqGettersAndMethods (req, res, next) {
        var methods = everyauth._req._methods
          , getters = everyauth._req._getters;
        for (var name in methods) {
          req[name] = methods[name];
        }
        for (name in getters) {
          Object.defineProperty(req, name, {
            get: getters[name]
          });
        }
        next();
      }
    , connect.router(function (app) {
        var modules = everyauth.enabled
          , _module;
        for (var _name in modules) {
          _module = modules[_name];
          _module.routeApp(app);
        }
      })
  );
  return app;
};

everyauth._req = {
    _methods: {}
  , _getters: {}
};
everyauth.addRequestMethod = function (name, fn) {
  this._req._methods[name] = fn;
  return this;
};

everyauth.addRequestGetter = function (name, fn, isAsync) {
  this._req._getters[name] = fn;
  return this;
};

everyauth
  .addRequestMethod('logout', function () {
    var req = this;
    delete req.session.auth;

  }).addRequestGetter('loggedIn', function () {
    var req = this;
    if (req.session.auth && req.session.auth.loggedIn) {
      return true;
    } else {
      return false;
    }
  });

everyauth.modules = {};
everyauth.enabled = {};
var includeModules = [['everymodule', false], ['password', true], ['oauth', false], ['twitter', true]
  , ['oauth2', false], ['facebook', true], ['github', true], ['instagram', true], ['foursquare', true]];

for (var i = 0, l = includeModules.length; i < l; i++) {
  var name = includeModules[i][0]
    , isRoutable = includeModules[i][1];
  Object.defineProperty(everyauth, name, {
    get: (function (name, isRoutable) {
      return function () {
        var mod = this.modules[name] || (this.modules[name] = require('./lib/' + name));
        // Make `everyauth` accessible from each 
        // auth strategy module
        mod.everyauth = this;
        if (isRoutable)
          this.enabled[name] = mod;
        return mod;
      }
    })(name, isRoutable)
  });
};

