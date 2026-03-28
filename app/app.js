// Nordic UART Service UUIDs
const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX_UUID      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // write (app → device)
const NUS_TX_UUID      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // notify (device → app)

let rxCharacteristic = null;

// --- PWA install prompt ---
let installPrompt = null;
const btnInstall = document.getElementById('btn-install');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  btnInstall.hidden = false;
});

btnInstall.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  if (outcome === 'accepted') btnInstall.hidden = true;
  installPrompt = null;
});

window.addEventListener('appinstalled', () => {
  btnInstall.hidden = true;
  installPrompt = null;
});

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
const cmdButtons = document.querySelectorAll('[data-cmd], [data-move], #btn-move, #btn-scroll-up, #btn-scroll-down, #btn-custom, #btn-type, #btn-enter, #btn-cipher');

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

// --- Forward console errors and uncaught exceptions to the on-screen log ---
const _origConsoleError = console.error.bind(console);
console.error = (...args) => {
  _origConsoleError(...args);
  addLog('ERR: ' + args.map(a => (a instanceof Error ? a.message : String(a))).join(' '), '#f87171');
};
window.addEventListener('error', e => addLog('ERR: ' + e.message, '#f87171'));
window.addEventListener('unhandledrejection', e => {
  const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
  addLog('ERR: ' + msg, '#f87171');
});

// --- BLE send ---
async function sendCommand(cmd) {
  if (!rxCharacteristic) return;
  const trimmed = cmd.trim();
  const upper = trimmed.toUpperCase();
  // Preserve original case for TYPE so the text is typed as-is
  const line = (upper.startsWith('TYPE ') ? 'TYPE ' + trimmed.slice(5) : upper) + '\n';
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
      optionalServices: [NUS_SERVICE_UUID],
    });

    bleDevice.addEventListener('gattserverdisconnected', () => {
      rxCharacteristic = null;
      setConnected(false);
      addLog('— disconnected', '#facc15');
    });

    addLog('— GATT connecting…', '#888');
    const server = await bleDevice.gatt.connect();
    addLog('— GATT connected, discovering services…', '#888');
    const allServices = await server.getPrimaryServices();
    addLog('— found ' + allServices.length + ' service(s)', '#888');
    const service = allServices.find(s => s.uuid === NUS_SERVICE_UUID);
    if (!service) throw new Error('NUS service not found (services: ' + allServices.map(s => s.uuid).join(', ') + ')');
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

// --- Type text ---
const btnType    = document.getElementById('btn-type');
const btnEnter   = document.getElementById('btn-enter');
const typeInput  = document.getElementById('type-text');
btnType.addEventListener('click', () => {
  const text = typeInput.value;
  if (text) { sendCommand('TYPE ' + text); typeInput.value = ''; }
});
btnEnter.addEventListener('click', () => sendCommand('KEY ENTER'));
typeInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') btnType.click();
});

// --- Tab switching ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.remove('hidden');
  });
});

// --- Cipher: pre-shared password via localStorage ---
const CIPHER_STORAGE_KEY = 'cipherPassword';

function getCipherPassword() {
  return localStorage.getItem(CIPHER_STORAGE_KEY) ?? 'changeme';
}

// Derive a 16-byte AES key from the password (mirrors device/_make_key)
async function _importCipherKey() {
  const pwdBytes = new TextEncoder().encode(getCipherPassword());
  const keyBytes = new Uint8Array(16);
  keyBytes.set(pwdBytes.subarray(0, 16));
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CTR' }, false, ['encrypt']);
}

async function encryptCipher(plaintext) {
  const key = await _importCipherKey();
  const iv  = crypto.getRandomValues(new Uint8Array(16));
  const ct  = await crypto.subtle.encrypt(
    { name: 'AES-CTR', counter: iv, length: 64 },
    key,
    new TextEncoder().encode(plaintext)
  );
  // payload = IV (16 bytes) || ciphertext  →  base64
  const payload = new Uint8Array(16 + ct.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ct), 16);
  return btoa(String.fromCharCode(...payload));
}

