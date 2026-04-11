// =============================================================================
// champions.js — Base de dados dos campeões (TDAH.GG)
// Imagens via Data Dragon CDN · Cache agressivo via localStorage
// =============================================================================

let DDRAGON_VERSION = '16.7.1';

const CHAMPION_IMG     = (id) => `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${id}.png`;
const CHAMPION_SPLASH  = (id) => `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${id}_0.jpg`;
const CHAMPION_LOADING = (id) => `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${id}_0.jpg`;

const ROLES = {
  FIGHTER:  'Lutador',
  MAGE:     'Mago',
  ASSASSIN: 'Assassino',
  TANK:     'Tanque',
  MARKSMAN: 'Atirador',
  SUPPORT:  'Suporte',
};

const TAG_ROLE_MAP = {
  Fighter:  'FIGHTER',
  Tank:     'TANK',
  Mage:     'MAGE',
  Assassin: 'ASSASSIN',
  Marksman: 'MARKSMAN',
  Support:  'SUPPORT',
};

const ENRICHED_DATA = {
  Aatrox:       { role: 'FIGHTER',  tags: ['sustain','dive','teamfight'],          counters: ['Vayne','Fiora','Kayle'] },
  Darius:       { role: 'FIGHTER',  tags: ['execute','tanky','snowball'],           counters: ['Vayne','Quinn','Kayle'] },
  Fiora:        { role: 'FIGHTER',  tags: ['duelist','splitpush','truedmg'],        counters: ['Malphite','Teemo','Quinn'] },
  Garen:        { role: 'FIGHTER',  tags: ['tanky','execute','silence'],            counters: ['Vayne','Quinn','Teemo'] },
  Illaoi:       { role: 'FIGHTER',  tags: ['sustain','zone','tentacles'],           counters: ['Vayne','Mordekaiser','Kayle'] },
  Irelia:       { role: 'FIGHTER',  tags: ['mobility','duelist','dive'],            counters: ['Tryndamere','Volibear','Renekton'] },
  Jax:          { role: 'FIGHTER',  tags: ['duelist','scale','hybrid'],             counters: ['Malphite','Garen','Teemo'] },
  Mordekaiser:  { role: 'FIGHTER',  tags: ['ap_bruiser','isolation','sustain'],     counters: ['Fiora','Vayne','Olaf'] },
  Olaf:         { role: 'FIGHTER',  tags: ['unstoppable','sustain','chase'],        counters: ['Vayne','Kayle','Jax'] },
  Renekton:     { role: 'FIGHTER',  tags: ['early_power','sustain','stun'],         counters: ['Vayne','Quinn','Illaoi'] },
  Sett:         { role: 'FIGHTER',  tags: ['sustain','grappler','true_dmg'],        counters: ['Vayne','Kayle','Quinn'] },
  Tryndamere:   { role: 'FIGHTER',  tags: ['crit','undying','splitpush'],           counters: ['Malphite','Nasus','Teemo'] },
  Viego:        { role: 'FIGHTER',  tags: ['reset','possession','sustain'],         counters: ['Renekton','LeeSin','Elise'] },
  Volibear:     { role: 'FIGHTER',  tags: ['dive','tanky','disable_tower'],         counters: ['Vayne','Lillia','Cassiopeia'] },
  Yasuo:        { role: 'FIGHTER',  tags: ['crit','windwall','mobility'],           counters: ['Renekton','Malphite','Rammus'] },
  Yone:         { role: 'FIGHTER',  tags: ['crit','hybrid','mobility'],             counters: ['Renekton','Sett','Malphite'] },
  Gwen:         { role: 'FIGHTER',  tags: ['ap_bruiser','true_dmg','sustain'],      counters: ['Mordekaiser','Irelia','Tryndamere'] },
  Camille:      { role: 'FIGHTER',  tags: ['mobility','true_dmg','lockdown'],       counters: ['Jax','Fiora','Darius'] },
  Ahri:         { role: 'MAGE',     tags: ['burst','mobility','charm'],             counters: ['Kassadin','Fizz','Yasuo'] },
  Annie:        { role: 'MAGE',     tags: ['burst','stun','tibbers'],               counters: ['Xerath','Syndra','Kassadin'] },
  Brand:        { role: 'MAGE',     tags: ['aoe','dot','percent_hp'],               counters: ['Xerath','Fizz','Kassadin'] },
  Cassiopeia:   { role: 'MAGE',     tags: ['dps','zone','grounding'],               counters: ['Xerath','Kassadin','Fizz'] },
  Diana:        { role: 'MAGE',     tags: ['dive','burst','aoe'],                   counters: ['Kassadin','Garen','Malphite'] },
  Karthus:      { role: 'MAGE',     tags: ['global','dps','postmortem'],            counters: ['Kassadin','Fizz','Olaf'] },
  Kayle:        { role: 'MAGE',     tags: ['scale','ranged','invulnerable'],        counters: ['Irelia','Jax','Tryndamere'] },
  Lux:          { role: 'MAGE',     tags: ['burst','cc','long_range'],              counters: ['Fizz','Yasuo','Kassadin'] },
  Syndra:       { role: 'MAGE',     tags: ['burst','zone','disengage'],             counters: ['Fizz','Yasuo','Kassadin'] },
  VelKoz:       { role: 'MAGE',     tags: ['artillery','true_dmg','poke'],          counters: ['Fizz','Yasuo','Kassadin'] },
  Veigar:       { role: 'MAGE',     tags: ['scale','burst','cage'],                 counters: ['Fizz','Kassadin','Xerath'] },
  Viktor:       { role: 'MAGE',     tags: ['scale','zone','burst'],                 counters: ['Fizz','Kassadin','Irelia'] },
  Xerath:       { role: 'MAGE',     tags: ['artillery','poke','aoe'],               counters: ['Fizz','Kassadin','Leblanc'] },
  Ziggs:        { role: 'MAGE',     tags: ['poke','aoe','objective'],               counters: ['Fizz','Kassadin','Yasuo'] },
  Zoe:          { role: 'MAGE',     tags: ['burst','cc','spell_thief'],             counters: ['Kassadin','Fizz','Galio'] },
  Lissandra:    { role: 'MAGE',     tags: ['engage','cc','anti_dive'],              counters: ['Xerath','Kassadin','Vayne'] },
  Orianna:      { role: 'MAGE',     tags: ['teamfight','shield','zone'],            counters: ['Fizz','Kassadin','Yasuo'] },
  Swain:        { role: 'MAGE',     tags: ['sustain','teamfight','ap_bruiser'],     counters: ['Kassadin','Fizz','Xerath'] },
  Akali:        { role: 'ASSASSIN', tags: ['burst','mobility','shroud'],            counters: ['Malphite','Galio','Diana'] },
  Ekko:         { role: 'ASSASSIN', tags: ['burst','mobility','rewind'],            counters: ['Malphite','Garen','Galio'] },
  Fizz:         { role: 'ASSASSIN', tags: ['burst','untargetable','slippery'],      counters: ['Malphite','Garen','Galio'] },
  Kassadin:     { role: 'ASSASSIN', tags: ['scale','anti_mage','mobility'],         counters: ['Cho\'Gath','Malphite','Pantheon'] },
  Katarina:     { role: 'ASSASSIN', tags: ['reset','mobility','aoe'],               counters: ['Malphite','Garen','Diana'] },
  Khazix:       { role: 'ASSASSIN', tags: ['burst','isolation','evolve'],           counters: ['Rengar','Rammus','Malphite'] },
  Leblanc:      { role: 'ASSASSIN', tags: ['burst','mobility','clone'],             counters: ['Malphite','Galio','Kassadin'] },
  Pyke:         { role: 'ASSASSIN', tags: ['execute','hook','reset'],               counters: ['Malphite','Galio','Leona'] },
  Rengar:       { role: 'ASSASSIN', tags: ['burst','stealth','hunt'],               counters: ['Malphite','Rammus','Galio'] },
  Talon:        { role: 'ASSASSIN', tags: ['burst','roam','parkour'],               counters: ['Malphite','Galio','Renekton'] },
  Zed:          { role: 'ASSASSIN', tags: ['burst','shadow','execute'],             counters: ['Malphite','Kayle','Zhonyas'] },
  Naafiri:      { role: 'ASSASSIN', tags: ['pack','burst','mobility'],              counters: ['Malphite','Galio','Rammus'] },
  Malphite:     { role: 'TANK',     tags: ['engage','rock','anti_ad'],              counters: ['Vayne','Mordekaiser','Vladimir'] },
  Nasus:        { role: 'TANK',     tags: ['scale','lifesteal','wither'],           counters: ['Vayne','Quinn','Teemo'] },
  Rammus:       { role: 'TANK',     tags: ['engage','taunt','anti_ad'],             counters: ['Mordekaiser','Vayne','Teemo'] },
  Shen:         { role: 'TANK',     tags: ['global','engage','split'],              counters: ['Vayne','Darius','Fiora'] },
  Ornn:         { role: 'TANK',     tags: ['engage','forge','teamfight'],           counters: ['Vayne','Fiora','Quinn'] },
  Cho_Gath:     { role: 'TANK',     tags: ['scale','silence','true_dmg'],           counters: ['Vayne','Quinn','Fiora'] },
  Mundo:        { role: 'TANK',     tags: ['sustain','tanky','unkillable'],         counters: ['Vayne','Fiora','Mordekaiser'] },
  Leona:        { role: 'TANK',     tags: ['engage','cc','sunlight'],               counters: ['Braum','Morgana','Xerath'] },
  Braum:        { role: 'TANK',     tags: ['engage','shield','anti_proj'],          counters: ['Xerath','Ziggs','Zyra'] },
  Ashe:         { role: 'MARKSMAN', tags: ['cc','kite','utility'],                  counters: ['Draven','Lucian','Tristana'] },
  Caitlyn:      { role: 'MARKSMAN', tags: ['long_range','poke','trap'],             counters: ['Draven','Lucian','Jinx'] },
  Draven:       { role: 'MARKSMAN', tags: ['early_power','execute','snowball'],     counters: ['Caitlyn','Ezreal','Sivir'] },
  Ezreal:       { role: 'MARKSMAN', tags: ['poke','mobility','skillshot'],          counters: ['Draven','Caitlyn','Lucian'] },
  Jinx:         { role: 'MARKSMAN', tags: ['reset','scale','aoe'],                  counters: ['Draven','Lucian','Caitlyn'] },
  KaiSa:        { role: 'MARKSMAN', tags: ['burst','mobility','hybrid'],            counters: ['Draven','Caitlyn','Miss_Fortune'] },
  MissFortune:  { role: 'MARKSMAN', tags: ['burst','aoe','ult'],                    counters: ['Draven','Lucian','Ezreal'] },
  Sivir:        { role: 'MARKSMAN', tags: ['waveclear','utility','spell_shield'],   counters: ['Draven','Lucian','Caitlyn'] },
  Tristana:     { role: 'MARKSMAN', tags: ['siege','reset','late_scale'],           counters: ['Draven','Lucian','Caitlyn'] },
  Twitch:       { role: 'MARKSMAN', tags: ['stealth','scale','aoe'],                counters: ['Draven','Caitlyn','Lucian'] },
  Vayne:        { role: 'MARKSMAN', tags: ['true_dmg','anti_tank','mobile'],        counters: ['Draven','Caitlyn','Lucian'] },
  Jhin:         { role: 'MARKSMAN', tags: ['burst','cc','artistry'],                counters: ['Lucian','Draven','Ezreal'] },
  Thresh:       { role: 'SUPPORT',  tags: ['hook','engage','utility'],              counters: ['Morgana','Blitzcrank','Leona'] },
  Morgana:      { role: 'SUPPORT',  tags: ['shield','cc','anti_cc'],                counters: ['Xerath','Brand','Zyra'] },
  Lulu:         { role: 'SUPPORT',  tags: ['peel','polymorph','hypercarry'],        counters: ['Leona','Thresh','Nautilius'] },
  Nami:         { role: 'SUPPORT',  tags: ['heal','cc','peel'],                     counters: ['Leona','Thresh','Blitzcrank'] },
  Soraka:       { role: 'SUPPORT',  tags: ['heal','silence','anti_execute'],        counters: ['Leona','Xerath','Brand'] },
  Janna:        { role: 'SUPPORT',  tags: ['peel','disengage','shield'],            counters: ['Leona','Thresh','Blitzcrank'] },
  Nautilus:     { role: 'SUPPORT',  tags: ['engage','hook','cc'],                   counters: ['Morgana','Sivir','Xerath'] },
  Senna:        { role: 'SUPPORT',  tags: ['scale','heal','poke'],                  counters: ['LeeSin','Nautilus','Blitzcrank'] },
  Zyra:         { role: 'SUPPORT',  tags: ['zone','damage','plants'],               counters: ['Xerath','Brand','Fizz'] },
  Blitzcrank:   { role: 'SUPPORT',  tags: ['hook','engage','pick'],                 counters: ['Morgana','Ezreal','Sivir'] },
  Teemo:        { role: 'SUPPORT',  tags: ['shrooms','blind','poke'],               counters: ['Irelia','Yasuo','Fizz'] },
};

