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
