let beeps = [];
let tags = new Set();
let nodes = {};
let beep_hist = {};

const DATE_FMT = 'YYYY-MM-DD HH:mm:ss';
let socket;

const setText = function(tag, value) {
  let id = '#'+tag;
  document.querySelector(id).textContent = value;
};

const clear_table = function(table) {
  while (table.firstChild.nextSibling) {
    table.removeChild(table.firstChild.nextSibling);
  }
};

const clear = function() {
  beeps = [];
  nodes = {};
  tags.clear();
  beep_hist = {};

  document.querySelectorAll('.radio').forEach(function(radio_table)  {
    clear_table(radio_table);
    clear_table(document.querySelector('#tags'));
  });
};

const initialize_controls = function() {
  /*
  document.querySelector('#upload-files').addEventListener('click', function(evt) {
    socket.send(JSON.stringify({
      msg_type: 'cmd', 
      cmd: 'upload', 
      data: {}
    }));
    document.querySelector('#upload-files').setAttribute('disabled', true);
  });
  */
  document.querySelectorAll('button[name="toggle_node_radio"]').forEach((btn) => {
    btn.addEventListener('click', function(e) {
      let radio_id = e.target.getAttribute('value');
      let res = window.confirm('Are you sure you want to toggle NODE listening mode for radio '+radio_id+'?');
      if (res) {
        socket.send(JSON.stringify({
          msg_type: 'cmd', 
          cmd: 'toggle_radio', 
          data: {
            type: 'node',
            channel: radio_id
          }
        }));
      }
    });
  });
  document.querySelectorAll('button[name="toggle_tag_radio"]').forEach((btn) => {
    btn.addEventListener('click', function(e) {
      let radio_id = e.target.getAttribute('value');
      let res = window.confirm('Are you sure you want to toggle TAG listening mode for radio '+radio_id+'?');
      if (res) {
        socket.send(JSON.stringify({
          msg_type: 'cmd', 
          cmd: 'toggle_radio', 
          data: {
            type: 'tag',
            channel: radio_id
          }
        }));
      }
    });
  });
  document.querySelector('#save-radios').addEventListener('click', (evt) => {
    let res = window.confirm('Are you sure you want to save the current radio configuration?');
    if (res) {
      socket.send(JSON.stringify({
        msg_type: 'cmd',
        cmd: 'save_radio',
        data: {}
      }));
    }
  });
  document.querySelectorAll('button[name="toggle_ook_radio"]').forEach((btn) => {
    btn.addEventListener('click', function(e) {
      let radio_id = e.target.getAttribute('value');
      let res = window.confirm('Are you sure you want to toggle OOK listening mode for radio '+radio_id+'?');
      if (res) {
        socket.send(JSON.stringify({
          msg_type: 'cmd', 
          cmd: 'toggle_radio', 
          data: {
            type: 'ook',
            channel: radio_id
          }
        }));
      }
    });
  });
  document.querySelector('#clear').addEventListener('click', (evt) => {
    clear();
  });
  document.querySelector('#reboot').addEventListener('click', (evt) => {
    let res = window.confirm('Are you sure you want to reboot?');
    if (res) {
      $.ajax({
        url: '/reboot',
        method: 'post',
        success: function(data) {
          alert('rebooting');
        },
        error: function(err) {
          alert('error trying to reboot', err.toString());
        }
      });
    }
  });
  document.querySelector('#clear-log').addEventListener('click', (evt) => {
    let res = window.confirm('Are you sure you want to clear the log file?');
    if (res) {
      $.ajax({
        url: '/clear-log',
        method: 'post',
        success: function(data) {
          alert('Clear Log Success');
        },
        error: function(err) {
          alert('error clearing log file', err.toString());
        }
      });
    }
  });
  document.querySelector('#save-deployment').addEventListener('click', (evt) => {
    let data = document.querySelector('#sg-deployment');
    $.ajax({
      url: '/save-sg-deployment',
      method: 'post',
      data: {
        contents: data.value
      },
      success: function(data) {
        alert('saved sg deployment file to disk');
      },
      error: function(err) {
        alert('error saving sg deployment file '+err.toString());
      }
    });
  });
  document.querySelector('#server-checkin').addEventListener('click', function(evt) {
    socket.send(JSON.stringify({
      msg_type: 'cmd', 
      cmd: 'checkin', 
      data: {}
    }));
    document.querySelector('#server-checkin').setAttribute('disabled', true);
    setTimeout(function() {
      document.querySelector('#server-checkin').removeAttribute('disabled');
    }, 5000)
  });
  document.querySelectorAll('button[name="delete-data"]').forEach((btn) => {
    btn.addEventListener('click', (evt) => {
      let dataset = evt.target.value;
      let result = window.confirm('Are you sure you want to delete all files for '+dataset);
      let url;
      if (result) {
        switch(dataset) {
          case('ctt-uploaded'):
          url = '/delete-ctt-data-uploaded';
          break;
          case('ctt-rotated'):
          url = '/delete-ctt-data-rotated';
          break;
          case('sg-uploaded'):
          url = '/delete-sg-data-uploaded';
          break;
          case('sg-rotated'):
          url = '/delete-sg-data-rotated';
          break;
          default:
            alert('invalid dataset to delete');
        }
        $.ajax({
          url: url,
          method: 'post',
          success: function(data) {
            if (data.res) {
              alert('delete success');
            }
          },
          error: function(err) {
            alert('error deleting files', err.toString());
          }
        });
        return;
      } 
    });
  });
};

