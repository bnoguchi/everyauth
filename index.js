var connect = require('connect')
  , hooks = require('hooks');

var everyauth = module.exports = {};

// Adds `hook`, `pre`, and `post` methods
// See https://github.com/bnoguchi/hooks-js/
for (var k in hooks) {
  everyauth[k] = hooks[k];
}

// The connect middleware
// e.g.,
//     connect(
//         connect.bodyParser()
//       , connect.cookieParser()
//       , connect.session({secret: 'oreo'})
//       , everyauth.connect()
//     )
everyauth.connect = function () {
  var app = connect(
      function (req, res, next) {
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
        var modules = everyauth.modules
          , _module;
        for (var _name in modules) {
          _module = modules[_name];
          _module.routeApp(app);
          _module.emit('start', _module);
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

everyauth.addRequestGetter = function (name, fn) {
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
['facebook'].forEach( function(name) {
  var mod =
  everyauth[name] =
  everyauth.modules[name] = require('./lib/' + name);

  // Make `everyauth` accessible from each 
  // auth strategy module
  mod.everyauth = everyauth;
});

