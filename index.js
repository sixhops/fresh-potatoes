const sqlite3 = require('sqlite3'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const url = require('url');
const http = require('http');

const db = new sqlite3.Database("./db/database.db");

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

function sendError(key, code, response) {
  response.statusCode = code;
  response.setHeader('Content-Type', 'application/json');
  let error = {};
  switch (code) {
    case 404:
      error = { message: "Error: Route does not exist. Please use the form /films/12345/recommendations" };
      break;
    case 422:
      error = { message: "Error: " + key + " is invalid. Please use only positive integers as values." };
      break;
  }
  response.end( JSON.stringify(error) );
}

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);
// Handler for bad routes
app.get('*', function(req, res) {
  sendError("route", 404, res);
});

// ROUTE HANDLER
function getFilmRecommendations(request, response) {
  // Retrieve the params from the url
  var parentId = request.params.id;
  if ( isNaN(parseInt(parentId)) ) {
    sendError('id', 422, response);
  }

  var parsedQuery = url.parse(request.url, true).query;

  var offset = parsedQuery.offset;
  if (typeof(offset) == 'undefined') {
    offset = 0;
  } else {
    if ( isNaN(parseInt(offset)) ) {
      sendError('offset', 422, response);
    }
  }

  var limit = parsedQuery.limit;
  if (typeof(limit) == 'undefined') {
    limit = 10;
  } else {
    if ( isNaN(parseInt(limit)) ) {
      sendError('limit', 422, response);
    }
  }

  // Query the database for the parent film
  var genreId = 0;
  var releaseDate = '';
  db.get("SELECT id, release_date, genre_id FROM films WHERE id=?", [parentId], function(err, row) {
    genreId = row.genre_id;
    releaseDate = row.release_date;
    // Calculate date range variables
    var releaseArray = releaseDate.split('-');
    releaseArray[0] = parseInt(releaseArray[0]) + 15;
    var latestDate = releaseArray.join('-');
    releaseArray[0] = parseInt(releaseArray[0]) - 30;
    var earliestDate = releaseArray.join('-');
    // Set up the variables for the next db and api call
    var queryString = `
      SELECT films.id, films.title, films.release_date, genres.name
        FROM films JOIN genres ON films.genre_id = genres.id
      WHERE films.genre_id = ?
        AND films.release_date > ?
        AND films.release_date < ?
        AND films.id <> ?
        ORDER BY films.id ASC
    `;
    var recommendationIds = []; // an array for the recommended film ids
    var reviewApi = '';         // variable to let us build the api url
    var body = '';              // a body to hold the API response
    var recReviews = [];           // an object to hold the resulting JSON object
    var numReviews = 0;         // a counter for reviews (for readability)
    var averageRating = 0;      // a variable for average rating
    var recommendation = {};    // an object to hold the created recommendation
    var recommendations = [];   // an array of recommendation objects
    // Query the database for the recommendations
    db.all(queryString, [genreId, earliestDate, latestDate], function(err, rows) {
      // Push each film into the array
      for (let i = 0; i < rows.length; i++) {
        recommendationIds.push(rows[i].id);
      }

      var filmIdsQuery = '';
      for (let i = 0; i < recommendationIds.length; i++) {
        filmIdsQuery += recommendationIds[i].toString() + ',';
      }
      reviewApi = 'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=' + filmIdsQuery;

      // Query the API for reviews about this film recommendation
      http.get(reviewApi, function(resApi) {
        body = '';
        resApi.on('data', function(chunk) {
          body += chunk;
        });
        resApi.on('end', function() {
          recReviews = JSON.parse(body);
          // Now that we have reviews for each recommendation we can loop
          //  thru them finding the rating info.
          for (let i = 0; i < recReviews.length; i++) {
            // Get number of reviews and average rating from the results
            numReviews = recReviews[i].reviews.length;
            if (numReviews >= 5) { // first qualifier
              averageRating = 0;
              for (let j = 0; j < numReviews; j++) {
                averageRating += recReviews[i].reviews[j].rating;
              }
              averageRating = parseFloat((averageRating / numReviews).toFixed(2));
              if (averageRating > 4.0) { // second qualifier
                // If we pass the qualifiers, we will make a new object and push it
                recommendation = {
                  id: rows[i].id,
                  title: rows[i].title,
                  releaseDate: rows[i].release_date,
                  genre: rows[i].name,
                  averageRating: averageRating,
                  reviews: numReviews
                };
                recommendations.push(recommendation);
              }
            }
          }
          // Prepare the return object
          // First we sort the recommendations array by id ascending
          recommendations.sort(function(a, b) {
            return a.id - b.id;
          });

          var fullResponse = {
            recommendations: recommendations,
            meta: {limit: limit, offset: offset}
          };

          // Send through the fully built repsonse to the client
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/json');
          response.end( JSON.stringify(fullResponse) );

        }); // end response on 'end' callback
 

      }).on('error', function(e){
        console.log("Got an error: ", e);
      });

    }); // end second db callback

  }); // end first db callback

  //res.status(500).send('Not Implemented');
}

module.exports = app;
