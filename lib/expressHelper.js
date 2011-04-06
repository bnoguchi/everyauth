module.exports = function (app) {
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
        return ea;
      }
    });
};
