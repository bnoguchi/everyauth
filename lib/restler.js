var rest = module.exports = require('restler');

// https 'end' event patch for restler -- see https://github.com/bnoguchi/everyauth/issues/16
var Request = rest.Request;

if (!Request.__responseHandler__) {
  // alias method chain this only once

  var proto = Request.prototype;

  proto.__responseHandler__ = proto._responseHandler;

  proto._responseHandler = function (response) {
    response.on('close', function () {
      response.emit('end');
    });
    this.__responseHandler__(response);
  };
}
