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
var zlib = require('zlib')
  , uuid = require('uuid')
  , mongoose = require('mongoose')
  , GridFS = require('GridFS').GridFS
  , GridStream = require('GridFS').GridStream;

var Schema = mongoose.Schema;


var Gridfstore = function(){
  var dbname = false;
  var gfs = false;
  var model = false;
  
  var gridschema = new Schema({
    filename: {type: String, unique: true, required: true},
    length: {type: Number}
  });
  gridschema.virtual('uuid').get(function () {
    return this.filename;
  });

  var register = function(dbName, metaschema)
  {
    dbname = dbName;
    gfs = new GridFS(dbName);
    if( typeof(metaschema) === 'object') {
      metaschema.filename = {type: String, required: true};
    } else {
      metaschema = {filename: {type: String, required: true} };
    }
    gridschema.add({metadata: metaschema});
    model = mongoose.model('fs.files', gridschema);
  }
  var close = function()
  {
    gfs.close();
  }
  /**
   @params meta Metadata to be stored to 
   @params data data to be stored to GridFS
   @params callback  to be called after execution
  */
  var store = function(meta, data, options, callback)
  {
    if( typeof(options) == 'function'){
      callback = options;
      options = {};
    }
    var json = { content_type: '', metadata: meta };
    var filename = uuid.v1();
    if( options.gzip ){
        json.content_type =  'application/x-gzip'
    }
    if( typeof(data.pipe) == 'function' )
    { //data was stream..I quess..
      
      var wstream = GridStream.createGridWriteStream(dbname, filename, 'w', json);
      if( options.gzip ){
        var gzip = zlib.createGzip();
        data.pipe(gzip).pipe(wstream);
      }
      else {
        data.pipe(wstream);
      }
      wstream.on('error', function(err){
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
              gfs.put(buffer, filename, 'w', json, callback);
            }
          });
        } else {
          gfs.put(data, filename, 'w', json, callback);
        }
      }
    }
  }

  var isGZipped = function(doc)
  {
    return doc.contentType==='application/x-gzip';
  }
  var getfs = function(filename, options, callback)
  {
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
  var getfss = function(uuid, options, callback)
  {
    model.findOne({filename: uuid}, function(error, obj){
      if( error ) {
        callback(error);
      } else if( obj ) {
        var doc = obj.toObject();
        if(options.gunzip && isGZipped(doc)){
            var gzip = zlib.createUnzip();
            var dbrstream = GridStream.createGridReadStream(dbname, uuid);
            callback(null, {meta: doc, stream: dbrstream.pipe(gzip)});
          } else {
            // Use the test database and open or create 'Hello World!'
            var readStream = GridStream.createGridReadStream(dbname, uuid);
            callback(null, {meta: obj, stream: readStream});
          
          }
      } else {
        callback('not found');
      }
    });
  }
  var read = function(uuid, options, callback)
  {
    if( typeof(options) == 'function' ){
      callback = options;
      options = { method: 'sync', gunzip: true };
    } else if( typeof(options) == 'object' ) {
      //
    } else if( typeof(options) == 'string' ) {
      // hmm, maybe output filename with full path
      callback('not supported');
    } else {
      callback('not supported');
    }
    
    if( options.method === 'sync' ) {
      getfs(uuid, options, callback);
    } else if( options.method === 'async' )
    { getfss(uuid, options, callback);
    } else {
      callback('not found');
    }
    return true;
  }
  var remove = function(uuid, filename, callback)
  {
    gfs.delete(uuid, callback);
  }
  var getModel = function(){
    return model;
  }

  return {
    getModel: getModel,
    register: register,
    close: close,
    store: store,
    read: read,
    remove: remove,
  }
}
module.exports = Gridfstore();
