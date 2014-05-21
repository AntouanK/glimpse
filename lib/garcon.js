var express = require('express');
var app = express();
var garcon  = {};      //  main server API
var on = false;
var port;
var httpServer;
var modRewrite = require('connect-modrewrite')

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

  if(opt.modRewrite){
    app.use(modRewrite(opt.modRewrite));
  }
  app.use(express.static(opt.rootPath));

  httpServer = require('http').createServer(app);
  httpServer.listen(opt.port);
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
