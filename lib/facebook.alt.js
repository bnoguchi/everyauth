var oauthModule = require('./oauth');

var fb = module.exports =
oauthModule.submodule('facebook')
  .apiHost('https://graph.facebook.com')
  .configurable('scope')
  .entryPath('/auth/facebook')
  .callbackPath('/auth/facebook/callback')
  .fetchOAuthUser( function (accessToken) {
    this.oauth.getProtectedResource(this.apiHost() + '/me', accessToken, function (err, data, response) {
      if (err) return p.error(err);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    })
  })

var fb = module.exports =
oauthModule.submodule('facebook')
  // TODO submodule should
  // set fb.name = 'facebook'
  .apiHost('https://graph.facebook.com')
  .setters('scope')
  .routeStep('authRequest')
    .uri('/auth/facebook')
  .step('authRequest')
    .accepts('req res abc')
    .returns('*')
    .get('/auth/facebook')
    // Should be able to access module
    // properties from within a step
    // definition
  .step('authCallback')
    .get('/auth/facebook/callback')
  .step('addToSession')
    .define( function (sess, auth) {

    })

// Introspection
console.log( fb.steps );
     
// Make order of steps explicit
// fb.seq(...)
fb.steps.order('authRequest', 'authCallback', 'addToSession');

fb.step('authRequest').steps.order(
  'handleRequest', 'determineScope', 
  'generateAuthUri', 'redirectToAuthUri');
// `order(...)` should throw an error if it is missing a step










////////////////////////////////////////

function findUser (cred, fbUserMetadata) {
  var p = new Promise();
  User.find({id: 1}, function (err, user) {
    p.succeed(err, user);
  });
  return p;
}

function orCreateUser(err, user) {
  var p = new Promise();
  if (user) {
    p.succeed(null, user);
  } else {
    User.create({}, function (err, user) {
      p.succeed(err, user);
    });
  }
  return p;
}

function assignToSession (sess, user, cred, fbData) {
  var p = new Promise();
  // Logic goes here
  p.succeed(sess, user, cred, fbData);
  return p;
}

function anon (req, res, uid, cred, info) {}

function anon2 (req, res, provider, uid, cred, info) {}

everyauth(
    function (req, res, provider, cred, info) {
    }
  , facebook(
        function (req, res, uid, cred, info) {
        }
      , userLogic(
        )
    )
  , twitter(
        function (req, res, uid, cred, info) {
        }
    )
);
