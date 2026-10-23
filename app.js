
'use strict';

// PocketMetaEditor - Frontend application
// Backend: FastAPI
// Current capabilities: local editing, saving, importing,
// exporting, API health checks and basic source validation.
// Genuine MQL5 compilation requires a connected Windows worker.

const $ = id => document.getElementById(id);

const logBox = $('logs');
const editor = $('codeEditor');
const draftKey = 'pocketmetaeditor.mq5.draft';

function log(message) {
  if (!logBox) return;

  const row = document.createElement('div');
  row.className = 'logline';

  const time = document.createElement('time');
  time.textContent = new Date().toLocaleTimeString();

  row.append(time, document.createTextNode(String(message)));
  logBox.prepend(row);
}

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

if ($('saveBtn')) {
  $('saveBtn').addEventListener('click', () => {
    try {
      localStorage.setItem(draftKey, editor.value);

      if ($('saveState')) {
        $('saveState').textContent = 'Saved locally';
      }

      log('MQL5 draft saved in this browser.');
    } catch (error) {
      log('Local draft storage unavailable. Export the file instead.');
    }
  });
}

// ---------- Export MQL5 file ----------

if ($('downloadBtn')) {
  $('downloadBtn').addEventListener('click', () => {
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

    URL.revokeObjectURL(url);

    log('Exported MyExpertAdvisor.mq5.');
  });
}

// ---------- Import MQL5 file ----------

if ($('fileInput')) {
  $('fileInput').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      editor.value = await file.text();
      count();

      if ($('saveState')) {
        $('saveState').textContent = 'Imported; save draft';
      }

      log('Imported ' + file.name + '.');
    } catch (error) {
      log('Could not read the selected file.');
    }

    event.target.value = '';
  });
}

// ---------- Backend API ----------

function apiBase() {
  return $('apiUrl')
    ? $('apiUrl').value.trim().replace(/\/+$/, '')
    : '';
}

async function api(path, options = {}) {
  const base = apiBase();

  if (!base) {
    throw new Error(
      'Enter your backend API URL in the MT5 account tab first.'
    );
  }

  const response = await fetch(base + path, {
    ...options,
    headers: {
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(options.headers || {})
    }
  });

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    // The server may return a non-JSON response.
  }

  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map(item => item.msg || 'Invalid request').join('; ')
      : data.detail;

    throw new Error(detail || ('HTTP ' + response.status));
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
        message.textContent = data.message || 'No details returned.';

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
}

// ---------- Source upload ----------
// The current backend does not implement /projects/upload.
// This handler is retained for when that endpoint is added.

if ($('uploadBtn')) {
  $('uploadBtn').addEventListener('click', async () => {
    try {
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

      // The backend expects "code", not "source".
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
          (data.success ? 'Compilation successful' : 'Compilation unavailable');

        const details = document.createElement('p');
        details.textContent = data.message ||
          JSON.stringify(data);

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

      if (buildLog) {
        buildLog.textContent = error.message;
      }

      log('Compile request failed: ' + error.message);
    }
  });
}

// ---------- Backtest request ----------
// The current backend does not implement /backtests.

if ($('testBtn')) {
  $('testBtn').addEventListener('click', async () => {
    const out = $('testResult');

    if (out) out.textContent = 'Submitting backtest request...';

    try {
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

// ---------- Emergency-stop request ----------
// This does not close trading positions unless a real worker
// and corresponding backend endpoint are implemented.

if ($('stopBtn')) {
  $('stopBtn').addEventListener('click', async () => {
    const confirmed = confirm(
      'Send an emergency-stop request to your configured backend? ' +
      'This prototype cannot guarantee positions will be closed.'
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

if (
  'serviceWorker' in navigator &&
  location.protocol.startsWith('http')
) {
  navigator.serviceWorker.register('./sw.js').catch(error => {
    console.warn('Service worker registration failed:', error);
  });
}
