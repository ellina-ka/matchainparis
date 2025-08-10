const state = {
  cafes: [],
  filtered: [],
  map: null,
  markers: [],
  topOnly: false,
  sortBy: "rating",      // NEW
  hideUnrated: false     // NEW
};

const el = {
  list: null,
  search: null,
  topToggle: null,
  sortBy: null,          // NEW
  hideUnrated: null      // NEW
};


function initMap() {
  // Centre on Paris
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
    // Only add a marker if we have coordinates
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

function starText(n) {
  if (typeof n !== 'number') return '—';
  return `${'★'.repeat(Math.round(n))}${'☆'.repeat(5 - Math.round(n))} ${n.toFixed(1)}`;
}

function googleLink(c) {
  // Always use the address for Google Maps button
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`;
}

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

function applyFilters() {
  const q = el.search.value.trim().toLowerCase();

  // Filter
  let items = state.cafes.filter(c => {
    if (state.topOnly && (c.my_rating ?? 0) < 4.6) return false;
    if (state.hideUnrated && typeof c.my_rating !== 'number') return false;
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      (c.tags || []).some(t => t.toLowerCase().includes(q))
    );
  });

  // Sort
  if (state.sortBy === 'name') {
    items.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  } else { // default: rating
    items.sort((a, b) => {
      const ra = typeof a.my_rating === 'number' ? a.my_rating : -1;
      const rb = typeof b.my_rating === 'number' ? b.my_rating : -1;
      if (rb !== ra) return rb - ra;
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });
  }

  state.filtered = items;
  renderList(state.filtered);
  renderMarkers(state.filtered);
}


async function boot() {
  document.getElementById('year').textContent = new Date().getFullYear();
  el.list = document.getElementById('list');
  el.search = document.getElementById('search');
  el.topToggle = document.getElementById('topToggle');
  el.sortBy = document.getElementById('sortBy'); // dropdown for sorting
el.hideUnrated = document.getElementById('hideUnrated'); // checkbox

// Listeners for new controls
el.sortBy?.addEventListener('change', () => {
  state.sortBy = el.sortBy.value;
  applyFilters();
});
el.hideUnrated?.addEventListener('change', () => {
  state.hideUnrated = el.hideUnrated.checked;
  applyFilters();
});


  initMap();

  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    state.cafes = await res.json();
  } catch (e) {
    console.error('Failed to load data.json', e);
    state.cafes = [];
  }

  el.search.addEventListener('input', applyFilters);
  el.topToggle.addEventListener('click', () => {
    state.topOnly = !state.topOnly;
    el.topToggle.textContent = state.topOnly ? 'Top picks: ON' : 'Top picks';
    applyFilters();
  });

  applyFilters();
}

boot();
