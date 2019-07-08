let beeps = [];
let tags = new Set();
let nodes = {};
let beep_hist = {};

const DATE_FMT = 'YYYY-MM-DD HH:mm:ss';
let socket;
let sg_socket;

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
    console.log('about to clear', radio_table);
    clear_table(radio_table);
    clear_table(document.querySelector('#tags'));
  });
};

const initialize_controls = function() {
  document.querySelectorAll('button[name="toggle_node_radio"]').forEach((btn) => {
    btn.addEventListener('click', function(e) {
      let radio_id = e.target.getAttribute('value');
      socket.send(JSON.stringify({
        msg_type: 'cmd', 
        cmd: 'toggle_radio', 
        data: {
          type: 'node',
          channel: radio_id
        }
      }));
    });
  });
  document.querySelectorAll('button[name="toggle_tag_radio"]').forEach((btn) => {
    btn.addEventListener('click', function(e) {
      let radio_id = e.target.getAttribute('value');
      socket.send(JSON.stringify({
        msg_type: 'cmd', 
        cmd: 'toggle_radio', 
        data: {
          type: 'tag',
          channel: radio_id
        }
      }));
    });
  });
  document.querySelector('#save-radios').addEventListener('click', (evt) => {
    socket.send(JSON.stringify({
      msg_type: 'cmd',
      cmd: 'save_radio',
      data: {}
    }));
  });
  document.querySelectorAll('button[name="toggle_cornell_radio"]').forEach((btn) => {
    btn.addEventListener('click', function(e) {
      let radio_id = e.target.getAttribute('value');
      socket.send(JSON.stringify({
        msg_type: 'cmd', 
        cmd: 'toggle_radio', 
        data: {
          type: 'cornell',
          channel: radio_id
        }
      }));
    });
  });
  document.querySelector('#clear').addEventListener('click', (evt) => {
    clear();
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
          alert('error clearing log file', err);
        }
      });
    }
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
        console.log('about to delete files!', url);
        $.ajax({
          url: url,
          method: 'post',
          success: function(data) {
            if (data.res) {
              alert('delete success');
            }
          },
          error: function(err) {
            alert('error deleting files', err);
          }
        });
        return;
      } 
      console.log('abort delete');
    });
  });
};

