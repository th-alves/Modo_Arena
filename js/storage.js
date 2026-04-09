// =============================================================================
// storage.js — Persistência via localStorage (v2)
// =============================================================================

const STORAGE_KEY = 'arena-champion-counter';

function defaultState() {
  return {
    wins: {},           // { champId: count }
    losses: {},         // { champId: count }
    currentChampion: null,
    compactMode: false,
    activeTag: null,
    patches: [],        // histórico de snapshots
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);

    // Migração do formato antigo (defeated: [])
    let wins = parsed.wins || {};
    if (Array.isArray(parsed.defeated) && Object.keys(wins).length === 0) {
      parsed.defeated.forEach(id => { wins[id] = 1; });
    }

    return {
      wins,
      losses:          parsed.losses || {},
      currentChampion: parsed.currentChampion || null,
      compactMode:     parsed.compactMode || false,
      activeTag:       parsed.activeTag || null,
      patches:         parsed.patches || [],
    };
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Erro ao salvar estado:', e); }
}

// --- Vitórias ---
function addWin(state, id) {
  state.wins[id] = (state.wins[id] || 0) + 1;
  saveState(state); return state;
}
function removeWin(state, id) {
  if ((state.wins[id] || 0) > 1) state.wins[id]--;
  else delete state.wins[id];
  saveState(state); return state;
}
function getWinCount(state, id)  { return state.wins[id] || 0; }
function hasWon(state, id)       { return getWinCount(state, id) > 0; }

// --- Derrotas ---
function addLoss(state, id) {
  state.losses[id] = (state.losses[id] || 0) + 1;
  saveState(state); return state;
}
function removeLoss(state, id) {
  if ((state.losses[id] || 0) > 1) state.losses[id]--;
  else delete state.losses[id];
  saveState(state); return state;
}
function getLossCount(state, id) { return state.losses[id] || 0; }

// --- Totais ---
function getTotalWins(state)   { return Object.values(state.wins).reduce((a,b) => a+b, 0); }
function getTotalLosses(state) { return Object.values(state.losses).reduce((a,b) => a+b, 0); }
function getUniqueWins(state)  { return Object.keys(state.wins).filter(id => state.wins[id] > 0).length; }

// --- Campeão atual ---
function setCurrentChampion(state, id)  { state.currentChampion = id; saveState(state); return state; }
function clearCurrentChampion(state)    { state.currentChampion = null; saveState(state); return state; }

// --- Patch snapshot ---
function savePatchSnapshot(state, label) {
  state.patches.unshift({
    date:        new Date().toLocaleDateString('pt-BR'),
    label,
    totalWins:   getTotalWins(state),
    uniqueWins:  getUniqueWins(state),
    totalLosses: getTotalLosses(state),
  });
  if (state.patches.length > 10) state.patches = state.patches.slice(0, 10);
  saveState(state); return state;
}

function resetWinsAndLosses(state) {
  state.wins = {}; state.losses = {};
  saveState(state); return state;
}

// --- Export / Import ---
function exportData(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `arena-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(jsonString) {
  try {
    const p = JSON.parse(jsonString);
    if (typeof p !== 'object') throw new Error('Invalid');
    const state = {
      wins:            p.wins || {},
      losses:          p.losses || {},
      currentChampion: p.currentChampion || null,
      compactMode:     p.compactMode || false,
      activeTag:       p.activeTag || null,
      patches:         p.patches || [],
    };
    // migrate old format
    if (Array.isArray(p.defeated) && Object.keys(state.wins).length === 0) {
      p.defeated.forEach(id => { state.wins[id] = 1; });
    }
    saveState(state);
    return state;
  } catch { return null; }
}
