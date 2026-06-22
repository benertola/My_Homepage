// ── Default starting positions for each widget ──
const DEFAULT_POSITIONS = {
  'widget-links':     { x: 40,  y: 40 },
  'widget-weather':   { x: 380, y: 40 },
  'widget-todo':      { x: 720, y: 40 },
  'widget-worldcup':  { x: 40,  y: 320 },
  'widget-markets':   { x: 380, y: 320 },
};

// ── Drag & Drop (interact.js) ──
function initDrag() {
  interact('.widget')
    .draggable({
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
      allowFrom: '.widget-header',
    })
    .resizable({
      edges: { left: true, right: true, bottom: true, top: true },
      listeners: {
        move(event) {
          const el = event.target;
          let x = parseFloat(el.dataset.x) || 0;
          let y = parseFloat(el.dataset.y) || 0;
          const newW = Math.max(event.rect.width, el.scrollWidth);
          const newH = Math.max(event.rect.height, el.scrollHeight);
          el.style.width = newW + 'px';
          el.style.height = newH + 'px';
          x += event.deltaRect.left;
          y += event.deltaRect.top;
          el.style.transform = `translate(${x}px, ${y}px)`;
          el.dataset.x = x;
          el.dataset.y = y;
        },
        end(event) {
          const el = event.target;
          savePosition(el.id, el.dataset.x, el.dataset.y);
          saveSize(el.id, el.style.width, el.style.height);
        },
      },
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

function saveSize(id, width, height) {
  const sizes = JSON.parse(localStorage.getItem('widget-sizes') || '{}');
  sizes[id] = { width, height };
  localStorage.setItem('widget-sizes', JSON.stringify(sizes));
}

function restoreSizes() {
  const saved = JSON.parse(localStorage.getItem('widget-sizes') || '{}');
  document.querySelectorAll('.widget').forEach(el => {
    const size = saved[el.id];
    if (size) {
      el.style.width = size.width;
      el.style.height = size.height;
    }
  });
}

// ── Category collapsed state ──
function getCollapsed(ns) {
  return JSON.parse(localStorage.getItem(`collapsed-${ns}`) || '{}');
}
function setCollapsed(ns, id, val) {
  const state = getCollapsed(ns);
  state[id] = val;
  localStorage.setItem(`collapsed-${ns}`, JSON.stringify(state));
}

// ── Links Widget ──
function saveLinks(links) {
  localStorage.setItem('links', JSON.stringify(links));
}
function loadLinks() {
  return JSON.parse(localStorage.getItem('links') || '[]');
}
function saveLinkCategories(cats) {
  localStorage.setItem('link-categories', JSON.stringify(cats));
}
function loadLinkCategories() {
  return JSON.parse(localStorage.getItem('link-categories') || '[]');
}

function makeLinkItem(link, i) {
  const li = document.createElement('li');
  li.dataset.idx = i;
  li.draggable = false;

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.textContent = '⠿';
  handle.title = 'Drag to categorize';
  handle.addEventListener('mousedown', () => { li.draggable = true; });
  handle.addEventListener('mouseup', () => { li.draggable = false; });

  li.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', i);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => li.classList.add('dragging'), 0);
  });
  li.addEventListener('dragend', () => {
    li.draggable = false;
    li.classList.remove('dragging');
    document.querySelectorAll('.links-drop-zone').forEach(z => z.classList.remove('drop-active'));
  });

  const a = document.createElement('a');
  a.href = link.url;
  a.textContent = link.name;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.title = link.url;

  const editBtn = document.createElement('button');
  editBtn.className = 'edit-btn';
  editBtn.textContent = '✏️';
  editBtn.title = 'Rename';
  editBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = link.name;
    input.className = 'link-name-edit';
    li.replaceChild(input, a);
    editBtn.style.display = 'none';
    input.focus();
    input.select();
    const commit = () => {
      const newName = input.value.trim();
      if (newName) {
        const updated = loadLinks();
        updated[i].name = newName;
        saveLinks(updated);
      }
      renderLinks();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') input.blur();
      if (ev.key === 'Escape') { input.value = link.name; input.blur(); }
    });
  });

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

  li.appendChild(handle);
  li.appendChild(a);
  li.appendChild(editBtn);
  li.appendChild(btn);
  return li;
}

