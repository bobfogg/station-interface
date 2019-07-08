import express from 'express';
import { readSync } from 'fs';
const router = express.Router();
const glob = require('glob');
const fs = require('fs');
const moment = require('moment');
const { spawn }  = require('child_process');
const archiver = require('archiver');

const TMP_FILE = '/tmp/download.zip';
const SG_DEPLOYMENT_FILE = '/data/sg_files/deployment.txt'

router.get('/', function(req, res, next) {
  res.render('main', {title: 'CTT Sensor Station', message: 'pug' });
});

router.get('/crash', (req, res, next) => {
  // crash - bad variable
  throw(Error('throwing crash error'));
});

router.get('/sg-deployment', (req,res,next) => {
  fs.readFile(SG_DEPLOYMENT_FILE, (err, contents) => {
    if (err) {
      next(err);
    } else { 
      res.send(contents);
    }
  });
});

router.post('/save-sg-deployment', (req, res, next) => {
  fs.writeFile(SG_DEPLOYMENT_FILE, req.body.contents, (err) => {
    if (err) {
      next(err);
    } else {
      console.log('saved data');
      res.json({res: true});
    }
  });
});

const prepareData = (filelist) => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(TMP_FILE)) {
      fs.unlinkSync(TMP_FILE);
    }
    let output = fs.createWriteStream(TMP_FILE);
    output.on('close', () => {
      resolve(true);
    });
    output.on('error', (err) => {
      reject(err);
    });
    var archive = archiver('zip', {
      zlip: { level: 9 }
    });
    archive.on('error', (err) => {
      reject(err);
    });
    archive.pipe(output);
    filelist.forEach((filename) => {
      archive.file(filename, { name: filename});
    });
    archive.finalize();
  });
};

router.get('/sg-data-rotated', function(req, res, next) {
  glob('/data/SGdata/*/*.gz', (err, filelist) => {
    if (filelist.length < 1) {
      res.send('Nothing to download yet');
      return;
    }
    prepareData(filelist).then((prepare_result) => {
      let download_name = `sg-data-uploaded.${moment(new Date()).format('YYYY-MM-DD_HHMMSS')}.zip`;
      res.download(TMP_FILE, download_name);
    }).catch((err) => {
      res.send('ERROR processing download request '+err);
    });
  });
});

router.get('/sg-data-uploaded', function(req, res, next) {
  glob('/data/uploaded/sg/*.gz', (err, filelist) => {
    if (filelist.length < 1) {
      res.send('Nothing to download yet');
      return;
    }
    prepareData(filelist).then((prepare_result) => {
      let download_name = `sg-data-uploaded.${moment(new Date()).format('YYYY-MM-DD_HHMMSS')}.zip`;
      res.download(TMP_FILE, download_name);
    }).catch((err) => {
      res.send('ERROR processing download request '+err);
    });
  });
});

router.get('/ctt-data-rotated', function(req, res, next) {
  glob('/data/rotated/*.gz', (err, filelist) => {
    if (filelist.length < 1) {
      res.send('Nothing to download yet');
      return;
    }
    prepareData(filelist).then((prepare_result) => {
      let download_name = `ctt-data-rotated.${moment(new Date()).format('YYYY-MM-DD_HHMMSS')}.zip`;
      res.download(TMP_FILE, download_name);
    }).catch((err) => {
      res.send('ERROR processing download request '+err);
    });
  });
});

router.get('/ctt-data-uploaded', function(req, res, next) {
  glob('/data/uploaded/ctt/*.gz', (err, filelist) => {
    if (filelist.length < 1) {
      res.send('Nothing to download yet');
      return;
    }
    prepareData(filelist).then((prepare_result) => {
      let download_name = `ctt-data-uploaded.${moment(new Date()).format('YYYY-MM-DD_HHMMSS')}.zip`;
      res.download(TMP_FILE, download_name);
    }).catch((err) => {
      res.send('ERROR processing download request '+err);
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
