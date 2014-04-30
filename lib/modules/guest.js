var everyModule = require('./everymodule');

var guestModule = module.exports =
everyModule.submodule('guest')
  .configurable({
    redirectPath: 'Where to redirect to after a failed or successful OAuth authorization'
  })
  .get('entryPath',
    'the link a user follows to initiate authorization')
    .step('getGuestId')
      .description('Retrieves guest id - if any - from the request')
      .accepts('req res')
      .promises('guestId')
    .step('createOrVerifyGuest')
      .description('Creates a new guest account or validates an existing one')
      .accepts('guestId req')
      .promises('userOrErrors')
    .step('interpretUserOrErrors')
      .description('Pipes the output of the previous step into either the `user` or `errors`')
      .accepts('userOrErrors')
      .promises('user errors')
    .step('getSession')
      .description('Retrieves the session of the incoming request and returns in')
      .accepts('req')
      .promises('session')
    .step('addToSession')
      .description('Adds the user to the session')
      .accepts('session user errors')
      .promises(null)
    .step('maybeLoginSucceed')
      .description('Execute a HTTP response for a successful login')
      .accepts('res user')
      .promises(null)
    .step('maybeLoginFail')
      .description('Execute a HTTP response for a failed login')
      .accepts('req res errors')
      .promises(null)
  .entryPath('/auth/guest')
  .getGuestId(function(req, res) {
    return (req.query && req.query.login) || null;
  })
  .getSession( function(req) {
    return req.session;
  })
  .addToSession( function (sess, user, errors) {
    var _auth = sess.auth || {};
    if (!sess.auth) {
      sess.auth = _auth;
    }
    if (user) {
      _auth.userId = user.id;
    }
    _auth.loggedIn = !!user;
  })
  .interpretUserOrErrors( function (userOrErrors) {
    if (Array.isArray(userOrErrors)) {
      return [null, userOrErrors]; // We have an array of errors
    } else {
      return [userOrErrors, []]; // We have a user
    }
  })
  .maybeLoginSucceed( function (res, user) {
    if (user) {
      this.redirect(res, this.redirectPath());
    }
  })
  .maybeLoginFail( function (req, res, errors, login) {
    if (errors && errors.length) {
      if (res.render) {
        res.render(__dirname + '/../views/auth-fail.jade', {
          errorDescription: errors[0]
        });
      } else {
        throw new Error("You must configure maybeLoginFail if you are not using express");
      }
    }
  });
