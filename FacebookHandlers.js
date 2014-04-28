// NodeJs external modules
var express = require('express'),
    request = require('request'),
    FormData = require('form-data'),
    https = require('https'),
    qs = require('qs'),
    fs = require('fs'),
    util = require('util');

//Facebook API credentials used to OAuth and make API calls
var APP_ID = FACEBOOK_API_ID;
var APP_SECRET = FACEBOOK_API_SECRET;

// Facebook API URL Constants
var TOKEN_URL = 'https://graph.facebook.com/oauth/access_token';
var ALBUM_URL = 'https://graph.facebook.com/me/albums';


/* URL: /extend_access_token
 * Info: The below function will get the Long Lived Access Token
 * of an existing valid Access Token from Facebook */
exports.extendAccessToken=function (req, response) {
  try {
    var body = req.body;
    if (!body || !body.access_token) {
      response.end(JSON.stringify({'error': 'missing_params'}));
      return;
    }

    var exchangeToken = body.access_token;

    // Setup the parameters to make the API call for Long-Lived access token
    var params = {
      grant_type: 'fb_exchange_token',
      client_id: APP_ID,
      client_secret: APP_SECRET,
      fb_exchange_token: exchangeToken
    };
    // Send a request to complete the flow and retrieve the access_token
    request.get({url:TOKEN_URL, qs:params}, function(err, resp, extendedToken) {
      if (err) {
        response.end(JSON.stringify({'error': err}));
        return;
      }
      var results = qs.parse(extendedToken);
      if (results.error) {
        response.end(JSON.stringify({'error': results.error}));
        return;
      }
      // Retrieve the access_token and expiration date from the response
      longAccessToken = results.access_token;
      expires = results.expires;
      response.writeHead(200, {'content-type': 'application/json'});
      response.write(JSON.stringify({'long_access_token': longAccessToken}));
      response.end();
      return;
    });
  }
  catch (e) {
    console.log('CaughtException: '+e.stack);
    response.end(JSON.stringify({'error': e}));
    return;
  }
};

/* URL: /user_details
 * Info: The below function will get the user's details
 * from Facebook */
exports.getUserDetails=function (req, response) {
  try {
    var body = req.body;
    if (!body || !body.access_token) {
      response.end(JSON.stringify({'error': 'missing_params'}));
      return;
    }

    var access_token = body.access_token;

    // Setup the parameters to make the API call for GET user details
    var url =
      'https://graph.facebook.com/me?fields=id,name,username,picture'+
      '&access_token='+access_token;

    // Do GET request to get the user details
    request.get({url:url}, function(err, userResponse, userDetails) {
      // Handle any errors that occur
      if (err) {
        response.end(JSON.stringify({'error': err}));
        return;
      }
      var results = JSON.parse(userDetails);
      if (results.error) {
        response.end(JSON.stringify({'error': results.error}));
        return;
      }
      response.end(JSON.stringify(results));
      return;
    });
  }
  catch (e) {
    console.log('CaughtException: '+e.stack);
    response.end(JSON.stringify({'error': e}));
    return;
  }
};

/* URL: /create_album
 * Info: The below function will create an album in
 * Facebook */
exports.createAlbum=function (req, response) {
  try {
  	var body = req.body;
  	if (!body || !body.name || !body.description || !body.access_token) {
      response.end(JSON.stringify({'error': 'missing_params'}));
      return;
    }

    var name = body.name;
    var description = body.description;
    var access_token = body.access_token;

    // Setup the parameters to make the API call for Album
    var params = {
      name: name,
      message: description,
      access_token: access_token,
      privacy: {'value':'EVERYONE'}
    };

    request.post({url:ALBUM_URL,qs:params}, function(err, resp, fb_album) {
      if (err) {
        console.log(err);
        response.end(JSON.stringify({'error': err}));
        return;
      }
      try 
      {
        fb_album = JSON.parse(fb_album);
        if (fb_album.error) {
          console.log(fb_album.error);
          response.end(JSON.stringify({'error': fb_album.error}));
          return;
        }
        if (fb_album.id) {
          response.end(JSON.stringify(fb_album));
          return;
        }
      }
      catch(e)
      {
      	console.log('json_parse_error: '+e.stack);
      	response.end(JSON.stringify({'error': 'json_parse_error'}));
      	return;
      }
    });
  }
  catch (e) {
    console.log('CaughtException: '+e.stack);
    response.end(JSON.stringify({'error': e}));
    return;
  }
};

/* URL: /check_album
 * Info: The below function will check existence of
 * an album in Facebook */
exports.checkAlbum=function (req, response) {
  try {
  	var body = req.body;
  	if (!body || !body.id || !body.access_token) {
      response.end(JSON.stringify({'error': 'missing_params'}));
      return;
    }

    var id = body.id;
    var access_token = body.access_token;
    
    var query = 'SELECT object_id FROM album WHERE owner=me() and object_id='+id;
    var fqlQuery = '/fql?q='+query.split(" ").join("+")+'&access_token='+access_token;
    var options = {
      host: 'graph.facebook.com',
      path: fqlQuery
    };
    // Do GET request to check whether the album is present or not and retrieve
    // the aid n the callback
    var checkRequest = https.get(options, function (checkResponse){
      checkResponse.on('data', function(responseData) {
      	try
      	{
          responseData = JSON.parse(responseData);        
          if (responseData.data && responseData.data.length > 0) {
            responseData = responseData.data;
          }
          response.end(JSON.stringify(responseData));
          return;
        } 
        catch (e)
        {
        	console.log('json_parse_error: '+e.stack);
        	response.end(JSON.stringify({'error': 'json_parse_error'}));
        	return;
        }
      });
    });

    // If anything goes wrong (request-wise not FB)
    checkRequest.on('error', function (e) {
      var error = 'unknown_error';
      console.log(e);
      response.end(JSON.stringify({'error': error}));
      return;
    });
  }
  catch (e) {
    console.log('CaughtException: '+e.stack);
    response.end(JSON.stringify({'error': e}));
    return;
  }
};