let x;
const handle_beep = function(beep) {

  let BEEP_TABLE = document.querySelector('#radio_'+beep.channel);
  let received_at = new Date(beep.received_at);
  let rx_dt = moment(beep.tag_at).utc().format(DATE_FMT);
  let tr = document.createElement('tr');
  let td = document.createElement('td');
  td.textContent = rx_dt;
  tr.appendChild(td);
  let alias = localStorage.getItem(beep.tag_id);
  if (alias) {
    tr.appendChild(createElement(alias));
  } else {
    tr.appendChild(createElement(beep.tag_id));
  }
  tr.appendChild(createElement(beep.rssi));
  tr.appendChild(createElement(beep.node_id));
  BEEP_TABLE.insertBefore(tr, BEEP_TABLE.firstChild.nextSibling);
  beeps.push(beep);
  let beep_count = beep_hist[beep.tag_id];
  if (tags.has(beep.tag_id)) {
    beep_hist[beep.tag_id] += 1;
    document.querySelector('#cnt_'+beep.tag_id).textContent = beep_hist[beep.tag_id];
  } else {
    beep_hist[beep.tag_id] = 1;
    tags.add(beep.tag_id);
    let TAG_TABLE = document.querySelector('#tags');
    tr = document.createElement('tr');
    td = createElement(beep.tag_id);
    tr.appendChild(td);
    td = document.createElement('td');
    td.setAttribute('id','cnt_'+beep.tag_id);
    td.textContent = beep_hist[beep.tag_id];
    tr.appendChild(td);
    let input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('class', 'form-input');
    let alias = localStorage.getItem(beep.tag_id);
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
    button.setAttribute('value', beep.tag_id);
    button.addEventListener('click', (evt) => {
      let tag_id = evt.target.getAttribute('value');
      let alias = evt.target.parentElement.previousSibling.firstChild.value;
      e = evt;
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

const handle_node_alive = function(node_alive_msg) {
  let NODE_TABLE = document.querySelector('#nodes');
  let tr, td;
  node_alive_msg.received_at = new Date(node_alive_msg.received_at);
  let node_id = node_alive_msg.node_id;
  nodes[node_id] = node_alive_msg;
  var items = Object.keys(nodes).map(function(key) {
    return [key, nodes[key]];
  });
  while (NODE_TABLE.firstChild.nextSibling) {
    NODE_TABLE.removeChild(NODE_TABLE.firstChild.nextSibling);
  }
  items.sort(function(a, b) {
    if (a.received_at < b.received_at) {
      return -1;
    }
    if (a.received_at > b.received_at) {
      return 1;
    }
    return 0;
  }).forEach((res) => {
    let node_id = res[0];
    let node_alive = res[1];
    tr = document.createElement('tr');
    td = createElement(node_id.toString());
    tr.appendChild(td);
    td = createElement(moment(node_alive.received_at).utc().format(DATE_FMT));
    tr.appendChild(td);
    td = createElement(node_alive.rssi);
    tr.appendChild(td);
    td = createElement(node_alive.battery);
    tr.appendChild(td);
    tr.appendChild(createElement(node_alive.firmware));
    NODE_TABLE.insertBefore(tr, NODE_TABLE.firstChild.nextSibling);
  });
  let BEEP_TABLE = document.querySelector('#radio_'+node_alive_msg.channel);
  tr = document.createElement('tr');
  td = createElement(moment(node_alive_msg.received_at).utc().format(DATE_FMT));
  tr.appendChild(td);
  td = document.createElement('td');
  td.setAttribute('class', 'table-success');
  td.textContent = 'ALIVE';
  tr.appendChild(td);
  td = createElement(node_alive_msg.rssi);
  tr.appendChild(td);
  tr.appendChild(createElement(node_id));
  BEEP_TABLE.insertBefore(tr,BEEP_TABLE.firstChild.nextSibling);
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
    name: 'Memory Usage',
    data: [{
      name: 'Load Percent',
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
    sorted_keys.forEach(function(tag_id) {
      let alias = localStorage.getItem(tag_id);
      if (alias) {
        tag_ids.push(alias);
      } else {
        tag_ids.push(tag_id);
      }
    });

    let values = [];
    sorted_keys.forEach((tag) => {
      values.push(beep_hist[tag]);
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
const initialize_sg_socket = function () {
  let url = 'ws://'+window.location.hostname+':8002';
  sg_socket = new WebSocket(url);
  sg_socket.addEventListener('close', function(evt) {
    alert('SG server disconnected');
  });
  sg_socket.addEventListener('open', function() {
    console.log('opened sg socket');
  });
  sg_socket.addEventListener('message', function(msg) {
    let records = msg.data.split('\n');
    records.forEach(function(record) {
      let vals = record.split(',');
      if (vals.length == 5) {
        let sg_table = document.querySelector('#sg-data');
        let tr = document.createElement('tr');
        let dt = moment(new Date(parseInt(vals[1]*1000)));
        tr.appendChild(createElement(vals[0]));
        tr.appendChild(createElement(dt.format(DATE_FMT)));
        tr.appendChild(createElement(vals[2]));
        tr.appendChild(createElement(vals[3]));
        tr.appendChild(createElement(vals[4]));
        sg_table.insertBefore(tr, sg_table.firstChild.nextSibling);
      }
    });
  });
};
const initialize_websocket = function() {
  let url = 'ws://'+window.location.hostname+':8001';
  socket = new WebSocket(url);
  socket.addEventListener('close', (event) => {
    alert('station connection disconnected');
  });
  socket.addEventListener('open', (event) => {
    socket.send(JSON.stringify({
      msg_type: 'cmd',
      cmd: 'about'
    }));
  });
  socket.onmessage = function(msg) {
    let data = JSON.parse(msg.data);
    let tr, td;
    switch(data.msg_type) {
    case('beep'):
      handle_beep(data);
      break;
    case('about'):
      let about = data.data;
      document.querySelector('#station-id').textContent = about.station_id;
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
      handle_node_alive(data);
      break;
    case('gps'):
      setText('lat', data.lat.toFixed(6));
      setText('lng', data.lon.toFixed(6));
      setText('time', moment(new Date(data.time)).format(DATE_FMT));
      setText('alt', data.alt);
      let n = 0;
      data.satellites.forEach((sat) => {
        if (sat.used == true) n += 1;
      });
      setText('nsats', `${n} of ${data.satellites.length} used`);
      break;
    case('fw'):
    console.log('FW', data);
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

(function() {
  document.querySelector('#sg_link').setAttribute('href', 'http://'+window.location.hostname+':3000');
  initialize_websocket();
  //initialize_sg_socket();
  initialize_controls();
  render_tag_hist();
  RAW_LOG = document.querySelector('#raw_log');
  updateChrony();
  setInterval(updateChrony, 10000);
})();