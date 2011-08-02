var everyModule = require('./everymodule')
  , rest = require('../restler')
  , url = require('url');

require('xml2js');

var box = module.exports =
everyModule.submodule('box')
  .configurable({
      apiKey: 'The API key obtained when registering a project with OpenBox'
    , redirectPath: 'Where to redirect to after a failed or successful auth'
  })

  .get('entryPath',
       'the link a user follows, whereupon you redirect them to Box.net -- e.g., "/auth/box"')
    .step('getTicket')
      .description('asks Box.net for a unique ticket for each user of your app')
      .accepts('req res')
      .promises('ticket')
    .step('redirectToBoxAuth')
      .description('redirects the user to https://www.box.net/api/1.0/auth/<ticket>')
      .accepts('res ticket')
      .promises(null)
  .get('callbackPath',
       'the callback path that Box.net redirects to after an authorization result - e.g., "/auth/box/callback"')
    .step('extractAuthToken')
      .description('extracts auth_token from the url that Box.net redirects to after authorization')
      .accepts('req res')
      .promises('authToken')
    .step('getSession')
      .description('extracts the session from the incoming request')
      .accepts('req')
      .promises('session')
    .step('fetchUser')
      .description('fetches the authorizing user via the API with the authToken')
      .accepts('authToken')
      .promises('boxUser')
    .step('findOrCreateUser')
      //.optional()
      .accepts('session authToken boxUser')
      .promises('user')
    .step('compileAuth')
      .description('combines the ticket, auth token, fetched boxUser, and your app user into a single object')
      .accepts('authToken boxUser user')
      .promises('auth')
    .step('addToSession')
      .description('adds the auth token and box.net user metadata to the session')
      .accepts('session auth')
      .promises(null)
    .step('sendResponse')
      .description('sends a response to the client by rendering a successful auth view')
      .accepts('res')
      .promises(null)

  .getTicket( function (req, res) {
    var promise = this.Promise();
    rest.get( this._apiHost + '/rest', {
        parser: rest.parsers.xml
      , query: {
            action: 'get_ticket'
          , api_key: this._apiKey
        }
    }).on('success', function (data, res) {
      var status = data.status
        , ticket = data.ticket;
      promise.fulfill(ticket);
    }).on('error', function (data, res) {
      promise.fail(data);
    });
    return promise;
  })
  .redirectToBoxAuth( function (res, ticket) {
    res.writeHead(303, {
      'Location': this._apiHost + '/auth/' + ticket
    });
    res.end();
  })

  .extractAuthToken( function (req, res) {
    var parsedUrl = url.parse(req.url, true)
      , authToken = parsedUrl.query && parsedUrl.query.auth_token;
    return authToken;
  })
  .getSession( function (req, res) {
    return req.session;
  })
  .fetchUser( function (authToken) {
    var promise = this.Promise();
    rest.get(this._apiHost + '/rest', {
        parser: rest.parsers.xml
      , query: {
            action: 'get_account_info'
          , api_key: this._apiKey
          , auth_token: authToken
        }
    }).on('success', function (data, res) {
      var status = data.status
        , user = data.user;
      promise.fulfill(user);
    }).on('fail', function (data, res) {
      promise.fail(data);
    });
    return promise;
  })
  .compileAuth( function (authToken, boxUser, user) {
    return compiled = {
        authToken: authToken
      , boxUser: boxUser
      , user: user
    };
  })
  .addToSession( function (sess, auth) {
    var _auth = sess.auth || (sess.auth = {})
      , mod = _auth[this.name] || (_auth[this.name] = {});
    _auth.loggedIn = true;
    _auth.userId || (_auth.userId = auth.user.user_id);
    mod.user = auth.boxUser;
    mod.authToken = auth.authToken;
  })
  .sendResponse( function (res) {
    var redirectTo = this.redirectPath();
    if (!redirectTo)
      throw new Error('You must configure a redirectPath');
    res.writeHead(303, {'Location': redirectTo});
    res.end();
  })
  
  .entryPath('/auth/box')
  .callbackPath('/auth/box/callback');

box._apiHost = 'https://www.box.net/api/1.0';
