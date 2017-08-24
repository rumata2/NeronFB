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
var mysql = require('mysql');
var SqlString = require('sqlstring');

var dbConnection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Kuzma104v",
  charset : 'utf8mb4'
});

dbConnection.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

dbConnection.query("USE fb_posts", function (err, result) {
  if (err) throw err;
  console.log("Schema Result: " + result);
});


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
fs.writeFile("popular.txt", "", (err) => {
  if (err) {
    console.log(err);
  };
});

var FB = require('fb');

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
    {"limit" : count, "date_format" : "d-m-y h:i"},
    function(response) {
      if(!response || response.error) {
        console.log(!response ? 'getPage - error occurred' : response.error);
        return;
      }

      for (var i=0; i<response.data.length; i++) {
        var val = response.data[i];
        // create an entry for the post
        var addPostSql = "INSERT INTO Posts VALUES(\'" + val.id + "\',\'" + val.created_time + "\', " + SqlString.escape(val.message) + ");"
        dbConnection.query(addPostSql, function (err, result) {
          if (err) throw err;
          console.log("Add Post Result: " + result);
        });

        getCommentsFromPost(val.id);
      }
    });
}


async function getCommentsFromPost(postId) {
  var fbApiCall = "/" + postId + "/comments";
  FB.api(
    fbApiCall,
    'GET',
    {"summary" : true, "date_format" : "d-m-y h:i"},
    function(response) {
      if(!response || response.error) {
        console.log(!response ? 'getPost - error occurred' : response.error);
        return;
      }

      if (response.summary.total_count < commentsThreshold) {
        return;
      }

      // create an entry for each comment
      for (var i=0; i<response.data.length; i++) {
        var val = response.data[i];
        var addCommentSql = "INSERT INTO Comments VALUES(\'" + val.id + "\'," + SqlString.escape(val.from.name) + ",\'" + val.from.id + "\'," + SqlString.escape(val.message) +
        ",\'" + val.created_time + "\',\'" + postId + "\');"
        console.log(addCommentSql);
        dbConnection.query(addCommentSql, function (err, result) {
          if (err) {
            console.log("Add Comment Error: " + err);
            throw err;
          }
          console.log("Add Comment Result: " + result);
        });
      }
      // create an entry for the post
      //fs.appendFile("comments.txt", val.from.name + " - " + val.message + "\n", function() {
      /*var addCommentSql = "INSERT INTO Comments VALUES(\'" + val.id + "\',\'" + val.created_time + "\', " + SqlString.escape(val.message) + ");"
      dbConnection.query(addPostSql, function (err, result) {
      if (err) throw err;
      console.log("Add Post Result: " + result);
    });
  });*/

  // next page
  /*if (typeof response.paging === "undefined" || typeof response.paging.next === "undefined" ) {
  console.log("data colllected");
} else {
fbApiCall =
url.parse(response.paging.next);

/*      FB.api(
apiURL.path,
'GET',
{},
processComments);
}
});
}*/
});
}