const format_beep = function(beep) {
  if (beep.data) {
    let tag_id, rssi, node_id, tag_at;
    let beep_at = moment(new Date(beep.received_at)).utc();
    tag_at = beep_at;
    if (beep.protocol) {
      // new protocol
      if (beep.meta.data_type == 'node_coded_id') {
        node_id = beep.meta.source.id;
        rssi = beep.data.rssi;
        tag_id =beep.data.id;
        tag_at = moment(new Date(beep.data.rec_at*1000));
      }
      if (beep.meta.data_type == 'coded_id') {
        rssi = beep.meta.rssi;
        tag_id = beep.data.id;
        tag_at = beep_at;
      }
    }

    if (beep.data.tag) {
      tag_id = beep.data.tag.id;
      rssi = beep.rssi;
    }
    if (beep.data.node_tag) {
      tag_id = beep.data.node_tag.tag_id;
      rssi = beep.data.node_beep.tag_rssi;
      node_id = beep.data.node_beep.id;
      tag_at = beep_at.subtract(beep.data.node_beep.offset_ms)
    }

    let data = {
      tag_id: tag_id,
      node_id: node_id,
      rssi: rssi,
      channel: beep.channel,
      received_at: beep_at,
      tag_at: tag_at
    }
    return data
  }
}

const format_node_health = function(msg) {
  let node_id, rssi, batt, temp, fw, sol_v, sol_ma, sum_sol_ma, fix_at, lat, lng;
  if (msg.protocol) {
    node_id = msg.meta.source.id;
    fw = msg.data.fw;
    rssi = msg.meta.rssi;
    lat = msg.data.lat / 1000000;
    lng = msg.data.lon / 1000000;
    batt = msg.data.bat_v / 100;
    sol_v = msg.data.sol_v;
    sol_ma = msg.data.sol_ma;
    sum_sol_ma = msg.data.sum_sol_ma;
    temp_c = msg.data.temp_c;
    fix_at = moment(new Date(msg.data.fix_at*1000)).utc();
  }
  if (msg.data.node_alive) {
    node_id = msg.data.node_alive.id;
    rssi = msg.rssi;
    batt = msg.data.node_alive.battery_mv / 1000;
    temp_c = msg.data.node_alive.celsius;
    fw = msg.data.node_alive.firmware;
  }
  let data = {
    node_id: node_id,
    fw: fw,
    rssi: rssi,
    lat: lat,
    lng: lng,
    battery: batt,
    sol_v: sol_v,
    sol_ma: sol_ma,
    sum_sol_ma: sum_sol_ma,
    fix_at: fix_at,
    received_at: moment(new Date(msg.received_at)).utc(),
    channel: msg.channel
  }
  return data;
}


