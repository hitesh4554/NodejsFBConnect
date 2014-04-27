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
}

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
}
