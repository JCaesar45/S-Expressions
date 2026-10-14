const input = document.getElementById('input');
const output = document.getElementById('output');
const status = document.getElementById('status');
const parseBtn = document.getElementById('parse-btn');
const clearBtn = document.getElementById('clear-btn');

const EXAMPLES = {
  simple: '(data1 data2 data3)',
  rosetta: '((data "quoted data" 123 4.5)\n(data (!@# (4.5) "(more" "data)")))',
  nested: '(a (b (c (d (e f)))))',
  unterminated: '(list "(unterminated string" 42)'
};

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function render(value, depth = 0) {
  const pad = '  '.repeat(depth);
  const padInner = '  '.repeat(depth + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map(v => padInner + render(v, depth + 1));
    return '[\n' + items.join(',\n') + '\n' + pad + ']';
  }

  if (typeof value === 'number') {
    return `<span class="num">${value}</span>`;
  }

  if (typeof value === 'string') {
    if (value.startsWith('"')) {
      return `<span class="str">${escapeHtml(value)}</span>`;
    }
    return `<span class="atom">${escapeHtml(value)}</span>`;
  }

  return escapeHtml(String(value));
}

function setStatus(text, isError = false) {
  status.textContent = text;
  status.classList.toggle('error', isError);
}

async function parse() {
  const source = input.value;

  if (source.trim() === '') {
    output.innerHTML = '<span class="err">Nothing to parse.</span>';
    setStatus('');
    return;
  }

  parseBtn.disabled = true;
  setStatus('parsing...');

  try {
    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source })
    });

    const data = await res.json();

    if (!data.ok) {
      output.innerHTML = `<span class="err">${escapeHtml(data.error)}</span>`;
      setStatus('error', true);
      return;
    }

    if (data.result === null) {
      output.innerHTML = '<span class="err">Empty expression.</span>';
      setStatus('');
      return;
    }

    output.innerHTML = render(data.result);
    setStatus('ok');
  } catch (err) {
    output.innerHTML = `<span class="err">Network error: ${escapeHtml(err.message)}</span>`;
    setStatus('offline', true);
  } finally {
    parseBtn.disabled = false;
  }
}

parseBtn.addEventListener('click', parse);
clearBtn.addEventListener('click', () => {
  input.value = '';
  output.textContent = '';
  setStatus('');
  input.focus();
});

input.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    parse();
  }
});

document.querySelectorAll('.examples button').forEach((btn) => {
  btn.addEventListener('click', () => {
    input.value = EXAMPLES[btn.dataset.example] ?? '';
    parse();
  });
});

parse();
