const AUTH_API_BASE = '/api/auth';
const FORUM_API_BASE = '/api/forum';
const PROFILE_AVATAR_SIZE = 320;
const DEFAULT_AVATAR = 'https://via.placeholder.com/320x320/202020/f0f0f0?text=U';

function isCurrentPage(pageName) {
  return window.location.pathname.endsWith(`/${pageName}`) || window.location.pathname === `/${pageName}`;
}

function authEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function authFetchJson(url, options = {}) {
  const currentUser = getCurrentUser();
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(currentUser?.id ? { 'X-User-Id': String(currentUser.id) } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Ошибка авторизации');
  }
  return data;
}

function saveCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify({
    id: user.id,
    username: user.username,
    email: user.email,
    avatar_url: user.avatarUrl || '',
    admin: Boolean(user.admin),
    blocked: Boolean(user.blocked)
  }));
}

function clearCurrentUser() {
  localStorage.removeItem('currentUser');
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser'));
  } catch {
    return null;
  }
}

function bindPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      button.classList.toggle('is-visible', !visible);
      button.setAttribute('aria-pressed', String(!visible));
    });
  });
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Не удалось прочитать изображение.'));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Не удалось загрузить файл.'));
    reader.readAsDataURL(file);
  });
}

async function cropAvatarToSquare(file) {
  const image = await loadImageFromFile(file);
  const cropSide = Math.min(image.width, image.height);
  const cropX = Math.floor((image.width - cropSide) / 2);
  const cropY = Math.floor((image.height - cropSide) / 2);
  const canvas = document.createElement('canvas');
  canvas.width = PROFILE_AVATAR_SIZE;
  canvas.height = PROFILE_AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, cropX, cropY, cropSide, cropSide, 0, 0, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_SIZE);
  return canvas.toDataURL('image/jpeg', 0.92);
}

async function initLoginPage() {
  if (!isCurrentPage('login.html')) return;
  const form = document.getElementById('login-form');
  const status = document.getElementById('login-status');
  if (!form || !status) return;

  bindPasswordToggles();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
      status.textContent = 'Заполните email и пароль.';
      return;
    }

    try {
      status.textContent = 'Выполняется вход...';
      const user = await authFetchJson(`${AUTH_API_BASE}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      saveCurrentUser(user);
      window.location.href = 'index.html';
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

async function initRegisterPage() {
  if (!isCurrentPage('register.html')) return;
  const form = document.getElementById('register-form');
  const status = document.getElementById('register-status');
  if (!form || !status) return;

  bindPasswordToggles();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const repeatPassword = document.getElementById('register-password-repeat').value.trim();

    if (!username || !email || !password || !repeatPassword) {
      status.textContent = 'Заполните все поля.';
      return;
    }
    if (password !== repeatPassword) {
      status.textContent = 'Пароли не совпадают.';
      return;
    }

    try {
      status.textContent = 'Создание аккаунта...';
      const user = await authFetchJson(`${AUTH_API_BASE}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
      });
      saveCurrentUser(user);
      window.location.href = 'index.html';
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

function renderTopicsList(topics) {
  if (!topics.length) {
    return '<p class="forum-empty-state">У пользователя пока нет созданных тем.</p>';
  }
  return `
    <div class="forum-topic-list">
      ${topics.map((topic) => `
        <a class="forum-topic-card-link" href="forum_topic.html?topicId=${encodeURIComponent(topic.id)}">
          <div class="topic-forum-title">${authEscapeHtml(topic.forumTitle)}</div>
          <div class="forum-topic-card-head">
            <h3>${authEscapeHtml(topic.title)}</h3>
          </div>
          <p class="forum-topic-card-excerpt">${authEscapeHtml(topic.excerpt)}</p>
        </a>
      `).join('')}
    </div>
  `;
}

async function initProfilePage() {
  if (!isCurrentPage('profile.html')) return;

  const currentUser = getCurrentUser();
  const params = new URLSearchParams(window.location.search);
  const requestedUserId = params.get('userId');
  const profileUserId = requestedUserId || currentUser?.id;
  const body = document.getElementById('profile-content');
  const subtitle = document.getElementById('profile-subtitle');
  if (!body || !subtitle) return;

  if (!profileUserId) {
    subtitle.textContent = 'Войдите в аккаунт, чтобы открыть профиль.';
    body.innerHTML = '<p class="forum-empty-state">Пользователь не авторизован.</p>';
    return;
  }

  try {
    const [profile, topics] = await Promise.all([
      authFetchJson(`${AUTH_API_BASE}/users/${profileUserId}`),
      authFetchJson(`${FORUM_API_BASE}/users/${profileUserId}/topics`)
    ]);

    const isOwner = currentUser?.id && Number(currentUser.id) === Number(profileUserId);
    document.title = `${profile.username} | Project Forum`;
    subtitle.textContent = isOwner ? 'Ваш публичный профиль и созданные темы.' : 'Публичный профиль пользователя.';

    body.innerHTML = `
      <div class="profile-layout">
        <aside class="profile-summary-card">
          <img class="profile-avatar-large" src="${profile.avatarUrl || DEFAULT_AVATAR}" alt="${authEscapeHtml(profile.username)}" />
          <div class="forum-author-block profile-summary-meta">
            <div>
              <div class="profile-name-row">
                <div class="forum-topic-main-title">${authEscapeHtml(profile.username)}</div>
                ${profile.blocked ? '<span class="restricted-badge">Ограниченный доступ</span>' : ''}
              </div>
            </div>
          </div>
          ${isOwner ? '<a class="forum-primary-btn" href="edit_profile.html">Редактировать профиль</a>' : ''}
        </aside>
        <section class="forum-content-card">
          <div class="forum-content-head">
            <h2>Созданные темы в форуме</h2>
            <span>${topics.length} тем</span>
          </div>
          ${renderTopicsList(topics)}
        </section>
      </div>
    `;
  } catch (error) {
    subtitle.textContent = error.message;
    body.innerHTML = '<p class="forum-empty-state">Не удалось загрузить профиль.</p>';
  }
}

