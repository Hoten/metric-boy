var express = require('express');
var mongoose = require('mongoose');
var Game = mongoose.model('Game');
var util = require('util');

var router = function(){
  var router = express.Router();

  router.post('/new_game', function(req, res, next) {
    console.log(req.body);
    var game = new Game({
      name: req.body.name
    });

    game.save(function(err) {
      if (err) {
        req.flash('errorMessages', err.toString());
        res.redirect('/');
        return;
      }

      req.flash('successMessages', 'Created Game Token. Bookmark this page.');
      res.redirect(util.format('/reports/%s/%s', game._id, game.authToken));
    });
  });

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

  function getSession(req, res, next) {
    var Session = req.game.getSessionModel();

    Session.findById(req.params.sessionId, function(err, session) {
      if (err)
        return next(err);

      if (session) {
        req.gameSession = session;
        next();
      } else {
        res.status(401);
        res.send('Invalid session id');
      }
    });
  }

  router.post('/new_session/:gameId/:authToken', confirmGameAuthorization, function(req, res, next) {
    var Session = req.game.getSessionModel();

    var session = new Session({
      info: req.body
    });

    session.save(function(err) {
      if (err)
        return next(err);

      res.json({
        sessionId: session._id
      });
    });
  });

  router.post('/tag/:gameId/:authToken/:sessionId', confirmGameAuthorization, getSession, function(req, res, next) {
    var tag = req.body;
    var session = req.gameSession;

    session.tags.push(tag);
    session.save(function(err) {
      if (err)
        return done(err);

      res.json(tag);
    });
  });

  router.post('/end_session/:gameId/:authToken/:sessionId', confirmGameAuthorization, getSession, function(req, res, next) {
    var tag = req.body;
    var session = req.gameSession;

    session.endedAt = new Date();
    session.save(function(err) {
      if (err)
        return done(err);

      res.json(tag);
    });
  });

  return router;
}();

module.exports = router;
