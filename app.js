
'use strict';

// PocketMetaEditor - Frontend application
// Backend: FastAPI on Render
// Supports local editing, saving, importing, exporting,
// API health checks, basic source validation and compile requests.
// Genuine MQL5 compilation requires a connected Windows worker.

const $ = id => document.getElementById(id);

const logBox = $('logs');
const editor = $('codeEditor');
const draftKey = 'pocketmetaeditor.mq5.draft';

// Automatically use the deployed backend if the API field is empty.
const DEFAULT_API_URL =
  'https://pocketmetaeditor-1.onrender.com';

// ---------- Logging ----------

function log(message) {
  if (!logBox) return;

  const row = document.createElement('div');
  row.className = 'logline';

  const time = document.createElement('time');
  time.textContent = new Date().toLocaleTimeString();

  row.append(time, document.createTextNode(String(message)));
  logBox.prepend(row);
}

// ---------- Navigation ----------

function activeView(name) {
  document.querySelectorAll('.tab').forEach(button => {
    button.classList.toggle('active', button.dataset.view === name);
  });

  document.querySelectorAll('.view').forEach(view => {
    view.classList.toggle('active', view.id === 'view-' + name);
  });
}

document.querySelectorAll('.tab').forEach(button => {
  button.addEventListener('click', () => activeView(button.dataset.view));
});

// ---------- Editor and local drafts ----------

if (editor) {
  try {
    const saved = localStorage.getItem(draftKey);
    if (saved !== null) editor.value = saved;
  } catch (error) {
    console.warn('Draft storage unavailable:', error);
  }
}

function count() {
  if ($('charCount') && editor) {
    $('charCount').textContent = editor.value.length + ' characters';
  }
}

count();

if (editor) {
  editor.addEventListener('input', () => {
    if ($('saveState')) {
      $('saveState').textContent = 'Unsaved changes';
    }
    count();
  });
}

// ---------- Save draft ----------

if ($('saveBtn')) {
  $('saveBtn').addEventListener('click', () => {
    try {
      if (!editor) throw new Error('Editor not found.');

      localStorage.setItem(draftKey, editor.value);

      if ($('saveState')) {
        $('saveState').textContent = 'Saved locally';
      }

      log('MQL5 draft saved in this browser.');
    } catch (error) {
      log('Could not save draft: ' + error.message);
    }
  });
}

// ---------- Export MQL5 file ----------

if ($('downloadBtn')) {
  $('downloadBtn').addEventListener('click', () => {
    if (!editor) {
      log('Export failed: editor not found.');
      return;
    }

    const blob = new Blob([editor.value], {
      type: 'text/plain;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'MyExpertAdvisor.mq5';

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    log('Exported MyExpertAdvisor.mq5.');
  });
}

// ---------- Import MQL5 file ----------

if ($('fileInput')) {
  $('fileInput').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      if (!editor) throw new Error('Editor not found.');

      editor.value = await file.text();
      count();

      if ($('saveState')) {
        $('saveState').textContent = 'Imported; save draft';
      }

      log('Imported ' + file.name + '.');
    } catch (error) {
      log('Could not read file: ' + error.message);
    }

    event.target.value = '';
  });
}

// ---------- Backend API ----------

function apiBase() {
  const field = $('apiUrl');
  const entered = field ? field.value.trim() : '';

  // Use the default URL when the field is missing or blank.
  const base = entered || DEFAULT_API_URL;

  return base.replace(/\/+$/, '');
}

async function api(path, options = {}) {
  const base = apiBase();

  let response;

  try {
    response = await fetch(base + path, {
      ...options,
      headers: {
        ...(options.body
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(options.headers || {})
      }
    });
  } catch (error) {
    if (error.name === 'TypeError') {
      throw new Error(
        'Cannot reach the backend. Check your internet connection, ' +
        'the backend status, and the website API connection.'
      );
    }

    throw error;
  }

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    // Response was not JSON.
  }

  if (!response.ok) {
    let detail = data.detail;

    if (Array.isArray(detail)) {
      detail = detail
        .map(item => item.msg || 'Invalid request')
        .join('; ');
    }

    throw new Error(
      detail || ('Backend returned HTTP ' + response.status)
    );
  }

  return data;
}

// ---------- API health check ----------

if ($('checkApiBtn')) {
  $('checkApiBtn').addEventListener('click', async () => {
    const out = $('apiResult');

    if (out) out.textContent = 'Checking backend...';

    try {
      const data = await api('/health');

      if (out) {
        out.replaceChildren();

        const heading = document.createElement('b');
        heading.textContent = 'API reachable';

        const details = document.createElement('p');
        details.textContent = JSON.stringify(data);

        out.append(heading, details);
      }

      log('Backend health check succeeded.');
    } catch (error) {
      if (out) {
        out.textContent = 'API unavailable: ' + error.message;
      }

      log('Health check failed: ' + error.message);
    }
  });
}

// ---------- Validate MQL5 source ----------

