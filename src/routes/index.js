import express from 'express';
const router = express.Router();
const glob = require('glob');
const fs = require('fs');
const tar = require('tar');
const moment = require('moment');
const { spawn }  = require('child_process');

router.get('/', function(req, res, next) {
  res.render('main', {title: 'CTT Sensor Station', message: 'pug' });
});

router.get('/crash', (req, res, next) => {
  // crash - bad variable
  throw(Error('throwing crash error'));
});

router.get('/sg-data-rotated', function(req, res, next) {
  glob('/data/SGdata/*/*.gz', (err, sg_files) => {
    if (sg_files.length < 1) {
      res.send('Nothing to download yet');
    }
    let tmp_file = '/tmp/download.tgz';
    if (fs.existsSync(tmp_file)) {
      fs.unlinkSync(tmp_file);
    }
    tar.c({
      gzip: true,
      file: tmp_file
    },
    sg_files).then(() => {
      let download_name = `sg-data-rotated.${moment(new Date()).format('YYYY-MM-DD_HHMMSS')}.tgz`;
      res.download(tmp_file, download_name);
    }).catch((err) => {
      console.log('error sending file...');
      console.error(err);
      res.send('ERROR '+err);
    });
  });
});

router.get('/sg-data-uploaded', function(req, res, next) {
  glob('/data/uploaded/sg/*.gz', (err, uploaded_files) => {
    if (uploaded_files.length < 1) {
      res.send('Nothing to download yet');
      return;
    }
    let tmp_file = '/tmp/download.tgz';
    if (fs.existsSync(tmp_file)) {
      fs.unlinkSync(tmp_file);
    }
    tar.c({
      gzip: true,
      file: tmp_file
    },
    uploaded_files).then(() => {
      let download_name = `sg-data-uploaded.${moment(new Date()).format('YYYY-MM-DD_HHMMSS')}.tgz`;
      res.download(tmp_file, download_name);
    }).catch((err) => {
      console.log('error sending file...');
      console.error(err);
      res.send('ERROR '+err);
    });
  });
});

router.get('/ctt-data-rotated', function(req, res, next) {
  glob('/data/rotated/*.gz', (err, ctt_files) => {
    if (ctt_files.length < 1) {
      res.send('Nothing to download yet');
      return;
    }
    let tmp_file = '/tmp/download.tgz';
    if (fs.existsSync(tmp_file)) {
      fs.unlinkSync(tmp_file);
    }
    tar.c({
      gzip: true,
      file: tmp_file
    },
    ctt_files).then(() => {
      let download_name = `ctt-data-rotated.${moment(new Date()).format('YYYY-MM-DD_HHMMSS')}.tgz`;
      res.download(tmp_file, download_name);
    }).catch((err) => {
      console.log('error sending file...');
      console.error(err);
      res.send('ERROR '+err);
    });
  });
});

router.get('/ctt-data-uploaded', function(req, res, next) {
  glob('/data/uploaded/ctt/*.gz', (err, uploaded_files) => {
    if (uploaded_files.length < 1) {
      res.send('Nothing to download yet');
      return;
    }
    let tmp_file = '/tmp/download.tgz';
    if (fs.existsSync(tmp_file)) {
      fs.unlinkSync(tmp_file);
    }
    tar.c({
      gzip: true,
      file: tmp_file
    },
    uploaded_files).then(() => {
      let download_name = `ctt-data-uploaded.${moment(new Date()).format('YYYY-MM-DD_HHMMSS')}.tgz`;
      res.download(tmp_file, download_name);
    }).catch((err) => {
      console.log('error sending file...');
      console.error(err);
      res.send('ERROR '+err);
    });
  });
});

router.post('/delete-ctt-data-uploaded', (req, res, next) => {
  glob('/data/uploaded/ctt/*.gz', (err, uploaded_files) => {
    uploaded_files.forEach((filename) => {
      fs.unlinkSync(filename);
    });
    res.json({res: true});
  });
});

router.post('/delete-ctt-data-rotated', (req, res, next) => {
  glob('/data/rotated/*.gz', (err, uploaded_files) => {
    uploaded_files.forEach((filename) => {
      fs.unlinkSync(filename);
    });
    res.json({res: true});
  });
});

router.post('/delete-sg-data-uploaded', (req, res, next) => {
  glob('/data/uploaded/sg/*.gz', (err, uploaded_files) => {
    uploaded_files.forEach((filename) => {
      fs.unlinkSync(filename);
    });
    res.json({res: true});
  });
});

router.post('/delete-sg-data-rotated', (req, res, next) => {
  let now = new Date();
  glob('/data/SGdata/*/*.gz', (err, uploaded_files) => {
    uploaded_files.forEach((filename) => {
      let file_info = fs.statSync(filename);
      if ((now-file_info.mtime) > 1000*60*61) {
        fs.unlinkSync(filename);
      } else {
        console.log('ignoring file for delete', filename);
      }
    });
    res.json({res: true});
  });
});

router.post('/clear-log/', (req, res, next) => {
  let log_file = '/data/sensor-station.log';
  if (fs.existsSync(log_file)) {
    fs.unlinkSync(log_file);
    res.send(JSON.stringify({res: true}));
  }
  res.send(JSON.stringify({res: false}));
});

router.get('/chrony', (req, res, next) => {
  const cmd = spawn('chronyc', ['sources', '-v']);
  let buffer = '';
  cmd.stdout.on('data', (data) => {
    buffer += data.toString();
  });
  cmd.on('close', () => {
    res.send(buffer);
  });
});

router.get('/reboot', (req, res, next) => {
  const reboot = spawn('shutdown', ['-r', 'now']);
  reboot.stdout.on('data', (data) => {
    console.log('data', data.toString());
  });
  reboot.stderr.on('data', (data) => {
    console.log('err', data.toString());
  })
  res.send('rebooting');
});
module.exports = router;