const handle_beep = function(beep) {
  if (beep.protocol) {
    switch(beep.meta.data_type) {
      case 'coded_id':
        handle_tag_beep(format_beep(beep));
        break;
      case 'node_coded_id':
        handle_tag_beep(format_beep(beep));
        break;
      case 'node_health':
        break;
      default:
        break;
    }
    return;
  }
  if (beep.data) {
    if (beep.data.node_alive) {
      return;
    }
    if (beep.data.node_beep) {
      handle_tag_beep(format_beep(beep));
    }
  }
};

const handle_tag_beep = function(beep) {
  let validated = false;
  let tag_id = beep.tag_id;
  if (tag_id.length > 8) {
    tag_id = tag_id.slice(0,8);
    validated = true;
  }
  let BEEP_TABLE = document.querySelector('#radio_'+beep.channel);
  let tr = document.createElement('tr');
  if (validated == true) {
    tr.style.border= "2px solid #22dd22";
  } else {
    tr.style.border= "2px solid red";
  }
  let td = document.createElement('td');
  td.textContent = beep.tag_at.format(DATE_FMT);
  tr.appendChild(td);
  let alias = localStorage.getItem(tag_id);
  if (alias) {
    tr.appendChild(createElement(alias));
  } else {
    tr.appendChild(createElement(tag_id));
  }
  tr.appendChild(createElement(beep.rssi));
  tr.appendChild(createElement(beep.node_id));
  BEEP_TABLE.insertBefore(tr, BEEP_TABLE.firstChild.nextSibling);
  beeps.push(beep);
  let beep_count = beep_hist[tag_id];
  if (tags.has(tag_id)) {
    beep_hist[tag_id] += 1;
    document.querySelector('#cnt_'+tag_id).textContent = beep_hist[tag_id];
  } else {
    beep_hist[tag_id] = 1;
    tags.add(tag_id);
    let TAG_TABLE = document.querySelector('#tags');
    tr = document.createElement('tr');
    td = createElement(tag_id);
    tr.appendChild(td);
    td = document.createElement('td');
    td.setAttribute('id','cnt_'+tag_id);
    td.textContent = beep_hist[tag_id];
    tr.appendChild(td);
    let input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('class', 'form-input');
    let alias = localStorage.getItem(tag_id);
    if (alias) {
      input.setAttribute('value', alias);
    }
    td = document.createElement('td');
    td.appendChild(input);
    tr.appendChild(td);
    td = document.createElement('td');
    let button = document.createElement('button');
    button.setAttribute('class', 'btn btn-sm btn-primary tag-alias');
    button.textContent='Update';
    button.setAttribute('value', tag_id);
    button.addEventListener('click', (evt) => {
      let tag_id = evt.target.getAttribute('value');
      let alias = evt.target.parentElement.previousSibling.firstChild.value;
      localStorage.setItem(tag_id, alias);
    });
    td.appendChild(button);
    tr.appendChild(td);

    button = document.createElement('button');
    button.setAttribute('class', 'btn btn-sm btn-danger');
    button.textContent='Remove';
    button.addEventListener('click', (evt) => {
      x = evt;
      let row = evt.target.parentElement.parentElement;
      let tag_id = row.firstChild.firstChild.textContent
      tags.delete(tag_id);
      row.remove();
    });
    td = document.createElement('td');
    td.appendChild(button);
    tr.appendChild(td);

    TAG_TABLE.appendChild(tr);
    //TAG_TABLE.insertBefore(tr, TAG_TABLE.firstChild.nextSibling);
  }

};
const createElement = function(text) {
  let td = document.createElement('td');
  td.textContent = text;
  return td;
};

const handle_stats = function(stats) {
  let record;
  let reports = {};
  let received_at, old_received_at;
  let n = 0;
  let channel_stats = {}
  Object.keys(stats.channels).forEach(function(channel) {
    let channel_data = stats.channels[channel];
    Object.keys(channel_data.nodes.health).forEach(function(node_id) {
      record = channel_data.nodes.health[node_id];
      received_at = moment(record.Time);
      if (reports[node_id]) {
        old_received_at = moment(reports[node_id].Time);
        if (received_at > old_received_at) {
          // this is newer - use this instead
          reports[node_id] = record;
        }
      } else {
        // new node id - use this report
        reports[node_id] = record;
      }
    });
    n = 0;
    let beeps, node_beeps, telemetry_beeps;
    Object.keys(channel_data.beeps).forEach(function(tag_id) {
      n += channel_data.beeps[tag_id];
    });
    beeps = n;
    n = 0;
    Object.keys(channel_data.nodes.beeps).forEach(function(tag_id) {
      n += channel_data.nodes.beeps[tag_id];
    });
    node_beeps = n;
    n = 0;
    Object.keys(channel_data.telemetry).forEach(function(tag_id) {
      n += channel_data.telemetry[tag_id];
    });
    telemetry_beeps = n;
    channel_stats[channel] = {
      beeps: beeps,
      node_beeps: node_beeps,
      telemetry_beeps: telemetry_beeps
    };
  });
  render_nodes(reports);
  render_channel_stats(channel_stats);
};

