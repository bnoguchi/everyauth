var everyModule = require('./everymodule'),
    url = require('url'),
    querystring = require('querystring'),
    request = require('request'),
    extractHostname = require('../utils').extractHostname;


var mandrill = module.exports =
everyModule.submodule('mandrill')
  .configurable({
    apiHost: 'e.g. https://mandrillapp.com/api/1.0/',
    apiAuthUrl: 'e.g. https://mandrillapp.com/api-auth/',
    authenticationId: 'The app authentication id generated from mandrill',
    authCallbackDidErr: 'Define the condition for the auth module determining if the auth callback url denotes a failure. Returns true/false.',
    myHostname: 'e.g., http://local.host:3000 . Notice no trailing slash',
    redirectPath: 'the path to redirect once the user is authenticated'
  })

  // Declares a GET route that is aliased
  // as 'entryPath'. The handler for this route
  // triggers the series of steps that you see
  // indented below it.
  .get('entryPath',
       'the link a user follows, whereupon you redirect them to authentication url- e.g., "/auth/mandrill"')
    .step('redirectToMandrill')
      .accepts('req res next')
      .promises(null)

  // post to callbackPath is aliased below. Mandrill redirects to callbackPath using both methods.
  .get('callbackPath',
       'the callback path to redirect to after an authorization - e.g., "/auth/mandrill/callback"')
    .step('getApiKey')
      .description('retrieves a verifier code from the url query')
      .accepts('req res next')
      .promises('apiKey')
      .canBreakTo('authCallbackErrorSteps')
    .step('getSession')
      .accepts('req')
      .promises('session')
    .step('fetchUser')
      .accepts('apiKey')
      .promises('mandrillUser')
    .step('findOrCreateUser')
      .accepts('session apiKey mandrillUser')
      .promises('user')
    .step('sendResponse')
      .accepts('res')
      .promises(null)

  .stepseq('authCallbackErrorSteps')
      .step('handleAuthCallbackError',
           'a request handler that intercepts a failed authorization message sent from mandrill')
        .accepts('req res next')
        .promises(null)

  .apiAuthUrl('http://mandrillapp.com/api-auth/')
  .apiHost('https://mandrillapp.com/api/1.0/')
  .entryPath('/auth/mandrill')
  .callbackPath('/auth/mandrill/callback')

  .redirectToMandrill(function(req, res) {
    if (!this._myHostname) {
      this.myHostname(extractHostname(req));
    }

    var authUrl,
        params;

    params = {
      id: this.authenticationId(),
      redirect_url: this.myHostname() + this.callbackPath()
    }
    authUrl = this.apiAuthUrl() + '?' + querystring.stringify(params);

    this.redirect(res, authUrl);
  })

  .getApiKey(function (req, res, next) {
    var data,
        apiKey;

    if (this._authCallbackDidErr(req)) {
      return this.breakTo('authCallbackErrorSteps', req, res, next);
    }

    // Note: This assumes that you're using connect.bodyParser
    // TODO(ibash) handle both cases where bodyParser is / is not used
    apiKey = req.body.key;
    return apiKey;
  })

  .getSession(function(req) {
    return req.session;
  })

  .fetchUser(function(apiKey) {
    var promise = this.Promise(),
        userUrl = this.apiHost() + '/users/info.json';

    request.post({url: userUrl, json:{key: apiKey}}, function(error, res, body) {
      if (error) {
        error.extra = {res: res, data: body};
        return promise.fail(error);
      }

      if (body && body.status && body.status === 'error') {
        // error from mandrill
        var errorMsg = body.name + ': ' + body.message;
        return promise.fail(new Error(errorMsg));
      }

      // body is an object representing the user
      promise.fulfill(body);
    });

    return promise;
  })

  .sendResponse( function (res) {
    var redirectTo = this.redirectPath();
    if (!redirectTo)
      throw new Error('You must configure a redirectPath');
    this.redirect(res, redirectTo);
  })

  .authCallbackDidErr(function(req) {
    return req.query && !!req.query.error;
  })
  .handleAuthCallbackError(function(req, res, next) {
    next(new Error("Authorization Error"));
  });

// alias post callbackPath to get callbackPath
mandrill._stepSequences['post:callbackPath'] = mandrill._stepSequences['get:callbackPath'];
