const state = {
  cafes: [],
  filtered: [],
  map: null,
  markers: [],
  topOnly: false
};

const el = {
  list: null,
  search: null,
  topToggle: null
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
  // Use coords if present; otherwise fall back to address search (always works)
  if (typeof c.lat === 'number' && typeof c.lng === 'number') {
    return `https://www.google.com/maps?q=${c.lat},${c.lng}`;
  }
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
  state.filtered = state.cafes.filter(c => {
    if (state.topOnly && (c.my_rating ?? 0) < 4.6) return fals_
