var express = require('express');
var mongoose = require('mongoose');
var Game = mongoose.model('Game');
var util = require('util');
var async = require('async');
var extend = require('util')._extend;

var router = function(){
  var router = express.Router();

  function confirmGameAuthorization(req, res, next) {
    Game.findById(req.params.gameId, function(err, game) {
      if (err)
        return next(err);

      if (game && game.authToken == req.params.authToken) {
        req.game = game;
        next();
      } else {
        res.status(401);
        res.send('Invalid game id or auth token');
      }
    });
  }

  function groupByMonthId() {
    return {
      "$concat": [
          { "$substr": [ { "$year": "$createdAt" }, 0, 4 ] },
          "-",
          { "$substr": [ { "$month": "$createdAt" }, 0, 4 ] },
          "-01"
        ]
      };
  }

  function groupByDayId() {
    return {
      "$concat": [
          { "$substr": [ { "$year": "$createdAt" }, 0, 4 ] },
          "-",
          { "$substr": [ { "$month": "$createdAt" }, 0, 4 ] },
          "-",
          { "$substr": [ { "$dayOfMonth": "$createdAt" }, 0, 4 ] }
        ]
      };
  }

  function groupByHourId() {
    return {
      "$concat": [
          { "$substr": [ { "$year": "$createdAt" }, 0, 4 ] },
          "-",
          { "$substr": [ { "$month": "$createdAt" }, 0, 4 ] },
          "-",
          { "$substr": [ { "$dayOfMonth": "$createdAt" }, 0, 4 ] },
          " ",
          { "$substr": [ { "$hour": "$createdAt" }, 0, 4 ] },
          ":00:00"
        ]
      };
  }

  function groupByMinuteId() {
    return {
      "$concat": [
          { "$substr": [ { "$year": "$createdAt" }, 0, 4 ] },
          "-",
          { "$substr": [ { "$month": "$createdAt" }, 0, 4 ] },
          "-",
          { "$substr": [ { "$dayOfMonth": "$createdAt" }, 0, 4 ] },
          " ",
          { "$substr": [ { "$hour": "$createdAt" }, 0, 4 ] },
          ":",
          { "$substr": [ { "$minute": "$createdAt" }, 0, 4 ] },
          ":00"
        ]
      };
  }

  function groupBySecondId() {
    return {
      "$concat": [
          { "$substr": [ { "$year": "$createdAt" }, 0, 4 ] },
          "-",
          { "$substr": [ { "$month": "$createdAt" }, 0, 4 ] },
          "-",
          { "$substr": [ { "$dayOfMonth": "$createdAt" }, 0, 4 ] },
          " ",
          { "$substr": [ { "$hour": "$createdAt" }, 0, 4 ] },
          ":",
          { "$substr": [ { "$minute": "$createdAt" }, 0, 4 ] },
          ":",
          { "$substr": [ { "$second": "$createdAt" }, 0, 4 ] },
        ]
      };
  }

  router.get('/export/:gameId/:authToken', confirmGameAuthorization, function(req, res, next) {
    var Session = req.game.getSessionModel();

    Session.find({}, function(err, sessions) {
      if (err)
        return next(err);

      res.json(sessions);
    });
  });

  router.get('/:gameId/:authToken', confirmGameAuthorization, function(req, res, next) {
    var Session = req.game.getSessionModel();

    var groupByTimeChunk = groupByDayId;

    if (req.query.time == "month") {
      groupByTimeChunk = groupByMonthId;
    } else if (req.query.time == "day") {
      groupByTimeChunk = groupByDayId;
    } else if (req.query.time == "hour") {
      groupByTimeChunk = groupByHourId;
    } else if (req.query.time == "minute") {
      groupByTimeChunk = groupByMinuteId;
    } else if (req.query.time == "second") {
      groupByTimeChunk = groupBySecondId;
    }

    function f1(cb) {
      Session.aggregate(
        [
          {
            $group : {
              "_id": groupByTimeChunk(),
              "count": { "$sum": 1 }
            }
          }
        ],
        function(err, results) {
          if (err)
            return cb(err);

          cb(null, results);
        }
      );
    }

    function f2(cb) {
      Session.aggregate(
        [
          {
            $group : {
              "_id": {
                "time": groupByTimeChunk(),
                "user": "$info.username"
              }
            }
          },
          {
            $group : {
              "_id": "$_id.time",
              "count": { "$sum": 1 }
            }
          }
        ],
        function(err, results) {
          if (err)
            return cb(err);

          cb(null, results);
        }
      );
    }

    // # games played
    function f3(cb) {
      Session.aggregate(
        [
          {
            $project: {
              "games": {
                $filter: {
                  input: '$tags',
                  as: 'item',
                  cond: {$eq: ['$$item.tag', 'game']}
                }
              },
              "createdAt": "$createdAt"
            }
          },
          {
            $group : {
              "_id": groupByTimeChunk(),
              "count": { "$sum": { "$size": "$games" } }
            }
          }
        ],
        function(err, results) {
          if (err)
            return cb(err);

          cb(null, results);
        }
      );
    }

    // wins per class
    function f4(cb) {
      Session.aggregate(
        [
          {
            $project: {
              "games": {
                $filter: {
                  input: '$tags',
                  as: 'item',
                  cond: {$eq: ['$$item.tag', 'game']}
                }
              },
              "createdAt": "$createdAt"
            }
          },
          {
            $unwind: {
              "path": "$games"
            }
          },
          {
            $group : {
              "_id": {
                time: groupByTimeChunk(),
                winner: "$games.winner"
              },
              "count": { "$sum": 1 }
            }
          }
        ],
        function(err, results) {
          if (err)
            return cb(err);

          // split into seperate data sets
          var datasets = {};
          for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var winner = result._id.winner;

            if (!(winner in datasets)) {
              datasets[winner] = [];
            }

            result._id = result._id.time;
            datasets[winner].push(result);
          }

          cb(null, datasets);
        }
      );
    }

    // avg session time
    function f5(cb) {
      Session.aggregate(
        [
          {
            $redact: {
              $cond: {
                if: { "$ifNull": [ "$endedAt", false ] },
                then: "$$KEEP",
                else: "$$PRUNE"
              }
            }
          },
          {
            $group : {
              "_id": groupByTimeChunk(),
              "count": {
                $avg: {
                  $divide: [{$subtract: ["$endedAt", "$createdAt"]}, 1000]
                }
              }
            }
          }
        ],
        function(err, results) {
          if (err)
            return cb(err);

          cb(null, results);
        }
      );
    }

    function f6(cb) {
      Session.find({}, function(err, sessions) {
        var mostRecentSession = sessions.length > 0 ? sessions[sessions.length -1] : null;

        cb(null, sessions);
      });
    }

    async.parallel([
      f1, f2, f3, f4, f5, f6
    ], function(err, results) {
      if (err)
        return next(err);

      var sessionsGrouped = results[0];
      var dailyActiveUsers = results[1];
      var gamesPlayed = results[2];
      var winsPerClass = results[3];
      var avgSessionTime = results[4];
      var sessions = results[5];

      var mostRecentSession = sessions.length > 0 ? sessions[sessions.length -1] : null;
      res.render('report', {avgSessionTime: avgSessionTime, winsPerClass: winsPerClass, game: req.game, sessionsGrouped: sessionsGrouped, mostRecentSession: mostRecentSession, sessions: sessions, dailyActiveUsers: dailyActiveUsers, gamesPlayed: gamesPlayed});
    });
  });

  return router;
}();

module.exports = router;
