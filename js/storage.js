// =============================================================================
// storage.js — Persistência via localStorage
// =============================================================================

const STORAGE_KEY = 'arena-champion-counter';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { defeated: [], currentChampion: null };
    const parsed = JSON.parse(raw);
    return {
      defeated: Array.isArray(parsed.defeated) ? parsed.defeated : [],
      currentChampion: parsed.currentChampion || null,
    };
  } catch {
    return { defeated: [], currentChampion: null };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Erro ao salvar estado:', e);
  }
}

function toggleDefeated(state, championId) {
  const idx = state.defeated.indexOf(championId);
  if (idx > -1) {
    state.defeated.splice(idx, 1);
  } else {
    state.defeated.push(championId);
  }
  saveState(state);
  return state;
}

function setCurrentChampion(state, championId) {
  state.currentChampion = championId;
  saveState(state);
  return state;
}

function clearCurrentChampion(state) {
  state.currentChampion = null;
  saveState(state);
  return state;
}

function isDefeated(state, championId) {
  return state.defeated.includes(championId);
}

function getDefeatedCount(state) {
  return state.defeated.length;
}
