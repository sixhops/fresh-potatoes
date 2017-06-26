const sqlite3 = require('sqlite3'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const url = require('url');

const db = new sqlite3.Database("./db/database.db");

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  // Retrieve the params from the url
  var parentId = req.params.id;
  var parsedQuery = url.parse(req.url, true).query;
  var offset = parsedQuery.offset;
  var limit = parsedQuery.limit;

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
    // Query the database for the recommendations
    var queryString = `
      SELECT films.id, films.title, films.release_date, genres.name
        FROM films JOIN genres ON films.genre_id = genres.id
      WHERE films.genre_id = ?
        AND films.release_date > ?
        AND films.release_date < ?
    `;
    var reviewApi = 'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1';
    var body = '';              // a body to hold the API response
    var reviews = {};           // an object to hold the resulting JSON object
    var numReviews = 0;         // a counter for reviews (for readability)
    var averageRating = 0;      // a variable for average rating
    var recommendation = {};    // an object to hold the created recommendation
    var recommendations = [];   // an array of recommendation objects
    
  });

  //res.status(500).send('Not Implemented');
}

module.exports = app;