function makeLinkDropZone(categoryId, cat) {
  const zone = document.createElement('div');
  zone.className = 'links-drop-zone todo-drop-zone';
  zone.dataset.categoryId = categoryId === null ? 'null' : categoryId;

  if (cat) {
    const header = document.createElement('div');
    header.className = 'todo-category-header';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'todo-category-name';
    nameSpan.textContent = cat.name;

    const editCatBtn = document.createElement('button');
    editCatBtn.className = 'edit-btn';
    editCatBtn.textContent = '✏️';
    editCatBtn.title = 'Rename category';
    editCatBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = cat.name;
      input.className = 'link-name-edit';
      header.replaceChild(input, nameSpan);
      editCatBtn.style.display = 'none';
      input.focus();
      input.select();
      const commit = () => {
        const newName = input.value.trim();
        if (newName) {
          const cats = loadLinkCategories();
          const c = cats.find(c => c.id === cat.id);
          if (c) { c.name = newName; saveLinkCategories(cats); }
        }
        renderLinks();
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') input.blur();
        if (ev.key === 'Escape') { input.value = cat.name; input.blur(); }
      });
    });

    const deleteCatBtn = document.createElement('button');
    deleteCatBtn.className = 'delete-btn';
    deleteCatBtn.textContent = '×';
    deleteCatBtn.title = 'Delete category';
    deleteCatBtn.addEventListener('click', () => {
      saveLinkCategories(loadLinkCategories().filter(c => c.id !== cat.id));
      saveLinks(loadLinks().map(l => l.categoryId === cat.id ? { ...l, categoryId: null } : l));
      renderLinks();
    });

    const collapsed = getCollapsed('links')[cat.id] || false;
    const arrow = document.createElement('span');
    arrow.className = 'cat-arrow';
    arrow.textContent = collapsed ? '▶' : '▼';

    header.addEventListener('click', e => {
      if (e.target.closest('button') || e.target.closest('input')) return;
      const isNowCollapsed = !getCollapsed('links')[cat.id];
      setCollapsed('links', cat.id, isNowCollapsed);
      list.style.display = isNowCollapsed ? 'none' : '';
      arrow.textContent = isNowCollapsed ? '▶' : '▼';
      const w = document.getElementById('widget-links');
      w.style.height = '';
      requestAnimationFrame(() => {
        w.style.height = w.scrollHeight + 'px';
        saveSize('widget-links', w.style.width || '', w.style.height);
      });
    });

    header.appendChild(arrow);
    header.appendChild(nameSpan);
    header.appendChild(editCatBtn);
    header.appendChild(deleteCatBtn);
    zone.appendChild(header);
  }

  const list = document.createElement('ul');
  list.className = 'todo-list';
  if (cat && (getCollapsed('links')[cat.id] || false)) list.style.display = 'none';
  zone.appendChild(list);
  return { zone, list };
}

function renderLinks() {
  const container = document.getElementById('links-container');
  container.innerHTML = '';
  const links = loadLinks();
  const categories = loadLinkCategories();

  const { zone: uncatZone, list: uncatList } = makeLinkDropZone(null, null);
  uncatZone.classList.add('todo-uncategorized');
  links.forEach((link, i) => {
    if (!link.categoryId) uncatList.appendChild(makeLinkItem(link, i));
  });
  container.appendChild(uncatZone);

  categories.forEach(cat => {
    const { zone, list } = makeLinkDropZone(cat.id, cat);
    links.forEach((link, i) => {
      if (link.categoryId === cat.id) list.appendChild(makeLinkItem(link, i));
    });
    container.appendChild(zone);
  });

  container.querySelectorAll('.links-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.classList.add('drop-active');
    });
    zone.addEventListener('dragleave', e => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('drop-active');
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drop-active');
      const idx = parseInt(e.dataTransfer.getData('text/plain'));
      const catId = zone.dataset.categoryId === 'null' ? null : zone.dataset.categoryId;
      const updated = loadLinks();
      updated[idx].categoryId = catId;
      saveLinks(updated);
      renderLinks();
    });
  });

  // Auto-grow widget if content exceeds current height
  const widgetEl = document.getElementById('widget-links');
  if (widgetEl.scrollHeight > widgetEl.clientHeight) {
    widgetEl.style.height = widgetEl.scrollHeight + 'px';
    saveSize('widget-links', widgetEl.style.width || '', widgetEl.style.height);
  }
}

