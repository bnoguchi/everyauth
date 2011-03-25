var clone = exports.clone = function clone (obj) {
  if (obj === undefined || obj === null)
    return obj
  if (Array.isArray(obj))
    return cloneArray(obj);
  if (obj.constructor == Object)
    return cloneObject(obj);
  return obj;
};

function cloneObject (obj, shouldMinimizeData) {
  var ret = {};
  for (var k in obj)
    ret[k] = clone(obj[k]);
  return ret;
};

function cloneArray (arr) {
  var ret = [];
  for (var i = 0, l = arr.length; i < l; i++)
    ret.push(clone(arr[i]));
  return ret;
};
