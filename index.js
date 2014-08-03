var path = require('path');
var EventEmitter = require('events').EventEmitter;
var express = require('express');
var ExpressRouter = require('express/lib/router');
var merge = require('./lib/utils').merge;
var EveryModule = require('./lib/modules/everymodule');

function EveryAuth () {
  this.everymodule = new EveryModule(this);
}

EveryAuth.prototype.debug = false;
EveryAuth.prototype.utils = require("./lib/utils");

EveryAuth.prototype.use = function (fn) {
  fn(this);
  return this;
};

EveryAuth.prototype.user = function (fn) {
  fn(everyauth);
  return this;
};

EveryAuth.prototype.logout = function (req) {
  delete req.session.auth;
};

EveryAuth.prototype.loggedIn = function (req) {
  return !!(req.session && req.session.auth && req.session.auth.loggedIn);
};

/* Middleware */

// Loads the user from the session
EveryAuth.prototype.loadUser = function fetchUserFromSession () {
  var self = this;
  return function (req, res, next) {
    var session = req.session
    var auth = session && session.auth;
    if (!auth || !auth.userId) return next();
    req.socket.pause();

    var findUserById_function = self.everymodule.findUserById();

    findUserById_function.length === 3
      ? findUserById_function( req, auth.userId, findUserById_callback )
      : findUserById_function(      auth.userId, findUserById_callback );

    function findUserById_callback (err, user) {
      if (err) {
        req.socket.resume();
        return next(err);
      }
      if (user) req.user = user;
      else delete session.auth;
      next();
      req.socket.resume();
    }
  };
}

EveryAuth.prototype.addRequestLocals = function (userAlias) {
  userAlias = userAlias || 'user';
  return function (req, res, next) {
    if (res.locals) {
      var session = req.session;
      var auth = session && session.auth;
      var everyauthLocal = merge(auth, {
        loggedIn: !! (auth && auth.loggedIn)
      , user: req.user
      });
      res.locals.everyauth = everyauthLocal;
      res.locals[userAlias] = req.user;
    }
    return next();
  };
};

exports = module.exports = new EveryAuth;
exports.EveryAuth = EveryAuth;
