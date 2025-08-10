// ---------- Config ----------
const TAGS = ["work-friendly", "no-laptops", "to-go", "ceremonial", "flavoured"];
const TOP_PICKS_THRESHOLD = 4.8; // you can tweak this

// ---------- State & element refs ----------
const state = {
  cafes: [],
  filtered: [],
  map: null,
  markers: [],
  topOnly: false,       // controlled by "Top picks" chip
  hideUnrated: false,   // checkbox
  arr: "all",           // arrondissement filter: "all" or "1".."20"
  selectedTags: [],     // multi-select chips (lowercase strings)
  q: ""                 // search text
};

const el = {
  list: null,
  tagChips: null,
  search: null,
  hideUnrated: null,
  arrFilter: null
};

// ---------- Map ----------
function initMap() {
  state.map = L.map('map', { scrollWheelZoom: false }).setView([48.8566, 2.3522], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(state.map);
}

function clearMarkers() {
  state.markers.forEach(m => state.map.removeLayer(m));
  state.markers = [];
}

function renderMarkers(items) {
  clearMarkers();
  const group = [];
  items.forEach((c, idx) => {
    if (typeof c.lat !== 'number' || typeof c.lng !== 'number') return;
    const m = L.marker([c.lat, c.lng]).addTo(state.map)
      .bindPopup(`<strong>${c.name}</strong><br/>${c.address}<br/>My rating: ${c.my_rating ?? "—"}`);
    m.on('click', () => highlightListItem(idx));
    state.markers.push(m);
    group.push(m);
  });
  if (group.length) {
    const g = L.featureGroup(group);
    state.map.fitBounds(g.getBounds().pad(0.25));
  }
}

function highlightListItem(idx) {
  const cards = document.querySelectorAll('.item');
  if (!cards[idx]) return;
  cards[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
  cards[idx].style.outline = '2px solid #6366f1';
  setTimeout(() => (cards[idx].style.outline = ''), 800);
}

// ---------- UI helpers ----------
function starText(n) {
  if (typeof n !== 'number') return '—';
  return `${'★'.repeat(Math.round(n))}${'☆'.repeat(5 - Math.round(n))} ${n.toFixed(1)}`;
}
function googleLink(c) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`;
}
function getArrFromAddress(address) {
  const m = (address || "").match(/75(\d{3})/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const arr = n === 116 ? 16 : (n % 100);
  return (arr >= 1 && arr <= 20) ? arr : null;
}

// ---------- Render list ----------
function renderList(items) {
  el.list.innerHTML = '';
  if (!items.length) {
    el.list.innerHTML = '<div class="item">No results.</div>';
    return;
  }
  items.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'item card';
    div.innerHTML = `
      <h3>${c.name}</h3>
      <div class="meta">${c.address} • ${c.price || '—'}</div>
      <div style="margin:6px 0">${(c.tags||[]).map(t=>`<span class="badge">${t}</span>`).join('')}</div>
      <div class="row">
        <div>My rating: <strong>${starText(c.my_rating)}</strong></div>
        <a class="btn" href="${googleLink(c)}" target="_blank" rel="noreferrer">Open in Google Maps</a>
      </div>
      ${c.notes ? `<div style="margin-top:6px;color:#4b5563">${c.notes}</div>` : ''}
    `;
    div.addEventListener('mouseenter', () => {
      const m = state.markers[i];
      if (m) m.openPopup();
    });
    el.list.appendChild(div);
  });
}

// ---------- Tag chips ----------
function renderTagChips() {
  const container = el.tagChips;
  container.innerHTML = '';

  // Special "Top picks" chip
  const topChip = document.createElement('button');
  topChip.type = 'button';
  topChip.className = 'chip' + (state.topOnly ? ' active' : '');
  topChip.textContent = 'Top picks';
  topChip.title = `Rating ≥ ${TOP_PICKS_THRESHOLD}`;
  topChip.addEventListener('click', () => {
    state.topOnly = !state.topOnly;
    renderTagChips();
    applyFilters();
  });
  container.appendChild(topChip);

  // Category chips (multi-select)
  TAGS.forEach(tag => {
    const active = state.selectedTags.includes(tag);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (active ? ' active' : '');
    chip.textContent = tag;
    chip.addEventListener('click', () => {
      const i = state.selectedTags.indexOf(tag);
      if (i === -1) state.selectedTags.push(tag);
      else state.selectedTags.splice(i, 1);
      renderTagChips();
      applyFilters();
    });
    container.appendChild(chip);
  });
}

// ---------- Filter + sort ----------
function applyFilters() {
  state.q = (el.search?.value || '').trim().toLowerCase();

  let items = state.cafes.filter(c => {
    // Top picks threshold
    if (state.topOnly && (c.my_rating ?? 0) < TOP_PICKS_THRESHOLD) return false;

    // Hide unrated
    if (state.hideUnrated && typeof c.my_rating !== 'number') return false;

    // Arrondissement
    if (state.arr !== "all") {
      const arr = getArrFromAddress(c.address || "");
      if (String(arr) !== String(state.arr)) return false;
    }

    // Tag chips (OR logic: any selected tag matches)
    if (state.selectedTags.length) {
      const ct = (c.tags || []).map(t => (t || '').toLowerCase());
      const ok = state.selectedTags.some(t => ct.includes(t));
      if (!ok) return false;
    }

    // Free text search (name + address + notes)
    if (state.q) {
      const hay = [
        c.name || '',
        c.address || '',
        c.notes || '',
        ...(c.tags || [])
      ].join(' ').toLowerCase();
      if (!hay.includes(state.q)) return false;
    }

    return true;
  });

  // Sort by rating desc, then name
  items.sort((a, b) => {
    const ra = typeof a.my_rating === 'number' ? a.my_rating : -1;
    const rb = typeof b.my_rating === 'number' ? b.my_rating : -1;
    if (rb !== ra) return rb - ra;
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  });

  state.filtered = items;
  renderList(state.filtered);
  renderMarkers(state.filtered);
}

// ---------- Boot ----------
async function boot() {
  document.getElementById('year').textContent = new Date().getFullYear();
  el.list = document.getElementById('list');
  el.tagChips = document.getElementById('tagChips');
  el.search = document.getElementById('search');
  el.hideUnrated = document.getElementById('hideUnrated');
  el.arrFilter = document.getElementById('arrFilter');

  initMap();

  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    state.cafes = await res.json();
  } catch (e) {
    console.error('Failed to load data.json', e);
    state.cafes = [];
  }

  renderTagChips();

  // Listeners
  el.search?.addEventListener('input', applyFilters);
  el.hideUnrated?.addEventListener('change', () => {
    state.hideUnrated = el.hideUnrated.checked;
    applyFilters();
  });
  el.arrFilter?.addEventListener('change', () => {
    state.arr = el.arrFilter.value;
    applyFilters();
  });

  applyFilters();
}

boot();
