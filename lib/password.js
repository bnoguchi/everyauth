var everyModule = require('./everymodule');

var password = module.exports =
everyModule.submodule('password')
  .configurable('loginView redirectPath')
  .get('loginPath')
    .step('displayLogin')
      .accepts('req res')
      .promises(null)
  .post('authPath')
    .step('extractLoginPassword')
      .accepts('req res')
      .promises('login password')
    .step('authenticate')
      .accepts('login password')
      .promises('didSucceed')
    .step('findUser')
      .accepts('didSucceed login')
      .promises('user')
    .step('getSession')
      .accepts('req')
      .promises('session')
    .step('addToSession')
      .accepts('session user')
      .promises(null)
    .step('sendResponse')
      .accepts('res didSucceed')
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
    return [req.body.login, req.body.password];
  })
  .getSession( function (req) {
    return req.session;
  })
  .addToSession( function (sess, user) {
    var _auth = sess.auth || (sess.auth = {});
    _auth.userId = user.id;
    _auth.loggedIn = !!user;
  })
  .sendResponse( function (res, didSucceed) {
    res.writeHead(303, {'Location': this.redirectPath()});
    res.end();
  });
