// =============================================================================
// champions.js — Base de dados dos campeões do Arena (LoL)
// Imagens via Data Dragon CDN da Riot Games
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

// Dados enriquecidos (counters + tags) para campeões cadastrados
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
  Xerath:       { role: 'MAGE',     tags: ['artillery','poke','long_range'],        counters: ['Fizz','Yasuo','Kassadin'] },
  Swain:        { role: 'MAGE',     tags: ['drain','cc','teamfight'],               counters: ['Vayne','Kassadin','Xerath'] },
  Lillia:       { role: 'MAGE',     tags: ['move_speed','dot','sleep'],             counters: ['Irelia','Yasuo','Diana'] },
  Akali:        { role: 'ASSASSIN', tags: ['mobility','burst','stealth'],           counters: ['Renekton','Garen','Annie'] },
  Fizz:         { role: 'ASSASSIN', tags: ['burst','mobility','untargetable'],      counters: ['Diana','Galio','Lissandra'] },
  Katarina:     { role: 'ASSASSIN', tags: ['reset','aoe','mobility'],               counters: ['Diana','Galio','Kassadin'] },
  Kassadin:     { role: 'ASSASSIN', tags: ['scale','mobility','anti_mage'],         counters: ['Renekton','Irelia','Talon'] },
  Khazix:       { role: 'ASSASSIN', tags: ['isolation','burst','stealth'],          counters: ['Renekton','LeeSin','Rammus'] },
  LeeSin:       { role: 'ASSASSIN', tags: ['mobility','insec','early_power'],       counters: ['Rammus','Malphite','Jax'] },
  Talon:        { role: 'ASSASSIN', tags: ['roam','burst','wall_hop'],              counters: ['Diana','Renekton','Malphite'] },
  Zed:          { role: 'ASSASSIN', tags: ['burst','shadow','outplay'],             counters: ['Malphite','Renekton','Rammus'] },
  Ekko:         { role: 'ASSASSIN', tags: ['burst','rewind','mobility'],            counters: ['Diana','Kassadin','Galio'] },
  Shaco:        { role: 'ASSASSIN', tags: ['stealth','clone','traps'],              counters: ['Renekton','LeeSin','Rammus'] },
  Malphite:     { role: 'TANK',     tags: ['engage','armor','as_slow'],             counters: ['Vayne','Fiora','Mordekaiser'] },
  Ornn:         { role: 'TANK',     tags: ['cc','upgrade','tanky'],                 counters: ['Vayne','Fiora','Mordekaiser'] },
  Leona:        { role: 'TANK',     tags: ['engage','cc','tanky'],                  counters: ['Morgana','Janna','Vayne'] },
  Nautilus:     { role: 'TANK',     tags: ['cc','hook','tanky'],                    counters: ['Morgana','Vayne','Fiora'] },
  Rammus:       { role: 'TANK',     tags: ['taunt','armor_reflect','mobility'],     counters: ['Mordekaiser','Vayne','Brand'] },
  DrMundo:      { role: 'TANK',     tags: ['regen','unstoppable','tanky'],          counters: ['Vayne','Fiora','Brand'] },
  Galio:        { role: 'TANK',     tags: ['anti_mage','engage','shield'],          counters: ['Vayne','Fiora','Mordekaiser'] },
  Nasus:        { role: 'TANK',     tags: ['scale','slow','splitpush'],             counters: ['Vayne','Darius','Illaoi'] },
  Amumu:        { role: 'TANK',     tags: ['engage','aoe_cc','tanky'],              counters: ['Morgana','Vayne','Brand'] },
  Chogath:      { role: 'TANK',     tags: ['scale','true_dmg','silence'],           counters: ['Vayne','Fiora','Mordekaiser'] },
  Vayne:        { role: 'MARKSMAN', tags: ['true_dmg','tank_killer','stealth'],     counters: ['Renekton','Leona','Nautilus'] },
  Jinx:         { role: 'MARKSMAN', tags: ['hypercarry','aoe','reset'],             counters: ['Renekton','LeeSin','Zed'] },
  Kaisa:        { role: 'MARKSMAN', tags: ['hybrid','burst','evolve'],              counters: ['Renekton','LeeSin','Diana'] },
  Lucian:       { role: 'MARKSMAN', tags: ['burst','mobility','combo'],             counters: ['Sett','Nautilus','Leona'] },
  MissFortune:  { role: 'MARKSMAN', tags: ['aoe','burst','poke'],                   counters: ['LeeSin','Zed','Fizz'] },
  Samira:       { role: 'MARKSMAN', tags: ['combo','lifesteal','style'],            counters: ['Nautilus','Leona','Malphite'] },
  Draven:       { role: 'MARKSMAN', tags: ['early_power','snowball','axes'],        counters: ['Nautilus','Leona','Malphite'] },
  Ezreal:       { role: 'MARKSMAN', tags: ['poke','safe','mobility'],               counters: ['Irelia','Yasuo','LeeSin'] },
  Jhin:         { role: 'MARKSMAN', tags: ['utility','burst','snipe'],              counters: ['Irelia','Yasuo','Fizz'] },
  Quinn:        { role: 'MARKSMAN', tags: ['roam','burst','blind'],                 counters: ['Malphite','Irelia','Yasuo'] },
  Lulu:         { role: 'SUPPORT',  tags: ['enchanter','polymorph','shield'],       counters: ['Leona','Nautilus','Brand'] },
  Morgana:      { role: 'SUPPORT',  tags: ['cc','spell_shield','zone'],             counters: ['Xerath','Brand','Zyra'] },
  Soraka:       { role: 'SUPPORT',  tags: ['heal','global','sustain'],              counters: ['Renekton','Fizz','Katarina'] },
  Thresh:       { role: 'SUPPORT',  tags: ['hook','peel','lantern'],                counters: ['Morgana','Ezreal','Sivir'] },
  Yuumi:        { role: 'SUPPORT',  tags: ['enchanter','attach','heal'],            counters: ['Renekton','LeeSin','Katarina'] },
  Janna:        { role: 'SUPPORT',  tags: ['disengage','shield','peel'],            counters: ['Leona','Nautilus','Zyra'] },
  Senna:        { role: 'SUPPORT',  tags: ['scale','heal','poke'],                  counters: ['LeeSin','Nautilus','Blitzcrank'] },
  Lissandra:    { role: 'SUPPORT',  tags: ['engage','cc','anti_dive'],              counters: ['Xerath','Kassadin','Vayne'] },
  Zyra:         { role: 'SUPPORT',  tags: ['zone','damage','plants'],               counters: ['Xerath','Brand','Fizz'] },
  Blitzcrank:   { role: 'SUPPORT',  tags: ['hook','engage','pick'],                 counters: ['Morgana','Ezreal','Sivir'] },
  Teemo:        { role: 'SUPPORT',  tags: ['shrooms','blind','poke'],               counters: ['Irelia','Yasuo','Fizz'] },
};