if ($('validateBtn')) {
  $('validateBtn').addEventListener('click', async () => {
    const out = $('validateResult');

    if (out) out.textContent = 'Validating source...';

    try {
      if (!editor || !editor.value.trim()) {
        throw new Error('Enter some MQL5 source code first.');
      }

      const data = await api('/validate', {
        method: 'POST',
        body: JSON.stringify({
          filename: 'MyExpertAdvisor.mq5',
          code: editor.value
        })
      });

      if (out) {
        out.replaceChildren();

        const heading = document.createElement('b');
        heading.textContent = data.valid
          ? 'Basic checks passed'
          : 'Validation failed';

        const message = document.createElement('p');
        message.textContent =
          data.message || 'The backend returned no details.';

        out.append(heading, message);
      }

      log('Validation response: ' + JSON.stringify(data));
    } catch (error) {
      if (out) {
        out.replaceChildren();

        const heading = document.createElement('b');
        heading.textContent = 'Validation unavailable';

        const message = document.createElement('p');
        message.textContent = error.message;

        out.append(heading, message);
      }

      log('Validation failed: ' + error.message);
    }
  });
} else {
  log(
    'Validation button not found. Check index.html for id="validateBtn".'
  );
}

// ---------- Source upload ----------
// Requires a /projects/upload endpoint on the backend.

if ($('uploadBtn')) {
  $('uploadBtn').addEventListener('click', async () => {
    try {
      if (!editor) throw new Error('Editor not found.');

      const data = await api('/projects/upload', {
        method: 'POST',
        body: JSON.stringify({
          filename: 'MyExpertAdvisor.mq5',
          source: editor.value
        })
      });

      log('Upload response: ' + JSON.stringify(data));

      alert(
        'The API responded. This does not prove the source compiled.'
      );
    } catch (error) {
      log('Upload unavailable: ' + error.message);
      alert('Upload unavailable: ' + error.message);
    }
  });
}

// ---------- Request MQL5 compilation ----------

if ($('compileBtn')) {
  $('compileBtn').addEventListener('click', async () => {
    const out = $('compileResult');
    const buildLog = $('buildLog');

    if (out) out.textContent = 'Submitting compilation request...';

    try {
      if (!editor || !editor.value.trim()) {
        throw new Error('Enter some MQL5 source code first.');
      }

      const data = await api('/compile', {
        method: 'POST',
        body: JSON.stringify({
          filename: 'MyExpertAdvisor.mq5',
          code: editor.value
        })
      });

      if (out) {
        out.replaceChildren();

        const heading = document.createElement('b');
        heading.textContent = data.status ||
          (data.success
            ? 'Compilation successful'
            : 'Compilation unavailable');

        const details = document.createElement('p');
        details.textContent = data.message || JSON.stringify(data);

        out.append(heading, details);
      }

      if (buildLog) {
        buildLog.textContent = JSON.stringify(data, null, 2);
      }

      log('Compile response: ' + JSON.stringify(data));
    } catch (error) {
      if (out) {
        out.replaceChildren();

        const heading = document.createElement('b');
        heading.textContent = 'Compilation unavailable';

        const details = document.createElement('p');
        details.textContent = error.message;

        out.append(heading, details);
      }

      if (buildLog) buildLog.textContent = error.message;

      log('Compile request failed: ' + error.message);
    }
  });
}

// ---------- Backtest request ----------
// Requires a /backtests endpoint on the backend.

if ($('testBtn')) {
  $('testBtn').addEventListener('click', async () => {
    const out = $('testResult');

    if (out) out.textContent = 'Submitting backtest request...';

    try {
      if (!editor) throw new Error('Editor not found.');

      const data = await api('/backtests', {
        method: 'POST',
        body: JSON.stringify({
          filename: 'MyExpertAdvisor.mq5',
          source: editor.value,
          symbol: $('symbol') ? $('symbol').value : 'EURUSD',
          timeframe: $('timeframe') ? $('timeframe').value : 'M1',
          model: $('model') ? $('model').value : '',
          deposit: Number($('deposit') ? $('deposit').value : 0)
        })
      });

      if (out) out.textContent = JSON.stringify(data, null, 2);

      log('Backtest response: ' + JSON.stringify(data));
    } catch (error) {
      if (out) {
        out.textContent = 'Backtest unavailable: ' + error.message;
      }

      log('Backtest unavailable: ' + error.message);
    }
  });
}

// ---------- Emergency stop ----------
// Does not close positions unless a real trading worker is connected.

if ($('stopBtn')) {
  $('stopBtn').addEventListener('click', async () => {
    const confirmed = confirm(
      'Send an emergency-stop request to the backend? ' +
      'This prototype cannot guarantee that trading positions will close.'
    );

    if (!confirmed) return;

    try {
      const data = await api('/emergency-stop', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'User requested emergency stop'
        })
      });

      log('Emergency-stop response: ' + JSON.stringify(data));
      alert(JSON.stringify(data));
    } catch (error) {
      log('Emergency stop unavailable: ' + error.message);
      alert('Emergency stop unavailable: ' + error.message);
    }
  });
}

// ---------- Clear logs ----------

if ($('clearLog')) {
  $('clearLog').addEventListener('click', () => {
    if (logBox) logBox.replaceChildren();
  });
}

// ---------- Startup ----------

log('PocketMetaEditor loaded. Prototype mode: no live trading.');
log('Backend default: ' + DEFAULT_API_URL);

if (
  'serviceWorker' in navigator &&
  location.protocol.startsWith('http')
) {
  navigator.serviceWorker.register('./sw.js').catch(error => {
    console.warn('Service worker registration failed:', error);
  });
}
