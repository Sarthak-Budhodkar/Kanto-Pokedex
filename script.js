const $ = id => document.getElementById(id);
const pokeList = $('pokemon-list'), pokeName = $('pokemon-name'), pokeId = $('pokemon-id'),
  pokeSprite = $('pokemon-sprite'), pokeTypes = $('pokemon-types'), pokeStats = $('pokemon-stats'),
  pokeGenus = $('pokemon-genus'), pokeDesc = $('pokemon-desc'), pokeHt = $('pokemon-ht'), pokeWt = $('pokemon-wt'),
  searchInput = $('search-input'), countEl = $('count'), shinyBtn = $('shiny-button'), cryBtn = $('cry-button');

const API = 'https://pokeapi.co/api/v2/';
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const CRY = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/';
const TOTAL = 151;
const STAT_LABELS = { hp: 'HP', attack: 'ATK', defense: 'DEF', 'special-attack': 'SPA', 'special-defense': 'SPD', speed: 'SPE' };

const cache = {};
let all = [], current = 1, shiny = false, token = 0;

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const pad = n => String(n).padStart(3, '0');
const pretty = n => n === 'nidoran-f' ? 'Nidoran ♀' : n === 'nidoran-m' ? 'Nidoran ♂' : n === 'mr-mime' ? 'Mr. Mime' : n === 'farfetchd' ? "Farfetch'd" : n.split('-').map(cap).join(' ');
const statColor = v => v < 50 ? '#e5533d' : v < 80 ? '#f0a030' : v < 110 ? '#e8d636' : v < 140 ? '#6cc24a' : '#2fb5c9';

/* ---------- Sprite ---------- */
function setSprite(id) {
  const animated = `${SPR}versions/generation-v/black-white/animated/${shiny ? 'shiny/' : ''}${id}.gif`;
  const still = `${SPR}${shiny ? 'shiny/' : ''}${id}.png`;
  pokeSprite.classList.add('loading');
  pokeSprite.onload = () => { pokeSprite.classList.remove('loading'); pokeSprite.classList.remove('pop'); void pokeSprite.offsetWidth; pokeSprite.classList.add('pop'); };
  pokeSprite.onerror = () => { pokeSprite.onerror = null; pokeSprite.src = still; };
  pokeSprite.src = animated;
}

/* ---------- Data ---------- */
async function getData(id) {
  if (cache[id]) return cache[id];
  const [p, s] = await Promise.all([
    fetch(`${API}pokemon/${id}`).then(r => r.json()),
    fetch(`${API}pokemon-species/${id}`).then(r => r.json())
  ]);
  const en = s.flavor_text_entries.filter(e => e.language.name === 'en');
  const pref = en.find(e => ['red', 'blue', 'yellow'].includes(e.version.name)) || en[0];
  cache[id] = {
    p,
    genus: (s.genera.find(g => g.language.name === 'en') || {}).genus || '',
    desc: pref ? pref.flavor_text.replace(/[\f\n\r]/g, ' ').replace(/\s+/g, ' ') : ''
  };
  return cache[id];
}

/* ---------- Display ---------- */
async function select(id, scroll = true) {
  id = Math.max(1, Math.min(TOTAL, id));
  current = id;
  const my = ++token;

  document.querySelectorAll('.list-item.active').forEach(e => e.classList.remove('active'));
  const li = pokeList.querySelector(`[data-id="${id}"]`);
  if (li) { li.classList.add('active'); if (scroll) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }

  pokeId.textContent = `No.${pad(id)}`;
  pokeName.textContent = pretty(all[id - 1]?.name || '...');
  setSprite(id);

  try {
    const d = await getData(id);
    if (my !== token) return;
    const { p } = d;
    pokeName.textContent = pretty(p.name);
    pokeGenus.textContent = d.genus.replace(' Pokémon', '');
    pokeDesc.textContent = d.desc;
    pokeHt.textContent = `HT ${(p.height / 10).toFixed(1)}m`;
    pokeWt.textContent = `WT ${(p.weight / 10).toFixed(1)}kg`;
    pokeTypes.innerHTML = p.types.map(t => `<span class="type-badge type-${t.type.name}">${t.type.name}</span>`).join('');
    pokeStats.innerHTML = p.stats.map(s => `
      <div class="stat-item"><span class="stat-name">${STAT_LABELS[s.stat.name]}</span>
      <div class="stat-bar-container"><div class="stat-bar" data-w="${Math.min(100, s.base_stat / 255 * 100)}" style="background:${statColor(s.base_stat)}"></div></div>
      <span class="stat-value">${s.base_stat}</span></div>`).join('');
    requestAnimationFrame(() => setTimeout(() =>
      pokeStats.querySelectorAll('.stat-bar').forEach(b => b.style.width = b.dataset.w + '%'), 30));
  } catch (e) {
    console.error(e);
    pokeDesc.textContent = 'Could not load data.';
  }
}

/* ---------- List ---------- */
function renderList(filter = '') {
  const f = filter.trim().toLowerCase();
  const rows = all.filter(p => !f || p.name.includes(f) || pretty(p.name).toLowerCase().includes(f) || String(p.id).includes(f) || pad(p.id).includes(f));
  countEl.textContent = `${rows.length} / ${TOTAL}`;
  if (!rows.length) { pokeList.innerHTML = '<li class="list-item">No Pokémon found</li>'; return rows; }
  pokeList.innerHTML = rows.map(p => `
    <li class="list-item${p.id === current ? ' active' : ''}" data-id="${p.id}">
      <img loading="lazy" alt="" src="${SPR}${p.id}.png">
      <span class="num">${pad(p.id)}</span><span>${pretty(p.name)}</span></li>`).join('');
  return rows;
}

pokeList.addEventListener('click', e => {
  const li = e.target.closest('.list-item[data-id]');
  if (li) select(+li.dataset.id, false);
});

searchInput.addEventListener('input', () => {
  const rows = renderList(searchInput.value);
  if (rows.length && searchInput.value.trim()) select(rows[0].id, false);
});

/* ---------- Controls ---------- */
const step = n => select(current + n);
$('up-button').onclick = () => step(-1);
$('down-button').onclick = () => step(1);
$('left-button').onclick = () => step(-10);
$('right-button').onclick = () => step(10);

shinyBtn.onclick = () => { shiny = !shiny; shinyBtn.classList.toggle('on', shiny); setSprite(current); };

let audio;
cryBtn.onclick = () => {
  if (audio) audio.pause();
  audio = new Audio(`${CRY}${current}.ogg`);
  audio.volume = .5;
  audio.play().catch(() => {});
};

document.addEventListener('keydown', e => {
  if (e.target === searchInput && !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
  const k = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -10, ArrowRight: 10 }[e.key];
  if (k) { e.preventDefault(); step(k); }
});

/* ---------- Opening sequence ---------- */
const cover = $('cover'), boot = $('boot');
let opened = false;
function openDex() {
  if (opened) return;
  opened = true;
  cover.classList.add('open');
  setTimeout(() => {
    cover.classList.add('gone');
    setTimeout(() => boot.classList.add('off'), 900);
  }, 1250);
}
cover.addEventListener('click', openDex);
setTimeout(openDex, 2600);

/* ---------- Init ---------- */
(async function init() {
  try {
    const res = await fetch(`${API}pokemon?limit=${TOTAL}`).then(r => r.json());
    all = res.results.map((p, i) => ({ id: i + 1, name: p.name }));
    renderList();
    select(1, false);
  } catch (e) {
    console.error(e);
    pokeList.innerHTML = '<li class="list-item">Error loading list. Check your connection.</li>';
  }
})();