async function initEditProfilePage() {
  if (!isCurrentPage('edit_profile.html')) return;

  const currentUser = getCurrentUser();
  const body = document.getElementById('edit-profile-content');
  const subtitle = document.getElementById('edit-profile-subtitle');
  if (!body || !subtitle) return;

  if (!currentUser?.id) {
    subtitle.textContent = 'Войдите в аккаунт, чтобы редактировать профиль.';
    body.innerHTML = '<p class="forum-empty-state">Пользователь не авторизован.</p>';
    return;
  }

  try {
    const profile = await authFetchJson(`${AUTH_API_BASE}/users/${currentUser.id}`);
    document.title = `Редактирование профиля | Project Forum`;
    body.innerHTML = `
      <div class="profile-layout">
        <div class="profile-avatar-panel">
          <img class="profile-avatar-large" id="profile-avatar-preview" src="${profile.avatarUrl || DEFAULT_AVATAR}" alt="${authEscapeHtml(profile.username)}" />
          <div class="profile-avatar-crop-ring"></div>
          <label class="forum-link-btn profile-upload-btn" for="profile-avatar-input">Выбрать изображение</label>
          <input id="profile-avatar-input" type="file" accept="image/*" hidden />
          <p class="forum-subtitle profile-avatar-hint">Изображение автоматически обрезается по центру в квадрат перед сохранением.</p>
        </div>
        <form id="edit-profile-form" class="forum-form forum-content-card">
          <label for="edit-profile-username">Ник</label>
          <input id="edit-profile-username" type="text" maxlength="50" value="${authEscapeHtml(profile.username)}" required />
          <p class="forum-form-status" id="edit-profile-status"></p>
          <button type="submit" class="forum-primary-btn">Сохранить изменения</button>
          <a class="forum-link-btn" href="profile.html">Вернуться в профиль</a>
          <hr class="profile-divider" />
          <label for="delete-account-password">Пароль для удаления аккаунта</label>
          <input id="delete-account-password" type="password" maxlength="200" />
          <p class="forum-subtitle">Темы и комментарии останутся на форуме, но аккаунт будет деактивирован.</p>
          <button type="button" class="forum-link-btn profile-danger-btn" id="delete-account-btn">Удалить аккаунт</button>
        </form>
      </div>
    `;
    subtitle.textContent = 'Измените ник и аватар. Удаление аккаунта доступно ниже.';

    const form = document.getElementById('edit-profile-form');
    const input = document.getElementById('profile-avatar-input');
    const preview = document.getElementById('profile-avatar-preview');
    const status = document.getElementById('edit-profile-status');
    const deleteButton = document.getElementById('delete-account-btn');
    let pendingAvatar = profile.avatarUrl || '';
    let avatarCropper = null;

    input?.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        status.textContent = 'Выберите файл изображения.';
        return;
      }
      try {
        status.textContent = 'Подготавливаем изображение...';
        const imageUrl = URL.createObjectURL(file);
        if (avatarCropper) {
          avatarCropper.destroy();
          avatarCropper = null;
        }
        preview.src = imageUrl;
        if (window.Cropper) {
          avatarCropper = new Cropper(preview, {
            aspectRatio: 1,
            viewMode: 3,
            dragMode: 'move',
            autoCropArea: 1,
            cropBoxMovable: false,
            toggleDragModeOnDblclick: false,
            responsive: true,
            background: false
          });
          pendingAvatar = '';
          status.textContent = 'Выберите область обрезки и сохраните профиль.';
        } else {
          pendingAvatar = await cropAvatarToSquare(file);
          preview.src = pendingAvatar;
          status.textContent = 'Изображение готово к сохранению.';
        }
      } catch (error) {
        status.textContent = error.message;
      }
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = document.getElementById('edit-profile-username').value.trim();
      if (!username) {
        status.textContent = 'Введите ник.';
        return;
      }
      try {
        status.textContent = 'Сохраняем профиль...';
        if (avatarCropper) {
          pendingAvatar = avatarCropper
            .getCroppedCanvas({ width: PROFILE_AVATAR_SIZE, height: PROFILE_AVATAR_SIZE })
            .toDataURL('image/jpeg', 0.92);
        }
        const updatedUser = await authFetchJson(`${AUTH_API_BASE}/users/${currentUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({ username, avatarUrl: pendingAvatar || null })
        });
        saveCurrentUser(updatedUser);
        status.textContent = 'Профиль обновлён.';
      } catch (error) {
        status.textContent = error.message;
      }
    });

    deleteButton?.addEventListener('click', async () => {
      const password = document.getElementById('delete-account-password').value.trim();
      if (!password) {
        status.textContent = 'Введите пароль для удаления аккаунта.';
        return;
      }
      try {
        status.textContent = 'Удаляем аккаунт...';
        await fetch(`${AUTH_API_BASE}/users/${currentUser.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': String(currentUser.id)
          },
          body: JSON.stringify({ password })
        }).then(async (response) => {
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || 'Не удалось удалить аккаунт');
          }
        });
        clearCurrentUser();
        window.location.href = 'index.html';
      } catch (error) {
        status.textContent = error.message;
      }
    });
  } catch (error) {
    subtitle.textContent = error.message;
    body.innerHTML = '<p class="forum-empty-state">Не удалось загрузить страницу редактирования.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initRegisterPage();
  initProfilePage();
  initEditProfilePage();
});
