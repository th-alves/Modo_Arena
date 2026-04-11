// =============================================================================
// app.js — Arena Champion Counter v4
// =============================================================================

(function () {
  'use strict';

  // ---- Utilitários ----

  // Escapa HTML para evitar XSS em qualquer valor inserido via innerHTML
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Debounce genérico
  function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  }

  // Memoização do filtro+sort — evita reprocessar 170 campeões quando nada mudou
  let _filterCache = { key: null, result: null };
  function getFilteredChampions() {
    const key = `${activeRole}|${searchQuery}|${activeTag}|${showUnplayed}|${showWon}|${sortBy}|${Object.keys(state.wins).length}|${Object.keys(state.losses).length}`;
    if (_filterCache.key === key) return _filterCache.result;

    let champs = getChampionsByRole(activeRole);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      champs = champs.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (ROLES[c.role] || '').toLowerCase().includes(q)
      );
    }
    if (activeTag)    champs = champs.filter(c => c.tags.includes(activeTag));
    if (showUnplayed) champs = champs.filter(c => getWinCount(state, c.id) === 0 && getLossCount(state, c.id) === 0);
    if (showWon)      champs = champs.filter(c => getWinCount(state, c.id) > 0);

    champs = [...champs];
    if (sortBy === 'wins') {
      champs.sort((a, b) => getWinCount(state, b.id) - getWinCount(state, a.id));
    } else if (sortBy === 'winrate') {
      champs.sort((a, b) => {
        const pa = getWinCount(state,a.id) + getLossCount(state,a.id);
        const pb = getWinCount(state,b.id) + getLossCount(state,b.id);
        const wra = pa > 0 ? getWinCount(state,a.id) / pa : -1;
        const wrb = pb > 0 ? getWinCount(state,b.id) / pb : -1;
        return wrb - wra;
      });
    } else if (sortBy === 'played') {
      champs.sort((a, b) => {
        const pa = getWinCount(state,a.id) + getLossCount(state,a.id);
        const pb = getWinCount(state,b.id) + getLossCount(state,b.id);
        return pb - pa;
      });
    } else {
      champs.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }

    _filterCache = { key, result: champs };
    return champs;
  }

  function invalidateFilterCache() { _filterCache = { key: null, result: null }; }

  // ---- Estado ----
  let state = loadState();
  let activeRole   = 'ALL';
  let searchQuery  = '';
  let activeTag    = null;
  let showUnplayed = false;
  let showWon      = false;
  let sortBy       = 'name';
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
  const statStreakItem  = document.getElementById('stat-streak-item');
  const statStreakVal   = document.getElementById('stat-streak');
  const statStreakLabel = document.getElementById('stat-streak-label');

  const currentChampionEl = document.getElementById('current-champion');
  const tagFilterBar      = document.getElementById('tag-filter-bar');
  const patchHistoryList  = document.getElementById('patch-history-list');
  const patchHistoryChart = document.getElementById('patch-history-chart');

  const detailSplash  = document.getElementById('detail-splash');
  const detailAvatar  = document.getElementById('detail-avatar');
  const detailName    = document.getElementById('detail-name');
  const detailTitle   = document.getElementById('detail-title');
  const detailRole    = document.getElementById('detail-role');
  const detailActions = document.getElementById('detail-actions');
  const tagsList      = document.getElementById('tags-list');
  const counterList   = document.getElementById('counter-list');
  const detailClose   = document.getElementById('detail-close');
  const detailNotes     = document.getElementById('detail-notes');
  const detailNotesHint = document.getElementById('detail-notes-hint');
  let _noteAbort = null; // AbortController para cleanup do listener de notas

  // ---- Focus Trap ----
  function trapFocus(container) {
    const focusable = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return () => {};
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    function handler(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    }
    container.addEventListener('keydown', handler);
    first.focus();
    return () => container.removeEventListener('keydown', handler);
  }
  let _detailTrapCleanup = null;
  let _wonTrapCleanup    = null;
  let _roleTrapCleanup   = null;
  let _resetTrapCleanup  = null;

  // ---- Image Fallback ----
  function imgWithFallback(src, alt, className, loading = 'lazy') {
    return `<img class="${className}" src="${src}" alt="${alt}" loading="${loading}"
      onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'80\\' height=\\'80\\'><rect width=\\'80\\' height=\\'80\\' fill=\\'%23222\\'/><text x=\\'50%\\' y=\\'55%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'28\\' fill=\\'%23555\\'>?</text></svg>'">`;
  }

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
    invalidateFilterCache();
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

    // Streak
    const streak = state.streak;
    if (streak && streak.count >= 2) {
      statStreakItem.style.display = '';
      const isWin = streak.type === 'win';
      statStreakVal.textContent  = `${streak.count}x`;
      statStreakVal.className    = `streak-value ${isWin ? 'streak-value--win' : 'streak-value--loss'}`;
      statStreakLabel.textContent = isWin ? '🔥 W-Streak' : '💀 L-Streak';
    } else {
      statStreakItem.style.display = 'none';
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
          ${imgWithFallback(CHAMPION_IMG(champ.id), champ.name, 'current-champion__img')}
          <div class="current-champion__info">
            <div class="current-champion__label">Campeão Atual</div>
            <div class="current-champion__name">${champ.name}</div>
            ${wins > 0 || losses > 0 ? `<div class="current-champion__record"><span class="record-w">${wins}V</span> <span class="record-l">${losses}D</span></div>` : ''}
          </div>
          <div class="current-champion__btns">
            <button class="current-champion__clear" id="clear-current" aria-label="Remover campeão atual">✕</button>
            <button class="current-champion__won"   id="btn-won" aria-label="Registrar vitória com ${champ.name}">🏆 Ganhei</button>
            <button class="current-champion__lost"  id="btn-lost" aria-label="Registrar derrota com ${champ.name}">💀 Perdi</button>
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
          launchFx('confetti');
        });
        document.getElementById('btn-lost').addEventListener('click', e => {
          e.stopPropagation();
          state = addLoss(state, champ.id);
          state = clearCurrentChampion(state);
          updateStats(); updateCurrentChampion(); renderGrid();
          showToast(`Perdi com ${champ.name}… próxima!`, 'danger');
          launchFx('skull');
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

  // ---- Card (full rebuild) ----
  function createChampionCard(champ, cardIndex = 99) {
    const loadAttr = cardIndex < 6 ? 'eager' : 'lazy';
    const wins      = getWinCount(state, champ.id);
    const losses    = getLossCount(state, champ.id);
    const hasWins   = wins > 0;
    const hasLosses = losses > 0;
    const untried   = wins === 0 && losses === 0;
    const isCurrent = state.currentChampion === champ.id;
    const compact   = state.compactMode;
    const played    = wins + losses;
    const wr        = played > 0 ? Math.round((wins / played) * 100) : null;

    const card = document.createElement('article');
    card.className = 'champion-card';
    card.dataset.champId = champ.id;
    card.setAttribute('aria-label', `${champ.name}${hasWins ? `, ${wins} vitória(s)` : ''}${hasLosses ? `, ${losses} derrota(s)` : ''}`);
    if (hasWins)   card.classList.add('champion-card--defeated');
    if (isCurrent) card.classList.add('champion-card--current');
    if (untried)   card.classList.add('champion-card--untried');
    if (hasLosses && !hasWins) card.classList.add('champion-card--loss-only');
    if (compact)   card.classList.add('champion-card--compact');

    if (compact) {
      card.innerHTML = `
        <div class="champion-card__img-wrapper">
          ${imgWithFallback(CHAMPION_IMG(champ.id), champ.name, 'champion-card__img', loadAttr)}
          <div class="champion-card__overlay"></div>
          ${wins > 0 ? `<span class="win-badge" aria-label="${wins} vitórias">${wins}</span>` : ''}
          ${losses > 0 ? `<span class="loss-badge" aria-label="${losses} derrotas">${losses}</span>` : ''}
        </div>
        <div class="champion-card__compact-name">${champ.name}</div>
        ${wr !== null ? `<div class="compact-wr ${wr >= 50 ? 'compact-wr--pos' : 'compact-wr--neg'}">${wr}%</div>` : ''}
      `;
      card.addEventListener('click', () => openDetail(champ.id));
    } else {
      card.innerHTML = `
        <div class="champion-card__img-wrapper">
          ${imgWithFallback(CHAMPION_IMG(champ.id), champ.name, 'champion-card__img', loadAttr)}
          <div class="champion-card__overlay"></div>
          <span class="champion-card__role-badge">${ROLES[champ.role] || champ.role}</span>
          ${wins > 0 ? `<span class="win-badge" aria-label="${wins} vitórias">${wins}V</span>` : ''}
          ${losses > 0 ? `<span class="loss-badge" aria-label="${losses} derrotas">${losses}D</span>` : ''}
          ${untried ? '<span class="untried-badge">Novo</span>' : ''}
          ${hasLosses && !hasWins ? '<span class="loss-pattern" aria-hidden="true"></span>' : ''}
        </div>
        <div class="champion-card__info">
          <div class="champion-card__name">${champ.name}</div>
          <div class="champion-card__title">${champ.title}</div>
          ${hasWins || hasLosses ? `
            <div class="card-record">
              <span class="record-w">${wins}V</span>
              <span class="record-sep">/</span>
              <span class="record-l">${losses}D</span>
              ${wr !== null ? `<span class="record-wr ${wr >= 50 ? 'record-wr--pos' : 'record-wr--neg'}">${wr}%</span>` : ''}
            </div>` : ''}
        </div>
        <div class="champion-card__actions">
          <button class="card-action-btn card-action-btn--win"  data-action="add-win"   data-id="${champ.id}" aria-label="Registrar vitória com ${champ.name}">✓ Venci</button>
          <button class="card-action-btn card-action-btn--loss" data-action="add-loss"  data-id="${champ.id}" aria-label="Registrar derrota com ${champ.name}">✗ Perdi</button>
          ${wins   > 0 ? `<button class="card-action-btn card-action-btn--undo" data-action="undo-win"  data-id="${champ.id}" aria-label="Desfazer última vitória">↩ ${wins}V</button>` : ''}
          ${losses > 0 ? `<button class="card-action-btn card-action-btn--undo" data-action="undo-loss" data-id="${champ.id}" aria-label="Desfazer última derrota">↩ ${losses}D</button>` : ''}
          <button class="card-action-btn card-action-btn--info" data-action="view-detail" data-id="${champ.id}" aria-label="Ver detalhes de ${champ.name}">Info</button>
        </div>
      `;

      card.querySelector('[data-action="view-detail"]').addEventListener('click', e => {
        e.stopPropagation(); openDetail(champ.id);
      });
      card.querySelector('[data-action="add-win"]').addEventListener('click', e => {
        e.stopPropagation();
        state = addWin(state, champ.id);
        updateStats(); updateCardInPlace(champ.id);
        showToast(`🏆 Venci com ${champ.name}! (${getWinCount(state, champ.id)}ª vez)`, 'success');
        launchFx('confetti');
      });
      card.querySelector('[data-action="add-loss"]').addEventListener('click', e => {
        e.stopPropagation();
        state = addLoss(state, champ.id);
        updateStats(); updateCardInPlace(champ.id);
        showToast(`💀 Perdi com ${champ.name}… bora de novo!`, 'danger');
        launchFx('skull');
      });
      card.querySelector('[data-action="undo-win"]')?.addEventListener('click', e => {
        e.stopPropagation();
        state = removeWin(state, champ.id);
        updateStats(); updateCardInPlace(champ.id);
        showToast(`${champ.name} — vitória removida`, 'danger');
      });
      card.querySelector('[data-action="undo-loss"]')?.addEventListener('click', e => {
        e.stopPropagation();
        state = removeLoss(state, champ.id);
        updateStats(); updateCardInPlace(champ.id);
        showToast(`${champ.name} — derrota removida`, 'gold');
      });
      card.querySelector('.champion-card__img-wrapper').addEventListener('click', () => openDetail(champ.id));
    }

    return card;
  }

  // ---- Update individual card (performance) ----
  function updateCardInPlace(champId) {
    const existing = grid.querySelector(`[data-champ-id="${champId}"]`);
    if (!existing) { renderGrid(); return; }
    const champ = getChampionById(champId);
    if (!champ) return;
    const newCard = createChampionCard(champ);
    newCard.style.animation = 'none'; // skip entrance animation on in-place update
    existing.replaceWith(newCard);
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
        <button class="tag-filter-clear" id="clear-tag" aria-label="Remover filtro de tag">✕</button>
      </span>
    `;
    document.getElementById('clear-tag').addEventListener('click', () => {
      activeTag = null;
      currentPage = 1;
      updateTagFilterBar();
      renderGrid();
    });
  }

  // ---- Grid ----
  let _cardIndex = 0; // reset a cada renderGrid para saber quais cards estão acima da dobra

  function renderGrid() {
    _cardIndex = 0;
    const champs = getFilteredChampions();
    const totalPages = Math.max(1, Math.ceil(champs.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const page = champs.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    grid.classList.toggle('champion-grid--compact', !!state.compactMode);
    grid.innerHTML = '';

    if (champs.length === 0) {
      let icon = '🔍', msg = 'Nenhum campeão encontrado';
      if (showUnplayed) { icon = '🎉'; msg = 'Você jogou com todos!'; }
      if (showWon)      { icon = '😅'; msg = 'Você ainda não venceu com nenhum campeão.'; }
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state__icon">${icon}</div>
          <div class="empty-state__text">${msg}</div>
        </div>`;
      renderPagination(0, 1); return;
    }

    const frag = document.createDocumentFragment();
    page.forEach(c => frag.appendChild(createChampionCard(c, _cardIndex++)));
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
    if (left > 1) { btns += `<button class="page-btn" data-page="1" aria-label="Página 1">1</button>`; if (left > 2) btns += `<span class="page-ellipsis" aria-hidden="true">…</span>`; }
    for (let i = left; i <= right; i++) btns += `<button class="page-btn ${i===currentPage?'page-btn--active':''}" data-page="${i}" aria-label="Página ${i}" ${i===currentPage?'aria-current="page"':''}>${i}</button>`;
    if (right < totalPages) { if (right < totalPages - 1) btns += `<span class="page-ellipsis" aria-hidden="true">…</span>`; btns += `<button class="page-btn" data-page="${totalPages}" aria-label="Última página, ${totalPages}">${totalPages}</button>`; }
    paginationEl.innerHTML = `
      <div class="pagination-info" aria-live="polite">${start}–${end} de ${total} campeões</div>
      <div class="pagination-controls">
        <button class="page-btn page-btn--nav" id="page-prev" aria-label="Página anterior" ${currentPage===1?'disabled':''}>‹ Anterior</button>
        ${btns}
        <button class="page-btn page-btn--nav" id="page-next" aria-label="Próxima página" ${currentPage===totalPages?'disabled':''}>Próxima ›</button>
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
  let _currentDetailId = null;
  function openDetail(championId) {
    const champ = getChampionById(championId);
    if (!champ) return;
    _currentDetailId = championId;

    const wins   = getWinCount(state, champ.id);
    const losses = getLossCount(state, champ.id);
    const played = wins + losses;
    const wr     = played > 0 ? Math.round((wins / played) * 100) : 0;

    detailSplash.src  = CHAMPION_SPLASH(champ.id);
    detailSplash.alt  = champ.name;
    detailSplash.onerror = () => { detailSplash.style.display = 'none'; };
    detailAvatar.src  = CHAMPION_IMG(champ.id);
    detailAvatar.alt  = champ.name;
    detailAvatar.onerror = () => { detailAvatar.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='80' height='80' fill='%23222'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23555'>?</text></svg>`; };
    detailName.textContent  = champ.name;
    document.title = `${champ.name} · TDAH.GG`;
    detailTitle.textContent = champ.title;
    detailRole.textContent  = ROLES[champ.role] || champ.role;

    const isCurrent = state.currentChampion === champ.id;

    // Remove stale record div
    document.querySelector('.detail-record')?.remove();

    detailActions.innerHTML = `
      <button class="detail-action-btn detail-action-btn--select" data-action="select" aria-label="${isCurrent ? 'Campeão já selecionado' : `Selecionar ${champ.name} como campeão atual`}">
        ${isCurrent ? '★ Selecionado' : '⚔ Selecionar'}
      </button>
      <button class="detail-action-btn detail-action-btn--defeat" data-action="add-win" aria-label="Registrar vitória com ${champ.name}">✓ Venci</button>
      <button class="detail-action-btn detail-action-btn--loss" data-action="add-loss" aria-label="Registrar derrota com ${champ.name}">💀 Perdi</button>
      ${wins > 0 ? `<button class="detail-action-btn detail-action-btn--undo" data-action="undo-win" aria-label="Desfazer última vitória">↩ -1V</button>` : ''}
      ${losses > 0 ? `<button class="detail-action-btn detail-action-btn--undo" data-action="undo-loss" aria-label="Desfazer última derrota">↩ -1D</button>` : ''}
    `;

    if (played > 0) {
      const recordDiv = document.createElement('div');
      recordDiv.className = 'detail-record';
      recordDiv.innerHTML = `
        <span class="record-w">${wins} Vitórias</span>
        <span class="record-sep">·</span>
        <span class="record-l">${losses} Derrotas</span>
        <span class="record-sep">·</span>
        <span class="record-wr ${wr >= 50 ? 'record-wr--pos' : 'record-wr--neg'}">${wr}% WR</span>
      `;
      detailActions.insertAdjacentElement('afterend', recordDiv);
    }

    // Notes
    const noteText = getNote(state, champ.id);
    // Notes — cleanup do listener anterior antes de registrar novo
    if (_noteAbort) _noteAbort.abort();
    _noteAbort = new AbortController();
    const saveNoteDebounced = debounce((text) => { state = setNote(state, champ.id, text); }, 500);
    detailNotes.value = getNote(state, champ.id);
    detailNotesHint.textContent = `${detailNotes.value.length}/500`;
    detailNotes.addEventListener('input', () => {
      detailNotesHint.textContent = `${detailNotes.value.length}/500`;
      saveNoteDebounced(detailNotes.value);
    }, { signal: _noteAbort.signal });

    detailActions.querySelector('[data-action="select"]').addEventListener('click', () => {
      state = setCurrentChampion(state, champ.id);
      updateCurrentChampion(); renderGrid(); openDetail(champ.id);
      showToast(`${champ.name} selecionado!`, 'gold');
    });
    detailActions.querySelector('[data-action="add-win"]').addEventListener('click', () => {
      state = addWin(state, champ.id); updateStats(); updateCardInPlace(champ.id); openDetail(champ.id);
      showToast(`🏆 Venci com ${champ.name}! (${getWinCount(state,champ.id)}ª vez)`, 'success');
      launchFx('confetti');
    });
    detailActions.querySelector('[data-action="add-loss"]').addEventListener('click', () => {
      state = addLoss(state, champ.id); updateStats(); updateCardInPlace(champ.id); openDetail(champ.id);
      showToast(`Perdi com ${champ.name}…`, 'danger');
      launchFx('skull');
    });
    detailActions.querySelector('[data-action="undo-win"]')?.addEventListener('click', () => {
      state = removeWin(state, champ.id); updateStats(); updateCardInPlace(champ.id); openDetail(champ.id);
      showToast(`${champ.name} — vitória removida`, 'danger');
    });
    detailActions.querySelector('[data-action="undo-loss"]')?.addEventListener('click', () => {
      state = removeLoss(state, champ.id); updateStats(); updateCardInPlace(champ.id); openDetail(champ.id);
      showToast(`${champ.name} — derrota removida`, 'gold');
    });

    // Tags
    tagsList.innerHTML = champ.tags.length
      ? champ.tags.map(t => `<button class="tag-chip tag-chip--clickable" data-tag="${t}" aria-label="Filtrar por ${t.replace(/_/g,' ')}">${t.replace(/_/g,' ')}</button>`).join('')
      : '<span style="color:var(--text-muted);font-size:0.85rem">—</span>';
    tagsList.querySelectorAll('.tag-chip--clickable').forEach(chip => {
      chip.addEventListener('click', () => {
        activeTag = chip.dataset.tag;
        currentPage = 1;
        updateTagFilterBar(); renderGrid(); closeDetail();
        showToast(`Filtrando por tag: ${activeTag.replace(/_/g,' ')}`, 'gold');
      });
    });

    // Counters — click opens detail without double-overlay
    const counters = getCountersFor(champ.id);
    counterList.innerHTML = counters.length
      ? counters.map(c => `
          <button class="counter-card" data-counter-id="${c.id}" aria-label="Ver detalhes de ${c.name}, counter de ${champ.name}">
            ${imgWithFallback(CHAMPION_IMG(c.id), c.name, 'counter-card__img')}
            <div><div class="counter-card__name">${c.name}</div><div class="counter-card__role">${ROLES[c.role]||c.role}</div></div>
          </button>`).join('')
      : '<div style="color:var(--text-muted);font-size:0.85rem">Sem counters registrados</div>';
    counterList.querySelectorAll('.counter-card').forEach(card => {
      card.addEventListener('click', () => {
        // Navigate within same overlay instead of stacking
        openDetail(card.dataset.counterId);
      });
    });

    const panel = document.getElementById('detail-panel');
    panel.scrollTop = 0;
    detailOverlay.classList.remove('detail-overlay--hidden');
    detailOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (_detailTrapCleanup) _detailTrapCleanup();
    _detailTrapCleanup = trapFocus(panel);
  }

  function closeDetail() {
    document.title = 'TDAH.GG';
    document.querySelector('.detail-record')?.remove();
    detailOverlay.classList.add('detail-overlay--hidden');
    detailOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (_detailTrapCleanup) { _detailTrapCleanup(); _detailTrapCleanup = null; }
    _currentDetailId = null;
  }

  // ---- Histórico de Patches ----
  function renderPatchHistory() {
    if (!patchHistoryList) return;
    if (state.patches.length === 0) {
      patchHistoryList.innerHTML = '<div class="patch-empty">Nenhum patch salvo ainda. Ao resetar, o histórico aparece aqui.</div>';
      if (patchHistoryChart) patchHistoryChart.innerHTML = '';
      return;
    }

    patchHistoryList.innerHTML = state.patches.map((p, i) => `
      <div class="patch-item" ${i === 0 ? 'data-latest' : ''}>
        <div class="patch-item__header">
          <span class="patch-item__label">${escHtml(p.label)}</span>
          <span class="patch-item__date">${escHtml(p.date)}</span>
        </div>
        <div class="patch-item__stats">
          <span class="patch-stat patch-stat--win">🏆 ${p.totalWins} vitórias</span>
          <span class="patch-stat patch-stat--unique">🎯 ${p.uniqueWins} campeões</span>
          <span class="patch-stat patch-stat--loss">💀 ${p.totalLosses} derrotas</span>
        </div>
      </div>
    `).join('');

    // Gráfico de evolução
    if (patchHistoryChart && state.patches.length >= 2) {
      renderPatchChart();
    } else if (patchHistoryChart) {
      patchHistoryChart.innerHTML = '';
    }
  }

  function renderPatchChart() {
    const patches = [...state.patches].reverse(); // cronológico
    const maxWins = Math.max(...patches.map(p => p.totalWins), 1);
    const W = 100, H = 70, padL = 5, padR = 5, padT = 8, padB = 20;
    const n = patches.length;
    const xStep = (W - padL - padR) / Math.max(n - 1, 1);

    const pts = (key) => patches.map((p, i) => {
      const x = padL + i * xStep;
      const y = padT + (H - padT - padB) * (1 - p[key] / maxWins);
      return `${x},${y}`;
    });

    const winPts  = pts('totalWins');
    const lossPts = pts('totalLosses');

    patchHistoryChart.innerHTML = `
      <div class="patch-chart__title">Evolução por Patch</div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="patch-chart__svg" aria-label="Gráfico de vitórias e derrotas por patch" role="img">
        <!-- Grid lines -->
        ${[0.25,0.5,0.75,1].map(f => {
          const y = padT + (H - padT - padB) * (1 - f);
          return `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="rgba(200,155,60,0.1)" stroke-width="0.5"/>`;
        }).join('')}
        <!-- Win line -->
        <polyline points="${winPts.join(' ')}" fill="none" stroke="#1cad6a" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
        <!-- Loss line -->
        <polyline points="${lossPts.join(' ')}" fill="none" stroke="#e84057" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
        <!-- Win dots + labels -->
        ${patches.map((p, i) => {
          const x = padL + i * xStep;
          const yw = padT + (H - padT - padB) * (1 - p.totalWins / maxWins);
          const yl = padT + (H - padT - padB) * (1 - p.totalLosses / maxWins);
          const label = p.label.length > 8 ? escHtml(p.label.slice(0,8)) + '…' : escHtml(p.label);
          return `
            <circle cx="${x}" cy="${yw}" r="2" fill="#1cad6a"/>
            <circle cx="${x}" cy="${yl}" r="2" fill="#e84057"/>
            <text x="${x}" y="${H - 4}" text-anchor="middle" fill="#a09b8c" font-size="3.5">${label}</text>
          `;
        }).join('')}
      </svg>
      <div class="patch-chart__legend">
        <span class="patch-chart__legend-item patch-chart__legend-item--win">● Vitórias</span>
        <span class="patch-chart__legend-item patch-chart__legend-item--loss">● Derrotas</span>
      </div>
    `;
  }

  // ---- Modal "Já Venci" ----
  const wonOverlay    = document.getElementById('won-overlay');
  const wonModalGrid  = document.getElementById('won-modal-grid');
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
        <div class="won-modal__empty" role="listitem">
          <div class="won-modal__empty-icon" aria-hidden="true">😅</div>
          <div>Você ainda não venceu com nenhum campeão.<br>Bora jogar!</div>
        </div>`;
    } else {
      wonModalGrid.innerHTML = winners.map(c => `
        <button class="won-champ-card" data-id="${c.id}" role="listitem" aria-label="${c.name}, ${getWinCount(state,c.id)} vitória(s)">
          ${imgWithFallback(CHAMPION_IMG(c.id), c.name, 'won-champ-card__img')}
          <div class="won-champ-card__name">${c.name}</div>
          <div class="won-champ-card__wins">🏆 ${getWinCount(state, c.id)}x</div>
        </button>
      `).join('');
      wonModalGrid.querySelectorAll('.won-champ-card').forEach(card => {
        card.addEventListener('click', () => { closeWonModal(); openDetail(card.dataset.id); });
      });
    }

    wonOverlay.classList.remove('won-overlay--hidden');
    wonOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (_wonTrapCleanup) _wonTrapCleanup();
    _wonTrapCleanup = trapFocus(document.querySelector('.won-modal'));
  }

  function closeWonModal() {
    wonOverlay.classList.add('won-overlay--hidden');
    wonOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (_wonTrapCleanup) { _wonTrapCleanup(); _wonTrapCleanup = null; }
  }

  document.getElementById('won-modal-btn')?.addEventListener('click', openWonModal);
  wonModalClose?.addEventListener('click', closeWonModal);
  wonOverlay?.addEventListener('click', e => { if (e.target === wonOverlay) closeWonModal(); });

  // ---- Modal "Stats por Role" ----
  const roleStatsOverlay = document.getElementById('role-stats-overlay');
  const roleStatsBody    = document.getElementById('role-stats-body');
  const roleStatsClose   = document.getElementById('role-stats-close');

  function openRoleStats() {
    const roleKeys = Object.keys(ROLES);
    const rows = roleKeys.map(role => {
      const champs = CHAMPIONS.filter(c => c.role === role);
      const wins   = champs.reduce((a,c) => a + getWinCount(state,c.id), 0);
      const losses = champs.reduce((a,c) => a + getLossCount(state,c.id), 0);
      const played = wins + losses;
      const wr     = played > 0 ? Math.round((wins / played) * 100) : null;
      const unique = champs.filter(c => getWinCount(state,c.id) > 0).length;
      return { role, label: ROLES[role], champs: champs.length, wins, losses, played, wr, unique };
    });

    const maxWins = Math.max(...rows.map(r => r.wins), 1);

    roleStatsBody.innerHTML = rows.map(r => `
      <div class="role-stat-row">
        <div class="role-stat-row__name">${r.label}</div>
        <div class="role-stat-row__bar-wrap">
          <div class="role-stat-row__bar" style="width:${Math.round((r.wins/maxWins)*100)}%" aria-hidden="true"></div>
        </div>
        <div class="role-stat-row__numbers">
          <span class="record-w">${r.wins}V</span>
          <span class="record-sep">/</span>
          <span class="record-l">${r.losses}D</span>
          ${r.wr !== null ? `<span class="record-wr ${r.wr >= 50 ? 'record-wr--pos' : 'record-wr--neg'}">${r.wr}%</span>` : '<span class="record-wr" style="color:var(--text-muted)">—</span>'}
        </div>
        <div class="role-stat-row__unique" title="${r.unique} de ${r.champs} campeões vencidos">${r.unique}/${r.champs} 🏆</div>
      </div>
    `).join('');

    roleStatsOverlay.classList.remove('role-stats-overlay--hidden');
    roleStatsOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (_roleTrapCleanup) _roleTrapCleanup();
    _roleTrapCleanup = trapFocus(document.querySelector('.role-stats-modal'));
  }

  function closeRoleStats() {
    roleStatsOverlay.classList.add('role-stats-overlay--hidden');
    roleStatsOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (_roleTrapCleanup) { _roleTrapCleanup(); _roleTrapCleanup = null; }
  }

  document.getElementById('role-stats-btn')?.addEventListener('click', openRoleStats);
  roleStatsClose?.addEventListener('click', closeRoleStats);
  roleStatsOverlay?.addEventListener('click', e => { if (e.target === roleStatsOverlay) closeRoleStats(); });

  // ---- Reset Modal ----
  const resetOverlay   = document.getElementById('reset-overlay');
  const resetBtn       = document.getElementById('reset-wins-btn');
  const resetCancel    = document.getElementById('reset-cancel');
  const resetConfirm   = document.getElementById('reset-confirm');
  const patchLabelInput = document.getElementById('patch-label-input');

  function openReset()  {
    resetOverlay.classList.remove('reset-overlay--hidden');
    resetOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    patchLabelInput?.focus();
    if (_resetTrapCleanup) _resetTrapCleanup();
    _resetTrapCleanup = trapFocus(document.querySelector('.reset-modal'));
  }
  function closeReset() {
    resetOverlay.classList.add('reset-overlay--hidden');
    resetOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (_resetTrapCleanup) { _resetTrapCleanup(); _resetTrapCleanup = null; }
  }

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
    patchToggle.setAttribute('aria-expanded', open.toString());
    patchToggle.querySelector('.patch-toggle-arrow').textContent = open ? '▲' : '▼';
  });

  // ---- Sort ----
  const sortSelect = document.getElementById('sort-select');
  sortSelect?.addEventListener('change', () => {
    sortBy = sortSelect.value;
    currentPage = 1;
    renderGrid();
  });

  // ---- Compact Mode ----
  const compactBtn = document.getElementById('compact-toggle');
  compactBtn?.addEventListener('click', () => {
    state.compactMode = !state.compactMode;
    saveState(state);
    compactBtn.classList.toggle('control-btn--active', state.compactMode);
    compactBtn.setAttribute('aria-pressed', state.compactMode.toString());
    compactBtn.title = state.compactMode ? 'Modo normal' : 'Modo compacto';
    renderGrid();
  });

  // ---- Mobile Menu Toggle ----
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const controlBtns      = document.getElementById('control-btns');
  mobileMenuToggle?.addEventListener('click', () => {
    const open = controlBtns.classList.toggle('control-btns--open');
    mobileMenuToggle.setAttribute('aria-expanded', open.toString());
    mobileMenuToggle.textContent = open ? '✕' : '☰';
  });

  // ---- "Filtrar Vitórias" ----
  const wonBtn     = document.getElementById('won-toggle');
  const unplayedBtn = document.getElementById('unplayed-toggle');

  wonBtn?.addEventListener('click', () => {
    showWon = !showWon;
    if (showWon) {
      showUnplayed = false;
      unplayedBtn?.classList.remove('control-btn--active');
      unplayedBtn?.setAttribute('aria-pressed', 'false');
    }
    wonBtn.classList.toggle('control-btn--active', showWon);
    wonBtn.setAttribute('aria-pressed', showWon.toString());
    currentPage = 1;
    renderGrid();
  });

  // ---- "Não joguei" ----
  unplayedBtn?.addEventListener('click', () => {
    showUnplayed = !showUnplayed;
    if (showUnplayed) {
      showWon = false;
      wonBtn?.classList.remove('control-btn--active');
      wonBtn?.setAttribute('aria-pressed', 'false');
    }
    unplayedBtn.classList.toggle('control-btn--active', showUnplayed);
    unplayedBtn.setAttribute('aria-pressed', showUnplayed.toString());
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
  searchInput.addEventListener('input', debounce(e => {
    searchQuery = e.target.value;
    currentPage = 1;
    renderGrid();
  }, 150));

  roleFilters.addEventListener('click', e => {
    const btn = e.target.closest('.role-btn');
    if (!btn) return;
    roleFilters.querySelectorAll('.role-btn').forEach(b => {
      b.classList.remove('role-btn--active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('role-btn--active');
    btn.setAttribute('aria-pressed', 'true');
    activeRole = btn.dataset.role;
    currentPage = 1;
    renderGrid();
  });

  detailClose.addEventListener('click', closeDetail);
  detailOverlay.addEventListener('click', e => { if (e.target === detailOverlay) closeDetail(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDetail(); closeReset(); closeWonModal(); closeRoleStats(); }
  });

  // ---- FX: Confetti & Skulls (GPU-optimised) ----
  const fxCanvas = document.getElementById('fx-canvas');
  const fxCtx    = fxCanvas.getContext('2d', { alpha: true, desynchronized: true });
  let fxParticles = [];
  let fxRaf       = null;
  let _skullSprite = null; // pre-rendered skull bitmap

  // Pre-render skull emoji once to an offscreen canvas
  function getSkullSprite(size) {
    const s = Math.round(size);
    const key = `skull_${s}`;
    if (!getSkullSprite._cache) getSkullSprite._cache = {};
    if (getSkullSprite._cache[key]) return getSkullSprite._cache[key];
    const oc = document.createElement('canvas');
    oc.width = s + 4; oc.height = s + 4;
    const octx = oc.getContext('2d');
    octx.font = `${s}px serif`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillText('💀', (s + 4) / 2, (s + 4) / 2);
    getSkullSprite._cache[key] = oc;
    return oc;
  }

  function resizeFxCanvas() {
    fxCanvas.width  = window.innerWidth;
    fxCanvas.height = window.innerHeight;
  }
  resizeFxCanvas();
  window.addEventListener('resize', resizeFxCanvas, { passive: true });

  function launchFx(type) {
    resizeFxCanvas();
    fxParticles = [];
    const count = type === 'confetti' ? 120 : 60;
    const COLORS = ['#ffd700','#ff6b6b','#4ecdc4','#45b7d1','#96ceb4','#dda0dd','#ff8c00','#00fa9a','#ff69b4','#c89b3c'];

    // Pre-warm skull sprites at the sizes we'll use
    if (type === 'skull') {
      [18, 22, 26, 30].forEach(s => getSkullSprite(s));
    }

    for (let i = 0; i < count; i++) {
      // Burst from two cannons: left and right edges of screen
      const side  = i % 2 === 0;
      const startX = side
        ? -10 + Math.random() * (fxCanvas.width * 0.15)
        : fxCanvas.width * 0.85 + Math.random() * (fxCanvas.width * 0.15);
      const angle  = side
        ? (-40 + Math.random() * 60) * (Math.PI / 180)   // shoot rightward
        : (-140 + Math.random() * 60) * (Math.PI / 180); // shoot leftward
      const speed  = 6 + Math.random() * 8;

      fxParticles.push({
        type,
        x: startX,
        y: fxCanvas.height * 0.3 + Math.random() * fxCanvas.height * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (2 + Math.random() * 4), // initial upward kick
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.22,
        size: type === 'confetti' ? 7 + Math.random() * 9 : 18 + Math.round(Math.random() * 3) * 4,
        color: COLORS[i % COLORS.length],
        opacity: 1,
        shape: i % 3, // deterministic, no Math.floor needed
        gravity: 0.45 + Math.random() * 0.2,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.04 + Math.random() * 0.04,
      });
    }

    if (fxRaf) cancelAnimationFrame(fxRaf);
    animateFx();
  }

  function animateFx() {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    let alive = false;
    const H = fxCanvas.height;
    const fadeStart = H * 0.55;

    for (let i = 0; i < fxParticles.length; i++) {
      const p = fxParticles[i];
      p.vy      += p.gravity;
      p.x       += p.vx + Math.sin(p.wobble) * 1.2;
      p.y       += p.vy;
      p.rotation += p.rotSpeed;
      p.wobble   += p.wobbleSpeed;
      if (p.y > fadeStart) p.opacity -= 0.06;
      if (p.opacity <= 0 || p.y > H + 20) continue;
      alive = true;

      fxCtx.save();
      fxCtx.globalAlpha = p.opacity;
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.rotation);

      if (p.type === 'skull') {
        // drawImage from pre-rendered canvas — way faster than fillText each frame
        const sprite = getSkullSprite(p.size);
        const half   = sprite.width / 2;
        fxCtx.drawImage(sprite, -half, -half);
      } else {
        fxCtx.fillStyle = p.color;
        const s = p.size;
        if (p.shape === 0) {
          fxCtx.fillRect(-s * 0.5, -s * 0.25, s, s * 0.5);
        } else if (p.shape === 1) {
          fxCtx.beginPath();
          fxCtx.ellipse(0, 0, s * 0.4, s * 0.25, 0, 0, Math.PI * 2);
          fxCtx.fill();
        } else {
          fxCtx.fillRect(-s * 0.15, -s * 0.5, s * 0.3, s);
        }
      }
      fxCtx.restore();
    }

    if (alive) fxRaf = requestAnimationFrame(animateFx);
    else fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  }

  // ---- Loading ----
  function showLoading() {
    grid.innerHTML = `
      <div class="loading-state" style="grid-column:1/-1">
        <div class="loading-spinner"></div>
        <div class="loading-text">Carregando campeões…</div>
      </div>
    `;
  }

  // ---- Init ----
  async function init() {
    showLoading();
    await loadAllChampions();
    if (state.compactMode) {
      compactBtn?.classList.add('control-btn--active');
      compactBtn?.setAttribute('aria-pressed', 'true');
    }
    updateStats();
    updateCurrentChampion();
    updateTagFilterBar();
    renderPatchHistory();
    renderGrid();
  }

  init();
})();
