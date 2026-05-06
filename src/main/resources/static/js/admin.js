const ADMIN_API_BASE = '/api/admin';
const ADMIN_FORUM_API_BASE = '/api/forum';

function adminCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser'));
  } catch {
    return null;
  }
}

function adminEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function adminFetchJson(url, options = {}) {
  const user = adminCurrentUser();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(user?.id ? { 'X-User-Id': String(user.id) } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Ошибка админ-панели');
  }
  return data;
}

async function adminFetchNoContent(url, options = {}) {
  const user = adminCurrentUser();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(user?.id ? { 'X-User-Id': String(user.id) } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Ошибка админ-панели');
  }
}

async function loadAdminPage() {
  const user = adminCurrentUser();
  const subtitle = document.getElementById('admin-subtitle');
  const content = document.getElementById('admin-content');
  const status = document.getElementById('admin-status');
  if (!user?.admin) {
    if (subtitle) subtitle.textContent = 'Войдите как администратор через страницу логина.';
    if (content) content.innerHTML = '<p class="forum-empty-state">Доступ запрещен.</p>';
    return;
  }

  async function loadTopicCategories(forumId) {
    const categorySelect = document.getElementById('admin-topic-category');
    if (!categorySelect || !forumId) return;
    try {
      const categories = await adminFetchJson(`${ADMIN_FORUM_API_BASE}/forums/${forumId}/categories`);
      categorySelect.innerHTML = categories.map((category) => (
        `<option value="${category.id}">${adminEscapeHtml(category.name)}</option>`
      )).join('');
    } catch (error) {
      categorySelect.innerHTML = '';
      if (status) status.textContent = error.message;
    }
  }

  async function reload() {
    const [forums, users] = await Promise.all([
      adminFetchJson(`${ADMIN_FORUM_API_BASE}/forums`),
      adminFetchJson(`${ADMIN_API_BASE}/users`)
    ]);
    document.getElementById('admin-forums-count').textContent = `${forums.length}`;
    document.getElementById('admin-users-count').textContent = `${users.length}`;
    document.getElementById('admin-forums-list').innerHTML = forums.map((forum) => `
      <div class="admin-list-item">
        <div class="admin-list-item-main">
          <strong>${adminEscapeHtml(forum.title)}</strong>
          <div class="forum-subtitle">ID ${forum.id} · ${adminEscapeHtml(forum.slug)}</div>
        </div>
        <div class="admin-list-item-actions">
          <button type="button" class="forum-link-btn profile-danger-btn" data-delete-forum="${forum.id}">Удалить</button>
        </div>
      </div>
    `).join('');
    document.getElementById('admin-users-list').innerHTML = users.map((item) => `
      <div class="admin-list-item">
        <div class="admin-list-item-main">
          <strong>${adminEscapeHtml(item.username)}</strong>
          ${item.blocked ? '<span class="restricted-badge">Ограниченный доступ</span>' : ''}
          ${item.admin ? '<span class="forum-pinned-badge">Админ</span>' : ''}
          <div class="forum-subtitle">ID ${item.id}${item.email ? ` · ${adminEscapeHtml(item.email)}` : ''}</div>
        </div>
        <div class="admin-list-item-actions">
          <button type="button" class="forum-link-btn" data-toggle-block="${item.id}" data-blocked="${item.blocked}">${item.blocked ? 'Разблокировать' : 'Заблокировать'}</button>
          <button type="button" class="forum-link-btn profile-danger-btn" data-delete-user="${item.id}">Удалить</button>
        </div>
      </div>
    `).join('');

    const forumSelect = document.getElementById('admin-topic-forum');
    if (forumSelect) {
      const previousForumId = forumSelect.value;
      forumSelect.innerHTML = forums.map((forum) => (
        `<option value="${forum.id}">${adminEscapeHtml(forum.title)}</option>`
      )).join('');
      if (previousForumId && forums.some((forum) => String(forum.id) === previousForumId)) {
        forumSelect.value = previousForumId;
      }
      await loadTopicCategories(forumSelect.value);
    }
  }

  document.getElementById('admin-forum-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await adminFetchJson(`${ADMIN_API_BASE}/forums`, {
        method: 'POST',
        body: JSON.stringify({
          title: document.getElementById('admin-forum-title').value.trim(),
          slug: document.getElementById('admin-forum-slug').value.trim()
        })
      });
      event.target.reset();
      if (status) status.textContent = 'Форум добавлен.';
      await reload();
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  });

  document.getElementById('admin-topic-forum')?.addEventListener('change', (event) => {
    loadTopicCategories(event.target.value);
  });

  document.getElementById('admin-create-topic-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await adminFetchJson(`${ADMIN_FORUM_API_BASE}/topics`, {
        method: 'POST',
        body: JSON.stringify({
          forumId: Number(document.getElementById('admin-topic-forum').value),
          categoryId: Number(document.getElementById('admin-topic-category').value),
          title: document.getElementById('admin-topic-title').value.trim(),
          content: document.getElementById('admin-topic-content').value.trim()
        })
      });
      event.target.reset();
      if (status) status.textContent = 'Тема добавлена.';
      await reload();
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  });

  document.getElementById('admin-create-comment-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await adminFetchJson(`${ADMIN_FORUM_API_BASE}/topics/${document.getElementById('admin-comment-topic-id').value}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: document.getElementById('admin-comment-content').value.trim(),
          parentCommentId: null
        })
      });
      event.target.reset();
      if (status) status.textContent = 'Комментарий добавлен.';
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  });

  document.getElementById('admin-content')?.addEventListener('click', async (event) => {
    const deleteForum = event.target.closest('[data-delete-forum]');
    const toggleBlock = event.target.closest('[data-toggle-block]');
    const deleteUser = event.target.closest('[data-delete-user]');
    try {
      if (deleteForum) {
        await adminFetchNoContent(`${ADMIN_API_BASE}/forums/${deleteForum.dataset.deleteForum}`, { method: 'DELETE' });
      } else if (toggleBlock) {
        await adminFetchJson(`${ADMIN_API_BASE}/users/${toggleBlock.dataset.toggleBlock}/status`, {
          method: 'PUT',
          body: JSON.stringify({ blocked: toggleBlock.dataset.blocked !== 'true' })
        });
      } else if (deleteUser) {
        await adminFetchNoContent(`${ADMIN_API_BASE}/users/${deleteUser.dataset.deleteUser}`, { method: 'DELETE' });
      } else {
        return;
      }
      if (status) status.textContent = 'Изменения сохранены.';
      await reload();
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  });

  await reload();
}

document.addEventListener('DOMContentLoaded', loadAdminPage);



