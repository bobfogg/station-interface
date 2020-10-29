var express = require('express');
var path = require('path');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var app = express();
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/highcharts', express.static(path.join(__dirname, '../node_modules/highcharts')));
app.use('/bootstrap', express.static(path.join(__dirname, '../node_modules/bootstrap')));
app.use('/jquery', express.static(path.join(__dirname, '../node_modules/jquery')));
app.use('/moment', express.static(path.join(__dirname, '../node_modules/moment')));

app.use('/', indexRouter);

app.use((req, res, next) => {
  res.sendStatus(404)
});

module.exports = app;
