// ── Default starting positions for each widget ──
const DEFAULT_POSITIONS = {
  'widget-links':     { x: 40,  y: 40 },
  'widget-weather':   { x: 380, y: 40 },
  'widget-todo':      { x: 720, y: 40 },
  'widget-worldcup':  { x: 40,  y: 320 },
};

// ── Drag & Drop (interact.js) ──
function initDrag() {
  interact('.widget').draggable({
    listeners: {
      move(event) {
        const el = event.target;
        const x = (parseFloat(el.dataset.x) || 0) + event.dx;
        const y = (parseFloat(el.dataset.y) || 0) + event.dy;
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.dataset.x = x;
        el.dataset.y = y;
      },
      end(event) {
        savePosition(event.target.id, event.target.dataset.x, event.target.dataset.y);
      },
    },
    // Only drag when grabbing the header bar
    allowFrom: '.widget-header',
  });
}

function savePosition(id, x, y) {
  const positions = JSON.parse(localStorage.getItem('widget-positions') || '{}');
  positions[id] = { x: parseFloat(x), y: parseFloat(y) };
  localStorage.setItem('widget-positions', JSON.stringify(positions));
}

function restorePositions() {
  const saved = JSON.parse(localStorage.getItem('widget-positions') || '{}');
  document.querySelectorAll('.widget').forEach(el => {
    const pos = saved[el.id] || DEFAULT_POSITIONS[el.id] || { x: 0, y: 0 };
    el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    el.dataset.x = pos.x;
    el.dataset.y = pos.y;
  });
}

// ── Links Widget ──
function saveLinks(links) {
  localStorage.setItem('links', JSON.stringify(links));
}

function loadLinks() {
  return JSON.parse(localStorage.getItem('links') || '[]');
}

function renderLinks() {
  const list = document.getElementById('links-list');
  const links = loadLinks();
  list.innerHTML = '';
  links.forEach((link, i) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.url;
    a.textContent = link.name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const btn = document.createElement('button');
    btn.className = 'delete-btn';
    btn.textContent = '×';
    btn.title = 'Remove';
    btn.addEventListener('click', () => {
      const updated = loadLinks();
      updated.splice(i, 1);
      saveLinks(updated);
      renderLinks();
    });
    li.appendChild(a);
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function initLinks() {
  renderLinks();
  document.getElementById('link-add-btn').addEventListener('click', addLink);
  document.getElementById('link-url-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addLink();
  });
}

function addLink() {
  const nameInput = document.getElementById('link-name-input');
  const urlInput = document.getElementById('link-url-input');
  const name = nameInput.value.trim();
  let url = urlInput.value.trim();
  if (!name || !url) return;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  const links = loadLinks();
  links.push({ name, url });
  saveLinks(links);
  nameInput.value = '';
  urlInput.value = '';
  renderLinks();
  nameInput.focus();
}

// ── Weather Widget ──
function saveWeatherConfig(city, key) {
  localStorage.setItem('weather-city', city);
  localStorage.setItem('weather-key', key);
}

function loadWeatherConfig() {
  return {
    city: localStorage.getItem('weather-city') || '',
    key: localStorage.getItem('weather-key') || '',
  };
}

async function fetchWeather(city, key) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not fetch weather');
  return res.json();
}

