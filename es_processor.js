// start ElasticSearch
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'error'
});

var fs = require('fs');
var baseDir = ".";
var commentID = "";
client.ping({
  requestTimeout: 30000,
}, function (error) {
  if (error) {
    console.error('elasticsearch cluster is down!');
  } else {
    // process parameters
    for (var index=2; index<process.argv.length; index++) {
      var arg = process.argv[index].split("=");
      switch(arg[0]) {
        case "-i":
        baseDir = arg[1];
        break;

        case "-p":
        indexPosts(baseDir, function(err) {
          if (err) {
            console.log(err);
          }
        });
        break;

        case "-c":
        indexComments(baseDir, function(err) {
          if (err) {
            console.log(err);
          }
        });
        break;

        case "-t":
          commentID = arg[1];
          calculateTagCloud(commentID);
          break;

        default:
        console.log("Wrong params");
        break;
      }
    }
  }
});


async function indexPosts(baseDir, callback) {
  // read files from posts directory
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


async function indexComments(baseDir, callback) {
  // read files from posts directory
  var bulkReq = [];
  fs.readdir(baseDir+'/comments', function(err, items) {
    if (err) {
      callback(err);
      return;
    }

    var comments = [];
    for (var i=0; i<items.length; i++) {
      var file = items[i];
      var postId = file.split(".")[0] + "_post";
      var commentObj = processCommentFile(postId, baseDir+'/comments/'+file);
      comments.push(commentObj);
      console.log(i);
    }

    var j=0;
    console.log(comments.length);
    comments.reduce(function(p, item) {
      return p.then(function() {
        console.log("processing - " + (j++));
        return client.index({
          index: 'fbposts',
          type: 'post',
          id: item.id,
          body: item
        });
      });
    }, Promise.resolve()).then(function(results) {
    // all done here with array of results
    });
  });
}


function processCommentFile (postId, filename) {
  var lines = fs.readFileSync(filename, 'utf-8')
  .split('\n')
  .filter(Boolean);
  var commentObj = {};
  commentObj.comments = [];
  commentObj.id = postId + "_comment";
  commentObj.body = "";
  for (var i=0; i<lines.length; i++) {
    var line = lines[i].split('{');
    var comment = {};
    comment.id = line[0];
    commentObj.body += line[1];
    //comment.message = line[1];
    comment.created = line[2];
    commentObj.comments.push(comment);
  }

  return commentObj;
}

function calculateTagCloud(commentId) {
  client.termvectors({
    index: 'fbposts',
    type: 'post',
    id: commentId,
    termStatistics: true
  }).then (function (stats) {
    buildCloudStats(commentId, stats);
  }, function(error) {
    console.trace(error.message);
  });
}

function buildCloudStats(commentId, stats) {
  var tagCloud = {};
  tagCloud.terms = [];
  var docCount = stats.term_vectors.body.field_statistics.doc_count;
  var terms = Object.keys(stats.term_vectors.body.terms);
  var i =0;
  var wordCount = 0;
  for (i=0; i<terms.length; i++) {
    wordCount+=stats.term_vectors.body.terms[terms[i]].term_freq;
  }
  console.log(wordCount);
  for (i=0; i<terms.length; i++) {
    var termKey = terms[i];
    var term = stats.term_vectors.body.terms[termKey];
    var tf1 = term.term_freq;
    var tf = term.term_freq/wordCount;
    var df = term.doc_freq;
    var idf = Math.log(docCount/df);
    var tfidf = tf * idf;
    var key = termKey.toString().concat("_");
    tagCloud.terms.push(key, tfidf);
    fs.appendFile(commentId+".csv", termKey + "," + tfidf +"," + tf1 + "," + df + "," + tf*100 + "," + idf + "\n", (err) => {
      if (err) throw err;
    });
  }

  fs.writeFile(commentId+".cld.txt", JSON.stringify(tagCloud, null, 2), (err) => {
    if (err) throw err;
    console.log('DONE!');
  });
}
/*
var fs = require('fs');
var FB = require('fb');
FB.options({version: 'v2.11'});

FB.setAccessToken(AUclient.search({
  q: 'pants'
}).then(function (body) {
  var hits = body.hits.hits;
}, function (error) {
  console.trace(error.message);
});TH_TOKEN);

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
