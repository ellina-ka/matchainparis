// ---------- Config ----------
const TAGS = ["work-friendly", "no-laptops", "to-go", "ceremonial", "flavoured"]; // checkboxes exist in HTML
const TOP_PICKS_THRESHOLD = 4.6;
let currentFilterCount = 0; // keeps filter count across language switches

// ---------- State & elements ----------
const state = {
  cafes: [],
  filtered: [],
  map: null,
  markers: [],
  topOnly: false,       // Top picks
  hideUnrated: false,
  arr: "all",
  selectedTags: [],     // selected category tags
  q: "",                // search text
  panelOpen: false
};

const el = {
  list: null,
  search: null,
  filterToggle: null,
  filterPanel: null,
  clearFilters: null,
  closeFilters: null,
  fTop: null,
  fTagBoxes: [],
  appliedChips: null,
  hideUnrated: null,
  arrFilter: null,
  langToggle: null
};

// ---------- i18n (UI-only; we do NOT touch cafe names/addresses/notes) ----------
const I18N = {
  en: {
    title_spots: "Matcha Spots in Paris 🍵",
    subtitle_spots: "All the matcha spots in Paris — my ratings, map, and quick links.",
    search_placeholder: "Search name, notes, or tags…",
    arr_title: "Arrondissement",
    hide_unrated: "Hide unrated",
    filter_heading: "Filter",
    top_picks_label: "Top picks (≥ 4.6)",
    clear_all: "Clear all",
    apply_filters: "Done",
    my_rating: "My rating",
    open_in_maps: "Open in Google Maps",
    no_results: "No results.",
    filters_btn: "Filters",
    top_picks_chip: "Top picks",
    nav_about: "About",
    nav_spots: "Spots"
  },
  fr: {
    title_spots: "Un matcha à Paris 🍵",
    subtitle_spots: "Toutes les adresses de matcha à Paris — mes notes, la carte et les liens utiles.",
    search_placeholder: "Rechercher (nom, notes, tags)…",
    arr_title: "Arrondissement",
    hide_unrated: "Masquer sans note",
    filter_heading: "Filtres",
    top_picks_label: "Top picks (≥ 4.6)",
    clear_all: "Tout effacer",
    apply_filters: "Appliquer",
    my_rating: "Ma note",
    open_in_maps: "Ouvrir dans Google Maps",
    no_results: "Aucun résultat.",
    filters_btn: "Filtres",
    top_picks_chip: "Top Lieux",
    nav_about: "À propos",
    nav_spots: "Adresses"
  }
};

let lang = localStorage.getItem('lang') || (navigator.language?.startsWith('fr') ? 'fr' : 'en');
function t(key){ return I18N[lang]?.[key] ?? I18N.en[key] ?? key; }

// Show labels in FR/EN but keep tag keys stable
const TAG_LABELS = {
  en: {
    "work-friendly": "work-friendly",
    "no-laptops": "no-laptops",
    "to-go": "to-go",
    "ceremonial": "ceremonial",
    "flavoured": "flavoured"
  },
  fr: {
    "work-friendly": "pour travailler",
    "no-laptops": "sans ordinateurs",
    "to-go": "à emporter",
    "ceremonial": "cérémonial",
    "flavoured": "aromatisé"
  }
};

function tagLabel(key) {
  return TAG_LABELS[lang]?.[key] || key;
}

// Prefer FR notes when FR is selected; otherwise EN (or fallback to existing notes)
function noteText(c) {
  if (lang === 'fr') return c.notes_fr ?? c.notes ?? "";
  return c.notes ?? ""; // if you later add notes_en, prefer it here
}

function setLabelTextAfterInput(inputId, text){
  const input = document.getElementById(inputId);
  if (!input) return;
  const label = input.closest('label') || input.parentElement;
  if (!label) return;
  if (label.lastChild && label.lastChild.nodeType === Node.TEXT_NODE) {
    label.lastChild.nodeValue = ' ' + text;
  } else {
    label.appendChild(document.createTextNode(' ' + text));
  }
}

