var express = require('express')
  , everyauth = require('../index')
  , conf = require('./conf');

everyauth.debug = true;

var usersByFbId = {};
var usersByTwitId = {};
var usersByGhId = {};
var usersByInstagramId = {};
var usersByFoursquareId = {};
var usersByLinkedinId = {};
var usersByLogin = {
  'brian': {
      login: 'brian'
    , password: 'password'
  }
};

everyauth
  .facebook
    .myHostname('http://local.host:3000')
    .appId(conf.fb.appId)
    .appSecret(conf.fb.appSecret)
    .findOrCreateUser( function (session, accessToken, accessTokenExtra, fbUserMetadata) {
      return usersByFbId[fbUserMetadata.id] ||
        (usersByFbId[fbUserMetadata.id] = fbUserMetadata);
    })
    .redirectPath('/');

everyauth
  .twitter
    .myHostname('http://local.host:3000')
    .consumerKey(conf.twit.consumerKey)
    .consumerSecret(conf.twit.consumerSecret)
    .findOrCreateUser( function (sess, accessToken, accessSecret, twitUser) {
      return usersByTwitId[twitUser.id] || (usersByTwitId[twitUser.id] = twitUser);
    })
    .redirectPath('/');

everyauth
  .password
    .getLoginPath('/login')
    .postLoginPath('/login')
    .loginView('login.jade')
    .authenticate( function (login, password) {
      var user = usersByLogin[login];
      if (!user) return false;
      if (user.password !== password) return false;
      return user;
    })

    .getRegisterPath('/register')
    .postRegisterPath('/register')
    .registerView('register.jade')
    .validateRegistration( function (login, password, extraParams, req, res) {
      if (!login)
        return this.breakTo('registrationError', req, res, 'Missing login');
      if (!password)
        return this.breakTo('registrationError', req, res, 'Missing password');

      var promise = this.Promise();
      // simulate an async user db
      setTimeout( function () {
        if (login in usersByLogin) {
          return promise.breakTo('registrationError', req, res, 'Someone already has the login ' + login);
        }
        promise.fulfill({
            login: login
          , password: password
        });
      }, 200);
      return promise;
    })
    .registerUser( function (newUserAttrs) {
      var login = newUserAttrs.login;
      return usersByLogin[login] = newUserAttrs;
    })

    .redirectPath('/');

everyauth.github
  .myHostname('http://local.host:3000')
  .appId(conf.github.appId)
  .appSecret(conf.github.appSecret)
  .findOrCreateUser( function (sess, accessToken, accessTokenExtra, ghUser) {
      return usersByGhId[ghUser.id] || (usersByGhId[ghUser.id] = ghUser);
  })
  .redirectPath('/');

everyauth.instagram
  .myHostname('http://local.host:3000')
  .appId(conf.instagram.clientId)
  .appSecret(conf.instagram.clientSecret)
  .findOrCreateUser( function (sess, accessToken, accessTokenExtra, hipster) {
      return usersByInstagramId[hipster.id] || (usersByInstagramId[hipster.id] = hipster);
  })
  .redirectPath('/');

everyauth.foursquare
  .myHostname('http://local.host:3000')
  .appId(conf.foursquare.clientId)
  .appSecret(conf.foursquare.clientSecret)
  .findOrCreateUser( function (sess, accessTok, accessTokExtra, addict) {
      return usersByFoursquareId[addict.id] || (usersByFoursquareId[addict.id] = addict);
  })
  .redirectPath('/');

everyauth.linkedin
  .myHostname('http://local.host:3000')
  .consumerKey(conf.linkedin.apiKey)
  .consumerSecret(conf.linkedin.apiSecret)
  .findOrCreateUser( function (sess, accessToken, accessSecret, linkedinUser) {
    return usersByLinkedinId[linkedinUser.id] || (usersByLinkedinId[linkedinUser.id] = linkedinUser);
  })
  .redirectPath('/');


var app = express.createServer(
    express.bodyParser()
  , express.static(__dirname + "/public")
  , express.cookieParser()
  , express.session({ secret: 'htuayreve'})
  , everyauth.middleware()
);

app.configure( function () {
  app.set('view engine', 'jade');
});

app.get('/', function (req, res) {
  res.render('home');
});

everyauth.helpExpress(app);

app.listen(3000);
