var connect = require('connect');

var everyauth = module.exports = function () {
  var app = connect(
      function (req, res, next) {
        req.isAuth = everyauth.isAuth;
        next();
      }
    , connect.router(function (app) {
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

everyauth.modules = {};
['facebook'].forEach( function(name) {
  everyauth[name] =
  everyauth.modules[name] = require('./lib/' + name);
});

everyauth.isAuth = function () {
  // TODO
  return false;
};
