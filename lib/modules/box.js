var everyModule = require('./everymodule')
  , request = require('request')
  , url = require('url')
  , xml2js =require('xml2js');

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
      .accepts('req res next')
      .promises('ticket')
    .step('redirectToBoxAuth')
      .description('redirects the user to https://www.box.net/api/1.0/auth/<ticket>')
      .accepts('res ticket')
      .promises(null)
  .get('callbackPath',
       'the callback path that Box.net redirects to after an authorization result - e.g., "/auth/box/callback"')
    .step('extractAuthToken')
      .description('extracts auth_token from the url that Box.net redirects to after authorization')
      .accepts('req res next')
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
    request.get({
        url: this._apiHost + '/rest'
      , qs: { action: 'get_ticket', api_key: this._apiKey }
    }, function (err, res, body) {
      var parser = new xml2js.Parser;
      console.log(body);
      parser.parseString(body, function (xmlErr, json) {
        if (xmlErr) {
          return promise.fail(xmlErr);
        }
        if (err) {
          err.extra = {res: res, data: json};
          return promise.fail(err);
        }
        if (parseInt(res.statusCode/100, 10) !== 2) {
          return promise.fail({extra: {data: json, res: res}});
        }
        var ticket = json.ticket;
        return promise.fulfill(ticket);
      });
    });
    return promise;
  })
  .redirectToBoxAuth( function (res, ticket) {
    this.redirect(res, this._apiHost + '/auth/' + ticket);
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
    request.get({
        url: this._apiHost + '/rest'
      , qs: {
            action: 'get_account_info'
          , api_key: this._apiKey
          , auth_token: authToken
        }
    }, function (err, res, body) {
      var parser = new xml2js.Parser;
      parser.parseString(body, function (xmlErr, json) {
        if (xmlErr) {
          return promise.fail(xmlErr);
        }
        if (err) {
          err.extra = {res: res, data: json};
          return promise.fail(err);
        }
        if (parseInt(res.statusCode/100, 10) !== 2) {
          return promise.fail({extra: {data: json, res: res}});
        }
        var user = json.user
        return promise.fulfill(user);
      });
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
    this.redirect(res, redirectTo);
  })

  .entryPath('/auth/box')
  .callbackPath('/auth/box/callback')

  .moduleErrback( function (err, seqValues) {
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      var boxResponse = err.extra.res
        , serverResponse = seqValues.res;
      serverResponse.writeHead(
          boxResponse.statusCode
        , boxResponse.headers);
      serverResponse.end(err.extra.data);
    } else {
      console.error(err);
      throw new Error('Unsupported error type');
    }
  });

box._apiHost = 'https://www.box.net/api/1.0';
