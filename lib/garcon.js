var express = require('express');
var app = express();
var garcon  = {};      //  main server API
var on = false;
var port;
var httpServer;

garcon.start = function(opt){

  if(opt.rootPath === undefined){
    throw 'no rootPath defined!';
  }

  if(on){
    console.warn('server already running');
    return;
  }

  on = true;

  opt.port = opt.port || 34567;
  port = opt.port;

  app.configure(function(){
    app.use(express.static(opt.rootPath));
  });

  httpServer = require('http').createServer(app);
  httpServer.listen(opt.port);
  // console.log('server listening at ' + port);
};


garcon.stop = function(){

  on = false;
  httpServer.close();
};

garcon.getRoot = function(){

  if(!on){
    return false;
  }
  return 'localhost:'+port;
};

module.exports = garcon;