function initLinks() {
  renderLinks();
  document.getElementById('link-add-btn').addEventListener('click', addLink);
  document.getElementById('link-url-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addLink();
  });
  document.getElementById('links-add-category-btn').addEventListener('click', () => {
    const name = prompt('Category name:');
    if (!name || !name.trim()) return;
    const cats = loadLinkCategories();
    cats.push({ id: 'lcat-' + Date.now(), name: name.trim() });
    saveLinkCategories(cats);
    renderLinks();
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
  links.push({ name, url, categoryId: null });
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

const DEFAULT_WEATHER_CITY = 'Istanbul';
const DEFAULT_WEATHER_KEY = '584435ad97e6b22eb268b65743c9d42b';

function loadWeatherConfig() {
  return {
    city: localStorage.getItem('weather-city') || DEFAULT_WEATHER_CITY,
    key: localStorage.getItem('weather-key') || DEFAULT_WEATHER_KEY,
  };
}

async function fetchWeather(city, key) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not fetch weather');
  return res.json();
}

let lastWeatherData = null;

function showWeatherData(data) {
  lastWeatherData = data;
  document.getElementById('weather-setup').classList.add('hidden');
  document.getElementById('weather-cancel-btn').classList.add('hidden');
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
    document.getElementById('weather-cancel-btn').classList.remove('hidden');
  });

  document.getElementById('weather-cancel-btn').addEventListener('click', () => {
    showWeatherData(lastWeatherData);
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
function saveCategories(cats) {
  localStorage.setItem('todo-categories', JSON.stringify(cats));
}
function loadCategories() {
  return JSON.parse(localStorage.getItem('todo-categories') || '[]');
}

function makeTodoItem(todo, idx) {
  const li = document.createElement('li');
  li.className = 'todo-item';
  if (todo.done) li.classList.add('done');
  li.dataset.idx = idx;
  li.draggable = false; // only draggable via handle

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.textContent = '⠿';
  handle.title = 'Drag to categorize';
  handle.addEventListener('mousedown', () => { li.draggable = true; });
  handle.addEventListener('mouseup', () => { li.draggable = false; });

  li.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', idx);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => li.classList.add('dragging'), 0);
  });
  li.addEventListener('dragend', () => {
    li.draggable = false;
    li.classList.remove('dragging');
    document.querySelectorAll('.todo-drop-zone').forEach(z => z.classList.remove('drop-active'));
  });

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.done;
  checkbox.id = `todo-${idx}`;
  checkbox.addEventListener('change', () => {
    const updated = loadTodos();
    updated[idx].done = checkbox.checked;
    saveTodos(updated);
    renderTodos();
  });

  const label = document.createElement('label');
  label.htmlFor = `todo-${idx}`;
  label.textContent = todo.text;

  const editBtn = document.createElement('button');
  editBtn.className = 'edit-btn';
  editBtn.textContent = '✏️';
  editBtn.title = 'Rename';
  editBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = todo.text;
    input.className = 'link-name-edit';
    li.replaceChild(input, label);
    editBtn.style.display = 'none';
    input.focus();
    input.select();
    const commit = () => {
      const newText = input.value.trim();
      if (newText) {
        const updated = loadTodos();
        updated[idx].text = newText;
        saveTodos(updated);
      }
      renderTodos();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') input.blur();
      if (ev.key === 'Escape') { input.value = todo.text; input.blur(); }
    });
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '×';
  deleteBtn.title = 'Delete';
  deleteBtn.addEventListener('click', () => {
    const updated = loadTodos();
    updated.splice(idx, 1);
    saveTodos(updated);
    renderTodos();
  });

  li.appendChild(handle);
  li.appendChild(checkbox);
  li.appendChild(label);
  li.appendChild(editBtn);
  li.appendChild(deleteBtn);
  return li;
}

