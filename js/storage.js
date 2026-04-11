// =============================================================================
// storage.js — Persistência via localStorage (v3)
// =============================================================================

const STORAGE_KEY = 'arena-champion-counter';

function defaultState() {
  return {
    wins: {},
    losses: {},
    notes: {},
    streak: { count: 0, type: null },
    currentChampion: null,
    compactMode: false,
    activeTag: null,
    patches: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    let wins = parsed.wins || {};
    if (Array.isArray(parsed.defeated) && Object.keys(wins).length === 0) {
      parsed.defeated.forEach(id => { wins[id] = 1; });
    }
    return {
      wins,
      losses:          parsed.losses || {},
      notes:           parsed.notes || {},
      streak:          parsed.streak || { count: 0, type: null },
      currentChampion: parsed.currentChampion || null,
      compactMode:     parsed.compactMode || false,
      activeTag:       parsed.activeTag || null,
      patches:         parsed.patches || [],
    };
  } catch { return defaultState(); }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Erro ao salvar estado:', e); }
}

function _updateStreak(state, type) {
  if (state.streak.type === type) state.streak.count++;
  else state.streak = { count: 1, type };
}

function addWin(state, id) {
  state.wins[id] = (state.wins[id] || 0) + 1;
  _updateStreak(state, 'win');
  saveState(state); return state;
}
function removeWin(state, id) {
  if ((state.wins[id] || 0) > 1) state.wins[id]--;
  else delete state.wins[id];
  state.streak = { count: 0, type: null };
  saveState(state); return state;
}
function getWinCount(state, id)  { return state.wins[id] || 0; }
function hasWon(state, id)       { return getWinCount(state, id) > 0; }

function addLoss(state, id) {
  state.losses[id] = (state.losses[id] || 0) + 1;
  _updateStreak(state, 'loss');
  saveState(state); return state;
}
function removeLoss(state, id) {
  if ((state.losses[id] || 0) > 1) state.losses[id]--;
  else delete state.losses[id];
  state.streak = { count: 0, type: null };
  saveState(state); return state;
}
function getLossCount(state, id) { return state.losses[id] || 0; }

function setNote(state, id, text) {
  if (text && text.trim()) state.notes[id] = text.trim();
  else delete state.notes[id];
  saveState(state); return state;
}
function getNote(state, id) { return state.notes[id] || ''; }

function getTotalWins(state)   { return Object.values(state.wins).reduce((a,b) => a+b, 0); }
function getTotalLosses(state) { return Object.values(state.losses).reduce((a,b) => a+b, 0); }
function getUniqueWins(state)  { return Object.keys(state.wins).filter(id => state.wins[id] > 0).length; }

function setCurrentChampion(state, id)  { state.currentChampion = id; saveState(state); return state; }
function clearCurrentChampion(state)    { state.currentChampion = null; saveState(state); return state; }

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
  state.streak = { count: 0, type: null };
  saveState(state); return state;
}

function exportData(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `arena-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
}

function importData(jsonString) {
  try {
    const p = JSON.parse(jsonString);
    if (typeof p !== 'object') throw new Error('Invalid');
    const state = {
      wins: p.wins || {}, losses: p.losses || {},
      notes: p.notes || {}, streak: p.streak || { count: 0, type: null },
      currentChampion: p.currentChampion || null, compactMode: p.compactMode || false,
      activeTag: p.activeTag || null, patches: p.patches || [],
    };
    if (Array.isArray(p.defeated) && Object.keys(state.wins).length === 0) {
      p.defeated.forEach(id => { state.wins[id] = 1; });
    }
    saveState(state); return state;
  } catch { return null; }
}
