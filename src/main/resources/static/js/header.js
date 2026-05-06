const HEADER_FORUM_API_BASE = window.location.port === '8081'
  ? `${window.location.origin}/api/forum`
  : 'http://localhost:8081/api/forum';

function forumGetCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser'));
  } catch {
    return null;
  }
}

function forumDefaultAvatar() {
  return 'https://via.placeholder.com/40x40/202020/f0f0f0?text=U';
}

function renderRestrictedBadge() {
  return '<span class="restricted-badge">Ограниченный доступ</span>';
}

function forumClearCurrentUser() {
  localStorage.removeItem('currentUser');
}

function escapeHeaderHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function headerFetchJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(data.error || 'Ошибка поиска');
  }
  return data;
}

function renderForumHeader() {
  const host = document.getElementById('site-header');
  if (!host) return;

  const user = forumGetCurrentUser();

  host.innerHTML = `
    <div class="site-header-inner">
      <div class="site-header-left">
        <nav class="site-nav">
          <a href="index.html" class="site-nav-link">Главная</a>
          <a href="forums.html" class="site-nav-link">Форумы</a>
          <a href="guides.html" class="site-nav-link">Руководства</a>
        </nav>
      </div>
      <div class="site-header-right">
        <button type="button" class="site-search-toggle" id="site-search-toggle" aria-label="Поиск">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
          </svg>
        </button>
        <div class="site-search" id="site-search">
          <input class="site-search-input" id="site-search-input" type="search" placeholder="Поиск форумов и обсуждений" />
          <div class="site-search-dropdown" id="site-search-dropdown"></div>
        </div>
        ${user ? `
          <div class="user-menu" id="user-menu">
            <button type="button" class="user-menu-trigger" id="user-menu-trigger">
              <span class="user-menu-name">${escapeHeaderHtml(user.username || 'Пользователь')}</span>
              ${user.blocked ? renderRestrictedBadge() : ''}
              <img class="user-menu-avatar" src="${user.avatar_url || forumDefaultAvatar()}" alt="${escapeHeaderHtml(user.username || 'Пользователь')}" />
            </button>
            <div class="user-menu-dropdown" id="user-menu-dropdown">
              <a href="profile.html" class="user-menu-link">Профиль</a>
              <a href="my_messages.html" class="user-menu-link">Мои сообщения</a>
              ${user.admin ? '<a href="admin.html" class="user-menu-link">Панель админа</a>' : ''}
              <button type="button" class="user-menu-link user-menu-logout" id="user-menu-logout">Выйти</button>
            </div>
          </div>
        ` : `
          <div class="guest-actions">
            <a href="register.html" class="site-auth-link">Регистрация</a>
            <a href="login.html" class="site-auth-link site-auth-link-primary">Войти</a>
          </div>
        `}
      </div>
    </div>
  `;

  bindSearch();

  if (user) {
    bindUserMenu();
  }
}

function bindUserMenu() {
  const trigger = document.getElementById('user-menu-trigger');
  const menu = document.getElementById('user-menu');
  const logoutButton = document.getElementById('user-menu-logout');

  if (!trigger || !menu) return;

  trigger.addEventListener('click', () => {
    menu.classList.toggle('open');
  });

  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target)) {
      menu.classList.remove('open');
    }
  });

  logoutButton?.addEventListener('click', () => {
    forumClearCurrentUser();
    window.location.href = 'index.html';
  });
}

function bindSearch() {
  const search = document.getElementById('site-search');
  const toggle = document.getElementById('site-search-toggle');
  const input = document.getElementById('site-search-input');
  const dropdown = document.getElementById('site-search-dropdown');
  if (!search || !input || !dropdown) return;

  let timer = null;

  toggle?.addEventListener('click', () => {
    const expanded = search.classList.toggle('expanded');
    if (expanded) {
      window.requestAnimationFrame(() => input.focus());
    } else {
      search.classList.remove('open');
      input.value = '';
      dropdown.innerHTML = '';
    }
  });

  input.addEventListener('input', () => {
    const query = input.value.trim();
    clearTimeout(timer);

    if (!query) {
      search.classList.remove('open');
      dropdown.innerHTML = '';
      return;
    }

    timer = setTimeout(async () => {
      try {
        const results = await headerFetchJson(`${HEADER_FORUM_API_BASE}/search?query=${encodeURIComponent(query)}`);
        if (!results.length) {
          dropdown.innerHTML = '<div class="site-search-empty">Ничего не найдено</div>';
          search.classList.add('open');
          return;
        }

        dropdown.innerHTML = results.map((item) => `
          <a class="site-search-item" href="${item.url}">
            <span class="site-search-type">${escapeHeaderHtml(item.type)}</span>
            <strong>${escapeHeaderHtml(item.title)}</strong>
            <span>${escapeHeaderHtml(item.subtitle || '')}</span>
          </a>
        `).join('');

        search.classList.add('open');
      } catch {
        dropdown.innerHTML = '<div class="site-search-empty">Ошибка поиска</div>';
        search.classList.add('open');
      }
    }, 180);
  });

  document.addEventListener('click', (event) => {
    if (!search.contains(event.target) && !toggle?.contains(event.target)) {
      search.classList.remove('open');
    }
  });
}

document.addEventListener('DOMContentLoaded', renderForumHeader);
