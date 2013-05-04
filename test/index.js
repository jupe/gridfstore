/* gridfstore test
*/
var fs = require('fs');

var
  gridfstore = require('../lib/gridfstore'),
  assert  = require('chai').assert,
  mongoose  = require('mongoose'),
  Schema = mongoose.Schema;

var db = mongoose.connect('mongodb://localhost/test', { db: { safe: false }});


var myschema = new Schema({
  filename: {type: String, unique: true, required: true},
  length: {type: Number},
  metadata: {
    title: {type: String},
    owner: {type: String}
  }
});  

var uuids = [];  
gridfstore.register('test', myschema);


describe('gridfstore',function(){
  it('check if register complete', function(done){
    assert.typeOf( mongoose.model('fs.files').find, 'function' );
    done();
  });
});  
describe('GridFS Store test',function(){
  it('store simple string data', function(done){
    gridfstore.store( {metadata: {filename: 'test1.txt', title: 'example', owner: 'jva'}}, 
                      'sample data',
                      function(error, res){
       assert.equal(error, null, error);
       assert.typeOf(res, 'object');
       assert.equal(res.metadata.filename, 'test1.txt');
       assert.equal(res.metadata.title, 'example');
       assert.equal(res.length, 11);
       done();
       
    });
  });
  it('store buffer data', function(done){
    gridfstore.store( {metadata: {filename: 'test2.txt', title: 'example', owner: 'jva'}}, 
                      new Buffer('sample data'),
                      function(error, res){
       assert.equal(error, null, error);
       assert.typeOf(res, 'object');
       assert.equal(res.metadata.filename, 'test2.txt');
       assert.equal(res.metadata.title, 'example');
       assert.equal(res.length, 11);
       done();
    });
  });
  it('store string data as raw', function(done){
    var lotofdata = '';
    for(var i=0;i<1000;i++){
      lotofdata += 'abcdef';
    }
    gridfstore.store( {metadata: {filename: 'test3.txt', title: 'example', owner: 'jva'}}, 
                      lotofdata, {gzip: false},
                      function(error, res){
       assert.equal(error, null, error);
       assert.typeOf(res, 'object');
       assert.equal(res.metadata.filename, 'test3.txt');
       assert.equal(res.metadata.title, 'example');
       assert.equal(res.length, 6000);
       done();
    });
  });
  
  it('store string data as gzip', function(done){
    var lotofdata = '';
    for(var i=0;i<1000;i++){
      lotofdata += 'abcdef';
    }
    gridfstore.store( {metadata: {filename: 'test4.txt', title: 'example', owner: 'jva'}}, 
                      lotofdata, {gzip: true},
                      function(error, res){
       assert.equal(error, null, error);
       assert.typeOf(res, 'object');
       assert.equal(res.metadata.filename, 'test4.txt');
       assert.equal(res.metadata.title, 'example');
       assert.equal(res.length, 37);
       done();
    });
  });
  it('store stream data as raw', function(done){
    rs = fs.createReadStream('./test/index.js');
    gridfstore.store( {metadata: {filename: 'test5.txt', title: 'example', owner: 'jva'}}, 
                      rs, {gzip: false},
                      function(error, res){
       assert.equal(error, null, error);
       assert.typeOf(res, 'object');
       var doc = res.toObject();
       console.log(doc.metadata.filename);
       assert.equal(doc.metadata.filename, 'test5.txt');
       assert.equal(doc.metadata.title, 'example');
       assert.operator(doc.length, '>', 1000);
       done();
    });
  });
  it('store stream data as gzip', function(done){
    rs = fs.createReadStream('./test/index.js');
    gridfstore.store( {metadata: {filename: 'test6.txt', title: 'example', owner: 'jva'}}, 
                      rs, {gzip: true},
                      function(error, res){
       assert.equal(error, null, error);
       assert.typeOf(res, 'object');
       var doc = res.toObject();
       assert.equal(doc.metadata.filename, 'test6.txt');
       assert.equal(doc.metadata.title, 'example');
       assert.operator(doc.length, '>', 500);
       done();
    });
  });
}); 


