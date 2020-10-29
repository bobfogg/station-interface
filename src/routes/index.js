import express from 'express';
import { readSync } from 'fs';
const router = express.Router();
const glob = require('glob');
const fs = require('fs');
const moment = require('moment');
const { spawn }  = require('child_process');
const archiver = require('archiver');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const TMP_FILE = '/tmp/download.zip';
const SG_DEPLOYMENT_FILE = '/data/sg_files/deployment.txt';
const LOG_FILE = '/data/sensor-station.log';
const ConfigFileURI = '/etc/ctt/station-config.json';

router.get('/', function(req, res, next) {
  res.render('main', {title: 'CTT Sensor Station', message: 'pug' });
});

router.get('/update-station', function(req, res, next) {
  res.render('station-update');
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

router.get('/ctt-data-current', (req, res, next) => {
  glob('/data/*.csv', (err, filelist) => {
    if (filelist.length < 1) {
      res.send('No data available');
      return;
    }
    prepareData(filelist).then((prepare_result) => {
      let download_name = `ctt-data.${moment(new Date()).format('YYYY-MM-DD_HHMMSS')}.zip`;
      res.download(TMP_FILE, download_name);
    }).catch((err) => {
      next(err);
    });
  });
});

router.get('/ctt-logfile', (req, res, next) => {
  glob('/data/CTT-*-log.csv', (err, filelist) => {
    if (filelist.length < 1) {
      res.send('no log file to send');
      return;
    }
    prepareData(filelist).then((prepare_result) => {
      let download_name = `ctt-log.${moment(new Date()).format('YYYY-MM-DD_HHMMSS')}.zip`;
      res.download(TMP_FILE, download_name);
    }).catch((err) => {
      res.send('error preparing ctt log files '+err);
    });
  });
});

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
  glob('/data/uploaded/sg/*/*.gz', (err, filelist) => {
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
  glob('/data/uploaded/ctt/*/*.gz', (err, filelist) => {
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
    return;
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

router.post('/reboot', (req, res, next) => {
  const reboot = spawn('shutdown', ['-r', 'now']);
  reboot.stdout.on('data', (data) => {
    console.log('data', data.toString());
  });
  reboot.stderr.on('data', (data) => {
    console.log('err', data.toString());
  })
  res.send('rebooting');
});

router.get('/update', (req, res, next) => {
  res.render('update', {title: 'CTT Sensor Station Update', message: 'pug' });
});

router.use(bodyParser.raw({
  limit: '50mb'
}));

router.post('/update', (req, res, next) => {
  let contents = req.body.toString();
  fs.writeFile('/tmp/update.sh',contents, (err) => {
    if (err) {
      res.send('error writing update file');
      return;
    } else {
      const cmd  = spawn('/bin/bash', ['/tmp/update.sh']);
      cmd.on('error', (err) => {
        console.error(err);
      });
      cmd.stdout.on('data', (data) => {
        console.log(data);
      });
      cmd.stderr.on('data', (data) => {
        console.log('error', data);
      });

      cmd.on('close', () => {
        res.send('updating');
      });
    }
  });
});

router.get('/config', (req, res, next) => {
  try {
    let config = JSON.parse(fs.readFileSync(ConfigFileURI).toString());
    res.json(config);
  } catch (err) {
    res.json({err: err.toString()});
  }
});

router.post('/radio-restart', (req, res) => {
  const cmd  = spawn('/usr/local/bin/pm2', ['restart', 'station-radio-interface']); 
  console.log('issuing radio restart')
  cmd.on('error', (err) => {
    console.error(error);
    res.sendStatus(500)
  })
  cmd.stdout.on('data', (data) => {
    console.log(data.toString())
  })
  cmd.on('close', () => {
    res.sendStatus(204)
  })
})

const HardwareRouter = (req, res, next) => {
  let url = 'http://localhost:3000' + req.originalUrl;
  fetch(url, { method: 'post'})
    .then((hardware_response) => {
      res.status(hardware_response.status).send();
    })
    .catch((err) => {
      res.status(500).send('hardware proxy error');
    });
}

router.post('/modem/start', HardwareRouter);
router.post('/modem/stop', HardwareRouter);
router.post('/modem/enable', HardwareRouter);
router.post('/modem/disable', HardwareRouter);

module.exports = router;