function makeDropZone(categoryId, label) {
  const zone = document.createElement('div');
  zone.className = 'todo-drop-zone';
  zone.dataset.categoryId = categoryId === null ? 'null' : categoryId;

  if (label) {
    const header = document.createElement('div');
    header.className = 'todo-category-header';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'todo-category-name';
    nameSpan.textContent = label.name;

    const editCatBtn = document.createElement('button');
    editCatBtn.className = 'edit-btn';
    editCatBtn.textContent = '✏️';
    editCatBtn.title = 'Rename category';
    editCatBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = label.name;
      input.className = 'link-name-edit';
      header.replaceChild(input, nameSpan);
      editCatBtn.style.display = 'none';
      input.focus();
      input.select();
      const commit = () => {
        const newName = input.value.trim();
        if (newName) {
          const cats = loadCategories();
          const cat = cats.find(c => c.id === label.id);
          if (cat) { cat.name = newName; saveCategories(cats); }
        }
        renderTodos();
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') input.blur();
        if (ev.key === 'Escape') { input.value = label.name; input.blur(); }
      });
    });

    const deleteCatBtn = document.createElement('button');
    deleteCatBtn.className = 'delete-btn';
    deleteCatBtn.textContent = '×';
    deleteCatBtn.title = 'Delete category';
    deleteCatBtn.addEventListener('click', () => {
      const cats = loadCategories().filter(c => c.id !== label.id);
      saveCategories(cats);
      const todos = loadTodos().map(t => t.categoryId === label.id ? { ...t, categoryId: null } : t);
      saveTodos(todos);
      renderTodos();
    });

    const collapsed = getCollapsed('todos')[label.id] || false;
    const arrow = document.createElement('span');
    arrow.className = 'cat-arrow';
    arrow.textContent = collapsed ? '▶' : '▼';

    header.addEventListener('click', e => {
      if (e.target.closest('button') || e.target.closest('input')) return;
      const isNowCollapsed = !getCollapsed('todos')[label.id];
      setCollapsed('todos', label.id, isNowCollapsed);
      list.style.display = isNowCollapsed ? 'none' : '';
      arrow.textContent = isNowCollapsed ? '▶' : '▼';
      const w = document.getElementById('widget-todo');
      w.style.height = '';
      requestAnimationFrame(() => {
        w.style.height = w.scrollHeight + 'px';
        saveSize('widget-todo', w.style.width || '', w.style.height);
      });
    });

    header.appendChild(arrow);
    header.appendChild(nameSpan);
    header.appendChild(editCatBtn);
    header.appendChild(deleteCatBtn);
    zone.appendChild(header);
  }

  const list = document.createElement('ul');
  list.className = 'todo-list';
  if (label && (getCollapsed('todos')[label.id] || false)) list.style.display = 'none';
  zone.appendChild(list);
  return { zone, list };
}

function renderTodos() {
  const container = document.getElementById('todo-container');
  container.innerHTML = '';
  const todos = loadTodos();
  const categories = loadCategories();

  // Uncategorized zone
  const { zone: uncatZone, list: uncatList } = makeDropZone(null, null);
  uncatZone.classList.add('todo-uncategorized');
  todos.forEach((todo, i) => {
    if (!todo.categoryId) uncatList.appendChild(makeTodoItem(todo, i));
  });
  container.appendChild(uncatZone);

  // Category zones
  categories.forEach(cat => {
    const { zone, list } = makeDropZone(cat.id, cat);
    todos.forEach((todo, i) => {
      if (todo.categoryId === cat.id) list.appendChild(makeTodoItem(todo, i));
    });
    container.appendChild(zone);
  });

  // Auto-grow widget if content exceeds current height
  const widgetEl = document.getElementById('widget-todo');
  if (widgetEl.scrollHeight > widgetEl.clientHeight) {
    widgetEl.style.height = widgetEl.scrollHeight + 'px';
    saveSize('widget-todo', widgetEl.style.width || '', widgetEl.style.height);
  }

  // Wire up drop zones with native drag-and-drop
  container.querySelectorAll('.todo-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.classList.add('drop-active');
    });
    zone.addEventListener('dragleave', e => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('drop-active');
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drop-active');
      const idx = parseInt(e.dataTransfer.getData('text/plain'));
      const rawCat = zone.dataset.categoryId;
      const catId = rawCat === 'null' ? null : rawCat;
      const todos = loadTodos();
      todos[idx].categoryId = catId;
      saveTodos(todos);
      renderTodos();
    });
  });
}

function initTodo() {
  renderTodos();
  document.getElementById('todo-add-btn').addEventListener('click', addTodo);
  document.getElementById('todo-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTodo();
  });
  document.getElementById('todo-add-category-btn').addEventListener('click', () => {
    const name = prompt('Category name:');
    if (!name || !name.trim()) return;
    const cats = loadCategories();
    cats.push({ id: 'cat-' + Date.now(), name: name.trim() });
    saveCategories(cats);
    renderTodos();
  });
}