describe('GridFS Find tests',function(){
  
  it('Find by mongoose model filename[0]', function(done){
    gridfstore.model.findOne( {'metadata.filename': 'test1.txt'}, function(error, obj){
       assert.equal(error, null);
       var doc = obj.toObject();
       uuids.push(doc.filename);
       assert.typeOf(doc, 'object');
       assert.equal(doc.metadata.filename, 'test1.txt');
       assert.equal(doc.metadata.title, 'example');
       assert.equal(doc.length, 11);
       done();
    });
  });
  
  it('Find by mongoose model filename[1]', function(done){
    gridfstore.model.findOne( {'metadata.filename': 'test2.txt'}, function(error, obj){
       assert.equal(error, null);
       var doc = obj.toObject();
       uuids.push(doc.filename);
       assert.typeOf(doc, 'object');
       assert.equal(doc.metadata.filename, 'test2.txt');
       assert.equal(doc.metadata.title, 'example');
       done();
    });
  });
  it('Find by mongoose model filename[2]', function(done){
    gridfstore.model.findOne( {'metadata.filename': 'test3.txt'}, function(error, obj){
       assert.equal(error, null);
       var doc = obj.toObject();
       uuids.push(doc.filename);
       assert.typeOf(doc, 'object');
       assert.equal(doc.metadata.filename, 'test3.txt');
       assert.equal(doc.metadata.title, 'example');
       done();
    });
  });
  it('Find by mongoose model filename[3]', function(done){
    gridfstore.model.findOne( {'metadata.filename': 'test4.txt'}, function(error, obj){
       assert.equal(error, null);
       var doc = obj.toObject();
       uuids.push(doc.filename);
       assert.typeOf(doc, 'object');
       assert.equal(doc.metadata.filename, 'test4.txt');
       assert.equal(doc.metadata.title, 'example');
       done();
    });
  });
  it('Find by mongoose model filename[4]', function(done){
    gridfstore.model.findOne( {'metadata.filename': 'test5.txt'}, function(error, obj){
       assert.equal(error, null);
       var doc = obj.toObject();
       uuids.push(doc.filename);
       assert.typeOf(doc, 'object');
       assert.equal(doc.metadata.filename, 'test5.txt');
       assert.equal(doc.metadata.title, 'example');
       done();
    });
  });
  
  
  it('read data by file uuid[0]', function(done){
    gridfstore.read(uuids[0], {get: true}, function(error, res){
      assert.equal(error, null);
      assert.typeOf(res.meta, 'object');
      assert.typeOf(res.buffer, 'object');
      assert.equal(res.buffer.toString(), 'sample data');
      done();
    });
  });
  it('read data by file uuid[1]', function(done){
    gridfstore.read(uuids[1], {get: true}, function(error, res){
      assert.equal(error, null);
      assert.typeOf(res.meta, 'object');
      assert.typeOf(res.buffer, 'object');
      assert.equal(res.buffer.toString(), 'sample data');
      done();
    });
  });
  it('read data by file uuid[2]', function(done){
    gridfstore.read(uuids[2], {get: true}, function(error, res){
      assert.equal(error, null);
      assert.typeOf(res.meta, 'object');
      assert.typeOf(res.buffer, 'object');
      assert.equal(res.buffer.toString().length, 6000);
      done();
    });
  });
  it('read data by file uuid[3]', function(done){
    gridfstore.read(uuids[3], {get: true, gunzip: true}, function(error, res){
      assert.equal(error, null);
      assert.typeOf(res.meta, 'object');
      assert.typeOf(res.buffer, 'object');
      assert.equal(res.buffer.toString().length, 6000);
      done();
    });
  });
  
  it('read data by file uuid[1]', function(done){
    gridfstore.read(uuids[4], {stream: true, gunzip: false}, function(error, res){
      assert.equal(error, null);
      assert.typeOf(res.meta, 'object');
      assert.typeOf(res.stream, 'object');
      //assert.equal(res.buffer.toString().length, 6000);
      done();
    });
  });
  
});     
