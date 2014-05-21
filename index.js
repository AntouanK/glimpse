;(function() {

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ modules
var q             = require('q'),
    fse           = require('fs-extra'),
    phantom       = require('phantom'),
    log           = require('consologger'),
    garcon        = require('./lib/garcon'),
    path          = require('path'),
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ variables
    server,
    basePath,
    urls,
    outputDir,
    makeDestPath,
    api = {},
    DEFAULT_PORT = 19283;

log.setPrefix(function(){ return '[html-snapshot] '; });

//  helpers
makeDestPath = function(containerDir){

  //  TODO : add check for dir here
  makeDestPath = function(fileName){
  
    if(fileName === ''){
      fileName = 'index.html';
      log.warning('replacing empty URL with "index.html"!');
    } else {
      fileName = fileName.replace(/.+\//, '');
    }

    return path.join(containerDir, fileName);
  };
};

//  create a phantom instance
//  expose an `open` property with a function that retrieves a page
//  expose a `phantom` property with the phantom instance 
var myPhantom = function(){

  var phantomInstance,
      getPhantom,
      phDefer = q.defer(),
      createPageDefer = q.defer(),
      pageDeferred = q.defer();

  //  instance getter
  getPhantom = function(){
  
    return phantomInstance;
  };

  //  make a phantom instance
  phantom.create(function(ph){
    //  when ready,save the reference
    phantomInstance = ph;
    //  and resolve the promise
    phDefer.resolve(ph); 
  });

  phDefer.promise
  .then(function(ph){

    ph.createPage(function(page){
      pageDeferred.resolve(page);
    });
  });

  getPage = function(){
    return pageDeferred.promise;
  };

  open = function(url){

    if(typeof url !== 'string'){
      throw 'url argument is not a valid string!';
    }

    var openDefer = q.defer();
  
    phDefer.promise
    //  when phantom instance is ready
    .then(function(ph){

      getPage()
      .then(function(page){

        page.open(url, function(status){

          openDefer.notify(status);

          if(status === 'success'){
            openDefer.resolve(page);
          } else {
            log.error('url:', url, '| status:', status);
            openDefer.reject(page);
          }

        });
      });

    });

    return openDefer.promise;
  };

  return {
    getPhantom: getPhantom,
    open: open
  };
};


api.savePage = function(phantomInstance, url, destination) {

  if(typeof url !== 'string'){
    throw 'url argument is not a valid string!';
  } else if(typeof destination !== 'string'){
    throw 'destination argument is not a valid string!';
  }

  var saveDefer = q.defer(),
      start     = Date.now();

  log.data('getting ' + url);

  phantomInstance
  .open(url)
  .then(function(page){
  
    page.evaluate(
    function() {
      return document.documentElement.outerHTML;
    },
    function(result) {

      fse.outputFile(destination, result, function(err){
        
        if(err){
          saveDefer.reject(err);
          throw err;
        }

        log.info(path.resolve(destination), 'saved');
        log.info(Date.now()-start, 'ms ellapsed')
        saveDefer.resolve();
      });
      // phantomInstance.getPhantom().exit();
    });

  }, function (error) {
      // If there's an error or a non-200 status code, log the error.
      // console.error(error);
      phantomInstance.getPhantom().exit();
  }, function (progress) {
      // Log the progress as it comes in.
      log.info("url: ", url, "| status:", progress);
  });

  return saveDefer.promise;
};

module.exports = function(opt){

  if(opt === undefined){
    throw Error('No argument given');
  }

  if(opt.root === undefined && opt.folder === undefined){
    throw Error('no path given to a URL or a directory');
  } else if(opt.root !== undefined && opt.folder !== undefined){
    log.warning('Both root and folder were defined, folder will be used only!')
  }

  if(opt.urls === undefined){
    log.warning('no urls given to take snapshots of');
    return true;
  }

  if(opt.outputDir === undefined){
    log.warning('no output directory given to save snapshots at');
    return true;
  }

  //  initialize the makeDestPath function
  makeDestPath(opt.outputDir);

  if(!opt.verbose){
    log.setMode('off');
  }

  // all checks are done
  //---------------------
  log.verbose('options', opt);

  var serverRoot,
      promises = [],
      openPagePromise = q.defer(),
      ph = myPhantom();

  //  if folder is given, spin up a server for it
  if(opt.folder !== undefined){

    opt.port = opt.port || DEFAULT_PORT;
    //  start a new static file server
    garcon.start({
      rootPath: opt.folder,
      port: opt.port,
      modRewrite: opt.modRewrite  //  define your mod_rewrite rules here
    });

    //  get the root of the new server
    serverRoot = garcon.getRoot();
    if(!serverRoot){
      throw Error('Server was not successfully started');
    } else {
      log.data('garcon started a server with root path :', serverRoot);
    }
  }

  if(typeof opt.urls === 'string'){
    opt.urls = [opt.urls];
  }

  var fetchNext = function(array, cb){

    if(fetchNext.i === undefined){
      fetchNext.i = 1;
    } else {
      fetchNext.i += 1;
    }

    if(array.length < fetchNext.i+1){
      return openPagePromise.resolve();
    }

    //  call cb with the next element
    cb(array[fetchNext.i]);
  };

  var onNext = function(url){
    
    var fullUrl = 'http://' + serverRoot + '/' + url,
      //  make a new deferred
      deferred = q.defer();

      api.savePage(ph, fullUrl, makeDestPath(url))
      .then(function(){
  
        fetchNext(opt.urls, onNext);
      });
  };

  var fullUrl = 'http://' + serverRoot + '/' + opt.urls[0],
      //  make a new deferred
      deferred = q.defer();

  api.savePage(ph, fullUrl, makeDestPath(opt.urls[0]))
  .then(function(){
  
    fetchNext(opt.urls, onNext);
  });

  return openPagePromise.promise
  .then(function(){
  
    log.info('closing phantom...');
    ph.getPhantom().exit();
  });
};

})();