// --- Eye toggle for cipher input ---
const cipherInput = document.getElementById('cipher-text');
const btnEye      = document.getElementById('btn-eye-cipher');

const SVG_EYE_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const SVG_EYE_OFF  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

// --- Settings: pre-shared key + worker URL ---
const keyInput          = document.getElementById('cipher-key');
const btnEyeKey         = document.getElementById('btn-eye-key');
const btnSaveSettings   = document.getElementById('btn-save-settings');
const settingsSavedMsg  = document.getElementById('settings-saved-msg');

keyInput.value = getCipherPassword();

btnEyeKey.innerHTML = SVG_EYE_OPEN;
btnEyeKey.addEventListener('click', () => {
  const visible   = keyInput.type === 'text';
  keyInput.type   = visible ? 'password' : 'text';
  btnEyeKey.innerHTML = visible ? SVG_EYE_OPEN : SVG_EYE_OFF;
});

btnSaveSettings.addEventListener('click', () => {
  const pwd = keyInput.value.trim();
  if (pwd) localStorage.setItem(CIPHER_STORAGE_KEY, pwd);
  localStorage.setItem(DERIVER_URL_KEY, deriverUrlInput.value.trim());
  settingsSavedMsg.style.visibility = 'visible';
  setTimeout(() => { settingsSavedMsg.style.visibility = 'hidden'; }, 2000);
});

// --- Eye toggle for cipher text input ---
btnEye.innerHTML = SVG_EYE_OPEN;
btnEye.addEventListener('click', () => {
  const visible = cipherInput.type === 'text';
  cipherInput.type    = visible ? 'password' : 'text';
  btnEye.innerHTML    = visible ? SVG_EYE_OPEN : SVG_EYE_OFF;
});

// --- Password Deriver ---
const DERIVER_URL_KEY  = 'deriverWorkerUrl';
const deriverUrlInput  = document.getElementById('deriver-url');
const deriverInput     = document.getElementById('deriver-input');
const btnDerive        = document.getElementById('btn-derive');
const deriverMsg       = document.getElementById('deriver-msg');

deriverUrlInput.value = localStorage.getItem(DERIVER_URL_KEY) ?? '';

btnDerive.addEventListener('click', async () => {
  const workerUrl = deriverUrlInput.value.trim();
  if (!workerUrl) { addLog('! Set the Worker URL first', '#f87171'); return; }
  const parts = deriverInput.value.trim().split(/\s+/);
  if (parts.length < 2) { addLog('! Enter context and version separated by a space', '#f87171'); return; }
  const [context, version] = parts;
  try {
    const url = new URL(workerUrl);
    url.searchParams.set('context', context);
    url.searchParams.set('version', version);
    const res = await fetch(url.toString());
    if (!res.ok) { addLog('! Worker error: ' + res.status, '#f87171'); return; }
    const data = await res.json();
    const salt = '';
    const w1 = data.word1.charAt(0).toUpperCase() + data.word1.slice(1);
    const derived = w1 + version.slice(0, 2) + data.word2 + salt + '!';
    cipherInput.value = derived;
    deriverMsg.style.visibility = 'visible';
    setTimeout(() => { deriverMsg.style.visibility = 'hidden'; }, 2000);
    addLog('> derived password set in cipher text');
  } catch (e) {
    addLog('! ' + e.message, '#f87171');
  }
});
deriverInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') btnDerive.click();
});

// --- Cipher send ---
const btnCipher = document.getElementById('btn-cipher');
btnCipher.addEventListener('click', async () => {
  if (!rxCharacteristic || !cipherInput.value) return;
  try {
    const b64  = await encryptCipher(cipherInput.value);
    const line = 'CIPHER ' + b64 + '\n';          // preserve base64 case — do NOT uppercase
    await rxCharacteristic.writeValue(new TextEncoder().encode(line));
    addLog('> CIPHER [encrypted]');
    cipherInput.value = '';
  } catch (e) {
    addLog('! ' + e.message, '#f87171');
  }
});
cipherInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') btnCipher.click();
});