/* URL: /upload_photos
 * Info: The below function will upload photos in
 * an album in Facebook */
exports.uploadPhotos=function (req, response){
  try {
    var body = req.body;
    if (!body || !body.id || !body.photos || body.photos.length<=0
        || !body.access_token) {
      response.end(JSON.stringify({'error': 'missing_params'}));
      return;
    }

    var id = body.id;
    var photos = body.photos;
    var access_token = body.access_token;
    var response_data = {};

    // Iterate photos list and upload photos synchronously
    var indexToBegin = 0;
    var iterate = function () {
      uploadPhotosInChunk(id, photos, indexToBegin, access_token, 
        function (err, uploadedPhotos) {
          if (err) {
            /* Send photos with facebook id if few
             * photos have been uploaded before these photos */
            var newPhotos = [];
            uploadedPhotos.forEach(function(photo){
              if(photo.fb_id){
                newPhotos.push(photo);
              }
            });
            response_data['error'] = err;
            response_data['photos'] = newPhotos;
            response.end(JSON.stringify({response_data}));
            return;
          }

          // Logic to update the facebook ids of photos collection
          var count = 0;
          for (var i=indexToBegin; i<(indexToBegin+MAX_PHOTO_TO_UPLOAD); i++) {
            if (!photos[i]) {
              break;
            }
            if (photos[i] && photos[i].id &&
              photos[i].id==uploadedPhotos[count].id) {
                photos[i].fb_id = uploadedPhotos[count].fb_id;
            }
            count += 1;
          }
          indexToBegin += MAX_PHOTO_TO_UPLOAD;

          /* Check if all the photos are uploaded then send
           * response_data back to client else iterate again */
          if (indexToBegin >= photos.length) {
            response_data['photos'] = photos;
            response.end(JSON.stringify({response_data}));
            return;
          }
          else if(indexToBegin < photos.length) {
            iterate();
          }
      });
    };
    iterate();
  }
  catch (e) {
    console.log('CaughtException: '+e.stack);
    response.end(JSON.stringify({'error': e}));
    return;
  }
};

function uploadPhotosInChunk (id, photos, indexToBegin, access_token, cb) {
  var photos_list =[];
  var batchRequest = [];
  var form = new FormData(); // Create multipart form

  /* Make a batch request of photos and limit it to
   * MAX_PHOTO_TO_UPLOAD constant photos in a single request */
  for (var i=indexToBegin; i<(indexToBegin+MAX_PHOTO_TO_UPLOAD); i++) {
    if (!photos[i]) {
      break;
    }

    var fbMessage = '';
    if (photos[i].name) {
      fbMessage = photos[i].name;
    }
    if (photos[i].description) {
      // %0A is a new line character code
      fbMessage = fbMessage + '%0A%0A' + photos[i].description;
    }
    fbMessage = fbMessage.split(" ").join("%20");
    form.append('file'+(i+1), request(photos[i].url)); //Put file
    var data = {
      "method": "POST",
      "relative_url": id+"/photos",
      "body": "message="+fbMessage,
      "attached_files": "file"+(i+1)
    };
    batchRequest.push(data);
  }
  var uploadCount = batchRequest.length;

  // Encoding the json string is must else FB will throw a GraphBatchException
  var url = '/?batch='+encodeURIComponent(JSON.stringify(batchRequest));
      url = url+'&access_token='+access_token;
  var options = {
    method: 'POST',
    host: 'graph.facebook.com',
    path: url,
    headers: form.getHeaders()
  };
  options.agent = false; //Turn off socket pooling

  // Do POST request to upload photos and retrieve the photo ids in the callback
  var photoRequest = https.request(options, function (photoResponse){
    var fb_photos = [];
    photoResponse.on('data', function(data) {
      fb_photos = fb_photos + data;
    });

    photoResponse.on('end', function() {
      try {
        fb_photos = JSON.parse(fb_photos);
      }
      catch (e) {
        console.log('NotJsonException: '+e.stack);
        cb(e, photos);
        return;
      }

      /* Check if photos to be uploaded and photos uploaded counts
       * are same. If yes than loop through uploaded photos collection.
       * If not than raise count not matching exception */
      if (fb_photos.length==uploadCount) {
        var count = 0;
        for (var i=indexToBegin; i<(indexToBegin+MAX_PHOTO_TO_UPLOAD); i++) {
          if (!photos[i]) {
            break;
          }
          if (fb_photos[count] && fb_photos[count].code==200) {
            body = JSON.parse(fb_photos[count].body);
            photos_list.push({'id': photos[i].id,'fb_id': body.id});
          }
          else if(fb_photos[count]){
            photos_list.push({'id': photos[i].id,'fb_id': null});
          }
          else{
            photos_list.push({'id': photos[i].id,'fb_id': null});
          }
          count += 1;
        }
        cb(null, photos_list);
        return;
      }
      else{
        var error = 'upload_count_is_not_matching';
        console.log(error);
        cb(error, photos);
        return;
      }
    });

  });

  // Binds form to request
  form.pipe(photoRequest);
  // If anything goes wrong (request-wise not FB)
  photoRequest.on('error', function (e) {
    var error = 'unknown_error';
    console.log(e);
    cb(error, photos);
    return;
  });
}
