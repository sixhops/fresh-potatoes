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

  });

  //res.status(500).send('Not Implemented');
}

module.exports = app;
