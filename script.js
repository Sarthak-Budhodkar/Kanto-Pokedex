const $ = id => document.getElementById(id);
const pokeList = $('pokemon-list'), pokeName = $('pokemon-name'), pokeId = $('pokemon-id'),
  pokeSprite = $('pokemon-sprite'), pokeTypes = $('pokemon-types'), pokeStats = $('pokemon-stats'),
  pokeGenus = $('pokemon-genus'), pokeDesc = $('pokemon-desc'), pokeHt = $('pokemon-ht'), pokeWt = $('pokemon-wt'),
  searchInput = $('search-input'), countEl = $('count'), shinyBtn = $('shiny-button'), cryBtn = $('cry-button'),
  spriteBox = document.querySelector('.sprite-box'), screenEl = $('screen');

const API = 'https://pokeapi.co/api/v2/';
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const CRY = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/';
const TOTAL = 151;
const STAT_LABELS = { hp: 'HP', attack: 'ATK', defense: 'DEF', 'special-attack': 'SPA', 'special-defense': 'SPD', speed: 'SPE' };

// Hardcoded names = instant list, no list request
const NAMES = 'bulbasaur ivysaur venusaur charmander charmeleon charizard squirtle wartortle blastoise caterpie metapod butterfree weedle kakuna beedrill pidgey pidgeotto pidgeot rattata raticate spearow fearow ekans arbok pikachu raichu sandshrew sandslash nidoran-f nidorina nidoqueen nidoran-m nidorino nidoking clefairy clefable vulpix ninetales jigglypuff wigglytuff zubat golbat oddish gloom vileplume paras parasect venonat venomoth diglett dugtrio meowth persian psyduck golduck mankey primeape growlithe arcanine poliwag poliwhirl poliwrath abra kadabra alakazam machop machoke machamp bellsprout weepinbell victreebel tentacool tentacruel geodude graveler golem ponyta rapidash slowpoke slowbro magnemite magneton farfetchd doduo dodrio seel dewgong grimer muk shellder cloyster gastly haunter gengar onix drowzee hypno krabby kingler voltorb electrode exeggcute exeggutor cubone marowak hitmonlee hitmonchan lickitung koffing weezing rhyhorn rhydon chansey tangela kangaskhan horsea seadra goldeen seaking staryu starmie mr-mime scyther jynx electabuzz magmar pinsir tauros magikarp gyarados lapras ditto eevee vaporeon jolteon flareon porygon omanyte omastar kabuto kabutops aerodactyl snorlax articuno zapdos moltres dratini dragonair dragonite mewtwo mew'.split(' ');
const all = NAMES.map((name, i) => ({ id: i + 1, name }));

const cache = {}, inflight = {};
let current = 1, shiny = false, token = 0;

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const pad = n => String(n).padStart(3, '0');
const pretty = n => n === 'nidoran-f' ? 'Nidoran ♀' : n === 'nidoran-m' ? 'Nidoran ♂' : n === 'mr-mime' ? 'Mr. Mime' : n === 'farfetchd' ? "Farfetch'd" : cap(n);
const statColor = v => v < 50 ? '#e5533d' : v < 80 ? '#f0a030' : v < 110 ? '#e8d636' : v < 140 ? '#6cc24a' : '#2fb5c9';

/* ---------- Sprite: show cached still instantly, swap to animated when ready ---------- */
function setSprite(id) {
  const still = `${SPR}${shiny ? 'shiny/' : ''}${id}.png`;
  const anim = `${SPR}versions/generation-v/black-white/animated/${shiny ? 'shiny/' : ''}${id}.gif`;
  pokeSprite.src = still;
  const img = new Image();
  img.onload = () => { if (id === current) pokeSprite.src = anim; };
  img.src = anim;
}

/* ---------- Data (trimmed + saved in localStorage so repeat visits are instant) ---------- */
function getData(id) {
  if (cache[id]) return Promise.resolve(cache[id]);
  try { const s = localStorage.getItem('pdx' + id); if (s) return Promise.resolve(cache[id] = JSON.parse(s)); } catch {}
  return inflight[id] || (inflight[id] = Promise.all([
    fetch(`${API}pokemon/${id}`).then(r => r.json()),
    fetch(`${API}pokemon-species/${id}`).then(r => r.json())
  ]).then(([p, s]) => {
    const en = s.flavor_text_entries.filter(e => e.language.name === 'en');
    const pref = en.find(e => ['red', 'blue', 'yellow'].includes(e.version.name)) || en[0];
    const d = {
      types: p.types.map(t => t.type.name),
      stats: p.stats.map(x => [x.stat.name, x.base_stat]),
      h: p.height, w: p.weight,
      genus: ((s.genera.find(g => g.language.name === 'en') || {}).genus || '').replace(' Pokémon', ''),
      desc: pref ? pref.flavor_text.replace(/[\f\n\r]/g, ' ').replace(/\s+/g, ' ') : ''
    };
    cache[id] = d;
    try { localStorage.setItem('pdx' + id, JSON.stringify(d)); } catch {}
    return d;
  }).finally(() => delete inflight[id]));
}

