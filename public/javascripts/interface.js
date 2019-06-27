const beeps = [];
const tags = new Set();
const nodes = {};
const beep_hist = {};

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
  tr.appendChild(createElement(beep.tag_id));
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
  node_alive_msg.received_at = new Date();
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
    td = createElement(node_alive.firmware);
    NODE_TABLE.insertBefore(tr, NODE_TABLE.firstChild.nextSibling);
  });
  console.log(node_alive_msg);
  let BEEP_TABLE = document.querySelector('#radio_'+node_alive_msg.channel);
  tr = document.createElement('tr');
  td = createElement(moment(node_alive_msg.received_at).format(DATE_FMT));
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
      setText('vdop', data.vdop);
      setText('xdop', data.xdop);
      setText('ydop', data.ydop);
      setText('pdop', data.pdop);
      setText('tdop', data.tdop);
      setText('hdop', data.hdop);
      setText('gdop', data.gdop);

      setText('epx', data.epx);
      setText('epy', data.epy);
      setText('epv', data.epv);
      setText('ept', data.ept);
      setText('eps', data.eps);

      setText('track', data.track);
      setText('speed', data.speed);
      setText('climb', data.climb);
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
  RAW_LOG = document.querySelector('#raw_log');
})();