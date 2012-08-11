module.exports = function (app, opts) {
  var everyauth = this
    , helpers = {}
    , userAlias = opts && opts.userAlias || 'user';
  helpers.everyauth = function (req, res) {
    var ea = {}
      , sess = req.session;
    ea.loggedIn = sess.auth && !!sess.auth.loggedIn;

    // Copy the session.auth properties over
    var auth = sess.auth;
    for (var k in auth) {
      ea[k] = auth[k];
    }

    if (everyauth.enabled.password) {
      // Add in access to loginFormFieldName() + passwordFormFieldName()
      ea.password || (ea.password = {});
      ea.password.loginFormFieldName = everyauth.password.loginFormFieldName();
      ea.password.passwordFormFieldName = everyauth.password.passwordFormFieldName();
    }

    ea.user = req.user;

    return ea;
  };
  helpers[userAlias] = function (req, res) {
    return req.user;
  };
  app.dynamicHelpers(helpers);
};
