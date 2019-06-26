import express from 'express';
const router = express.Router();

router.get('/', function(req, res, next) {
  res.render('test', {title: 'CTT Sensor Station', message: 'pug' });
});

module.exports = router;
