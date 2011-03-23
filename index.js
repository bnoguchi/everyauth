var everyauth = module.exports = function (app) {
  this.app = app;
  this.refresh();
};

everyauth.refresh = function () {
  var modules = everyauth.modules;
  for (var _module in modules) {
    modules[_module].routeApp(app);
  }
};

['facebook'].forEach( function (name) {
  everyauth[name] = 
  everyauth.modules[name] = require('./lib/' + name);
});
