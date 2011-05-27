var helper = require('./test_helper'),
    rest   = require('../lib/restler'),
    sys    = require('sys');
    
helper.testCase("Basic Tests", helper.echoServer, {
  testRequestShouldTakePath: function(host, test) {
    rest.get(host + '/thing').on('complete', function(data) {
      test.ok(/^GET \/thing/.test(data), 'should hit /thing');
    });
  },
  testRequestShouldWorkWithNoPath: function(host, test) {
   rest.get(host).on('complete', function(data) {
     test.ok(/^GET \//.test(data), 'should hit /');
   });
  },
  testRequestShouldWorkPreserveQueryStringInURL: function(host, test) {
   rest.get(host + '/thing?boo=yah').on('complete', function(data) {
     test.ok(/^GET \/thing\?boo\=yah/.test(data), 'should hit /thing?boo=yah');
   });
  },
  testRequestShouldBeAbleToGET: function(host, test) {
   rest.get(host).on('complete', function(data) {
     test.ok(/^GET/.test(data), 'should be GET');
   });
  },
  testRequestShouldBeAbleToPUT: function(host, test) {
   rest.put(host).on('complete', function(data) {
     test.ok(/^PUT/.test(data), 'should be PUT');
   });
  },
  testRequestShouldBeAbleToPOST: function(host, test) {
   rest.post(host).on('complete', function(data) {
     test.ok(/^POST/.test(data), 'should be POST');
   });
  },
  testRequestShouldBeAbleToDELETE: function(host, test) {
   rest.del(host).on('complete', function(data) {
     test.ok(/^DELETE/.test(data), 'should be DELETE');
   });
  },
  testRequestShouldSerializeQuery: function(host, test) {
    rest.get(host, { query: { q: 'balls' } }).on('complete', function(data) {
      test.ok(/^GET \/\?q\=balls/.test(data), 'should hit /?q=balls');
    });
  },
  testRequestShouldPostBody: function(host, test) {
    rest.post(host, { data: "balls" }).on('complete', function(data) {
      test.ok(/\r\n\r\nballs/.test(data), 'should have balls in the body')
    });
  },
  testRequestShouldSerializePostBody: function(host, test) {
    rest.post(host, { data: { q: 'balls' } }).on('complete', function(data) {
      test.ok(/content-type\: application\/x-www-form-urlencoded/.test(data), 
                      'should set content-type');
      test.ok(/content-length\: 7/.test(data), 'should set content-length');
      test.ok(/\r\n\r\nq=balls/.test(data), 'should have balls in the body')
    });
  },
  testRequestShouldSendHeaders: function(host, test) {
    rest.get(host, {
      headers: { 'Content-Type': 'application/json' }
    }).on('complete', function(data) {
      test.ok(/content\-type\: application\/json/.test(data), 'should content type header')
    });
  },
  testRequestShouldSendBasicAuth: function(host, test) {
    rest.post(host, { username: 'danwrong', password: 'flange' }).on('complete', function(data) {
      test.ok(/authorization\: Basic ZGFud3Jvbmc6Zmxhbmdl/.test(data), 'should have auth header')
    });
  },
  testRequestShouldSendBasicAuthIfInURL: function(host, test) {
    var port = host.match(/\:(\d+)/)[1];
    host = "http://danwrong:flange@localhost:" + port;
    rest.post(host).on('complete', function(data) {
      test.ok(/authorization\: Basic ZGFud3Jvbmc6Zmxhbmdl/.test(data), 'should have auth header')
    });
  },
  testRequestShouldFire2XXAnd200Events: function(host, test) {
    var count = 0;
    
    rest.get(host).on('2XX', function() {
      count++;
    }).on('200', function() {
      count++;
    }).on('complete', function() {
      test.equal(2, count);
    });
  },
  testRequestShouldFireError4XXand404EventsFor404: function(host, test) {
    var count = 0;
    
    rest.get(host, { headers: { 'X-Give-Me-Status': 404 }}).on('error', function() {
      count++;
    }).on('4XX', function() {
      count++;
    }).on('404', function() {
      count++;
    }).on('complete', function() {
      test.equal(3, count);
    });
  }
});
 
helper.testCase('Multipart Tests', helper.echoServer, {
 testMultipartRequestWithSimpleVars: function(host, test) {
   rest.post(host, {
     data: { a: 1, b: 'thing' },
     multipart: true
   }).on('complete', function(data) {
     test.ok(/content-type\: multipart\/form-data/.test(data), 'should set content type')
     test.ok(/name="a"(\s)+1/.test(data), 'should send a=1');
     test.ok(/name="b"(\s)+thing/.test(data), 'should send b=thing');
   });
 }
});


helper.testCase("Deserialization Tests", helper.dataServer, {
  testAutoSerializerShouldParseJSON: function(host, test) {
    rest.get(host, {
      headers: { 'Accepts': 'application/json' }
    }).on('complete', function(data) {
      test.equal(true, data.ok, "returned " + sys.inspect(data));
    });
  },
  testAutoSerializerShouldParseXML: function(host, test) {
    rest.get(host, {
      headers: { 'Accepts': 'application/xml' }
    }).on('complete', function(data) {
      test.equal("true", data.ok, "returned " + sys.inspect(data));
    });
  },
  testAutoSerializerShouldParseYAML: function(host, test) {
    rest.get(host, {
      headers: { 'Accepts': 'application/yaml' }
    }).on('complete', function(data) {
      test.equal(true, data.ok, "returned " + sys.inspect(data));
    });
  }
});

helper.testCase('Redirect Tests', helper.redirectServer, {
  testShouldAutomaticallyFollowRedirects: function(host, test) {
    rest.get(host).on('complete', function(data) {
      test.equal('Hell Yeah!', data, "returned " + sys.inspect(data));
    });
  }
});