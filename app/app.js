// Nordic UART Service UUIDs
const NUS_SERVICE_UUID = '6e400001-b5b3-f393-e0a9-e50e24dcca9e';
const NUS_RX_UUID      = '6e400002-b5b3-f393-e0a9-e50e24dcca9e'; // write (app → device)
const NUS_TX_UUID      = '6e400003-b5b3-f393-e0a9-e50e24dcca9e'; // notify (device → app)

let rxCharacteristic = null;

// --- UI refs ---
const btnConnect    = document.getElementById('btn-connect');
const statusDot     = document.getElementById('status-dot');
const statusText    = document.getElementById('status-text');
const log           = document.getElementById('log');
const btnMove       = document.getElementById('btn-move');
const btnScrollUp   = document.getElementById('btn-scroll-up');
const btnScrollDown = document.getElementById('btn-scroll-down');
const btnCustom     = document.getElementById('btn-custom');
const customInput   = document.getElementById('custom-cmd');

// All buttons that require a BLE connection
const cmdButtons = document.querySelectorAll('[data-cmd], [data-move], #btn-move, #btn-scroll-up, #btn-scroll-down, #btn-custom');

// --- Logging ---
function addLog(msg, color = '#4ade80') {
  const span = document.createElement('span');
  span.style.color = color;
  span.textContent = msg;
  // column-reverse means prepend = visually on top
  log.prepend(span);
  // keep max 50 lines
  while (log.children.length > 50) log.removeChild(log.lastChild);
}

// --- BLE send ---
async function sendCommand(cmd) {
  if (!rxCharacteristic) return;
  const line = cmd.trim().toUpperCase() + '\n';
  const data = new TextEncoder().encode(line);
  try {
    await rxCharacteristic.writeValue(data);
    addLog('> ' + cmd.trim());
  } catch (e) {
    addLog('! ' + e.message, '#f87171');
  }
}

// --- Connection state ---
function setConnected(connected) {
  statusDot.className = connected ? 'connected' : '';
  statusText.textContent = connected ? 'Connected' : 'Disconnected';
  btnConnect.textContent = connected ? 'Disconnect' : 'Connect';
  btnConnect.className = 'btn-connect' + (connected ? ' connected' : '');
  cmdButtons.forEach(b => b.disabled = !connected);
}

function setConnecting() {
  statusDot.className = 'connecting';
  statusText.textContent = 'Connecting…';
  btnConnect.disabled = true;
}

// --- Connect / Disconnect ---
let bleDevice = null;

async function connect() {
  if (!navigator.bluetooth) {
    addLog('! Web Bluetooth not supported in this browser.', '#f87171');
    return;
  }
  setConnecting();
  try {
    bleDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [NUS_SERVICE_UUID]
    });

    bleDevice.addEventListener('gattserverdisconnected', () => {
      rxCharacteristic = null;
      setConnected(false);
      addLog('— disconnected', '#facc15');
    });

    addLog('— GATT connecting…', '#888');
    const server = await bleDevice.gatt.connect();
    addLog('— GATT connected, getting service…', '#888');
    const service = await server.getPrimaryService(NUS_SERVICE_UUID);
    addLog('— service found, getting RX characteristic…', '#888');
    rxCharacteristic = await service.getCharacteristic(NUS_RX_UUID);
    addLog('— RX ready', '#888');

    // Subscribe to TX notifications (device → app) — non-fatal if unavailable
    try {
      const txChar = await service.getCharacteristic(NUS_TX_UUID);
      await txChar.startNotifications();
      txChar.addEventListener('characteristicvaluechanged', e => {
        const msg = new TextDecoder().decode(e.target.value);
        addLog('< ' + msg.trim(), '#93c5fd');
      });
      addLog('— TX notifications enabled', '#888');
    } catch (e) {
      addLog('! TX notifications unavailable: ' + e.message, '#facc15');
    }

    setConnected(true);
    btnConnect.disabled = false;
    addLog('— connected to ' + bleDevice.name);
  } catch (e) {
    rxCharacteristic = null;
    setConnected(false);
    btnConnect.disabled = false;
    if (e.name !== 'NotFoundError') {
      addLog('! ' + e.message, '#f87171');
    }
  }
}

async function disconnect() {
  if (bleDevice && bleDevice.gatt.connected) {
    bleDevice.gatt.disconnect();
  }
}

// --- Wire up connect button ---
btnConnect.addEventListener('click', () => {
  if (bleDevice && bleDevice.gatt.connected) disconnect();
  else connect();
});

// --- Wire up data-cmd buttons ---
document.querySelectorAll('[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => sendCommand(btn.dataset.cmd));
});

// --- Wire up directional arrow buttons ---
document.querySelectorAll('[data-move]').forEach(btn => {
  btn.addEventListener('click', () => {
    const [x, y] = btn.dataset.move.split(',');
    sendCommand(`MOVE ${x} ${y}`);
  });
});

// --- Move with custom x/y ---
btnMove.addEventListener('click', () => {
  const x = document.getElementById('move-x').value || 0;
  const y = document.getElementById('move-y').value || 0;
  sendCommand(`MOVE ${x} ${y}`);
});

// --- Scroll ---
btnScrollUp.addEventListener('click', () => {
  const n = Math.abs(parseInt(document.getElementById('scroll-amount').value) || 3);
  sendCommand(`SCROLL ${n}`);
});
btnScrollDown.addEventListener('click', () => {
  const n = Math.abs(parseInt(document.getElementById('scroll-amount').value) || 3);
  sendCommand(`SCROLL -${n}`);
});

// --- Custom command ---
btnCustom.addEventListener('click', () => {
  const cmd = customInput.value.trim();
  if (cmd) { sendCommand(cmd); customInput.value = ''; }
});
customInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') btnCustom.click();
});
