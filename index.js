var connect = require('connect')
  , fs = require('fs')
  , __pause = connect.utils.pause;
  
var Everyauth = function Everyauth () {
  this._req = {
      _methods: {}
    , _getters: {}
  };

  this
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

  this.modules = {};
  this.enabled = {};

  // Grab all filenames in ./modules -- They correspond to the modules of the same name
  // as the filename (minus '.js')
  var files = fs.readdirSync(__dirname + '/lib/modules');
  var includeModules = files.map( function (fname) {
    return fname.substring(0, fname.length - 3);
  });
  for (var i = 0, l = includeModules.length; i < l; i++) {
    var name = includeModules[i];

    // Lazy enabling of a module via `everyauth` getters
    // i.e., the `facebook` module is not loaded into memory
    // until `everyauth.facebook` is evaluated
    Object.defineProperty(this, name, {
      get: (function (name) {
        return function () {
          var mod = this.modules[name] || (this.modules[name] = require('./lib/modules/' + name));
          // Make `everyauth` accessible from each auth strategy module
          if (!mod.everyauth) mod.everyauth = this;
          if (mod.shouldSetup)
            this.enabled[name] = mod;
          return mod;
        }
      })(name)
    });
  }
}

Everyauth.prototype = {
    Promise: require('./lib/promise')
  , helpExpress: require('./lib/expressHelper')
  , debug: false

    // The connect middleware
    // e.g.,
    //     connect(
    //         connect.bodyParser()
    //       , connect.cookieParser()
    //       , connect.session({secret: 'oreo'})
    //       , everyauth.middleware()
    //     )
  , middleware: function () {
      var everyauth = this;
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
        , function fetchUserFromSession (req, res, next) {
            var sess = req.session
              , auth = sess && sess.auth
              , everymodule, findUser;
            if (!auth) return next();
            if (!auth.userId) return next();
            everymodule = everyauth.everymodule;
            if (!everymodule._findUserById) return next();
            var pause = __pause(req);
            everymodule._findUserById(auth.userId, function (err, user) {
              if (err) throw err; // TODO Leverage everyauth's error handling
              if (user) req.user = user;
              next();
              pause.resume();
            });
          }
        , connect.router(function (app) {
            var modules = everyauth.enabled
              , _module;
            for (var _name in modules) {
              _module = modules[_name];
              _module.validateSteps();
              _module.routeApp(app);
            }
          })
      );
      return app;
    }
  , addRequestMethod: function (name, fn) {
      this._req._methods[name] = fn;
      return this;
    }
  , addRequestGetter: function (name, fn, isAsync) {
      this._req._getters[name] = fn;
      return this;
    }
};

var everyauth = exports = module.exports = new Everyauth();
exports.Everyauth = Everyauth;
