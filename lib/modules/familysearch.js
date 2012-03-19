var oauthModule = require('./oauth')
  , OAuth = require('oauth').OAuth;

var cleanupUser = function (fsUser) {
  var cleanUser = {};

  for (var prop in fsUser) {
    switch (prop) {
      case "password":
      case "member":
        continue;
      case "requestedId":
        if (null === fsUser["requestedId"]) {
          continue;
        } else {
          cleanUser["requestedId"] = fsUser["requestdId"];
        }
        break;
      case "preferences":
        var prefs = {};
        // Silly Java...an array of name/value pairs should be an object
        for (var i = 0; i < fsUser["preferences"].length; i++) {
          var pref = fsUser["preferences"][i];
          prefs[pref.name] = pref.value;
        }
        break;
      case "names":
        for (var i = 0; i < fsUser["names"].length; i++) {
          var name = fsUser["names"][i];
          if (name.type.toLowerCase() === 'display') {
            cleanUser["name"] = name.value;
          }
        }
        if ('undefined' === typeof cleanUser["name"] && fsUser["names"].length > 0) {
          cleanUser["name"] = fsUser["names"][0].value;
        }
        break;
      case "emails":
        for (var i = 0; i < fsUser["emails"].length; i++) {
          var email = fsUser["emails"][i];
          if (email.type.toLowerCase() === 'primary') {
            cleanUser["email"] = email.value;
          }
        }
        if ('undefined' === typeof cleanUser["email"] && fsUser["emails"].length > 0) {
          cleanUser["email"] = fsUser["emails"][0].value;
        }
        break;
      default:
        cleanUser[prop] = fsUser[prop];
        break;
    }
  }

  return cleanUser;
}

var familysearch = module.exports =
oauthModule.submodule('familysearch')
  .configurable({
      developerKey:   'your FamilySearch developer key -- https://devnet.familysearch.org/'
    , userAgent:      'the user agent string to send with all OAuth calls. (e.g. "My Cool App/1.0")'
    , referenceHost:  'the FamilySearch reference system to use. Defaults to "https://api.familysearch.org".'
  })
  .definit( function () {
    // Set the configured developerKey as the OAuth consumerKey.
    this.consumerKey(this.developerKey());
    this.apiHost(this.referenceHost());
    this.oauthHost(this.referenceHost());


    // Setup plaintext signing, as required by FamilySearch API
    this.oauth = new OAuth(
        this.oauthHost() + this.requestTokenPath()
      , this.oauthHost() + this.accessTokenPath()
      , this.consumerKey()
      , this.consumerSecret()
      , '1.0', null, 'PLAINTEXT', null
      , { 'User-Agent': this.userAgent() });


    /**
     * Fixes for FamilySearch's non-standard OAuth server implementation...
     */
    this.oauth._isParameterNameAnOAuthParameter= function(parameter) {
      var m = parameter.match('^oauth_');
      // NOTE: FamilySearch Change // if( m && ( m[0] === "oauth_" ) ) {
      if( m && ( m[0] === "oauth_" ) && !parameter.match('oauth_callback') ) {
        return true;
      }
      else {
        return false;
      }
    };

    this.oauth._createSignature= function(signatureBase, tokenSecret) {
       if( tokenSecret === undefined ) var tokenSecret= "";
       else tokenSecret= this._encodeData( tokenSecret );
       // consumerSecret is already encoded
       var key= this._consumerSecret + "&" + tokenSecret;

       var hash= ""
       if( this._signatureMethod == "PLAINTEXT" ) {
         // NOTE: FamilySearch Change // hash= this._encodeData(key);
         hash= key;
       }
       else {
           if( crypto.Hmac ) {
             hash = crypto.createHmac("sha1", key).update(signatureBase).digest("base64");
           }
           else {
             hash= sha1.HMACSHA1(key, signatureBase);
           }
       }
       return hash;
    }

  })
  .referenceHost('https://api.familysearch.org')
  .requestTokenPath('/identity/v2/request_token')
  .accessTokenPath('/identity/v2/access_token')
  .authorizePath('/identity/v2/authorize')
  .consumerSecret('')
  .entryPath('/auth/familysearch')
  .callbackPath('/auth/familysearch/callback')
  .sendCallbackWithAuthorize(false)
  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var promise = this.Promise();
    this.oauth.get(this.apiHost() + '/identity/v2/user/?dataFormat=application/json&sessionId=' + accessToken, accessToken, accessTokenSecret, function (err, data) {
      if (err) return promise.fail(err);
      var user = cleanupUser( JSON.parse(data).users[0] );
      user.sessionId = accessToken;
      promise.fulfill(user);
    });
    return promise;
  })
  .convertErr( function (data) {
    var stringy = JSON.stringify(data);
    if (data.statusCode == 400) {
      return new Error("400 Bad Request. " + stringy);
    }
    if (data.statusCode == 401) {
      if (data.data) {
        return new Error("401 Unauthorized. " + stringy);
      } else {
        return new Error("401 Unauthorized. Is your developer key correct? " + stringy);
      }
    }
    if (data.statusCode == 500) {
      return new Error("500 Server Error. " + stringy);
    }
    return JSON.stringify(data);
  });
