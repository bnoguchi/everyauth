var oauthModule = require('./oauth2'),
    request = require('request');

var stripe = module.exports =
oauthModule.submodule('stripe')

  .configurable({
    scope: "A space seperated list of scope values of Stripe scopes to be accessed.  See the documentation to determine what scope you'd like to specify.  If not specified, it will default to: read_only",
    landing: "Set to login or register depending on what type of screen you want your users to see.  Defaults to login scope for read_only and register for scope for read_write"
  })

  .oauthHost('https://connect.stripe.com')
  .apiHost('https://api.stripe.com')

  .authPath('/oauth/authorize')
  .authQueryParam('response_type', 'code')

  .authQueryParam('stripe_landing', function () {
    return this._landing && this.landing();
  })

  .accessTokenPath('/oauth/token')
  .accessTokenParam('grant_type', 'authorization_code')
  .accessTokenHttpMethod('post')

  .entryPath('/auth/stripe')
  .callbackPath('/auth/stripe/callback')

  .authQueryParam('scope', function () {
    return this._scope && this.scope();
  })

  .fetchOAuthUser( function (accessToken, authResponse) {
    var user = authResponse;
    var p = this.Promise();
    p.fulfill(user.extra);
    return p;
  })

  .moduleErrback( function (err, seqValues) {
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      var stripeResponse = err.extra.res, 
          serverResponse = seqValues.res;
      serverResponse.writeHead(
          stripeResponse.statusCode, 
          stripeResponse.headers);
      serverResponse.end(err.extra.data);
    } else if (err.statusCode) {
      var serverResponse = seqValues.res;
      serverResponse.writeHead(err.statusCode);
      serverResponse.end(err.data);
    } else {
      console.error(err);
      throw new Error('Unsupported error type');
    }
  });
