// read parameters
var PropertiesReader = require('properties-reader');
var props = PropertiesReader('/etc/neron-fb-fetcher/neron-fb-fetcher.conf');

const AUTH_TOKEN = props.get("auth-token");
const ACTION_PAGE = 0;
const ACTION_POST = 1;

var action = -1;
var postsCount = 25;
var objectId = 0;
var commentsThreshold = 1000;
const url = require('url');
var SqlString = require('sqlstring');

// process parameters
process.argv.forEach(function (val, index, array) {
  if (index > 1) {
    var arg = val.split("=");
    switch (arg[0]) {
      case "-p":
      action = ACTION_POST;
      break;

      case "-P":
      action = ACTION_PAGE;
      break;

      case "-i":
      objectId = arg[1];
      break;

      case "-c":
      postsCount = arg[1];
      break;

      case "-t":
      commentsThreshold = arg[1];
      break;

      default:
      break;
    }
  }
});

var fs = require('fs');
var FB = require('fb');
FB.options({version: 'v2.11'});

FB.setAccessToken(AUTH_TOKEN);

switch (action) {
  case ACTION_PAGE:
  getCommentsFromPage(objectId, postsCount);
  break;

  case ACTION_POST:
  getCommentsFromPost(objectId);
  break;

  default:
  console.log("Please specify an action -p (post) or -P (page)");
  break;
}

function getCommentsFromPage(objectID, count) {
  var apiCall = "/" + objectID + "/posts";
  FB.api(
    apiCall,
    'GET',
    {"limit" : count, "date_format" : "d-m-y h:i", "after" : "Q2c4U1pXNTBYM0YxWlhKNVgzTjBiM0o1WDJsa0R5TXhNREl3T1RrNU1UWTFNekEzT0RRNkxUVXdOVGN3TURrM01EQXpNVFkxTURjd01BOE1ZAWEJwWDNOMGIzSjVYMmxrRHlBeE1ESXdPVGs1TVRZAMU16QTNPRFJmTVRBNE1qRXdNRE00TlRFNU56TTVOQThFZAEdsdFpRWlY5ZAmVYQVE9PQZDZD"},
    function(response) {
      if(!response || response.error) {
        console.log(!response ? 'getPage - error occurred' : response.error);
        return;
      }

      for (var i=0; i<response.data.length; i++) {
        var val = response.data[i];
        fs.appendFile(val.id+"_post.txt", val.message, function (err) {
          if (err) throw err;
        });

        var fbApiCall = "/" + val.id + "/comments";
        getCommentsFromPost(val.id, fbApiCall);
      }
    });
  }


  async function getCommentsFromPost(postId, fbApiCall) {
    FB.api(
      fbApiCall,
      'GET',
      {"summary" : true, limit: 1000, "date_format" : "d-m-y h:i"},
      function(response) {
        if(!response || response.error) {
          console.log(!response ? 'getPost - error occurred' : response.error);
          return;
        }

        if (response.summary.total_count < commentsThreshold) {
          console.log("NOT POPULAR - " + postId +  "-" + response.summary.total_count);
          return;
        }

        // create an entry for each comment
        for (var i=0; i<response.data.length; i++) {
          var val = response.data[i];
          var addCommentStr = val.id + "{" + SqlString.escape(val.message) +
          "{" + val.created_time + "\n";
          fs.appendFile(postId+".txt", addCommentStr, function (err) {
            if (err) throw err;
          });
        }


        // next page
        if (typeof response.paging === "undefined" || typeof response.paging.next === "undefined" ) {
          console.log("data colllected");
        } else {
          var apiURL = url.parse(response.paging.next);
          getCommentsFromPost(postId, apiURL.path);
        }
      });
    }
