var everyModule = require('./everymodule');

var password = module.exports =
everyModule.submodule('password')
  .configurable({
      loginFormFieldName: 'the name of the login field. Same as what you put in your login form '
               + '- e.g., if <input type="text" name="username" />, then loginFormFieldName '
               + 'should be set to "username".'
    , passwordFormFieldName: 'the name of the login field. Same as what you put in your login form '
               + '- e.g., if <input type="password" name="pswd" />, then passwordFormFieldName '
               + 'should be set to "pswd".'
    , loginView: 'Either (A) the name of the view (e.g., "login.jade") or (B) the HTML string ' +
                 'that corresponds to the login page OR (C) a function (errors, login) {...} that returns the HTML string incorporating the array of `errors` messages and the `login` used in the prior attempt'
    , loginSuccessRedirect: 'The path we redirect to after a successful login.'
    , registerView: 'Either the name of the view (e.g., "register.jade") or the HTML string ' +
                 'that corresponds to the register page.'
    , registerSuccessRedirect: 'The path we redirect to after a successful registration.'
  })
  .loginFormFieldName('login')
  .passwordFormFieldName('password')

  .get('getLoginPath', "the login page's uri path.")
    .step('displayLogin')
      .accepts('req res')
      .promises(null)
  .displayLogin( function (req, res) {
    if (res.render) {
      res.render(this.loginView(), {login: null});
    } else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(this.loginView());
    }
  })

  .post('postLoginPath', "the uri path that the login POSTs to. Same as the 'action' field of the login <form />.")
    .step('extractLoginPassword')
      .accepts('req res')
      .promises('login password')
    .step('authenticate')
      .accepts('login password req res')
      .promises('userOrErrors')
    .step('interpretUserOrErrors')
      .description('Pipes the output of the step `authenticate` into either the `user` or `errors` param')
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
    .step('respondToLoginSucceed') // TODO Rename to maybeRespondToLoginSucceed ?
      .description('Execute a HTTP response for a successful login')
      .accepts('res user')
      .promises(null)
    .step('respondToLoginFail')
      .description('Execute a HTTP response for a failed login')
      .accepts('res errors login')
      .promises(null)
  .extractLoginPassword( function (req, res) {
    return [req.body[this.loginFormFieldName()], req.body[this.passwordFormFieldName()]];
  })
  .interpretUserOrErrors( function (userOrErrors) {
    if (Array.isArray(userOrErrors)) {
      return [null, userOrErrors]; // We have an array of errors
    } else {
      return [userOrErrors, []]; // We have a user
    }
  })
  .getSession( function (req) {
    return req.session;
  })
  .addToSession( function (sess, user, errors) {
    var _auth = sess.auth || (sess.auth = {});
    if (user)
      _auth.userId = user.id;
    _auth.loggedIn = !!user;
  })
  .respondToLoginSucceed( function (res, user) {
    if (user) {
      res.writeHead(303, {'Location': this.loginSuccessRedirect()});
      res.end();
    }
  })
  .respondToLoginFail( function (res, errors, login) {
    if (!errors || !errors.length) return;
    if (res.render) {
      res.render(this.loginView(), { 
          errors: errors 
        , login: login
      });
    } else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      if ('function' === typeof this.loginView()) {
        res.end(this.loginView()(errors, login));
      } else {
        res.end(this.loginView());
      }
    }
  })

  .get('getRegisterPath', "the registration page's uri path.")
    .step('displayRegister')
      .accepts('req res')
      .promises(null)
  .displayRegister( function (req, res) {
    var userParams = {};
    if (res.render) {
      res.render(this.registerView(), {userParams: userParams});
    } else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(this.registerView());
    }
  })

  .post('postRegisterPath', "the uri path that the registration POSTs to. Same as the 'action' field of the registration <form />.")
    .step('extractLoginPassword') // Re-used (/search for other occurence)
    .step('extractExtraRegistrationParams')
      .description('Extracts additonal query or body params from the ' + 
                   'incoming request and returns them in the `extraParams` object')
      .accepts('req')
      .promises('extraParams')
    .step('aggregateParams')
      .description('Combines login, password, and extraParams into a newUserAttributes Object containing everything in extraParams plus login and password key/value pairs')
      .accepts('login password extraParams')
      .promises('newUserAttributes')
    .step('validateRegistration')
      .description('Validates the registration parameters. Default includes check for existing user')
      .accepts('newUserAttributes')
      .promises('errors')
    .step('maybeBreakToRegistrationFailSteps')
      .accepts('req res errors newUserAttributes')
      .promises(null)
      .canBreakTo('registrationFailSteps')
    .step('registerUser')
      .description('Creates and returns a new user with newUserAttributes')
      .accepts('newUserAttributes')
      .promises('user')
    .step('getSession')
    .step('addToSession')
    .step('respondToRegistrationSucceed')
      .accepts('res user')
      .promises(null)
  .extractExtraRegistrationParams( function (req) {
    return {};
  })
  .aggregateParams( function (login, password, extraParams) {
    var params = extraParams;
    params.login = login;
    params.password = password;
    return params;
  })
  .validateRegistration( function (newUserAttributes) {
    var login = newUserAttributes.login
      , password = newUserAttributes.password
      , errors = [];
    if (!login) errors.push('Missing login');
    if (!password) errors.push('Missing password');
    return errors;
  })
  .maybeBreakToRegistrationFailSteps( function (req, res, errors, newUserAttributes) {
    var user;
    if (errors && errors.length) {
      user = newUserAttributes;
      delete user.password;
      return this.breakTo('registrationFailSteps', req, res, errors, user);
    }
  })
  .respondToRegistrationSucceed( function (res, user) {
    res.writeHead(303, {'Location': this.registerSuccessRedirect()});
    res.end();
  })

  .stepseq('registrationFailSteps')
    .step('respondToRegistrationFail')
      .accepts('req res errors newUserAttributes')
      .promises(null)
  .respondToRegistrationFail( function (req, res, errors, newUserAttributes) {
    res.render(this.registerView(), {
        errors: errors
      , userParams: newUserAttributes
    });
  });
