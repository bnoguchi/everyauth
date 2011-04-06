var everyModule = require('./everymodule');

var password = module.exports =
everyModule.submodule('password')
  .configurable('loginName passwordName loginView registerView redirectPath User')
  .loginName('login')
  .passwordName('password')
  .get('getLoginPath')
    .step('displayLogin')
      .accepts('req res')
      .promises(null)
  .post('postLoginPath')
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
    return [req.body[this.loginName()], req.body[this.passwordName()]];
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
  .get('getRegisterPath')
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
  .post('postRegisterPath')
    .step('extractRegistrationParams')
      .accepts('req res')
      .promises('login password')
    .step('registerUser')
      .accepts('login password')
      .promises('user')
    .step('retrieveSession')
      .accepts('req')
      .promises('session')
    .step('registerSession')
      .accepts('session user')
      .promises(null)
    .step('ackRegistration')
      .accepts('res user')
      .promises(null)
  // TODO Allow ability to re-use steps across different 
  //      sequences (i.e., across different routes)
  .extractRegistrationParams( function (req, res) {
    return [req.body[this.loginName()], req.body[this.passwordName()]];
  })
  .retrieveSession( function (req) {
    return req.session;
  })
  .registerSession( function (sess, user) {
    var auth = sess.auth || (sess.auth = {});
    auth.userId = user.id;
    auth.loggedIn = true;
  })
  .ackRegistration( function (res, user) {
    res.writeHead(303, {'Location': this.redirectPath()});
    res.end();
  });
