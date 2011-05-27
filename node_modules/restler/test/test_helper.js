var http  = require("http"),
    sys   = require('sys'),
    test  = require('assert');

exports.echoServer = function() {
  var server = http.createServer(function(request, response) {
    var echo = [request.method, request.url, "HTTP/" +
                request.httpVersion].join(' ') + "\r\n";
    for (var header in request.headers) {
      echo += header + ": " + request.headers[header] + "\r\n";
    }
    echo += '\r\n';
    
    request.addListener('data', function(chunk) {
      echo += chunk.toString('binary');
    });
    request.addListener('end', function() {
      
      var requestedCode = request.headers['x-give-me-status'];
      
      response.writeHead(requestedCode || 200, {
        'Content-Type': 'text/plain',
        'Content-Length': echo.length
      });
    
      response.write(echo);
      response.end();
      server.close();
    });
  });
  
  var port = exports.port++;
  server.listen(port, "localhost");
  return ["http://localhost:" + port, server];
}

exports.dataServer = function() {
  var json = "{ \"ok\": true }";
  var xml  = "<document><ok>true</ok></document>";
  var yaml = "ok: true";
  
  var server = http.createServer(function(request, response) {
    response.writeHead(200, { 'Content-Type': request.headers['accepts'], 'test': 'thing' });
    
    if (request.headers['accepts'] == 'application/json') {
      response.write(json);
    }
    
    if (request.headers['accepts'] == 'application/xml') {
      response.write(xml);
    }
    
    if (request.headers['accepts'] == 'application/yaml') {
      response.write(yaml);
    }
    
    response.end();
    server.close();
  });
  
  var port = exports.port++;
  server.listen(port, "localhost");
  return ["http://localhost:" + port, server];
}

exports.redirectServer = function() {
  var port = exports.port++;
  
  var server = http.createServer(function(request, response) {
    if (request.url == '/redirected') {
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.write('Hell Yeah!');
      response.end();
      server.close();
    } else {
      response.writeHead(301, { 'Location': 'http://localhost:' + port + '/redirected' });
      response.write('Redirecting...');
      response.end();
    }
    
  });
  
  server.listen(port, "localhost");
  return ["http://localhost:" + port, server];
}

exports.port = 7000;

exports.testCase = function(caseName, serverFunc, tests) {
  var testCount = 0, passes = 0, fails = 0;
  
  function wrapAssertions(name) {
    var assertions = {};
    
    [
      'ok',
      'equal',
      'notEqual',
      'deepEqual',
      'notDeepEqual',
      'strictEqual',
      'notStrictEqual',
      'throws',
      'doesNotThrow',
      'ifError'
    ].forEach(function(assert) {
      assertions[assert] = function() {
        testCount++;
        try {
          test[assert].apply(this, arguments);
          passes++;
        } catch(e) {
          sys.puts(name + ': ' + e);
          fails++;
        }
      }
    });
    
    return assertions;
  }
  
  if (typeof serverFunc != 'function') {
    tests = serverFunc;
    serverFunc = null;
  }
  
  for (var name in tests) {
    if (name.match(/^test/)) {
      if (typeof serverFunc == 'function') {
        var res = serverFunc(), host = res[0], 
            server = res[1];
        tests[name](host, wrapAssertions(name));
      } else {
        tests[name](wrapAssertions(name));
      }
    }
  }
  
  process.addListener('exit', function() {
    var passFail = (testCount == passes) ? ' \033[0;32mPASS\033[1;37m' : ' \033[0;31mFAIL\033[1;37m';
    sys.puts(caseName + " - Assertions: " + testCount + " Passed: " + passes + " Failed: " + fails + passFail);
  });
}