// Re-label each tag checkbox in the filter panel
function updateTagCheckboxLabels() {
  el.fTagBoxes.forEach(input => {
    const label = input.closest('label') || input.parentElement;
    if (!label) return;
    // Find the first TEXT_NODE after the input; create one if needed.
    let node = input.nextSibling;
    while (node && node.nodeType !== Node.TEXT_NODE) node = node.nextSibling;
    if (node) {
      node.nodeValue = ' ' + tagLabel(input.value);
    } else {
      label.appendChild(document.createTextNode(' ' + tagLabel(input.value)));
    }
  });
}

function applyLangStaticTexts() {
  document.documentElement.lang = lang;

  const title = document.querySelector('h1.page-title');
  const subtitle = document.querySelector('p.text-muted');
  if (title) title.textContent = t('title_spots');
  if (subtitle) subtitle.textContent = t('subtitle_spots');

  const search = document.getElementById('search');
  if (search) search.setAttribute('placeholder', t('search_placeholder'));

  const arrSel = document.getElementById('arrFilter');
  if (arrSel) arrSel.setAttribute('title', t('arr_title'));

  setLabelTextAfterInput('hideUnrated', t('hide_unrated'));
  const navAbout = document.getElementById('navAbout');
const navSpots = document.getElementById('navSpots');
if (navAbout) navAbout.textContent = t('nav_about');
if (navSpots) navSpots.textContent = t('nav_spots');

  // Filter panel texts
  const panel = document.getElementById('filterPanel');
  if (panel) {
    const h = panel.querySelector('h4'); if (h) h.textContent = t('filter_heading');
    setLabelTextAfterInput('fTop', t('top_picks_label'));
    const clearBtn = document.getElementById('clearFilters'); if (clearBtn) clearBtn.textContent = t('clear_all');
    const closeBtn = document.getElementById('closeFilters'); if (closeBtn) closeBtn.textContent = t('apply_filters');
  }

  // Localize tag checkbox labels
  updateTagCheckboxLabels();

  // Navbar language toggle shows the other language
  const tog = document.getElementById('langToggle');
  if (tog) tog.textContent = lang === 'en' ? 'FR' : 'EN';

  // Update Filters button text (with count handled elsewhere)
  updateFilterButtonCount(currentFilterCount);
}

// Show count on "Filters" button (e.g., Filters (3))
function updateFilterButtonCount(n){
  currentFilterCount = n;
  const btn = document.getElementById('filterToggle');
  if (!btn) return;
  btn.textContent = n ? `${t('filters_btn')} (${n})` : t('filters_btn');
}

