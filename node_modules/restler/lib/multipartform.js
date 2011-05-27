var fs = require('fs');
var sys = require("sys")
exports.defaultBoundary = '48940923NODERESLTER3890457293';


// This little object allows us hijack the write method via duck-typing
// and write to strings or regular streams that support the write method.
function Stream(stream) {
	//If the user pases a string for stream,we initalize one to write to
	if (this._isString(stream)) {
		this.string = "";
	}
	this.stream = stream;
	
}

Stream.prototype = {
  //write to an internal String or to the Stream
  write: function(data) {
	if (this.string != undefined) {
		this.string += data;
	} else {
		this.stream.write(data, "binary");
	}
  },

  //stolen from underscore.js
  _isString: function(obj) {
    return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
  }
}

function File(path, filename, fileSize, encoding, contentType) {
  this.path = path;
  this.filename = filename || this._basename(path);
  this.fileSize = fileSize;
  this.encoding = encoding || "binary";
  this.contentType = contentType || 'application/octet-stream';
}

File.prototype = {
  _basename: function(path) {
    var parts = path.split(/\/|\\/);
    return parts[parts.length - 1];
  }
};

function Data(filename, contentType, data) {
  this.filename = filename;
  this.contentType = contentType || 'application/octet-stream';
  this.data = data;
}

function Part(name, value, boundary) {
  this.name = name;
  this.value = value;
  this.boundary = boundary;
}


Part.prototype = {
	
  //returns the Content-Disposition header		
  header: function() {
	  var header;
	  
    if (this.value.data) {
	    header = "Content-Disposition: form-data; name=\"" + this.name + 
  	            "\"; filename=\"" + this.value.filename + "\"\r\n" +
  	            "Content-Type: " + this.value.contentType;
 	  } if (this.value instanceof File) {
  	  header = "Content-Disposition: form-data; name=\"" + this.name + 
  	            "\"; filename=\"" + this.value.filename + "\"\r\n" +
  	            "Content-Length: " + this.value.fileSize + "\r\n" +	
  	            "Content-Type: " + this.value.contentType;	
  	} else {
      header = "Content-Disposition: form-data; name=\"" + this.name + "\"";
  	}
  	
	  return "--" + this.boundary + "\r\n" + header + "\r\n\r\n";
  },

  //calculates the size of the Part
  sizeOf: function() {
	  var valueSize;
  	if (this.value instanceof File) {
  	  valueSize = this.value.fileSize;
  	} else if (this.value.data) {
  	  valueSize = this.value.data.length;
  	} else {
  	  valueSize = this.value.length;
  	}
  	return valueSize + this.header().length + 2; 
  },

  // Writes the Part out to a writable stream that supports the write(data) method
  // You can also pass in a String and a String will be returned to the callback
  // with the whole Part
  // Calls the callback when complete
  write: function(stream, callback) {
	
    var self = this;
	
	  //first write the Content-Disposition
	  stream.write(this.header());
	
  	//Now write out the body of the Part
    if (this.value instanceof File) {
  	  fs.open(this.value.path, "r", 0666, function (err, fd) { 
    	  if (err) throw err; 
    	  
  		  position = 0;
  		  
  	    (function reader () {
  	      fs.read(fd, 1024 * 4, position, "binary", function (er, chunk) {
  	        if (er) callback(err);
  	        stream.write(chunk); 
  	        position += 1024 * 4;
  	        if (chunk) reader();
  	        else {
  			      stream.write("\r\n")
      			  callback();
      			  fs.close(fd);
      			}
  	      }); 
  	    })(); // reader() 
  	  });
     } else {
  	  stream.write(this.value + "\r\n");
  	  callback();
  	}
  }
}

//Renamed to MultiPartRequest from Request
function MultiPartRequest(data, boundary) {
  this.encoding = 'binary';
  this.boundary = boundary || exports.defaultBoundary;
  this.data = data;
  this.partNames = this._partNames();
}

MultiPartRequest.prototype = {
  _partNames: function() {
	  partNames = []
      for (var name in this.data) {
  		partNames.push(name)
  	}
  	return partNames;
  },
  write: function(stream, callback) {
    var partCount = 0, self = this;
    
	  // wrap the stream in our own Stream object
  	// See the Stream function above for the benefits of this
  	var stream = new Stream(stream);
  	
  	// Let each part write itself out to the stream
  	(function writePart() {
  	  partName = this.partNames[partCount];
  	  part = new Part(partName, self.data[partName], self.boundary);
  	  part.write(stream, function (err) {
  		  if (err) {
    			callback(err);
    			return;
    		}
     		partCount += 1;
    	  if (partCount < self.partNames.length)
    	    writePart();
    		else {
    		  stream.write('--' + self.boundary + '--' + "\r\n");

          if (callback) callback(stream.string || "");
    		}
  	  });
    })(); 
  }
}

var exportMethods = {
  file: function(path, filename, fileSize, encoding, contentType) { 
    return new File(path, filename, fileSize, encoding, contentType)
  },
  data: function(filename, contentType, data) {
    return new Data(filename, contentType, data);
  },
  sizeOf: function(parts, boundary) {
    var totalSize = 0;
	  boundary = boundary || exports.defaultBoundary;
  	for (var name in parts) totalSize += new Part(name, parts[name], boundary).sizeOf();
  	return totalSize + boundary.length + 6;
  },
  write: function(stream, data, callback, boundary) {
    var r = new MultiPartRequest(data, boundary);
    r.write(stream, callback);
    return r;
  }
}

Object.keys(exportMethods).forEach(function(exportMethod) {
  exports[exportMethod] = exportMethods[exportMethod]
})