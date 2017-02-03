require( './models/game.js' );

var express = require('express');
var engine   = require('ejs-locals');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var flash    = require('connect-flash');
var session      = require('express-session');

var api = require('./routes/api');
var report = require('./routes/report');

var app = express();

var configDB = require('./config/database.js');

var isTesting = typeof global.it === 'function';
mongoose.connect(isTesting ? configDB.testUrl : configDB.url);

app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', engine);
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ secret: 'ilovescotchscotchyscotchscotch' })); // session secret

app.use(flash()); // use connect-flash for flash messages stored in session
app.use(function(req, res, next){
  res.locals.successMessages = req.flash('successMessages');
  res.locals.errorMessages = req.flash('errorMessages');
  next();
});

app.get('/', function(req, res, next) {
  res.render('index', { title: 'Index' });
});
app.use('/api/v1', api);
app.use('/reports', report);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.set('port', process.env.PORT || 3000);

module.exports = app;
