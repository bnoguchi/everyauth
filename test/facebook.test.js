var tobi = require('tobi')
  , should = require('should')
  , browser = tobi.createBrowser(3000, 'local.host')
  , creds = require('./creds.js');

// Test a successful login
browser.userAgent = 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.30 (KHTML, like Gecko) Chrome/12.0.742.100 Safari/534.30';
browser.get('/auth/facebook', function (res, $) {
  var form = $('#login_form');
  form
    .fill({ 
        email: creds.facebook.login
      , pass: creds.facebook.password

        // Need to do this; otherwise, parameters are corrupted, and Facebook responds with an error
        // Ideally, $.fn.serializeArray() would do this, but alas...
      , next: form.find('input[name="next"]').attr('value').replace(/&amp;/g, '&') })
    .submit(function (res, $) {
      var form = $('#uiserver_form');
      if (form.length) {
        // If we are at the "Request for Permission" page on Facebook
        form.submit( function (res, $) {
          $('h2').should.have.text('Authenticated');
          $('h2').should.not.have.text('Not Authenticated');
        });
        
      } else {
        // Else we are back at local.host
        $('h2').should.have.text('Authenticated');
        $('h2').should.not.have.text('Not Authenticated');
      }

    });
});