const render_channel_stats = function(channel_stats) {
  let beep_info, node_beep_info, telemetry_beep_info;
  Object.keys(channel_stats).forEach(function(channel) {
    beep_info= `#beep_count_${channel}`;
    node_beep_info= `#node_beep_count_${channel}`;
    telemetry_beep_info= `#telemetry_beep_count_${channel}`;
    let stats = channel_stats[channel];
    document.querySelector(beep_info).textContent = stats.beeps;
    document.querySelector(node_beep_info).textContent = stats.node_beeps;
    document.querySelector(telemetry_beep_info).textContent = stats.telemetry_beeps;
  });
};

const render_nodes = function(reports) {
  let NODE_TABLE = document.querySelector('#node-history');
  while (NODE_TABLE.firstChild.nextSibling) {
    NODE_TABLE.removeChild(NODE_TABLE.firstChild.nextSibling);
  }
  let report;
  let tr, td;
  Object.keys(reports).forEach(function(node_id) {
    report = reports[node_id];
    tr = document.createElement('tr');
    tr.appendChild(createElement(node_id));
    tr.appendChild(createElement(moment(report.Time).format(DATE_FMT)));
    tr.appendChild(createElement(report.NodeRSSI));
    tr.appendChild(createElement(report.Battery));
    tr.appendChild(createElement(report.Firmware));
    tr.appendChild(createElement(report.Latitude));
    tr.appendChild(createElement(report.Longitude));
    tr.appendChild(createElement(moment(report.RecordedAt).format(DATE_FMT)));
    NODE_TABLE.appendChild(tr);
  });
};

const render_pie = function(id, data) {
  $(id).highcharts({
    chart: {
      backgroundColor: '#FcFFC5',
      type: 'pie'
    },
    plotOptions: {
      pie: {
        dataLabels: {
          enabled: false
        }
      }
    },
    title: {
      text: ''
    },
    credits: {
      enabled: false
    },
    series: data
  });
};

const render_mem_chart = function(free, used) {
  let data = [{
    name: 'Memory Usage',
    data: [{
      name: 'Free',
      y: free
    },{
      name: 'Used',
      y: used
    }]
  }];
  render_pie('#mem-chart', data);
};

const render_cpu_chart = function(load_avg) {
  let data = [{
    name: '15 Minute CPU Load Average',
    data: [{
      name: 'Used',
      y: load_avg*100, 
    },{
      name: 'Free CPU',
      y: (1-load_avg)*100 
    }]
  }];
  render_pie('#cpu-chart', data);
};

const render_tag_hist = function() {
  setInterval(function() {
    let tag_ids = [];
    let sorted_keys = Object.keys(beep_hist).sort(function(a,b) {
      if (a < b) {
        return -1;
      }
      return 1;
    });
    let values = [];
    sorted_keys.forEach(function(tag) {
      let count;
      let alias = localStorage.getItem(tag);
      if (!alias) {
        alias = tag;
      }

      count = beep_hist[tag];
      if (count > 5) {
        tag_ids.push(alias);
        values.push(count);
      }
    });

    $('#tag_hist').highcharts({
      chart: {
        type: 'column'
      },
      title: {
        text: ''
      },
      xAxis: {
        categories: tag_ids,
        crosshair: true
      },
      yAxis: {
        min: 0,
        title: {
          text: 'Count'
        }
      },
      credits: {
        enabled: false
      },
      legend: {
        enabled: false
      },
      series: [{
        name: 'Hist',
        data: values
      }]
    });
  }, 10000);
};