let CHAMPIONS = [];

// =============================================================================
// Cache — evita re-fetch do champion.json a cada visita
// Chave inclui versão: invalida automaticamente quando DDragon atualiza
// =============================================================================
const CACHE_KEY_PREFIX = 'tdahgg_champs_v_';
const CACHE_TTL_MS     = 24 * 60 * 60 * 1000; // 24h fallback mesmo versão

function _readCache(version) {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + version);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch { return null; }
}

function _writeCache(version, data) {
  try {
    // Remove caches antigos de versões anteriores
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_KEY_PREFIX) && k !== CACHE_KEY_PREFIX + version)
      .forEach(k => localStorage.removeItem(k));
    localStorage.setItem(CACHE_KEY_PREFIX + version, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* quota cheia — sem cache, sem drama */ }
}

function _buildChampionList(raw) {
  return raw
    .map(c => {
      const enriched = ENRICHED_DATA[c.id] || {};
      return {
        id:       c.id,
        name:     c.name,
        title:    c.title,
        role:     enriched.role || _inferRole(c.tags),
        tags:     enriched.tags  || [],
        counters: enriched.counters || [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function _inferRole(tags) {
  if (!tags || tags.length === 0) return 'FIGHTER';
  return TAG_ROLE_MAP[tags[0]] || TAG_ROLE_MAP[tags[1]] || 'FIGHTER';
}

// Alias legado
function inferRole(tags) { return _inferRole(tags); }

async function loadAllChampions() {
  // 1. Busca versão atual (arquivo tiny ~2 KB)
  try {
    const vRes     = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await vRes.json();
    if (Array.isArray(versions) && versions[0]) DDRAGON_VERSION = versions[0];
  } catch { /* usa versão hardcoded */ }

  // 2. Tenta cache local primeiro
  const cached = _readCache(DDRAGON_VERSION);
  if (cached) {
    CHAMPIONS = cached;
    _preloadFirstPage();
    return CHAMPIONS;
  }

  // 3. Cache miss → busca champion.json
  try {
    const res  = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/pt_BR/champion.json`
    );
    const json = await res.json();
    // Extrai só os campos que usamos (id, name, title, tags) — descarta stats/spells/lore
    const raw  = Object.values(json.data).map(c => ({
      id:    c.id,
      name:  c.name,
      title: c.title,
      tags:  c.tags,
    }));
    CHAMPIONS = _buildChampionList(raw);
    _writeCache(DDRAGON_VERSION, CHAMPIONS);
  } catch (err) {
    console.warn('Falha ao buscar campeões da API, usando lista local:', err);
    CHAMPIONS = Object.entries(ENRICHED_DATA)
      .map(([id, data]) => ({ id, name: id, title: '', role: data.role, tags: data.tags, counters: data.counters }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  _preloadFirstPage();
  return CHAMPIONS;
}

// Pré-carrega as imagens da primeira página invisívelmente
// Assim quando o grid renderiza, as imgs já estão no cache do browser
function _preloadFirstPage(count = 24) {
  if (!('requestIdleCallback' in window)) return;
  requestIdleCallback(() => {
    CHAMPIONS.slice(0, count).forEach(c => {
      const img = new Image();
      img.src = CHAMPION_IMG(c.id);
    });
  }, { timeout: 2000 });
}

function getChampionById(id)     { return CHAMPIONS.find(c => c.id === id) || null; }
function getChampionsByRole(role) {
  if (!role || role === 'ALL') return CHAMPIONS;
  return CHAMPIONS.filter(c => c.role === role);
}
function getCountersFor(championId) {
  const champ = getChampionById(championId);
  if (!champ) return [];
  return champ.counters.map(id => getChampionById(id)).filter(Boolean);
}
function searchChampions(query) {
  const q = query.toLowerCase().trim();
  if (!q) return CHAMPIONS;
  return CHAMPIONS.filter(c => c.name.toLowerCase().includes(q));
}
