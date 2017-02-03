var request = require('supertest');
var should = require('should');
var app = require('../app.js');
var util = require('util');
var mongoose = require('mongoose');
var Game = mongoose.model('Game');
var async = require('async');

describe('GET /', function() {
  it('responds 200', function(done) {
    request(app)
      .get('/')
      .expect(200, done);
  });
});

var newSessionRouteFormat = '/api/v1/new_session/%s/%s';
var tagRouteFormat = '/api/v1/tag/%s/%s/%s';

describe('Game model', function() {
  it('generates guid for auth token', function(done) {
    Game.create({name: 'game 1'}, {name: 'game 1'}, function(err, game1, game2) {
      if (err)
        return done(err);

      should.exist(game1);
      should.exist(game2);
      game1.authToken.should.not.equal(game2.authToken);
      done();
    });
  });
});

describe('POST /api/v1/new_session', function() {
  var game;

  beforeEach(function(done) {
    game = new Game({
      name: 'My Game',
      authToken: 'abc123'
    });

    game.save(done);
  });

  afterEach(function(done) {
    game.remove(done);
  });

  it('responds 401 if invalid game id', function(done) {
    request(app)
      .post(util.format(newSessionRouteFormat, mongoose.Types.ObjectId(), 'blah'))
      .expect(401, done);
  });

  it('responds 401 if invalid auth token', function(done) {
    request(app)
      .post(util.format(newSessionRouteFormat, game._id, 'blah'))
      .expect(401, done);
  });

  it('responds 200 if valid auth token', function(done) {
    request(app)
      .post(util.format(newSessionRouteFormat, game._id, game.authToken))
      .expect(200, done);
  });

  it('responds with session id', function(done) {
    request(app)
      .post(util.format(newSessionRouteFormat, game._id, game.authToken))
      .end(function(err, res) {
        if (err)
          return done(err);
        
        res.body.should.have.property('sessionId');
        done();
      });
  });
});

describe('POST /api/v1/tag', function() {
  var game, session, Session;

  beforeEach(function(done) {
    game = new Game({
      name: 'My Game',
      authToken: 'abc123'
    });

    async.series([
      function(cb) {
        game.save(cb)
      },
      function(cb) {
        Session = game.getSessionModel();

        session = new Session({
          gameId: game._id
        });
        session.save(cb)
      }
    ], done);
  });

  afterEach(function(done) {
    async.series([
      function(cb) {
        game.remove(cb)
      },
      function(cb) {
        session.remove(cb)
      }
    ], done);
  });

  it('responds 401 if invalid game id', function(done) {
    request(app)
      .post(util.format(tagRouteFormat, mongoose.Types.ObjectId(), 'blah', session._id))
      .expect(401, done);
  });

  it('responds 401 if invalid auth token', function(done) {
    request(app)
      .post(util.format(tagRouteFormat, game._id, 'blah', session._id))
      .expect(401, done);
  });

  it('responds 200 if valid auth token', function(done) {
    request(app)
      .post(util.format(tagRouteFormat, game._id, game.authToken, session._id))
      .expect(200, done);
  });

  it('accepts tag data', function(done) {
    var tag = {tag: 'game', player: ['rogue', 'mage'], moreData: { a: 1, b: 2}};

    request(app)
      .post(util.format(tagRouteFormat, game._id, game.authToken, session._id))
      .send(tag)
      .expect(200)
      .end(function(err, res) {
        if (err)
          return done(err);
        
        Session.findById(session._id, function(err, updatedSession) {
          if (err)
            return done(err);

          tag.should.eql(updatedSession.tags[0]);
          done();
        });
      });
  });
});