let CHAMPIONS = [];

function inferRole(tags) {
  if (!tags || tags.length === 0) return 'FIGHTER';
  return TAG_ROLE_MAP[tags[0]] || TAG_ROLE_MAP[tags[1]] || 'FIGHTER';
}

async function loadAllChampions() {
  // Busca a versão mais recente do Data Dragon automaticamente
  try {
    const vRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await vRes.json();
    if (Array.isArray(versions) && versions.length > 0) DDRAGON_VERSION = versions[0];
  } catch { /* usa fallback */ }

  try {
    const res = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/pt_BR/champion.json`
    );
    const json = await res.json();
    const raw = Object.values(json.data);

    CHAMPIONS = raw
      .map(c => {
        const enriched = ENRICHED_DATA[c.id] || {};
        return {
          id:       c.id,
          name:     c.name,
          title:    c.title,
          role:     enriched.role || inferRole(c.tags),
          tags:     enriched.tags || [],
          counters: enriched.counters || [],
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  } catch (err) {
    console.warn('Falha ao buscar campeões da API, usando lista local:', err);
    const enrichedEntries = Object.entries(ENRICHED_DATA);
    CHAMPIONS = enrichedEntries
      .map(([id, data]) => ({
        id,
        name:     id,
        title:    '',
        role:     data.role,
        tags:     data.tags,
        counters: data.counters,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }
  return CHAMPIONS;
}

function getChampionById(id) {
  return CHAMPIONS.find(c => c.id === id) || null;
}

function getCountersFor(championId) {
  const champ = getChampionById(championId);
  if (!champ) return [];
  return champ.counters.map(cId => getChampionById(cId)).filter(Boolean);
}

function getChampionsByRole(role) {
  if (!role || role === 'ALL') return CHAMPIONS;
  return CHAMPIONS.filter(c => c.role === role);
}

function searchChampions(query) {
  const q = query.toLowerCase().trim();
  if (!q) return CHAMPIONS;
  return CHAMPIONS.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.title.toLowerCase().includes(q) ||
    (ROLES[c.role] || '').toLowerCase().includes(q)
  );
}
