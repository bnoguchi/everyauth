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
    , loginView: 'Either the name of the view (e.g., "login.jade") or the HTML string ' +
                 'that corresponds to the login page.'
    , registerView: 'Either the name of the view (e.g., "register.jade") or the HTML string ' +
                 'that corresponds to the register page.'
    , redirectPath: 'The path we redirect to after a login attempt.'
  })
  .loginFormFieldName('login')
  .passwordFormFieldName('password')
  .get('getLoginPath', "the login page's uri path.")
    .step('displayLogin')
      .accepts('req res')
      .promises(null)

  .post('postLoginPath', "the uri path that the login POSTs to. Same as the 'action' field of the login <form />.")
    .step('extractLoginPassword')
      .accepts('req res')
      .promises('login password')
    .step('authenticate')
      .accepts('login password')
      .promises('user')
    .step('getSession')
      .accepts('req')
      .promises('session')
    .step('addToSession')
      .accepts('session user')
      .promises(null)
    .step('sendResponse')
      .accepts('res user')
      .promises(null)
  .displayLogin( function (req, res) {
    if (res.render) {
      res.render(this.loginView());
    } else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(this.loginView());
    }
  })
  .extractLoginPassword( function (req, res) {
    return [req.body[this.loginFormFieldName()], req.body[this.passwordFormFieldName()]];
  })
  .getSession( function (req) {
    return req.session;
  })
  .addToSession( function (sess, user) {
    var _auth = sess.auth || (sess.auth = {});
    if (user)
      _auth.userId = user.id;
    _auth.loggedIn = !!user;
  })
  .sendResponse( function (res, user) {
    res.writeHead(303, {'Location': this.redirectPath()});
    res.end();
  })
  .get('getRegisterPath', "the registration page's uri path.")
    .step('displayRegister')
      .accepts('req res')
      .promises(null)
  .displayRegister( function (req, res) {
    if (res.render) {
      res.render(this.registerView());
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
    .step('validateRegistration')
      .description('Validates the registration parameters. Default includes check for existing user')
      .accepts('login password extraParams req res')
      .promises('newUserAttributes')
      .canBreakTo('registrationError') // canGoTo
    .step('registerUser')
      .description('Creates and returns a new user with newUserAttributes')
      .accepts('newUserAttributes')
      .promises('user')
    .step('getSession')
    .step('addToSession')
    .step('sendResponse')
  .extractExtraRegistrationParams( function (req) {
    return {};
  })
  .validateRegistration( function (login, password, extraParams, req, res) {
    if (login && password) return { login: login, password: password };
    else return this.breakTo('registrationError', req, res, 'Missing login and/or password');
  })

  .stepseq('registrationError')
    .step('handleRegistrationError')
      .accepts('req res errorMessage')
      .promises(null)
  .handleRegistrationError( function (req, res, errorMessage) {
    res.render(this.registerView(), {
      errorMessage: errorMessage
    });
  });