function showWeatherData(data) {
  document.getElementById('weather-setup').classList.add('hidden');
  document.getElementById('weather-data').classList.remove('hidden');
  document.getElementById('weather-temp').textContent = Math.round(data.main.temp) + '°C';
  document.getElementById('weather-desc').textContent = data.weather[0].description;
  document.getElementById('weather-city-name').textContent = data.name + ', ' + data.sys.country;
  document.getElementById('weather-icon').src =
    `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  document.getElementById('weather-icon').alt = data.weather[0].description;
}

function showWeatherSetup() {
  document.getElementById('weather-setup').classList.remove('hidden');
  document.getElementById('weather-data').classList.add('hidden');
}

async function initWeather() {
  const { city, key } = loadWeatherConfig();

  document.getElementById('weather-save-btn').addEventListener('click', async () => {
    const city = document.getElementById('weather-city-input').value.trim();
    const key = document.getElementById('weather-key-input').value.trim();
    if (!city || !key) return;
    try {
      const data = await fetchWeather(city, key);
      saveWeatherConfig(city, key);
      showWeatherData(data);
    } catch {
      alert('Could not load weather. Check your city name and API key.');
    }
  });

  document.getElementById('weather-change-btn').addEventListener('click', () => {
    showWeatherSetup();
  });

  if (city && key) {
    try {
      const data = await fetchWeather(city, key);
      showWeatherData(data);
    } catch {
      showWeatherSetup();
    }
  }
}

// ── To-Do Widget ──
function saveTodos(todos) {
  localStorage.setItem('todos', JSON.stringify(todos));
}

function loadTodos() {
  return JSON.parse(localStorage.getItem('todos') || '[]');
}

function renderTodos() {
  const list = document.getElementById('todo-list');
  const todos = loadTodos();
  list.innerHTML = '';
  todos.forEach((todo, i) => {
    const li = document.createElement('li');
    if (todo.done) li.classList.add('done');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.done;
    checkbox.id = `todo-${i}`;
    checkbox.addEventListener('change', () => {
      const updated = loadTodos();
      updated[i].done = checkbox.checked;
      saveTodos(updated);
      renderTodos();
    });
    const label = document.createElement('label');
    label.htmlFor = `todo-${i}`;
    label.textContent = todo.text;
    const btn = document.createElement('button');
    btn.className = 'delete-btn';
    btn.textContent = '×';
    btn.title = 'Delete';
    btn.addEventListener('click', () => {
      const updated = loadTodos();
      updated.splice(i, 1);
      saveTodos(updated);
      renderTodos();
    });
    li.appendChild(checkbox);
    li.appendChild(label);
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function initTodo() {
  renderTodos();
  document.getElementById('todo-add-btn').addEventListener('click', addTodo);
  document.getElementById('todo-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTodo();
  });
}

function addTodo() {
  const input = document.getElementById('todo-input');
  const text = input.value.trim();
  if (!text) return;
  const todos = loadTodos();
  todos.push({ text, done: false });
  saveTodos(todos);
  input.value = '';
  renderTodos();
  input.focus();
}

// ── World Cup 2026 Widget ──
function toIstanbulTime(utcDateStr) {
  const date = new Date(utcDateStr);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  });
}

function toDateKey(utcDateStr) {
  const date = new Date(utcDateStr);
  return date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Istanbul',
  });
}

function isTodayOrTomorrow(utcDateStr) {
  const matchDate = new Date(utcDateStr);
  const now = new Date();
  const istanbul = (d) => new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  const m = istanbul(matchDate);
  const t = istanbul(now);
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const mDay = new Date(m.getFullYear(), m.getMonth(), m.getDate());
  return mDay.getTime() === today.getTime() || mDay.getTime() === tomorrow.getTime();
}

function espnDateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  // Use Istanbul date
  const istStr = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }); // YYYY-MM-DD
  return istStr.replace(/-/g, '');
}

async function fetchWCDay(offsetDays) {
  const dateStr = espnDateStr(offsetDays);
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.events || [];
}

function statusLabel(event) {
  const status = event.competitions?.[0]?.status?.type;
  if (!status) return '';
  if (status.state === 'in') return `<span class="wc-live">CANLI ${status.detail || ''}</span>`;
  if (status.state === 'post') {
    const comps = event.competitions?.[0]?.competitors || [];
    const home = comps.find(c => c.homeAway === 'home');
    const away = comps.find(c => c.homeAway === 'away');
    if (home && away) return `<span class="wc-score">${home.score} - ${away.score}</span>`;
    return '<span class="wc-ended">Bitti</span>';
  }
  return `<span class="wc-time">${toIstanbulTime(event.date)}</span>`;
}

function renderWCMatches(todayEvents, tomorrowEvents) {
  const container = document.getElementById('wc-content');
  let html = '';

  const renderGroup = (events, label) => {
    if (events.length === 0) return '';
    let block = `<div class="wc-day-label">${label}</div>`;
    events.forEach(event => {
      const comps = event.competitions?.[0]?.competitors || [];
      const home = comps.find(c => c.homeAway === 'home') || comps[0];
      const away = comps.find(c => c.homeAway === 'away') || comps[1];
      if (!home || !away) return;
      const homeName = home.team?.shortDisplayName || home.team?.displayName || '?';
      const awayName = away.team?.shortDisplayName || away.team?.displayName || '?';
      const homeFlagUrl = home.team?.flag?.href || home.team?.logos?.[0]?.href || '';
      const awayFlagUrl = away.team?.flag?.href || away.team?.logos?.[0]?.href || '';
      block += `
        <div class="wc-match">
          <div class="wc-teams">
            <span class="wc-team">
              ${homeFlagUrl ? `<img src="${homeFlagUrl}" class="wc-flag" />` : ''}${homeName}
            </span>
            <span class="wc-vs">vs</span>
            <span class="wc-team">
              ${awayFlagUrl ? `<img src="${awayFlagUrl}" class="wc-flag" />` : ''}${awayName}
            </span>
          </div>
          <div class="wc-status">${statusLabel(event)}</div>
        </div>`;
    });
    return block;
  };

  const todayLabel = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' });
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowLabel = tomorrowDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' });

  html += renderGroup(todayEvents, `Bugün — ${todayLabel}`);
  html += renderGroup(tomorrowEvents, `Yarın — ${tomorrowLabel}`);

  if (!html) html = '<p class="wc-none">Bugün ve yarın maç yok.</p>';
  container.innerHTML = html;
}

async function initWorldCup() {
  try {
    const [todayEvents, tomorrowEvents] = await Promise.all([
      fetchWCDay(0),
      fetchWCDay(1),
    ]);
    renderWCMatches(todayEvents, tomorrowEvents);
  } catch {
    document.getElementById('wc-content').innerHTML = '<p class="wc-none">Maçlar yüklenemedi.</p>';
  }
}

// ── Boot ──
restorePositions();
initDrag();
initLinks();
initWeather();
initTodo();
initWorldCup();
