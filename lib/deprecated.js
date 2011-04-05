/** Facebook **/
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

/** OAuth **/

var oauth = module.exports =
everyModule.submodule('oauth')
  .setters('apiHost entryUri callbackUri')
  .setupRoutes( function (mod, app) {
    app.get(mod._entryUri, mod.start('/auth/facebook'));
    // mod.start() creates a new instantiation of the promise chain
    // and returns the `trigger` of the first step
    app.get(mod._callbackUri, mod.start('auth/facebook/callback'));
  })
  // Define a sequence of steps named 'auth/facebook'
  .sequence('/auth/facebook')
    .step('requestAuthUri', function (substep) {
      substep('determineScope')
        .accepts('req res')
        .promises('scope')
        .define(fn)
        .error(fn);
      substep('generateAuthUri')
        .accepts('scope')
        .promises('authUri');
      substep('requestAuthUri')
        .accepts('authUri')
        .promises(null);
    })
    // reset vs bridge
    // bridge should create a hook for
    // instantiating a new chain of steps
  .sequence('/auth/facebook/callback')
    .step('retrieveCode')
      .accepts('req res')
      .promises('code')
    .step('retrieveAccessToken')
      .accepts('code')
      .promises('accessToken refreshToken')
    .step('getAuth')
      .accepts('accessToken refreshToken')
      .promises('auth');
    // define can define the step function
    // OR it can be the entry point for defining
    // the sub steps it is composed of
    .define( function (authRequest) {
      authRequest
    })
  .step('authCallback')
    .accepts('req res auth')
    .promises(null);

oauth.step('authRequest/determineScope').define( function (req, res) {
  var scope = this._scope;
  if ('function' === typeof scope) {
    return scope(req);
  }
  return scope;
});

oauth.step('authRequest/generateAuthUri').define( function (scope) {
  var oauth = this._oauth
    , authUri = oauth.getAuthorizeUrl({
          redirect_uri: this._myHostname + this._callbackUri
        , scope: scope});
  return authUri;
});

oauth.step('authRequest/retrieveCode').define( function (authUri) {
  var res = this.cache.res;
  res.writeHead(303, {'Location': authUri});
  res.end();
});


// How to add steps to a module or to a composed step

// Adds a series of steps
oauth.step('authCallback', function (step) {
  step('addCronJob');
});

// Adds a single step
oauth.step('authCallback');

// Over-rides a sequence of substeps
// composedOf vs override
oauth.step('authCallback').override(function (step) {
  step(...);
});

oauth.step('authCallback').order('...');

oauth.step('authCallback').addStep('addCronJob');

oauth.step('authCallback').steps.order(...);

oauth.step('authCallback').steps.add('addCronJob', {before: ''});

oauth.step('authCallback').steps.add('addCronJob', {after: ''});