function addTodo() {
  const input = document.getElementById('todo-input');
  const text = input.value.trim();
  if (!text) return;
  const todos = loadTodos();
  todos.push({ text, done: false, categoryId: null });
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

// ── Markets Widget ──
const MARKET_ASSETS = [
  { key: 'btc', label: 'Bitcoin',  icon: '₿', decimals: 0 },
  { key: 'xau', label: 'Gold',     icon: '🟡', decimals: 0, unit: '/oz' },
  { key: 'xag', label: 'Silver',   icon: '⚪', decimals: 1, unit: '/oz' },
  { key: 'usd', label: 'USD',      icon: '💵', decimals: 4 },
];

async function fetchMarkets() {
  const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/try.min.json');
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
}

function saveMarketSnapshot(date, rates) {
  localStorage.setItem('markets-snapshot', JSON.stringify({ date, rates }));
}

function loadMarketSnapshot() {
  return JSON.parse(localStorage.getItem('markets-snapshot') || 'null');
}

function formatTRY(val, decimals) {
  if (val >= 1000000) return '₺' + (val / 1000000).toFixed(2) + 'M';
  if (val >= 1000)    return '₺' + val.toLocaleString('tr-TR', { maximumFractionDigits: decimals });
  return '₺' + val.toFixed(decimals);
}

function renderMarkets(todayRates, prevRates, date) {
  const content = document.getElementById('markets-content');
  const updated = document.getElementById('markets-updated');

  content.innerHTML = MARKET_ASSETS.map(asset => {
    // rates are TRY per 1 unit → invert (1 / try_per_unit = units_per_try → invert again)
    const tryPerUnit = 1 / todayRates[asset.key];
    const prev = prevRates ? (1 / prevRates[asset.key]) : null;
    const change = prev ? ((tryPerUnit - prev) / prev) * 100 : null;

    const changeHtml = change !== null
      ? `<span class="market-change ${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%</span>`
      : `<span class="market-change neutral">—</span>`;

    return `
      <div class="market-row">
        <span class="market-icon">${asset.icon}</span>
        <span class="market-label">${asset.label}${asset.unit ? '<small>' + asset.unit + '</small>' : ''}</span>
        <span class="market-price">${formatTRY(tryPerUnit, asset.decimals)}</span>
        ${changeHtml}
      </div>`;
  }).join('');

  updated.textContent = 'Updated: ' + date;
}

async function initMarkets() {
  try {
    const data = await fetchMarkets();
    const todayDate = data.date;
    const todayRates = data.try;

    const snap = loadMarketSnapshot();
    const prevRates = (snap && snap.date !== todayDate) ? snap.rates : null;

    renderMarkets(todayRates, prevRates, todayDate);

    if (!snap || snap.date !== todayDate) {
      const yesterday = snap ? snap.rates : null;
      saveMarketSnapshot(todayDate, todayRates);
      if (yesterday) renderMarkets(todayRates, yesterday, todayDate);
    }
  } catch {
    document.getElementById('markets-content').textContent = 'Could not load market data.';
  }
}

// ── Theme ──
const THEMES = ['istanbul', 'midnight', 'ocean', 'forest', 'sunset'];

function applyTheme(theme, customBg) {
  THEMES.forEach(t => document.body.classList.remove(`theme-${t}`));
  if (theme === 'istanbul') {
    document.body.style.removeProperty('--body-bg');
  } else if (theme === 'custom') {
    document.body.style.setProperty('--body-bg', `url(${customBg}) center/cover no-repeat fixed`);
  } else {
    document.body.classList.add(`theme-${theme}`);
  }
  document.querySelectorAll('.theme-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.theme === theme);
  });
}

function initTheme() {
  const saved = localStorage.getItem('theme') || 'istanbul';
  const customBg = localStorage.getItem('theme-custom-bg');
  applyTheme(saved, customBg);

  const btn = document.getElementById('theme-btn');
  const panel = document.getElementById('theme-panel');

  btn.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });
  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== btn) panel.classList.add('hidden');
  });

  document.querySelectorAll('.theme-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      const theme = swatch.dataset.theme;
      localStorage.setItem('theme', theme);
      localStorage.removeItem('theme-custom-bg');
      applyTheme(theme);
    });
  });

  document.getElementById('theme-upload-btn').addEventListener('click', () => {
    document.getElementById('theme-upload-input').click();
  });
  document.getElementById('theme-upload-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      localStorage.setItem('theme', 'custom');
      localStorage.setItem('theme-custom-bg', dataUrl);
      applyTheme('custom', dataUrl);
      document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
    };
    reader.readAsDataURL(file);
  });
}

// ── Boot ──
restorePositions();
restoreSizes();
initDrag();
initLinks();
initWeather();
initTodo();
initWorldCup();
initTheme();
initMarkets();
