// =============================================================================
// app.js — Arena Champion Counter v3
// =============================================================================

(function () {
  'use strict';

  // ---- Estado ----
  let state = loadState();
  let activeRole  = 'ALL';
  let searchQuery = '';
  let activeTag   = null;       // filtro por tag
  let showUnplayed = false;     // filtro "Não joguei"
  let showWon      = false;     // filtro "Já Venci"
  let currentPage  = 1;
  const PER_PAGE   = 24;

  // ---- Ranques ----
  const RANKS = [
    { name: 'Ferro',       min: 0,   max: 0,        color: '#7a7a7a', icon: '🩶' },
    { name: 'Bronze',      min: 1,   max: 5,        color: '#cd7f32', icon: '🥉' },
    { name: 'Prata',       min: 6,   max: 15,       color: '#c0c0c0', icon: '🥈' },
    { name: 'Ouro',        min: 16,  max: 30,       color: '#ffd700', icon: '🥇' },
    { name: 'Platina',     min: 31,  max: 50,       color: '#00d4aa', icon: '💎' },
    { name: 'Diamante',    min: 51,  max: 75,       color: '#5b9fff', icon: '🔷' },
    { name: 'Mestre',      min: 76,  max: 100,      color: '#9b59b6', icon: '👑' },
    { name: 'Grão-Mestre', min: 101, max: 130,      color: '#e84057', icon: '🔥' },
    { name: 'Desafiante',  min: 131, max: Infinity, color: '#c89b3c', icon: '⚡' },
  ];
  function getRank(wins) { return RANKS.find(r => wins >= r.min && wins <= r.max) || RANKS[0]; }

  // ---- DOM ----
  const grid          = document.getElementById('champion-grid');
  const searchInput   = document.getElementById('search-input');
  const roleFilters   = document.getElementById('role-filters');
  const detailOverlay = document.getElementById('detail-overlay');
  const toastEl       = document.getElementById('toast');
  const paginationEl  = document.getElementById('pagination');

  const statTotal    = document.getElementById('stat-total');
  const statWins     = document.getElementById('stat-wins');
  const statUnique   = document.getElementById('stat-unique');
  const statLosses   = document.getElementById('stat-losses');
  const statWinrate  = document.getElementById('stat-winrate');
  const statRank     = document.getElementById('stat-rank');
  const progressFill = document.getElementById('progress-fill');
  const statPercent  = document.getElementById('stat-percent');

  const currentChampionEl = document.getElementById('current-champion');
  const tagFilterBar      = document.getElementById('tag-filter-bar');
  const patchHistoryList  = document.getElementById('patch-history-list');

  const detailSplash  = document.getElementById('detail-splash');
  const detailAvatar  = document.getElementById('detail-avatar');
  const detailName    = document.getElementById('detail-name');
  const detailTitle   = document.getElementById('detail-title');
  const detailRole    = document.getElementById('detail-role');
  const detailActions = document.getElementById('detail-actions');
  const tagsList      = document.getElementById('tags-list');
  const counterList   = document.getElementById('counter-list');
  const detailClose   = document.getElementById('detail-close');

  // ---- Toast ----
  let toastTimer = null;
  function showToast(msg, type = 'success') {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.className   = 'toast toast--visible';
    if (type === 'danger') toastEl.classList.add('toast--danger');
    if (type === 'gold')   toastEl.classList.add('toast--gold');
    toastTimer = setTimeout(() => toastEl.classList.remove('toast--visible'), 2400);
  }

  // ---- Stats ----
  function updateStats() {
    const total       = CHAMPIONS.length;
    const totalWins   = getTotalWins(state);
    const totalLosses = getTotalLosses(state);
    const unique      = getUniqueWins(state);
    const played      = totalWins + totalLosses;
    const winrate     = played > 0 ? Math.round((totalWins / played) * 100) : 0;
    const percent     = total > 0 ? Math.round((unique / total) * 100) : 0;
    const rank        = getRank(totalWins);

    statTotal.textContent   = total;
    statWins.textContent    = totalWins;
    statUnique.textContent  = unique;
    statLosses.textContent  = totalLosses;
    statWinrate.textContent = `${winrate}%`;
    progressFill.style.width = `${percent}%`;
    statPercent.textContent  = `${percent}%`;

    if (statRank) {
      statRank.innerHTML = `
        <span class="rank-icon">${rank.icon}</span>
        <span class="rank-name" style="color:${rank.color}">${rank.name}</span>
      `;
    }
  }

  // ---- Campeão Atual ----
  function updateCurrentChampion() {
    if (state.currentChampion) {
      const champ = getChampionById(state.currentChampion);
      if (champ) {
        currentChampionEl.classList.remove('current-champion--empty');
        const wins   = getWinCount(state, champ.id);
        const losses = getLossCount(state, champ.id);
        currentChampionEl.innerHTML = `
          <img class="current-champion__img" src="${CHAMPION_IMG(champ.id)}" alt="${champ.name}">
          <div class="current-champion__info">
            <div class="current-champion__label">Campeão Atual</div>
            <div class="current-champion__name">${champ.name}</div>
            ${wins > 0 || losses > 0 ? `<div class="current-champion__record"><span class="record-w">${wins}V</span> <span class="record-l">${losses}D</span></div>` : ''}
          </div>
          <div class="current-champion__btns">
            <button class="current-champion__clear" id="clear-current">✕</button>
            <button class="current-champion__won"   id="btn-won">🏆 Ganhei</button>
            <button class="current-champion__lost"  id="btn-lost">💀 Perdi</button>
          </div>
        `;
        document.getElementById('clear-current').addEventListener('click', e => {
          e.stopPropagation();
          state = clearCurrentChampion(state);
          updateCurrentChampion(); renderGrid();
          showToast('Campeão atual removido', 'danger');
        });
        document.getElementById('btn-won').addEventListener('click', e => {
          e.stopPropagation();
          state = addWin(state, champ.id);
          state = clearCurrentChampion(state);
          updateStats(); updateCurrentChampion(); renderGrid();
          showToast(`🏆 Venci com ${champ.name}! (${getWinCount(state, champ.id)}ª vitória)`, 'success');
          window._fxLaunch('confetti');
        });
        document.getElementById('btn-lost').addEventListener('click', e => {
          e.stopPropagation();
          state = addLoss(state, champ.id);
          state = clearCurrentChampion(state);
          updateStats(); updateCurrentChampion(); renderGrid();
          showToast(`Perdi com ${champ.name}… próxima!`, 'danger');
          window._fxLaunch('skull');
        });
        return;
      }
    }
    currentChampionEl.classList.add('current-champion--empty');
    currentChampionEl.innerHTML = `
      <div class="current-champion__info">
        <div class="current-champion__label">Campeão Atual</div>
        <div class="current-champion__name">Selecione um campeão</div>
      </div>
    `;
  }

  // ---- Card ----
  function createChampionCard(champ) {
    const wins      = getWinCount(state, champ.id);
    const losses    = getLossCount(state, champ.id);
    const hasWins   = wins > 0;
    const hasLosses = losses > 0;
    const untried   = wins === 0 && losses === 0;
    const isCurrent = state.currentChampion === champ.id;
    const compact   = state.compactMode;

    const card = document.createElement('article');
    card.className = 'champion-card';
    if (hasWins)   card.classList.add('champion-card--defeated');
    if (isCurrent) card.classList.add('champion-card--current');
    if (untried)   card.classList.add('champion-card--untried');
    if (compact)   card.classList.add('champion-card--compact');

    if (compact) {
      card.innerHTML = `
        <div class="champion-card__img-wrapper">
          <img class="champion-card__img" src="${CHAMPION_IMG(champ.id)}" alt="${champ.name}" loading="lazy">
          <div class="champion-card__overlay"></div>
          ${wins > 0 ? `<span class="win-badge">${wins}</span>` : ''}
          ${losses > 0 ? `<span class="loss-badge">${losses}</span>` : ''}
        </div>
        <div class="champion-card__compact-name">${champ.name}</div>
      `;
      card.addEventListener('click', () => openDetail(champ.id));
      card.querySelector('.champion-card__img-wrapper').addEventListener('click', e => {
        e.stopPropagation(); openDetail(champ.id);
      });
    } else {
      card.innerHTML = `
        <div class="champion-card__img-wrapper">
          <img class="champion-card__img" src="${CHAMPION_IMG(champ.id)}" alt="${champ.name}" loading="lazy">
          <div class="champion-card__overlay"></div>
          <span class="champion-card__role-badge">${ROLES[champ.role] || champ.role}</span>
          ${wins > 0 ? `<span class="win-badge">${wins}V</span>` : ''}
          ${losses > 0 ? `<span class="loss-badge">${losses}D</span>` : ''}
          ${untried ? '<span class="untried-badge">Novo</span>' : ''}
        </div>
        <div class="champion-card__info">
          <div class="champion-card__name">${champ.name}</div>
          <div class="champion-card__title">${champ.title}</div>
          ${hasWins || hasLosses ? `<div class="card-record"><span class="record-w">${wins}V</span><span class="record-sep">/</span><span class="record-l">${losses}D</span></div>` : ''}
        </div>
        <div class="champion-card__actions">
          <button class="card-action-btn card-action-btn--win" data-action="add-win" data-id="${champ.id}">✓ Venci</button>
          <button class="card-action-btn card-action-btn--undo" data-action="undo-win" data-id="${champ.id}" style="${wins > 0 ? '' : 'visibility:hidden;pointer-events:none'}">↩</button>
          <button class="card-action-btn" data-action="view-detail" data-id="${champ.id}">Info</button>
        </div>
      `;

      card.querySelector('[data-action="view-detail"]').addEventListener('click', e => {
        e.stopPropagation(); openDetail(champ.id);
      });
      card.querySelector('[data-action="add-win"]').addEventListener('click', e => {
        e.stopPropagation();
        state = addWin(state, champ.id);
        updateStats(); renderGrid();
        showToast(`🏆 Venci com ${champ.name}! (${getWinCount(state, champ.id)}ª vez)`, 'success');
        window._fxLaunch('confetti');
      });
      const undoBtn = card.querySelector('[data-action="undo-win"]');
      if (undoBtn && wins > 0) {
        undoBtn.addEventListener('click', e => {
          e.stopPropagation();
          state = removeWin(state, champ.id);
          updateStats(); renderGrid();
          showToast(`${champ.name} — vitória removida`, 'danger');
        });
      }
      card.querySelector('.champion-card__img-wrapper').addEventListener('click', () => openDetail(champ.id));
    }

    return card;
  }

  // ---- Tag Filter Bar ----
  function updateTagFilterBar() {
    if (!tagFilterBar) return;
    if (!activeTag) {
      tagFilterBar.classList.add('tag-filter-bar--hidden');
      tagFilterBar.innerHTML = '';
      return;
    }
    tagFilterBar.classList.remove('tag-filter-bar--hidden');
    tagFilterBar.innerHTML = `
      <span class="tag-filter-label">Tag ativa:</span>
      <span class="tag-filter-chip">
        ${activeTag.replace(/_/g, ' ')}
        <button class="tag-filter-clear" id="clear-tag">✕</button>
      </span>
    `;
    document.getElementById('clear-tag').addEventListener('click', () => {
      activeTag = null;
      currentPage = 1;
      updateTagFilterBar();
      renderGrid();
    });
  }

  // ---- Filtro ----
  function getFilteredChampions() {
    let champs = getChampionsByRole(activeRole);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      champs = champs.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (ROLES[c.role] || '').toLowerCase().includes(q)
      );
    }
    if (activeTag) {
      champs = champs.filter(c => c.tags.includes(activeTag));
    }
    if (showUnplayed) {
      champs = champs.filter(c => getWinCount(state, c.id) === 0 && getLossCount(state, c.id) === 0);
    }
    if (showWon) {
      champs = champs.filter(c => getWinCount(state, c.id) > 0);
    }
    return champs;
  }

  // ---- Grid ----
  function renderGrid() {
    const champs = getFilteredChampions();
    const totalPages = Math.max(1, Math.ceil(champs.length / PER_PAGE));

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const page = champs.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

    // compact class on grid
    grid.classList.toggle('champion-grid--compact', !!state.compactMode);

    grid.innerHTML = '';
    if (champs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state__icon">${showUnplayed ? '🎉' : '🔍'}</div>
          <div class="empty-state__text">${showUnplayed ? 'Você jogou com todos!' : 'Nenhum campeão encontrado'}</div>
        </div>`;
      renderPagination(0, 1); return;
    }

    const frag = document.createDocumentFragment();
    page.forEach(c => frag.appendChild(createChampionCard(c)));
    grid.appendChild(frag);
    renderPagination(champs.length, totalPages);
  }

  // ---- Paginação ----
  function renderPagination(total, totalPages) {
    if (!paginationEl) return;
    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

    const start = (currentPage - 1) * PER_PAGE + 1;
    const end   = Math.min(currentPage * PER_PAGE, total);
    const delta = 2;
    const left  = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    let btns = '';
    if (left > 1) { btns += `<button class="page-btn" data-page="1">1</button>`; if (left > 2) btns += `<span class="page-ellipsis">…</span>`; }
    for (let i = left; i <= right; i++) btns += `<button class="page-btn ${i===currentPage?'page-btn--active':''}" data-page="${i}">${i}</button>`;
    if (right < totalPages) { if (right < totalPages - 1) btns += `<span class="page-ellipsis">…</span>`; btns += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`; }

    paginationEl.innerHTML = `
      <div class="pagination-info">${start}–${end} de ${total} campeões</div>
      <div class="pagination-controls">
        <button class="page-btn page-btn--nav" id="page-prev" ${currentPage===1?'disabled':''}>‹ Anterior</button>
        ${btns}
        <button class="page-btn page-btn--nav" id="page-next" ${currentPage===totalPages?'disabled':''}>Próxima ›</button>
      </div>
    `;
    paginationEl.querySelector('#page-prev')?.addEventListener('click', () => { if(currentPage>1){currentPage--;renderGrid();scrollToGrid();} });
    paginationEl.querySelector('#page-next')?.addEventListener('click', () => { if(currentPage<totalPages){currentPage++;renderGrid();scrollToGrid();} });
    paginationEl.querySelectorAll('.page-btn[data-page]').forEach(b => {
      b.addEventListener('click', () => { currentPage=parseInt(b.dataset.page,10); renderGrid(); scrollToGrid(); });
    });
  }

  function scrollToGrid() { grid.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  // ---- Modal de Detalhes ----
  function openDetail(championId) {
    const champ = getChampionById(championId);
    if (!champ) return;

    const wins   = getWinCount(state, champ.id);
    const losses = getLossCount(state, champ.id);

    detailSplash.src  = CHAMPION_SPLASH(champ.id);
    detailSplash.alt  = champ.name;
    detailAvatar.src  = CHAMPION_IMG(champ.id);
    detailAvatar.alt  = champ.name;
    detailName.textContent  = champ.name;
    detailTitle.textContent = champ.title;
    detailRole.textContent  = ROLES[champ.role] || champ.role;

    const isCurrent = state.currentChampion === champ.id;
    const played    = wins + losses;
    const wr        = played > 0 ? Math.round((wins / played) * 100) : 0;

    detailActions.innerHTML = `
      <button class="detail-action-btn detail-action-btn--select" data-action="select">
        ${isCurrent ? '★ Selecionado' : '⚔ Selecionar'}
      </button>
      <button class="detail-action-btn detail-action-btn--defeat" data-action="add-win">✓ Venci</button>
      <button class="detail-action-btn detail-action-btn--loss" data-action="add-loss">💀 Perdi</button>
      ${wins > 0 ? `<button class="detail-action-btn detail-action-btn--undo" data-action="undo-win">↩ -1V</button>` : ''}
      ${losses > 0 ? `<button class="detail-action-btn detail-action-btn--undo" data-action="undo-loss">↩ -1D</button>` : ''}
    `;

    if (played > 0) {
      const recordDiv = document.createElement('div');
      recordDiv.className = 'detail-record';
      recordDiv.innerHTML = `
        <span class="record-w">${wins} Vitórias</span>
        <span class="record-sep">·</span>
        <span class="record-l">${losses} Derrotas</span>
        <span class="record-sep">·</span>
        <span class="record-wr">${wr}% WR</span>
      `;
      detailActions.insertAdjacentElement('afterend', recordDiv);
    } else {
      document.querySelector('.detail-record')?.remove();
    }

    detailActions.querySelector('[data-action="select"]').addEventListener('click', () => {
      state = setCurrentChampion(state, champ.id);
      updateCurrentChampion(); renderGrid(); openDetail(champ.id);
      showToast(`${champ.name} selecionado!`, 'gold');
    });
    detailActions.querySelector('[data-action="add-win"]').addEventListener('click', () => {
      state = addWin(state, champ.id); updateStats(); renderGrid(); openDetail(champ.id);
      showToast(`🏆 Venci com ${champ.name}! (${getWinCount(state,champ.id)}ª vez)`, 'success');
      window._fxLaunch('confetti');
    });
    detailActions.querySelector('[data-action="add-loss"]').addEventListener('click', () => {
      state = addLoss(state, champ.id); updateStats(); renderGrid(); openDetail(champ.id);
      showToast(`Perdi com ${champ.name}…`, 'danger');
      window._fxLaunch('skull');
    });
    detailActions.querySelector('[data-action="undo-win"]')?.addEventListener('click', () => {
      state = removeWin(state, champ.id); updateStats(); renderGrid(); openDetail(champ.id);
      showToast(`${champ.name} — vitória removida`, 'danger');
    });
    detailActions.querySelector('[data-action="undo-loss"]')?.addEventListener('click', () => {
      state = removeLoss(state, champ.id); updateStats(); renderGrid(); openDetail(champ.id);
      showToast(`${champ.name} — derrota removida`, 'gold');
    });

    // Tags clicáveis
    tagsList.innerHTML = champ.tags.length
      ? champ.tags.map(t => `<span class="tag-chip tag-chip--clickable" data-tag="${t}">${t.replace(/_/g,' ')}</span>`).join('')
      : '<span style="color:var(--text-muted);font-size:0.85rem">—</span>';

    tagsList.querySelectorAll('.tag-chip--clickable').forEach(chip => {
      chip.addEventListener('click', () => {
        activeTag = chip.dataset.tag;
        currentPage = 1;
        updateTagFilterBar();
        renderGrid();
        closeDetail();
        showToast(`Filtrando por tag: ${activeTag.replace(/_/g,' ')}`, 'gold');
      });
    });

    const counters = getCountersFor(champ.id);
    counterList.innerHTML = counters.length
      ? counters.map(c => `
          <div class="counter-card" data-counter-id="${c.id}">
            <img class="counter-card__img" src="${CHAMPION_IMG(c.id)}" alt="${c.name}" loading="lazy">
            <div><div class="counter-card__name">${c.name}</div><div class="counter-card__role">${ROLES[c.role]||c.role}</div></div>
          </div>`).join('')
      : '<div style="color:var(--text-muted);font-size:0.85rem">Sem counters registrados</div>';

    counterList.querySelectorAll('.counter-card').forEach(card => {
      card.addEventListener('click', () => openDetail(card.dataset.counterId));
    });

    detailOverlay.classList.remove('detail-overlay--hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeDetail() {
    document.querySelector('.detail-record')?.remove();
    detailOverlay.classList.add('detail-overlay--hidden');
    document.body.style.overflow = '';
  }

  // ---- Histórico de Patches ----
  function renderPatchHistory() {
    if (!patchHistoryList) return;
    if (state.patches.length === 0) {
      patchHistoryList.innerHTML = '<div class="patch-empty">Nenhum patch salvo ainda. Ao resetar, o histórico aparece aqui.</div>';
      return;
    }
    patchHistoryList.innerHTML = state.patches.map((p, i) => `
      <div class="patch-item" ${i === 0 ? 'data-latest' : ''}>
        <div class="patch-item__header">
          <span class="patch-item__label">${p.label}</span>
          <span class="patch-item__date">${p.date}</span>
        </div>
        <div class="patch-item__stats">
          <span class="patch-stat patch-stat--win">🏆 ${p.totalWins} vitórias</span>
          <span class="patch-stat patch-stat--unique">🎯 ${p.uniqueWins} campeões</span>
          <span class="patch-stat patch-stat--loss">💀 ${p.totalLosses} derrotas</span>
        </div>
      </div>
    `).join('');
  }

  // ---- Reset Modal ----
  const resetOverlay = document.getElementById('reset-overlay');
  const resetBtn     = document.getElementById('reset-wins-btn');
  const resetCancel  = document.getElementById('reset-cancel');
  const resetConfirm = document.getElementById('reset-confirm');
  const patchLabelInput = document.getElementById('patch-label-input');

  function openReset()  { resetOverlay.classList.remove('reset-overlay--hidden'); document.body.style.overflow = 'hidden'; patchLabelInput?.focus(); }
  function closeReset() { resetOverlay.classList.add('reset-overlay--hidden'); document.body.style.overflow = ''; }

  resetBtn.addEventListener('click', openReset);
  resetCancel.addEventListener('click', closeReset);
  resetOverlay.addEventListener('click', e => { if (e.target === resetOverlay) closeReset(); });
  resetConfirm.addEventListener('click', () => {
    const label = patchLabelInput?.value.trim() || `Patch ${new Date().toLocaleDateString('pt-BR')}`;
    state = savePatchSnapshot(state, label);
    state = resetWinsAndLosses(state);
    if (patchLabelInput) patchLabelInput.value = '';
    closeReset();
    updateStats(); updateCurrentChampion(); renderGrid(); renderPatchHistory();
    showToast('🔄 Resetado! Bora pro novo patch!', 'gold');
  });

  // ---- Patch History Toggle ----
  const patchToggle = document.getElementById('patch-history-toggle');
  const patchBody   = document.getElementById('patch-history-body');
  patchToggle?.addEventListener('click', () => {
    const open = patchBody.classList.toggle('patch-history__body--open');
    patchToggle.querySelector('.patch-toggle-arrow').textContent = open ? '▲' : '▼';
  });

  // ---- Compact Mode ----
  const compactBtn = document.getElementById('compact-toggle');
  compactBtn?.addEventListener('click', () => {
    state.compactMode = !state.compactMode;
    saveState(state);
    compactBtn.classList.toggle('control-btn--active', state.compactMode);
    compactBtn.title = state.compactMode ? 'Modo normal' : 'Modo compacto';
    renderGrid();
  });

  // ---- "Já Venci" filter ----
  const wonBtn = document.getElementById('won-toggle');
  wonBtn?.addEventListener('click', () => {
    showWon = !showWon;
    if (showWon) { showUnplayed = false; unplayedBtn?.classList.remove('control-btn--active'); }
    wonBtn.classList.toggle('control-btn--active', showWon);
    currentPage = 1;
    renderGrid();
  });

  // ---- "Não joguei" filter ----
  const unplayedBtn = document.getElementById('unplayed-toggle');
  unplayedBtn?.addEventListener('click', () => {
    showUnplayed = !showUnplayed;
    if (showUnplayed) { showWon = false; wonBtn?.classList.remove('control-btn--active'); }
    unplayedBtn.classList.toggle('control-btn--active', showUnplayed);
    currentPage = 1;
    renderGrid();
  });

  // ---- Export / Import ----
  document.getElementById('export-btn')?.addEventListener('click', () => {
    exportData(state);
    showToast('📦 Backup exportado!', 'gold');
  });

  document.getElementById('import-btn')?.addEventListener('click', () => {
    document.getElementById('import-file')?.click();
  });

  document.getElementById('import-file')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const imported = importData(ev.target.result);
      if (imported) {
        state = imported;
        updateStats(); updateCurrentChampion(); renderGrid(); renderPatchHistory();
        showToast('✅ Dados importados com sucesso!', 'success');
      } else {
        showToast('❌ Arquivo inválido', 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // ---- Event Listeners ----
  searchInput.addEventListener('input', e => { searchQuery = e.target.value; currentPage = 1; renderGrid(); });

  roleFilters.addEventListener('click', e => {
    const btn = e.target.closest('.role-btn');
    if (!btn) return;
    roleFilters.querySelectorAll('.role-btn').forEach(b => b.classList.remove('role-btn--active'));
    btn.classList.add('role-btn--active');
    activeRole = btn.dataset.role;
    currentPage = 1;
    renderGrid();
  });

  detailClose.addEventListener('click', closeDetail);
  detailOverlay.addEventListener('click', e => { if (e.target === detailOverlay) closeDetail(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDetail(); closeReset(); }
  });

  // ---- Loading ----
  function showLoading() {
    grid.innerHTML = `
      <div class="loading-state" style="grid-column:1/-1">
        <div class="loading-spinner"></div>
        <div class="loading-text">Carregando campeões…</div>
      </div>
    `;
  }

  // ---- Modal "Já Venci" ----
  const wonOverlay   = document.getElementById('won-overlay');
  const wonModalGrid = document.getElementById('won-modal-grid');
  const wonModalStats = document.getElementById('won-modal-stats');
  const wonModalClose = document.getElementById('won-modal-close');

  function openWonModal() {
    const winners = CHAMPIONS.filter(c => getWinCount(state, c.id) > 0)
      .sort((a, b) => getWinCount(state, b.id) - getWinCount(state, a.id));

    const totalWinsSum = winners.reduce((acc, c) => acc + getWinCount(state, c.id), 0);

    wonModalStats.innerHTML = `
      <div class="won-modal__stat"><div class="won-modal__stat-value">${winners.length}</div><div class="won-modal__stat-label">Campeões</div></div>
      <div class="won-modal__stat"><div class="won-modal__stat-value">${totalWinsSum}</div><div class="won-modal__stat-label">Vitórias</div></div>
      <div class="won-modal__stat"><div class="won-modal__stat-value">${CHAMPIONS.length - winners.length}</div><div class="won-modal__stat-label">Faltam</div></div>
      <div class="won-modal__stat"><div class="won-modal__stat-value">${Math.round((winners.length/CHAMPIONS.length)*100)}%</div><div class="won-modal__stat-label">Completado</div></div>
    `;

    if (winners.length === 0) {
      wonModalGrid.innerHTML = `
        <div class="won-modal__empty">
          <div class="won-modal__empty-icon">😅</div>
          <div>Você ainda não venceu com nenhum campeão.<br>Bora jogar!</div>
        </div>`;
    } else {
      wonModalGrid.innerHTML = winners.map(c => `
        <div class="won-champ-card" data-id="${c.id}">
          <img class="won-champ-card__img" src="${CHAMPION_IMG(c.id)}" alt="${c.name}" loading="lazy">
          <div class="won-champ-card__name">${c.name}</div>
          <div class="won-champ-card__wins">🏆 ${getWinCount(state, c.id)}x</div>
        </div>
      `).join('');
      wonModalGrid.querySelectorAll('.won-champ-card').forEach(card => {
        card.addEventListener('click', () => { closeWonModal(); openDetail(card.dataset.id); });
      });
    }

    wonOverlay.classList.remove('won-overlay--hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeWonModal() {
    wonOverlay.classList.add('won-overlay--hidden');
    document.body.style.overflow = '';
  }

  document.getElementById('won-modal-btn')?.addEventListener('click', openWonModal);
  wonModalClose?.addEventListener('click', closeWonModal);
  wonOverlay?.addEventListener('click', e => { if (e.target === wonOverlay) closeWonModal(); });

  // ---- FX: Confetti & Skulls ----
  const fxCanvas = document.getElementById('fx-canvas');
  const fxCtx    = fxCanvas.getContext('2d');
  let   fxParticles = [];
  let   fxRaf      = null;

  function resizeFxCanvas() {
    fxCanvas.width  = window.innerWidth;
    fxCanvas.height = window.innerHeight;
  }
  resizeFxCanvas();
  window.addEventListener('resize', resizeFxCanvas);

  function launchFx(type) {
    resizeFxCanvas();
    fxParticles = [];
    const count = type === 'confetti' ? 160 : 80;

    const CONFETTI_COLORS = [
      '#ffd700','#ff6b6b','#4ecdc4','#45b7d1','#96ceb4',
      '#dda0dd','#ff8c00','#00fa9a','#ff69b4','#c89b3c'
    ];

    for (let i = 0; i < count; i++) {
      const fromLeft = Math.random() < 0.5;
      fxParticles.push({
        type,
        x: fromLeft ? Math.random() * fxCanvas.width * 0.4 : fxCanvas.width * 0.6 + Math.random() * fxCanvas.width * 0.4,
        y: -20 - Math.random() * 120,
        vx: (Math.random() - 0.5) * 6,
        vy: 3 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        size: type === 'confetti' ? 8 + Math.random() * 10 : 18 + Math.random() * 14,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        opacity: 1,
        shape: Math.floor(Math.random() * 3), // 0=rect, 1=circle, 2=strip
        gravity: 0.12 + Math.random() * 0.08,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.05 + Math.random() * 0.05,
      });
    }

    if (fxRaf) cancelAnimationFrame(fxRaf);
    animateFx();
  }

  function animateFx() {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    let alive = false;

    for (const p of fxParticles) {
      p.vy      += p.gravity;
      p.x       += p.vx + Math.sin(p.wobble) * 1.5;
      p.y       += p.vy;
      p.rotation += p.rotSpeed;
      p.wobble   += p.wobbleSpeed;
      if (p.y > fxCanvas.height * 0.85) p.opacity -= 0.04;
      if (p.opacity <= 0) continue;
      alive = true;

      fxCtx.save();
      fxCtx.globalAlpha = Math.max(0, p.opacity);
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.rotation);

      if (p.type === 'skull') {
        fxCtx.font = `${p.size}px serif`;
        fxCtx.textAlign = 'center';
        fxCtx.textBaseline = 'middle';
        fxCtx.fillText('💀', 0, 0);
      } else {
        fxCtx.fillStyle = p.color;
        if (p.shape === 0) {
          fxCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === 1) {
          fxCtx.beginPath();
          fxCtx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
          fxCtx.fill();
        } else {
          fxCtx.fillRect(-p.size / 6, -p.size / 2, p.size / 3, p.size);
        }
      }
      fxCtx.restore();
    }

    if (alive) fxRaf = requestAnimationFrame(animateFx);
    else fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  }

  // Expõe globalmente para os botões chamarem
  window._fxLaunch = launchFx;

  // ---- Init ----
  async function init() {
    showLoading();
    await loadAllChampions();

    // Sync compact button state
    if (state.compactMode) compactBtn?.classList.add('control-btn--active');

    updateStats();
    updateCurrentChampion();
    updateTagFilterBar();
    renderPatchHistory();
    renderGrid();
  }

  init();
})();