let RAW_LOG;
const updateStats = function() {
  socket.send(JSON.stringify({
    msg_type: 'cmd',
    cmd: 'about'
  }));
  socket.send(JSON.stringify({
    msg_type: 'cmd',
    cmd: 'stats'
  }));
};

const initialize_websocket = function() {
  let url = 'ws://'+window.location.hostname+':8001';
  socket = new WebSocket(url);
  socket.addEventListener('close', (event) => {
    alert('station connection disconnected');
  });
  socket.addEventListener('open', (event) => {
    updateStats();
    setInterval(updateStats, 10000);
  });
  socket.onmessage = function(msg) {
    let data = JSON.parse(msg.data);
    let tr, td;
    switch(data.msg_type) {
    case('beep'):
      handle_beep(data);
      break;

    case('stats'):
      handle_stats(data);
      break;
    case('about'):
      let about = data;
      document.querySelector('#station-id').textContent = about.station_id;
      document.querySelector('#station-image').textContent = about.station_image;
      document.querySelector('#software-start').textContent = moment(about.begin).format(DATE_FMT);
      document.querySelector('#serial').textContent = about.serial;
      document.querySelector('#hardware').textContent = about.hardware;
      document.querySelector('#revision').textContent = about.revision;
      document.querySelector('#bootcount').textContent = about.bootcount;
      let total = Math.round(about.total_mem / 1024 / 1024.0);
      let free = Math.round(about.free_mem/ 1024/1024.0);
      let used = total - free;
      render_mem_chart(free, used);
      render_cpu_chart(about.loadavg_15min);
      setText('memory',  used+' MB of '+total+' MB used');
      setText('uptime', moment(new Date()).subtract(about.uptime, 's'));
      break;
    case('log'):
      tr = document.createElement('tr');
      td = document.createElement('td');
      td.textContent = moment(new Date()).utc().format(DATE_FMT);
      tr.appendChild(td);
      td = document.createElement('td');
      td.textContent = data.data;
      tr.appendChild(td);
      RAW_LOG.insertBefore(tr, RAW_LOG.firstChild.nextSibling);
      break;
    case('node-alive'):
      console.log(data);
      break;
    case('gps'):
      setText('lat', data.gps.lat.toFixed(6));
      setText('lng', data.gps.lon.toFixed(6));
      setText('time', moment(new Date(data.gps.time)));
      setText('alt', data.gps.alt);
      let n = 0;
      data.sky.satellites.forEach((sat) => {
        if (sat.used == true) n += 1;
      });
      setText('nsats', `${n} of ${data.sky.satellites.length} used`);
      break;
    case('fw'):
      document.querySelector('#raw_log').value += data.data
    default:
      console.log('WTF dunno', data);

//      document.querySelector('#raw_gps').textContent = JSON.stringify(data, null, 2);
    }
  };
};

const updateChrony = function() {
  $.ajax({
    url: '/chrony',
    method: 'get',
    success: function(data) {
      document.querySelector('#chrony').textContent= data;
    },
    error: function(err) {
      console.error(err);
    }
  });
};

const get_config = function() {
  $.ajax({
    url: '/config',
    success: function(contents) {
      console.log('got config');
      console.log(contents);
      let i=0;
      let radio_id, value;
      contents.radios.forEach(function(radio) {
        i++;
        radio_id = "#config_radio_"+i;
        switch (radio.config[0]) {
          case "preset:node3":
            value = "Node";
            break;
          case "preset:fsktag":
            value = "Tag";
            break;
          case "preset:ooktag":
            value = "Original Tag"
            break;
          default:
            value = "Custom Mode"
            break;
        }
        console.log('setting', radio_id, value);
        document.querySelector(radio_id).textContent = value;
      });
       
    }
  })
};

(function() {
  document.querySelector('#sg_link').setAttribute('href', 'http://'+window.location.hostname+':3010');
  initialize_websocket();
  initialize_controls();
  get_config();
  render_tag_hist();
  RAW_LOG = document.querySelector('#raw_log');
  updateChrony();
  setInterval(updateChrony, 30000);
  $.ajax({
    url: '/sg-deployment',
    success: function(contents) {
      document.querySelector('#sg-deployment').value = contents;
    }
  });
})();