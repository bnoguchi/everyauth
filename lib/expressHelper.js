module.exports = function (app) {
  var everyauth = this;
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
