// =============================================================================
// app.js — Main application logic for Arena Champion Counter
// =============================================================================

(function () {
  'use strict';

  // ---- Estado ----
  let state = loadState();
  let activeRole = 'ALL';
  let searchQuery = '';
  let currentPage = 1;
  const PER_PAGE = 24;

  // ---- Sistema de Ranque ----
  const RANKS = [
    { name: 'Ferro',        min: 0,   max: 0,   color: '#6e6e6e', icon: '🩶' },
    { name: 'Bronze',       min: 1,   max: 5,   color: '#cd7f32', icon: '🥉' },
    { name: 'Prata',        min: 6,   max: 15,  color: '#c0c0c0', icon: '🥈' },
    { name: 'Ouro',         min: 16,  max: 30,  color: '#ffd700', icon: '🥇' },
    { name: 'Platina',      min: 31,  max: 50,  color: '#00d4aa', icon: '💎' },
    { name: 'Diamante',     min: 51,  max: 75,  color: '#5b9fff', icon: '🔷' },
    { name: 'Mestre',       min: 76,  max: 100, color: '#9b59b6', icon: '👑' },
    { name: 'Grão-Mestre',  min: 101, max: 130, color: '#e84057', icon: '🔥' },
    { name: 'Desafiante',   min: 131, max: Infinity, color: '#c89b3c', icon: '⚡' },
  ];

  function getRank(wins) {
    return RANKS.find(r => wins >= r.min && wins <= r.max) || RANKS[0];
  }

  // ---- DOM refs ----
  const grid = document.getElementById('champion-grid');
  const searchInput = document.getElementById('search-input');
  const roleFilters = document.getElementById('role-filters');
  const detailOverlay = document.getElementById('detail-overlay');
  const detailPanel = document.getElementById('detail-panel');
  const toastEl = document.getElementById('toast');
  const paginationEl = document.getElementById('pagination');

  // Stats
  const statTotal = document.getElementById('stat-total');
  const statDefeated = document.getElementById('stat-defeated');
  const statRemaining = document.getElementById('stat-remaining');
  const statPercent = document.getElementById('stat-percent');
  const statRank = document.getElementById('stat-rank');
  const progressFill = document.getElementById('progress-fill');

  // Current champion
  const currentChampionEl = document.getElementById('current-champion');

  // Detail panel refs
  const detailSplash = document.getElementById('detail-splash');
  const detailAvatar = document.getElementById('detail-avatar');
  const detailName = document.getElementById('detail-name');
  const detailTitle = document.getElementById('detail-title');
  const detailRole = document.getElementById('detail-role');
  const detailActions = document.getElementById('detail-actions');
  const tagsList = document.getElementById('tags-list');
  const counterList = document.getElementById('counter-list');
  const detailClose = document.getElementById('detail-close');

  // ---- Toast ----
  let toastTimer = null;
  function showToast(message, type = 'success') {
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.className = 'toast toast--visible';
    if (type === 'danger') toastEl.classList.add('toast--danger');
    if (type === 'gold') toastEl.classList.add('toast--gold');
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('toast--visible');
    }, 2200);
  }

  // ---- Stats + Ranque ----
  function updateStats() {
    const total = CHAMPIONS.length;
    const defeated = getDefeatedCount(state);
    const remaining = total - defeated;
    const percent = total > 0 ? Math.round((defeated / total) * 100) : 0;
    const rank = getRank(defeated);

    statTotal.textContent = total;
    statDefeated.textContent = defeated;
    statRemaining.textContent = remaining;
    statPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;

    // Atualiza badge de ranque
    if (statRank) {
      statRank.innerHTML = `
        <span class="rank-icon">${rank.icon}</span>
        <span class="rank-name" style="color: ${rank.color}">${rank.name}</span>
      `;
    }
  }

  // ---- Campeão Atual ----
  function updateCurrentChampion() {
    if (state.currentChampion) {
      const champ = getChampionById(state.currentChampion);
      if (champ) {
        currentChampionEl.classList.remove('current-champion--empty');
        const alreadyWon = isDefeated(state, champ.id);
        currentChampionEl.innerHTML = `
          <img class="current-champion__img" src="${CHAMPION_IMG(champ.id)}" alt="${champ.name}">
          <div class="current-champion__info">
            <div class="current-champion__label">Campeão Atual</div>
            <div class="current-champion__name">${champ.name}</div>
          </div>
          <div class="current-champion__btns">
            <button class="current-champion__clear" id="clear-current">✕ Limpar</button>
            ${!alreadyWon ? '<button class="current-champion__won" id="btn-won">🏆 Ganhei</button>' : ''}
            <button class="current-champion__lost" id="btn-lost">💀 Perdi</button>
          </div>
        `;
        document.getElementById('clear-current').addEventListener('click', (e) => {
          e.stopPropagation();
          state = clearCurrentChampion(state);
          updateCurrentChampion();
          renderGrid();
          showToast('Campeão atual removido', 'danger');
        });
        const btnWon = document.getElementById('btn-won');
        if (btnWon) {
          btnWon.addEventListener('click', (e) => {
            e.stopPropagation();
            state = toggleDefeated(state, champ.id);
            state = clearCurrentChampion(state);
            updateStats();
            updateCurrentChampion();
            renderGrid();
            showToast(`🏆 Venci com ${champ.name}!`, 'success');
          });
        }
        document.getElementById('btn-lost').addEventListener('click', (e) => {
          e.stopPropagation();
          state = clearCurrentChampion(state);
          updateCurrentChampion();
          renderGrid();
          showToast(`Perdi com ${champ.name}… próxima!`, 'danger');
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
    const defeated = isDefeated(state, champ.id);
    const isCurrent = state.currentChampion === champ.id;

    const card = document.createElement('article');
    card.className = 'champion-card';
    if (defeated) card.classList.add('champion-card--defeated');
    if (isCurrent) card.classList.add('champion-card--current');

    card.innerHTML = `
      <div class="champion-card__img-wrapper">
        <img class="champion-card__img" src="${CHAMPION_IMG(champ.id)}" alt="${champ.name}" loading="lazy">
        <div class="champion-card__overlay"></div>
        <span class="champion-card__role-badge">${ROLES[champ.role] || champ.role}</span>
      </div>
      <div class="champion-card__info">
        <div class="champion-card__name">${champ.name}</div>
        <div class="champion-card__title">${champ.title}</div>
      </div>
      <div class="champion-card__actions">
        <button class="card-action-btn ${defeated ? 'card-action-btn--undefeat' : 'card-action-btn--defeat'}" data-action="toggle-defeat" data-id="${champ.id}">
          ${defeated ? 'Desfazer' : '✓ Venci'}
        </button>
        <button class="card-action-btn" data-action="view-detail" data-id="${champ.id}">
          Detalhes
        </button>
      </div>
    `;

    card.querySelector('[data-action="view-detail"]').addEventListener('click', (e) => {
      e.stopPropagation();
      openDetail(champ.id);
    });

    card.querySelector('[data-action="toggle-defeat"]').addEventListener('click', (e) => {
      e.stopPropagation();
      state = toggleDefeated(state, champ.id);
      updateStats();
      renderGrid();
      showToast(
        isDefeated(state, champ.id) ? `🏆 Venci com ${champ.name}!` : `${champ.name} desmarcado`,
        isDefeated(state, champ.id) ? 'success' : 'danger'
      );
    });

    card.querySelector('.champion-card__img-wrapper').addEventListener('click', () => openDetail(champ.id));

    return card;
  }

  // ---- Grid + Paginação ----
  function getFilteredChampions() {
    let champions = getChampionsByRole(activeRole);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      champions = champions.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (ROLES[c.role] || '').toLowerCase().includes(q)
      );
    }
    return champions;
  }

  function renderGrid() {
    const champions = getFilteredChampions();
    const totalPages = Math.max(1, Math.ceil(champions.length / PER_PAGE));

    // Garante que a página atual é válida
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * PER_PAGE;
    const pageChamps = champions.slice(start, start + PER_PAGE);

    grid.innerHTML = '';

    if (champions.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state__icon">🔍</div>
          <div class="empty-state__text">Nenhum campeão encontrado</div>
        </div>
      `;
      renderPagination(0, 1);
      return;
    }

    const fragment = document.createDocumentFragment();
    pageChamps.forEach(champ => fragment.appendChild(createChampionCard(champ)));
    grid.appendChild(fragment);

    renderPagination(champions.length, totalPages);
  }

  function renderPagination(total, totalPages) {
    if (!paginationEl) return;

    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    const start = (currentPage - 1) * PER_PAGE + 1;
    const end = Math.min(currentPage * PER_PAGE, total);

    // Constrói botões de página (mostra até 5 ao redor da atual)
    let pageButtons = '';
    const delta = 2;
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    if (left > 1) {
      pageButtons += `<button class="page-btn" data-page="1">1</button>`;
      if (left > 2) pageButtons += `<span class="page-ellipsis">…</span>`;
    }
    for (let i = left; i <= right; i++) {
      pageButtons += `<button class="page-btn ${i === currentPage ? 'page-btn--active' : ''}" data-page="${i}">${i}</button>`;
    }
    if (right < totalPages) {
      if (right < totalPages - 1) pageButtons += `<span class="page-ellipsis">…</span>`;
      pageButtons += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    paginationEl.innerHTML = `
      <div class="pagination-info">${start}–${end} de ${total} campeões</div>
      <div class="pagination-controls">
        <button class="page-btn page-btn--nav" id="page-prev" ${currentPage === 1 ? 'disabled' : ''}>‹ Anterior</button>
        ${pageButtons}
        <button class="page-btn page-btn--nav" id="page-next" ${currentPage === totalPages ? 'disabled' : ''}>Próxima ›</button>
      </div>
    `;

    paginationEl.querySelector('#page-prev')?.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderGrid(); scrollToGrid(); }
    });
    paginationEl.querySelector('#page-next')?.addEventListener('click', () => {
      if (currentPage < totalPages) { currentPage++; renderGrid(); scrollToGrid(); }
    });
    paginationEl.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page, 10);
        renderGrid();
        scrollToGrid();
      });
    });
  }

  function scrollToGrid() {
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- Modal ----
  function openDetail(championId) {
    const champ = getChampionById(championId);
    if (!champ) return;

    const defeated = isDefeated(state, champ.id);

    detailSplash.src = CHAMPION_SPLASH(champ.id);
    detailSplash.alt = champ.name;
    detailAvatar.src = CHAMPION_IMG(champ.id);
    detailAvatar.alt = champ.name;
    detailName.textContent = champ.name;
    detailTitle.textContent = champ.title;
    detailRole.textContent = ROLES[champ.role] || champ.role;

    const isCurrent = state.currentChampion === champ.id;
    detailActions.innerHTML = `
      <button class="detail-action-btn detail-action-btn--select" data-action="select">
        ${isCurrent ? '★ Selecionado' : '⚔ Selecionar'}
      </button>
      <button class="detail-action-btn ${defeated ? 'detail-action-btn--undefeat' : 'detail-action-btn--defeat'}" data-action="toggle">
        ${defeated ? '↩ Desmarcar' : '✓ Venci'}
      </button>
    `;

    detailActions.querySelector('[data-action="select"]').addEventListener('click', () => {
      state = setCurrentChampion(state, champ.id);
      updateCurrentChampion();
      renderGrid();
      openDetail(champ.id);
      showToast(`${champ.name} selecionado como atual!`, 'gold');
    });

    detailActions.querySelector('[data-action="toggle"]').addEventListener('click', () => {
      state = toggleDefeated(state, champ.id);
      updateStats();
      renderGrid();
      openDetail(champ.id);
      showToast(
        isDefeated(state, champ.id) ? `🏆 Venci com ${champ.name}!` : `${champ.name} desmarcado`,
        isDefeated(state, champ.id) ? 'success' : 'danger'
      );
    });

    tagsList.innerHTML = champ.tags.length
      ? champ.tags.map(t => `<span class="tag-chip">${t.replace(/_/g, ' ')}</span>`).join('')
      : '<span style="color: var(--text-muted); font-size: 0.85rem;">—</span>';

    const counters = getCountersFor(champ.id);
    counterList.innerHTML = counters.length
      ? counters.map(c => `
          <div class="counter-card" data-counter-id="${c.id}">
            <img class="counter-card__img" src="${CHAMPION_IMG(c.id)}" alt="${c.name}" loading="lazy">
            <div>
              <div class="counter-card__name">${c.name}</div>
              <div class="counter-card__role">${ROLES[c.role] || c.role}</div>
            </div>
          </div>
        `).join('')
      : '<div style="color: var(--text-muted); font-size: 0.85rem;">Sem counters registrados</div>';

    counterList.querySelectorAll('.counter-card').forEach(card => {
      card.addEventListener('click', () => openDetail(card.dataset.counterId));
    });

    detailOverlay.classList.remove('detail-overlay--hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeDetail() {
    detailOverlay.classList.add('detail-overlay--hidden');
    document.body.style.overflow = '';
  }

  // ---- Event Listeners ----
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    currentPage = 1;
    renderGrid();
  });

  roleFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.role-btn');
    if (!btn) return;
    roleFilters.querySelectorAll('.role-btn').forEach(b => b.classList.remove('role-btn--active'));
    btn.classList.add('role-btn--active');
    activeRole = btn.dataset.role;
    currentPage = 1;
    renderGrid();
  });

  detailClose.addEventListener('click', closeDetail);
  detailOverlay.addEventListener('click', (e) => { if (e.target === detailOverlay) closeDetail(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });

  // ---- Loading overlay ----
  function showLoading() {
    grid.innerHTML = `
      <div class="loading-state" style="grid-column: 1 / -1;">
        <div class="loading-spinner"></div>
        <div class="loading-text">Carregando campeões…</div>
      </div>
    `;
  }

  // ---- Init (assíncrono) ----
  async function init() {
    showLoading();
    await loadAllChampions();
    updateStats();
    updateCurrentChampion();
    renderGrid();
  }

  init();
})();
