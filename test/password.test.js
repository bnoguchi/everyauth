var tobi = require('tobi')
  , should = require('should')
  , browser = tobi.createBrowser(3000, 'local.host');

// Test a successful registration
browser.get('/register', function (res, $) {
  $('form')
    .fill({ email: 'newuser@example.com', password: 'pass' })
    .submit( function (res, $) {
      res.should.have.status(200);
      $('h2').should.have.text('Authenticated');
      $('h2').should.not.have.text('Not Authenticated');
    });
});

// Test failed registrations
browser.get('/register', function (res, $) {
  $('form')
    .fill({ email: '', password: '' })
    .submit( function (res, $) {
      res.should.have.status(200);
      $('#errors li:first').should.have.text('Missing email');
      $('#errors li:eq(1)').should.have.text('Missing password');
    });
  $('form')
    .fill({ email: 'newuser', password: 'pass' })
    .submit( function (res, $) {
      res.should.have.status(200);
      $('#errors').should.have.text('Please correct your email.');
    });
  $('form')
    .fill({ email: 'newuser', password: '' })
    .submit( function (res, $) {
      res.should.have.status(200);
      $('#errors li:first').should.have.text('Please correct your email.');
      $('#errors li:eq(1)').should.have.text('Missing password');
    });
  $('form')
    .fill({ email: 'abc@example.com', password: '' })
    .submit( function (res, $) {
      res.should.have.status(200);
      $('#errors').should.have.text('Missing password');
    });

  // TODO Add case of person trying to take an existing login
});

// Test a successful login
browser.get('/login', function (res, $) {
  $('form')
    .fill({ email: 'brian@example.com', password: 'password' })
    .submit( function (res, $) {
      res.should.have.status(200);
      $('h2').should.have.text('Authenticated');
      $('h2').should.not.have.text('Not Authenticated');
    });
});

// Test failed logins
browser.get('/login', function (res, $) {
  $('form')
    .fill({ email: 'brian@example.com', password: 'wrongpassword' })
    .submit( function (res, $) {
      res.should.have.status(200);
      $('#errors').should.have.text('Login failed');
    });
  $('form')
    .fill({ email: 'brian@example.com', password: '' })
    .submit( function (res, $) {
      $('#errors').should.have.text('Missing password');
    });
  $('form')
    .fill({ email: '', password: '' })
    .submit( function (res, $) {
      $('#errors li:first').should.have.text('Missing login');
      $('#errors li:eq(1)').should.have.text('Missing password');
    });
});
