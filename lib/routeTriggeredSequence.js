var StepSequence = require('./stepSequence');

var RouteTriggeredSequence = module.exports = function RouteTriggeredSequence (name, _module) {
  StepSequence.call(this, name, _module);
}

RouteTriggeredSequence.prototype.__proto__ = StepSequence.prototype;

RouteTriggeredSequence.prototype.routeHandler = function () {
  // Create a shallow clone, so that seq.values are different per HTTP request
  var seq = this.materialize();
  // Kicks off a sequence of steps based on a route
  seq.start.apply(seq, arguments); // BOOM!
};
