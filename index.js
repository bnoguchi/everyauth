var connect = require('connect')
  , everyauth = module.exports = {};

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
//      function (req, res, next) {
//        var methods = everyauth._req._sync._methods
//          , getters = everyauth._req._sync._getters;
//        for (var name in methods) {
//          req[name] = methods[name];
//        }
//        for (name in getters) {
//          Object.defineProperty(req, name, {
//            get: getters[name]
//          });
//        }
//        next();
//      }
      connect.router(function (app) {
        var modules = everyauth.modules
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
    _sync: {
        _methods: {}
      , _getters: {}
    }
  , _async: {
        _methods: {}
      , _getters: {}
    }
};
everyauth.addRequestMethod = function (name, fn, isAsync) {
  this._req['_' + (isAsync ? 'a' : '') + 'sync']._methods[name] = fn;
  return this;
};

everyauth.addRequestGetter = function (name, fn, isAsync) {
  this._req['_' + (isAsync ? 'a' : '') + 'sync']._getters[name] = fn;
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
['oauth', 'facebook'].forEach( function(name) {
  var mod =
  everyauth[name] =
  everyauth.modules[name] = require('./lib/' + name);

  // Make `everyauth` accessible from each 
  // auth strategy module
  mod.everyauth = everyauth;
});

