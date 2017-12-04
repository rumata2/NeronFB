// strat ElasticSearch
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'error'
});

client.ping({
  requestTimeout: 30000,
}, function (error) {
  if (error) {
    console.error('elasticsearch cluster is down!');
  } else {
    // process parameters
    process.argv.forEach(function (val, index, array) {
      if (index > 1) {
        var arg = val.split("=");
        switch(arg[0]) {
          case "-i":
          var baseDir = arg[1];
          indexDocuments(baseDir, function(err) {
            if (err) {
              console.log(err);
            }
          });
          break;

          default:
          console.log("No params");
          break;
        }
      }
    });
  }
});


async function indexDocuments(baseDir, callback) {
  // read files from posts directory
  var fs = require('fs');
  var bulkReq = [];
  fs.readdir(baseDir+'/posts', function(err, items) {
    if (err) {
      callback(err);
      return;
    }

    for (var i=0; i<items.length; i++) {
      var file = items[i];
      var postId = file.split(".")[0];
      var indexCommand =  { index:  { _index: 'fbposts', _type: 'post', _id: postId } };
      var postObj = {};
      postObj.id = postId;
      postObj.body = fs.readFileSync(baseDir+'/posts/'+file, {encoding: 'utf-8'});

      bulkReq.push(indexCommand);
      bulkReq.push(postObj);
    }

    //console.log(bulkReq);

    client.bulk({
      body: bulkReq
    }, function (err1, resp) {
      if (err1) {
        console.log(err1);
        console.log(resp);
      } else {
        console.log("Bulk Done");
      }
    });
  });


}


/*
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
*/
