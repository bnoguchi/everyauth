var oauthModule = require('./oauth2')
  , querystring = require('querystring')
  , request = require('request')
  , everyModule = require('./everymodule')
  , OAuth = require('oauth').OAuth2
  , url = require('url')
  , extractHostname = require('../utils').extractHostname
  , url = require('url');

var paypal = module.exports =
oauthModule.submodule('paypal')
  .configurable({
      scope: 'specify types of access: See https://developer.paypal.com/docs/integration/direct/identity/attributes/'
  })

  // Override these in implementation to hit sandbox during development
  .oauthHost('https://www.paypal.com')
  .apiHost('https://api.paypal.com')

  .authPath('/webapps/auth/protocol/openidconnect/v1/authorize')
  .authQueryParam('response_type', 'code')


  // Use oAuth request to retrive an acces toekn for use with api calls
  // See line 158 in oauth2.js for reason to include the entire url (and not the typically use relative path)
  .accessTokenPath('https://api.sandbox.paypal.com/v1/oauth2/token')

  // (Identity) Grant token from authorization code: third party site sign-in
  //.accessTokenPath('https://api.paypal.com/v1/identity/openidconnect/tokenservice')

  .accessTokenParam('grant_type', 'client_credentials')
  .accessTokenHttpMethod('post')
  .postAccessTokenParamsVia('data')

  .entryPath('/auth/paypal')
  .callbackPath('/auth/paypal/callback')

  .authQueryParam('scope', function () {
    return this._scope && this.scope();
  })

  .authCallbackDidErr( function (req) {
    var parsedUrl = url.parse(req.url, true);
    console.log("error happends here:", parsedUrl.query);
    return parsedUrl.query && !!parsedUrl.query.error;
  })

  .handleAuthCallbackError( function (req, res) {
    var parsedUrl = url.parse(req.url, true)
      , errorDesc = parsedUrl.query.error_description;
    if (res.render) {
      res.render(__dirname + '/../views/auth-fail.jade', {
        errorDescription: errorDesc
      });
    } else {
      // TODO Replace this with a nice fallback
      throw new Error("You must configure handleAuthCallbackError if you are not using express");
    }
  })

  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise(),
        url = this._apiHost() + '/v1/identity/openidconnect/userinfo/',
        headers = {'Authorization': 'Bearer ' + accessToken},
        queryParams = '?schema=openid';

    request.get({
      url: url + queryParams,
      headers: headers
    }, function(err, data, body) {
      if (err) return p.fail(err);
      var oauthUser = JSON.parse(body).user;
      p.fulfill(oauthUser);
    });

    return p;
  })

  .getAccessToken( function (code, data) {
    console.log("oauth2 getAccessToken data: ", data);

    var p = this.Promise()
      , params = {
          // PayPal expects incomming requests to treat thses as Basic Http Auth credentials
          // https://developer.paypal.com/docs/integration/direct/make-your-first-call/
          //client_id: this._appId
          //client_secret: this._appSecret
           redirect_uri: this._myHostname + this._callbackPath,
           code: code
        }
      , specialUrl = this._oauthHost + this._accessTokenPath
      , additionalParams = this.moreAccessTokenParams
      , additionalQueryParams = this.moreAccessTokenQueryParams
      , param;

    if (this._accessTokenPath.indexOf("://") != -1) {
      // Just in case the access token url uses a different subdomain
      // than than the other urls involved in the oauth2 process.
      // * cough * ... gowalla
      specialUrl = this._accessTokenPath;
    }

    //Some auths take params specific to query string, but still expect posted data
    if (additionalQueryParams) {
      var queryParams = {};
      for (var j in additionalQueryParams) {
        param = additionalQueryParams[j];
        if ('function' === typeof param) {
          additionalQueryParams[j] = // cache the fn call
            param = param.call(this, data.req, data.res);
        }
        if ('function' === typeof param) {
          param = param.call(this, data.req, data.res);
        }
        queryParams[j] = param;
      }

      specialUrl += '?' + querystring.stringify(queryParams);
    }

    if (additionalParams) for (var k in additionalParams) {
      param = additionalParams[k];
      if ('function' === typeof param) {
        additionalParams[k] = // cache the fn call
          param = param.call(this, data.req, data.res);
      }
      if ('function' === typeof param) {
        param = param.call(this, data.req, data.res);
      }
      params[k] = param;
    }

    var opts = { url: specialUrl }
      , paramsVia = this._postAccessTokenParamsVia;
    switch (paramsVia) {
      case 'query': // Submit as a querystring
        opts.headers || (opts.headers = {});
        opts.headers['Content-Length'] = 0;
        paramsVia = 'qs';
        break;
      case 'data': // Submit via application/x-www-form-urlencoded
        paramsVia = 'form';
        break;
      default:
        throw new Error('postAccessTokenParamsVia must be either "query" or "data"');
    }

    opts[paramsVia] = params;
    
    // To client_id & client_secret as http basic auth creds, add the "auth" block to the request's options
    // TODO: the previouse statment needs to be verified; perhaps including creds in custom header would be better
    // https://github.com/mikeal/request
    opts['auth'] = { user: this._appId, pass: this._appSecret, sendImmediately: true};

    request[this._accessTokenHttpMethod](opts, function (err, res, body) {
      if (err) {
        err.extra = {data: body, res: res, url: specialUrl,
          additionalParams: additionalParams, additionalQueryParams: additionalQueryParams};
        return p.fail(err);
      }

      if (parseInt(res.statusCode / 100) != 2) {
        return p.fail({statusCode: res.statusCode, data: body, url: specialUrl,
                      additionalParams: additionalParams, additionalQueryParams: additionalQueryParams});
      }
      var resType = res.headers['content-type']
        , data;
      if (resType.substring(0, 10) === 'text/plain') {
        data = querystring.parse(body);
      } else if (resType.substring(0, 33) === 'application/x-www-form-urlencoded') {
        data = querystring.parse(body);
      } else if (resType.substring(0, 16) === 'application/json') {
        data = JSON.parse(body);
      } else {
        throw new Error('Unsupported content-type ' + resType);
      }
      var aToken = data.access_token;

      delete data.access_token;
      p.fulfill(aToken, data);
    });

    return p;
  })

  .moduleErrback( function (err, seqValues) {
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      var ghResponse = err.extra.res
        , serverResponse = seqValues.res;
      serverResponse.writeHead(
          ghResponse.statusCode
        , ghResponse.headers);
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