/* ---------- Display ---------- */
function animate(el, cls) {
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}

async function select(id, scroll = true, dir = 'pop') {
  id = Math.max(1, Math.min(TOTAL, id));
  current = id;
  const my = ++token;

  document.querySelectorAll('.list-item.active').forEach(e => e.classList.remove('active'));
  const li = pokeList.querySelector(`[data-id="${id}"]`);
  if (li) { li.classList.add('active'); if (scroll) li.scrollIntoView({ block: 'nearest' }); }

  pokeId.textContent = `No.${pad(id)}`;
  pokeName.textContent = pretty(all[id - 1].name);
  setSprite(id);
  animate(spriteBox, 'go-' + dir);
  animate(screenEl, 'flash');

  try {
    const d = await getData(id);
    if (my !== token) return;
    pokeGenus.textContent = d.genus;
    pokeDesc.textContent = d.desc;
    pokeHt.textContent = `HT ${(d.h / 10).toFixed(1)}m`;
    pokeWt.textContent = `WT ${(d.w / 10).toFixed(1)}kg`;
    pokeTypes.innerHTML = d.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
    pokeStats.innerHTML = d.stats.map(([n, v]) => `
      <div class="stat-item"><span class="stat-name">${STAT_LABELS[n]}</span>
      <div class="stat-bar-container"><div class="stat-bar" data-w="${Math.min(100, v / 255 * 100)}" style="background:${statColor(v)}"></div></div>
      <span class="stat-value">${v}</span></div>`).join('');
    requestAnimationFrame(() => setTimeout(() =>
      pokeStats.querySelectorAll('.stat-bar').forEach(b => b.style.width = b.dataset.w + '%'), 30));
    // prefetch neighbours
    [id + 1, id - 1, id + 10, id - 10].forEach(n => { if (n > 0 && n <= TOTAL) getData(n).catch(() => {}); });
  } catch (e) {
    console.error(e);
    pokeDesc.textContent = 'Could not load data.';
  }
}

/* ---------- List ---------- */
function renderList(filter = '') {
  const f = filter.trim().toLowerCase();
  const rows = all.filter(p => !f || p.name.includes(f) || pretty(p.name).toLowerCase().includes(f) || String(p.id) === f || pad(p.id).includes(f));
  countEl.textContent = `${rows.length} / ${TOTAL}`;
  if (!rows.length) { pokeList.innerHTML = '<li class="list-item">No Pokémon found</li>'; return rows; }
  pokeList.innerHTML = rows.map(p => `
    <li class="list-item${p.id === current ? ' active' : ''}" data-id="${p.id}">
      <img loading="lazy" decoding="async" alt="" src="${SPR}${p.id}.png">
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

/* ---------- D-pad: press effect + direction slide ---------- */
const DIRS = {
  up: { btn: 'up-button', n: -1, cls: 'down' },
  down: { btn: 'down-button', n: 1, cls: 'up' },
  left: { btn: 'left-button', n: -10, cls: 'right' },
  right: { btn: 'right-button', n: 10, cls: 'left' }
};
function press(dir) {
  const d = DIRS[dir], b = $(d.btn);
  b.classList.add('pressed');
  setTimeout(() => b.classList.remove('pressed'), 140);
  if (navigator.vibrate) navigator.vibrate(12);
  if ((dir === 'up' && current === 1) || (dir === 'down' && current === TOTAL)) return animate(spriteBox, 'go-bump');
  select(current + d.n, true, d.cls);
}
Object.keys(DIRS).forEach(k => $(DIRS[k].btn).addEventListener('pointerdown', e => { e.preventDefault(); press(k); }));

shinyBtn.onclick = () => { shiny = !shiny; shinyBtn.classList.toggle('on', shiny); setSprite(current); animate(spriteBox, 'go-pop'); };

let audio;
cryBtn.onclick = () => {
  if (audio) audio.pause();
  audio = new Audio(`${CRY}${current}.ogg`);
  audio.volume = .5;
  audio.play().catch(() => {});
  cryBtn.classList.add('on'); setTimeout(() => cryBtn.classList.remove('on'), 300);
};

document.addEventListener('keydown', e => {
  const k = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
  if (!k || (e.target === searchInput && (k === 'left' || k === 'right'))) return;
  e.preventDefault(); press(k);
});

/* ---------- Opening sequence ---------- */
const cover = $('cover'), boot = $('boot');
let opened = false;
function openDex() {
  if (opened) return;
  opened = true;
  cover.classList.add('open');
  document.body.classList.add('opened');
  setTimeout(() => { cover.classList.add('gone'); setTimeout(() => boot.classList.add('off'), 700); }, 1300);
}
cover.addEventListener('click', openDex);
setTimeout(openDex, 2200);

/* ---------- Init ---------- */
renderList();
select(1, false);
