/**
  gridfstore
  
  gridfstore.register('mydb',  myMetaSchema);
  
  Schema format:
  
  schema: { 
    uuid: {type: String, unique: true},
    metadata: {
      //what ever...
    }
  }
*/
var zlib = require('zlib');

var uuid = require('uuid');
var mongoose = require('mongoose')
var GridFS = require('GridFS').GridFS;
var GridStream = require('GridFS').GridStream;

var dbname = false;
var gfs = false;
var model = false;

module.exports.register = function(dbName, schema)
{
  dbname = dbName;
  gfs = new GridFS(dbname);
  this.model = mongoose.model('fs.files', schema);
  model = this.model;
}
module.exports.close = function()
{
  gfs.close();
}
/**
 @params meta Metadata to be stored to 
 @params data data to be stored to GridFS
 @params callback  to be called after execution
*/
module.exports.store = function(meta, data, options, callback)
{
  if( typeof(options) == 'function'){
    callback = options;
    options = {};
  }
  var filename = uuid.v1();
  if( options.gzip ){
      meta.content_type =  'application/x-gzip'
      meta.metadata.gzip = true;
  }
  if( typeof(data.pipe) == 'function' )
  { 
    
    var wstream = GridStream.createGridWriteStream(dbname, filename, 'w', meta);
    if( options.gzip ){
      var gzip = zlib.createGzip();
      data.pipe(gzip).pipe(wstream);
    }
    else {
      data.pipe(wstream);
    }
    wstream.on('error', function(err){
      console.log(err);
      callback(err);
    });
    //data.on('end', function(){});
    wstream.on('close', function(){
      model.findOne({filename: filename}, callback);
    });
  } else { //string of buffer
    if( typeof(data) == 'string' ) {
      data = new Buffer(data); //convert to buffer
    }
    if(typeof(data) == 'object') {
      if( options.gzip ) {
        zlib.deflate(data, function(err, buffer) {
          if (err) callback(err);
          else {
            gfs.put(buffer, filename, 'w', meta, callback);
          }
        });
      } else {
        gfs.put(data, filename, 'w', meta, callback);
      }
    }
  }
}

var isGZipped = function(doc)
{
  return doc.contentType=='application/x-gzip';
}
var getfs = function(filename, options, callback)
{
  console.log('test');
  model.findOne({filename: filename}, function(error, obj){
    if( error ) {
      callback(error);
    } else if( obj ) {
      var doc = obj.toObject();
      gfs.get(filename, function(err,data){
        if(options.gunzip && isGZipped(doc)){
          zlib.unzip(data, function(err, buffer) {
            callback(null, {meta: doc, buffer: buffer});
          });
        } else {
          callback(null, {meta: doc, buffer: data});
        }
      });
    } else {
      callback('not found');
    }
  });
}
var getfss = function(filename, options, callback)
{
  model.findOne({filename: filename}, function(error, obj){
    if( error ) {
      callback(error);
    } else if( obj ) {
      var doc = obj.toObject();
      if(options.gunzip && isGZipped(doc)){
          console.log('gunzip');
          /*var zlib = zlib.createUnzip();
          var dbrstream = GridStream.createGridReadStream(dbname, uuid, 'r');
          callback(null, {meta: doc, stream: dbrstream.pipe(gzip)});*/
        } else {
          console.log('raw');
          // Use the test database and open or create 'Hello World!'
          var readStream = GridStream.createGridReadStream(dbname,uuid);
          readStream.pipe(process.stdout);
          
          //var gs = GridStream.createGridReadStream (dbname, uuid, 'r');
          //callback(null, {meta: doc, stream: gs});
        }
    } else {
      callback('not found');
    }
  });
}
module.exports.get = getfs
module.exports.gets = getfss
module.exports.read = function(uuid, options, callback)
{
  if( typeof(options) == 'function' ){
    callback = oFileName;
    options = { get: true };
  } else if( typeof(options) == 'object' ) {
    //
  } else if( typeof(options) == 'string' ) {
    // hmm, maybe output filename with full path
    console.log('not supported');
    return;
  } else {
    callback('not supported');
    return;
  }
  
  if( options.get ) {
    getfs(uuid, options, callback);
  } else if( options.stream )
  {
    getfss(uuid, options, callback);
  } else {
    callback('not found');
  }
}
module.exports.delete = function(uuid, filename, callback)
{
  gfs.delete(uuid, callback);
}