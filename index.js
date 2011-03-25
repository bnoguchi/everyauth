var connect = require('connect');

var everyauth = module.exports = function () {
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
          if (_module._cachedPreFetchUser)
            _module.pre('succeed', _module._cachedPreFetchUser);
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
  if (req.session.access_token) {
    return true;
  } else {
    return false;
  }
  // TODO
};

everyauth.logout = function () {
  var req = this;
  delete req.session.access_token;
};