// ---------- Map ----------
function initMap() {
  state.map = L.map('map', { scrollWheelZoom: false }).setView([48.8566, 2.3522], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(state.map);
}
function clearMarkers(){ state.markers.forEach(m=>state.map.removeLayer(m)); state.markers=[]; }
function renderMarkers(items){
  clearMarkers(); const group=[];
  items.forEach((c,idx)=>{
    if (typeof c.lat!=='number'||typeof c.lng!=='number') return;
    const m=L.marker([c.lat,c.lng]).addTo(state.map)
      .bindPopup(`<strong>${c.name}</strong><br/>${c.address}<br/>My rating: ${c.my_rating ?? "—"}`);
    m.on('click',()=>highlightListItem(idx));
    state.markers.push(m); group.push(m);
  });

  if (group.length === 0) {
    state.map.setView([48.8566, 2.3522], 12); // reset to Paris default
    return;
  }
  if (group.length === 1) {
    const p = group[0].getLatLng();
    state.map.setView(p, Math.max(state.map.getZoom(), 14));
    return;
  }
  const fg = L.featureGroup(group);
  state.map.fitBounds(fg.getBounds().pad(0.25), { maxZoom: 15 });
}
function highlightListItem(idx){
  const cards=document.querySelectorAll('.item'); if(!cards[idx])return;
  cards[idx].scrollIntoView({behavior:'smooth',block:'center'});
  cards[idx].style.outline='2px solid #6366f1'; setTimeout(()=>cards[idx].style.outline='',800);
}

// ---------- Helpers ----------
function starText(n){ if(typeof n!=='number')return '—'; return `${'★'.repeat(Math.round(n))}${'☆'.repeat(5-Math.round(n))} ${n.toFixed(1)}`; }
function googleLink(c){ return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`; }
function getArrFromAddress(address){
  const m=(address||"").match(/75(\d{3})/); if(!m) return null;
  const n=parseInt(m[1],10); const arr=n===116?16:(n%100); return (arr>=1&&arr<=20)?arr:null;
}

// ---------- List ----------
function renderList(items){
  el.list.innerHTML='';
  if (!items.length) {
    el.list.innerHTML = '<div class="item">' + t('no_results') + '</div>';
    return;
  }
  items.forEach((c,i)=>{
    const div=document.createElement('div'); div.className='item card';
    div.innerHTML=`
      <h3>${c.name}</h3>
      <div class="meta">${c.address} • ${c.price || '—'}</div>
      <div style="margin:6px 0">${
        (c.tags || []).map(t => `<span class="badge">${tagLabel(t)}</span>`).join('')
      }</div>
      <div class="row">
        <div>${t('my_rating')}: <strong>${starText(c.my_rating)}</strong></div>
        <a class="btn" href="${googleLink(c)}" target="_blank" rel="noreferrer">${t('open_in_maps')}</a>
      </div>
      ${noteText(c) ? `<div style="margin-top:6px;color:#4b5563">${noteText(c)}</div>` : ''}
    `;
    div.addEventListener('mouseenter',()=>{ const m=state.markers[i]; if(m) m.openPopup(); });
    el.list.appendChild(div);
  });
}

// ---------- Applied chips (only selected filters) ----------
function renderAppliedChips(){
  const chips = el.appliedChips;
  chips.innerHTML = '';
  let count = 0;

  if (state.topOnly){
    const b = document.createElement('button');
    b.className = 'chip';
    b.innerHTML = `<span class="x" aria-hidden="true">×</span>${t('top_picks_chip')}`;
    b.title = 'Remove';
    b.addEventListener('click', ()=>{
      state.topOnly = false;
      syncPanelFromState();
      applyFilters();
    });
    chips.appendChild(b);
    count++;
  }

  state.selectedTags.forEach(tag=>{
    const b = document.createElement('button');
    b.className = 'chip';
    b.innerHTML = `<span class="x" aria-hidden="true">×</span>${tagLabel(tag)}`;
    b.title = 'Remove';
    b.addEventListener('click', ()=>{
      state.selectedTags = state.selectedTags.filter(t=>t!==tag);
      syncPanelFromState();
      applyFilters();
    });
    chips.appendChild(b);
    count++;
  });

  updateFilterButtonCount(count);
}

// ---------- Filters logic ----------
function applyFilters(){
  state.q=(el.search?.value||'').trim().toLowerCase();

  let items=state.cafes.filter(c=>{
    if(state.topOnly && (c.my_rating ?? 0) < TOP_PICKS_THRESHOLD) return false;
    if(state.hideUnrated && typeof c.my_rating!=='number') return false;

    if(state.arr!=="all"){
      const arr=getArrFromAddress(c.address||"");
      if(String(arr)!==String(state.arr)) return false;
    }

    if(state.selectedTags.length){
      const ct=(c.tags||[]).map(t=>(t||'').toLowerCase());
      const ok = state.selectedTags.every(t => ct.includes(t)); // AND logic
      if(!ok) return false;
    }

    if(state.q){
      const hay = [
        c.name || '',
        c.address || '',
        c.notes || '',
        c.notes_fr || '',
        ...(c.tags || []),
        ...(c.tags || []).map(tagLabel)
      ].join(' ').toLowerCase();
      if(!hay.includes(state.q)) return false;
    }
    return true;
  });

  // Sort by rating desc, then name
  items.sort((a,b)=>{
    const ra=typeof a.my_rating==='number'?a.my_rating:-1;
    const rb=typeof b.my_rating==='number'?b.my_rating:-1;
    if(rb!==ra) return rb-ra;
    return a.name.localeCompare(b.name,'fr',{sensitivity:'base'});
  });

  state.filtered=items;
  renderList(items);
  renderMarkers(items);
  renderAppliedChips();
}

function syncPanelFromState(){
  if (el.fTop) el.fTop.checked = state.topOnly;
  el.fTagBoxes.forEach(box=>{ box.checked = state.selectedTags.includes(box.value); });
}
function updateStateFromPanel(){
  state.topOnly = !!el.fTop?.checked;
  state.selectedTags = el.fTagBoxes.filter(b=>b.checked).map(b=>b.value);
}

function openPanel(){ syncPanelFromState(); el.filterPanel.hidden=false; state.panelOpen=true; }
function closePanel(){ el.filterPanel.hidden=true; state.panelOpen=false; }

// ---------- Boot ----------
async function boot(){
  document.getElementById('year').textContent=new Date().getFullYear();
  el.list=document.getElementById('list');
  el.search=document.getElementById('search');
  el.filterToggle=document.getElementById('filterToggle');
  el.filterPanel=document.getElementById('filterPanel');
  el.clearFilters=document.getElementById('clearFilters');
  el.closeFilters=document.getElementById('closeFilters');
  el.fTop=document.getElementById('fTop');
  el.fTagBoxes=Array.from(document.querySelectorAll('.fTag'));
  el.appliedChips=document.getElementById('appliedChips');
  el.hideUnrated=document.getElementById('hideUnrated');
  el.arrFilter=document.getElementById('arrFilter');
  el.langToggle=document.getElementById('langToggle');

  initMap();

  try{
    const res=await fetch('data.json',{cache:'no-store'});
    state.cafes=await res.json();
  }catch(e){ console.error('Failed to load data.json',e); state.cafes=[]; }

  // Initial language application + tag label localization
  applyLangStaticTexts();

  // Listeners
  el.search?.addEventListener('input', applyFilters);
  el.hideUnrated?.addEventListener('change', ()=>{ state.hideUnrated=el.hideUnrated.checked; applyFilters(); });
  el.arrFilter?.addEventListener('change', ()=>{ state.arr=el.arrFilter.value; applyFilters(); });

  el.filterToggle?.addEventListener('click', ()=>{ state.panelOpen?closePanel():openPanel(); });
  el.closeFilters?.addEventListener('click', ()=>{ closePanel(); });
  el.clearFilters?.addEventListener('click', ()=>{
    state.topOnly=false; state.selectedTags=[]; syncPanelFromState(); applyFilters();
  });
  el.langToggle?.addEventListener('click', () => {
    lang = (lang === 'en' ? 'fr' : 'en');
    localStorage.setItem('lang', lang);
    applyLangStaticTexts(); // updates UI labels + tag checkbox labels
    applyFilters();         // re-render list with translated strings
  });
  el.fTop?.addEventListener('change', ()=>{ updateStateFromPanel(); applyFilters(); });
  el.fTagBoxes.forEach(b=> b.addEventListener('change', ()=>{ updateStateFromPanel(); applyFilters(); }));

  // Close panel on outside click
  document.addEventListener('click',(e)=>{
    if(!state.panelOpen) return;
    const inside = el.filterPanel.contains(e.target) || el.filterToggle.contains(e.target);
    if(!inside) closePanel();
  });

  applyFilters();
}
boot();
