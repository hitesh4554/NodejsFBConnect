//NodeJs external modules
var express = require('express'),
    http = require('http');

//Custom Modules
var FacebookHandlers=require("./FacebookHandlers");

//Instantiate express
var app = express();

// Setup middleware
app.configure(function () {
  // all environments
  app.set('port', process.env.PORT || 9864);
  app.use(express.static(__dirname));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'foo bar' }));
  app.use(function(err, req, res, next){
    console.error('Something broke!'+err.stack);
    res.send(500, 'Something broke!');
  });
});

// All routing related configuration over here
app.get('/access_token', FacebookHandlers.getAccessToken);
app.get('/callback', FacebookHandlers.callback);
app.get('/extend_access_token', FacebookHandlers.extendAccessToken);
app.get('/user_details', FacebookHandlers.getUserDetails);
app.post('/create_album', FacebookHandlers.createAlbum);
app.get('/check_album', FacebookHandlers.checkAlbum);
app.post('/upload_photos', FacebookHandlers.uploadPhotos);
app.get('/delete_object', FacebookHandlers.deleteObject);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
