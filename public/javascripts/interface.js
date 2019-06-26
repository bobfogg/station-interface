const beeps = [];
const tags = new Set();
const beep_hist = {};

const setText = function(tag, value) {
  let id = '#'+tag;
  document.querySelector(id).textContent = value;
};
(function() {
  const BEEP_TABLE = document.querySelector('#beeps');

  d3.selectAll("body").transition().style("color", () => {
    return "hsl("+ Math.random() * 360 + ",100%,50%)";
  });
  let url = 'ws://'+window.location.hostname+':8001';
  const socket = new WebSocket(url);
  socket.onmessage = function(msg) {
    let data = JSON.parse(msg.data);
    console.log(data);
    switch(data.msg_type) {
    case('beep'):
      let beep = data;
      let received_at = new Date(data.received_at);
      let tr = document.createElement('tr');
      let td = document.createElement('td');
      td.textContent = received_at;
      tr.appendChild(td);
      td = document.createElement('td');
      td.textContent = beep.channel;
      tr.appendChild(td);
      td = document.createElement('td');
      td.textContent = beep.tag_id;
      tr.appendChild(td);
      td = document.createElement('td');
      td.textContent = beep.rssi;
      tr.appendChild(td);
      BEEP_TABLE.appendChild(tr);
      beeps.push(beep);
      if (tags.has(beep.tag_id)) {
        beep_hist[beep.tag_id] += 1;
      } else {
        beep_hist[beep.tag_id] = 1;
      }
      tags.add(beep.tag_id);
      console.log(`tag: ${beep.tag_id}; tag count: ${beep_hist[beep.tag_id]};   ${beeps.length} beeps; ${tags.size} tags;`);
      break;
    case('log'):
      document.querySelector('#raw_log').value += data.data;
      break;
    case('gps'):
      setText('lat', data.lat.toFixed(6));
      setText('lng', data.lon.toFixed(6));
      setText('time', new Date(data.time));
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

//      document.querySelector('#raw_gps').textContent = JSON.stringify(data, null, 2);
    }
  };
})();