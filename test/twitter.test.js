var tobi = require('tobi')
  , should = require('should')
  , browser = tobi.createBrowser(3000, 'local.host')
  , creds = require('./creds.js');

// Test a successful login
browser.userAgent = 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.30 (KHTML, like Gecko) Chrome/12.0.742.100 Safari/534.30';
browser.get('/auth/twitter', function (res, $) {
  $('#oauth_form')
    .fill({ 
        'session[username_or_email]': creds.twitter.login
      , 'session[password]': creds.twitter.password })
    .submit(function (res, $) {
      $('.happy.notice h2').should.have.text('Redirecting you back to the application');
      $('.happy.notice a').click( function (res, $) {
        res.should.have.status(200);
        $('h2').should.have.text('Authenticated');
        $('h2').should.not.have.text('Not Authenticated');
      });
    });
});
