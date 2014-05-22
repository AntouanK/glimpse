
var should       = require('should');

describe('garcon', function(){

  var garcon = require('../lib/garcon');

  it('should be loaded', function(){
    garcon.should.not.eql(undefined);
  });

  it('should start a server with .start(), given a root path', function(done){
    var rootPath = __dirname + '/testPage';

    garcon.start({
      rootPath: rootPath,
      port: 12345
    });

    var http = require('http');

    http.get('http://localhost:12345/test.html', function(res){
      res.statusCode.should.eql(200);
      garcon.stop();
      done();
    })
    .on('error', function(e) {
      console.log("Got error: " + e.message);
      garcon.stop();
      done();
    });

  });
});

describe('glimpse', function(){

  var glimpse = require('../index');

  it('should be a function', function(){
    glimpse.should.be.an.Function;
  });

  it('should throw an error, when called without options', function(){
    (function(){
      glimpse();
    }).should.throw;
  });

  it('should throw an error, when called without root path', function(){
    (function(){
      glimpse({});
    }).should.throw;
  });

  it('should read the contents of the html page', function(done){

    var onPageDone = function(){

      var linkEle = document.querySelector('link'),
          linkRemoved = false;
      if(linkEle !== null){
        linkRemoved = true;
        linkEle.parentElement.removeChild(linkEle)
      }

      return linkRemoved;
    };

    glimpse({
      folder: __dirname + '/testPage',
      urls: [
        '',
        'test.html',
        'somePage.html'
      ],
      outputDir: 'output',
      onPageDone: onPageDone,
      verbose: true
    })
    .then(function(a){

      done();
    });
  });

});

