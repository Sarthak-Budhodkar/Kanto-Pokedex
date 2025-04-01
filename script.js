const pokeList = document.getElementById('pokemon-list');
const pokeName = document.getElementById('pokemon-name');
const pokeId = document.getElementById('pokemon-id');
const pokeSprite = document.getElementById('pokemon-sprite');
const pokeTypes = document.getElementById('pokemon-types');
const pokeStats = document.getElementById('pokemon-stats');
const loadingIndicator = document.getElementById('loading-indicator');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');

const POKE_API_BASE = 'https://pokeapi.co/api/v2/pokemon/';
const START_ID = 1;
const END_ID = 151;
const MAX_STAT_VALUE = 255;
const POKEMONS_PER_PAGE = 20;

let pokemonCache = {};
let currentActiveListItem = null;
let currentPage = 1;
let totalPages = Math.ceil((END_ID - START_ID + 1) / POKEMONS_PER_PAGE);
let allPokemonList = [];

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function setLoading(isLoading) {
    if (isLoading) {
        loadingIndicator.classList.add('active');
        pokeSprite.classList.add('loading');
    } else {
        loadingIndicator.classList.remove('active');
        pokeSprite.classList.remove('loading');
    }
}

async function fetchPokemonData(idOrName) {
    if (pokemonCache[idOrName]) {
        return pokemonCache[idOrName];
    }

    setLoading(true);
    try {
        const response = await fetch(POKE_API_BASE + idOrName);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        pokemonCache[data.id] = data;
        pokemonCache[data.name] = data;
        return data;
    } catch (error) {
        console.error("Could not fetch Pokemon data:", error);
        setLoading(false);
        pokeName.textContent = "Error";
        pokeId.textContent = "";
        pokeSprite.src = "";
        pokeTypes.innerHTML = "";
        pokeStats.innerHTML = `<p style="color: red; text-align: center;">Could not load data.</p>`;
        return null;
    }
}

function displayPokemonInfo(data) {
    if (!data) return;

    pokeName.textContent = capitalize(data.name);
    pokeId.textContent = `#${String(data.id).padStart(3, '0')}`;

    const animatedSprite = data.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default;
    const defaultSprite = data.sprites.front_default;
    pokeSprite.src = animatedSprite || defaultSprite || 'placeholder.png';
    pokeSprite.alt = capitalize(data.name);

    pokeTypes.innerHTML = '';
    data.types.forEach(typeInfo => {
        const typeSpan = document.createElement('span');
        typeSpan.textContent = typeInfo.type.name;
        typeSpan.className = `type-badge type-${typeInfo.type.name}`;
        pokeTypes.appendChild(typeSpan);
    });

    pokeStats.innerHTML = '';
    data.stats.forEach(statInfo => {
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';

        const statName = document.createElement('span');
        statName.className = 'stat-name';
        let name = statInfo.stat.name.replace('special-attack', 'Sp. Atk').replace('special-defense', 'Sp. Def');
        statName.textContent = capitalize(name);

        const statBarContainer = document.createElement('div');
        statBarContainer.className = 'stat-bar-container';

        const statBar = document.createElement('div');
        statBar.className = 'stat-bar';
        const barWidth = Math.min(100, (statInfo.base_stat / MAX_STAT_VALUE) * 100);
        setTimeout(() => {
            statBar.style.width = `${barWidth}%`;
        }, 50);

        statBarContainer.appendChild(statBar);

        const statValue = document.createElement('span');
        statValue.className = 'stat-value';
        statValue.textContent = statInfo.base_stat;

        statItem.appendChild(statName);
        statItem.appendChild(statBarContainer);
        statItem.appendChild(statValue);
        pokeStats.appendChild(statItem);
    });

    setLoading(false);
}

async function populatePokemonList(page = 1) {
    currentPage = page;
    const startId = START_ID + (page - 1) * POKEMONS_PER_PAGE;
    const endId = Math.min(startId + POKEMONS_PER_PAGE - 1, END_ID);
    
    pokeList.innerHTML = '';

    if (allPokemonList.length === 0) {
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${END_ID}`);
            const data = await response.json();
            allPokemonList = data.results.map((pokemon, index) => ({
                id: index + 1,
                name: pokemon.name,
                url: pokemon.url
            }));
        } catch (error) {
            console.error("Failed to fetch all Pokémon:", error);
            pokeList.innerHTML = '<li class="list-item">Error loading Pokémon list</li>';
            return;
        }
    }

    for (let i = startId; i <= endId; i++) {
        const pokemon = allPokemonList[i - 1];
        if (!pokemon) continue;

        const listItem = document.createElement('li');
        listItem.className = 'list-item';
        listItem.dataset.id = pokemon.id;

        const listImg = document.createElement('img');
        listImg.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
        listImg.alt = '';
        listImg.loading = 'lazy';

        const listName = document.createElement('span');
        listName.textContent = `#${String(pokemon.id).padStart(3,'0')} ${capitalize(pokemon.name)}`;

        listItem.appendChild(listImg);
        listItem.appendChild(listName);

        listItem.addEventListener('click', async () => {
            if (currentActiveListItem) {
                currentActiveListItem.classList.remove('active');
            }
            listItem.classList.add('active');
            currentActiveListItem = listItem;

            const pokemonData = await fetchPokemonData(pokemon.id);
            displayPokemonInfo(pokemonData);
        });

        pokeList.appendChild(listItem);
    }

    updateNavigationButtons();

    if (!currentActiveListItem && pokeList.firstChild) {
        pokeList.firstChild.click();
    }
}

function updateNavigationButtons() {
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
}

function searchPokemon() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm === '') {
        populatePokemonList(currentPage);
        return;
    }

    const results = allPokemonList.filter(pokemon => 
        pokemon.name.toLowerCase().includes(searchTerm) || 
        String(pokemon.id).includes(searchTerm)
    ).slice(0, POKEMONS_PER_PAGE);

    pokeList.innerHTML = '';

    if (results.length === 0) {
        pokeList.innerHTML = '<li class="list-item">No Pokémon found</li>';
        return;
    }

    results.forEach(pokemon => {
        const listItem = document.createElement('li');
        listItem.className = 'list-item';
        listItem.dataset.id = pokemon.id;

        const listImg = document.createElement('img');
        listImg.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
        listImg.alt = '';
        listImg.loading = 'lazy';

        const listName = document.createElement('span');
        listName.textContent = `#${String(pokemon.id).padStart(3,'0')} ${capitalize(pokemon.name)}`;

        listItem.appendChild(listImg);
        listItem.appendChild(listName);

        listItem.addEventListener('click', async () => {
            if (currentActiveListItem) {
                currentActiveListItem.classList.remove('active');
            }
            listItem.classList.add('active');
            currentActiveListItem = listItem;

            const pokemonData = await fetchPokemonData(pokemon.id);
            displayPokemonInfo(pokemonData);
        });

        pokeList.appendChild(listItem);
    });

    if (pokeList.firstChild) {
        pokeList.firstChild.click();
    }
}

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchPokemon();
    }
});

searchButton.addEventListener('click', searchPokemon);

prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
        populatePokemonList(currentPage - 1);
    }
});

nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
        populatePokemonList(currentPage + 1);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    populatePokemonList();
});