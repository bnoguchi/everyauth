var everyauth = require('../'),
    __pause = require('connect').utils.pause;

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

function fetchUserFromSession (req, res, next) {
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
      else delete sess.auth;
      next();
      pause.resume();
    });
}

module.exports = function (app, modules) {
  var everyauth = this,
      _module;
      
  // ensure we have modules
  modules = modules || everyauth.enabled;
  app.use(registerReqGettersAndMethods);
  app.use(fetchUserFromSession);
  
  // attach the routes for each of the enabled modules
  for (var _name in modules) {
    _module = modules[_name];
    _module.validateSteps();
    _module.routeApp(app);
  } // for
  
  app.dynamicHelpers({
      everyauth: function (req, res) {
        var ea = {}
          , sess = req.session;
        ea.loggedIn = sess.auth && !!sess.auth.loggedIn;

        // Copy the session.auth properties over
        var auth = sess.auth;
        for (var k in auth) {
          ea[k] = auth[k];
        }

        // Add in access to loginFormFieldName() and passwordFormFieldName()
        // TODO Don't compute this if we
        // aren't using password module
        ea.password || (ea.password = {});
        ea.password.loginFormFieldName = everyauth.password.loginFormFieldName();
        ea.password.passwordFormFieldName = everyauth.password.passwordFormFieldName();

        ea.user = req.user;

        return ea;
      }
    , user: function (req, res) {
        return req.user;
      }
  });
};
