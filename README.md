everyauth
==========

Authentication and authorization (password, facebook, & more) for your node.js Connect and Express apps.

`everyauth` is:

- *Modular* - We have you covered with Facebook and Twitter 
  OAuth logins, basic login/password support, and modules 
  coming soon for beta invitation support and more.
- *Easily Configurable* - everyauth was built with powerful 
  configuration needs in mind. One of the problems I found 
  with existing `connect` solutions was that it offered 
  configurability from options, but if you wanted to do 
  anything more you had to dig into source and fork the
  codebase. `everyauth` allows you to over-ride specific 
  hooks so that you can configure it to your auth needs.
- *Idiomatic* - The syntax for configuring and extending your authorization strategies are
  idiomatic and chainable.
- *Step-driven*

## Installation
    $ npm install everyauth

## Setting up Facebook Connect

    var everyauth = require('everyauth');
    
    everyauth.facebook
      .myHostname('http://localhost:3000')
      .appId('YOUR APP ID HERE')
      .appSecret('YOUR APP SECRET HERE')
      .findOrCreateUser( function (session, accessToken, fbUserMetadata) {
      })
      .redirectPath('/');
