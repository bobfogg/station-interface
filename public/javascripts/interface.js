const beeps = [];
const tags = new Set();
const nodes = {};
const beep_hist = {};
let e;

const DATE_FMT = 'YYYY-MM-DD HH:mm:ss';
let socket;

const setText = function(tag, value) {
  let id = '#'+tag;
  document.querySelector(id).textContent = value;
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

};

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
    button.textContent='update';
    button.setAttribute('value', beep.tag_id);
    button.addEventListener('click', (evt) => {
      let tag_id = evt.target.getAttribute('value');
      let alias = evt.target.parentElement.previousSibling.firstChild.value;
      e = evt;
      console.log('setting alias', alias);
      localStorage.setItem(tag_id, alias);
    });
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
    td = createElement(moment(node_alive.received_at).format(DATE_FMT));
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

(function() {
  document.querySelector('#sg_link').setAttribute('href', 'http://'+window.location.hostname);
  d3.selectAll("body").transition().style("color", () => {
    return "hsl("+ Math.random() * 360 + ",100%,50%)";
  });
  initialize_websocket();
  initialize_controls();
  render_tag_hist();
  RAW_LOG = document.querySelector('#raw_log');
})();