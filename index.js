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
      createPageDefer = q.defer();

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

  open = function(url){

    if(typeof url !== 'string'){
      throw 'url argument is not a valid string!';
    }

    var openDefer = q.defer();

    log.info('Opening ' + url);
  
    phDefer.promise
    //  when phantom instance is ready
    .then(function(ph){
    
      ph.createPage(function(page){
    
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


api.savePage = function(url, destination) {

  if(typeof url !== 'string'){
    throw 'url argument is not a valid string!';
  } else if(typeof destination !== 'string'){
    throw 'destination argument is not a valid string!';
  }

  var phOne = myPhantom(),
      saveDefer = q.defer();

  log.info('opening ' + url + ' on Phantom');

  phOne
  .open(url)
  .then(function(page){
  
    page.evaluate(
    function() {
      return document.documentElement.outerHTML;
    },
    function(result) {

      log.info('saving '+url+' to -> '+destination);
      fse.outputFile(destination, result, function(err){
        
        if(err){
          saveDefer.reject(err);
          throw err;
        }

        log.info('file saved');
        saveDefer.resolve();
      });
      phOne.getPhantom().exit();
    });

  }, function (error) {
      // If there's an error or a non-200 status code, log the error.
      // console.error(error);
      phOne.getPhantom().exit();
  }, function (progress) {
      // Log the progress as it comes in.
      log.info("| url: ", url, " | status:", progress);
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
  log.verbose('opt', opt);

  var serverRoot,
      promises = [];

  //  if folder is given, spin up a server for it
  if(opt.folder !== undefined){
    opt.port = opt.port || DEFAULT_PORT;
    garcon.start({
      rootPath: opt.folder,
      port: opt.port
    });

    serverRoot = garcon.getRoot();
    if(!serverRoot){
      throw Error('Server was not successfully started');
    }
  }

  if(typeof opt.urls === 'string'){
    opt.urls = [opt.urls];
  }

  opt.urls
  .forEach(function(url){
  
    var fullUrl = 'http://' + serverRoot + '/' + url;
    var thisPromise = api.savePage(fullUrl, makeDestPath(url));
    promises.push(thisPromise);
  });


  return q.all(promises);
};

})();