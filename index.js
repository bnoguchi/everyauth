var connect = require('connect')
  , hooks = require('hooks');

var everyauth = module.exports = {};
for (var k in hooks) {
  everyauth[k] = hooks[k];
}
everyauth.connect = function () {
  var app = connect(
      function (req, res, next) {
        req.isAuth = everyauth.isAuth;
        req.logout = everyauth.logout;
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

everyauth.modules = {};
['facebook'].forEach( function(name) {
  var mod =
  everyauth[name] =
  everyauth.modules[name] = require('./lib/' + name);

  mod.everyauth = everyauth;
});

everyauth.isAuth = function () {
  var req = this;
  if (req.session.auth && req.session.auth.loggedIn) {
    return true;
  } else {
    return false;
  }
  // TODO
};

everyauth.logout = function () {
  var req = this;
  delete req.session.auth;
};
