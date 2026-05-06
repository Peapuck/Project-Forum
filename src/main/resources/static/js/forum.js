const FORUM_API_BASE = '/api/forum';
const DEFAULT_AVATAR = 'https://via.placeholder.com/48x48/202020/f0f0f0?text=U';
const MAX_VISIBLE_REPLIES = 3;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'video/webm'];

function isCurrentPage(pageName) {
  return window.location.pathname.endsWith(`/${pageName}`) || window.location.pathname === `/${pageName}`;
}

function forumCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser'));
  } catch {
    return null;
  }
}

function forumEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function forumFormatDate(dateString) {
  if (!dateString) return 'Р”Р°С‚Р° РЅРµ СѓРєР°Р·Р°РЅР°';
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function forumFetchJson(url, options = {}) {
  const user = forumCurrentUser();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (user?.id) {
    headers['X-User-Id'] = String(user.id);
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РґР°РЅРЅС‹С… С„РѕСЂСѓРјР°');
  }
  return data;
}

function forumProfileUrl(userId) {
  return `profile.html?userId=${encodeURIComponent(userId)}`;
}

function readAttachmentInput(input) {
  return new Promise((resolve, reject) => {
    const file = input?.files?.[0];
    if (!file) {
      resolve({ attachmentUrl: null, attachmentType: null });
      return;
    }
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      reject(new Error('РњРѕР¶РЅРѕ РїСЂРёРєСЂРµРїРёС‚СЊ С‚РѕР»СЊРєРѕ png, jpg, webp РёР»Рё webm.'));
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      reject(new Error('Р¤Р°Р№Р» РЅРµ РґРѕР»Р¶РµРЅ РїСЂРµРІС‹С€Р°С‚СЊ 10 РњР‘.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ attachmentUrl: reader.result, attachmentType: file.type });
    reader.onerror = () => reject(new Error('РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ С„Р°Р№Р».'));
    reader.readAsDataURL(file);
  });
}

function renderAttachment(url, type) {
  if (!url || !type) return '';
  if (type === 'video/webm') {
    return `<video class="forum-attachment" src="${url}" controls data-media-open="${url}" data-media-type="${type}"></video>`;
  }
  return `<img class="forum-attachment" src="${url}" alt="Р’Р»РѕР¶РµРЅРёРµ" data-media-open="${url}" data-media-type="${type}" />`;
}

function openMediaViewer(url, type) {
  const existing = document.getElementById('forum-media-viewer');
  existing?.remove();
  const viewer = document.createElement('div');
  viewer.className = 'forum-media-viewer';
  viewer.id = 'forum-media-viewer';
  viewer.innerHTML = `
    <button type="button" class="forum-media-viewer-close" aria-label="Р—Р°РєСЂС‹С‚СЊ">x</button>
    ${type === 'video/webm'
      ? `<video src="${url}" controls autoplay></video>`
      : `<img src="${url}" alt="Р’Р»РѕР¶РµРЅРёРµ" />`}
  `;
  viewer.addEventListener('click', (event) => {
    if (event.target === viewer || event.target.closest('.forum-media-viewer-close')) {
      viewer.remove();
    }
  });
  document.body.appendChild(viewer);
}

function renderTopicMetrics(topic) {
  return `
    <div class="topic-metric"><span class="topic-metric-icon">рџ’¬</span><span>${Number(topic.commentsCount || 0)}</span></div>
    <div class="topic-metric"><span class="topic-metric-icon">+</span><span>${Number(topic.likesCount || 0)}</span></div>
    <div class="topic-metric"><span class="topic-metric-icon">рџ‘Ѓ</span><span>${Number(topic.viewsCount || 0)}</span></div>
  `;
}

function renderForumCategories(categories, activeCategoryId) {
  const list = document.getElementById('forum-category-list');
  if (!list) return;
  const allCount = categories.reduce((sum, item) => sum + Number(item.topicCount || 0), 0);
  list.innerHTML = `
    <button class="forum-category-item ${activeCategoryId ? '' : 'active'}" type="button" data-category-id="">
      <span>Р’СЃРµ РѕР±СЃСѓР¶РґРµРЅРёСЏ</span>
      <span>${allCount}</span>
    </button>
    ${categories.map((category) => `
      <button class="forum-category-item ${Number(activeCategoryId) === Number(category.id) ? 'active' : ''}" type="button" data-category-id="${category.id}">
        <span>${forumEscapeHtml(category.name)}</span>
        <span>${Number(category.topicCount || 0)}</span>
      </button>
    `).join('')}
  `;
}

function renderForumTopics(topics) {
  const list = document.getElementById('forum-topic-list');
  const total = document.getElementById('forum-topic-total');
  if (!list || !total) return;
  total.textContent = `${topics.length} С‚РµРј`;
  if (!topics.length) {
    list.innerHTML = '<p class="forum-empty-state">Р’ СЌС‚РѕР№ РєР°С‚РµРіРѕСЂРёРё РїРѕРєР° РЅРµС‚ С‚РµРј.</p>';
    return;
  }
  list.innerHTML = topics.map((topic) => `
    <a class="forum-topic-card-link" href="forum_topic.html?topicId=${encodeURIComponent(topic.id)}">
      <div class="topic-forum-title">${forumEscapeHtml(topic.forumTitle)}</div>
      <div class="forum-topic-card-head">
        <div>
          <h3>${forumEscapeHtml(topic.title)}</h3>
          <p class="forum-topic-card-excerpt">${forumEscapeHtml(topic.excerpt)}</p>
        </div>
        <div class="forum-topic-stats">${renderTopicMetrics(topic)}</div>
      </div>
      <div class="forum-topic-card-meta">
        <span>РђРІС‚РѕСЂ: ${forumEscapeHtml(topic.username)}</span>
        <span>РЎРѕР·РґР°РЅРѕ: ${forumFormatDate(topic.createdAt)}</span>
        <span>РђРєС‚РёРІРЅРѕСЃС‚СЊ: ${forumFormatDate(topic.lastActivityAt)}</span>
      </div>
    </a>
  `).join('');
}

function renderPopularTopics(topics) {
  const list = document.getElementById('popular-topics-list');
  const count = document.getElementById('popular-topics-count');
  if (!list || !count) return;
  count.textContent = `${topics.length} С‚РµРј`;
  if (!topics.length) {
    list.innerHTML = '<p class="forum-empty-state">РџРѕРїСѓР»СЏСЂРЅС‹Рµ С‚РµРјС‹ РїРѕРєР° РЅРµ РїРѕСЏРІРёР»РёСЃСЊ.</p>';
    return;
  }
  list.innerHTML = topics.map((topic) => `
    <a class="forum-topic-card-link" href="forum_topic.html?topicId=${encodeURIComponent(topic.id)}">
      <div class="topic-forum-title">${forumEscapeHtml(topic.forumTitle)}</div>
      <div class="forum-topic-card-head">
        <h3>${forumEscapeHtml(topic.title)}</h3>
        <div class="forum-topic-stats">${renderTopicMetrics(topic)}</div>
      </div>
    </a>
  `).join('');
}

function renderGuideTopics(topics) {
  const list = document.getElementById('guides-topics-list');
  const count = document.getElementById('guides-topics-count');
  if (!list || !count) return;
  count.textContent = `${topics.length} С‚РµРј`;
  if (!topics.length) {
    list.innerHTML = '<p class="forum-empty-state">Р’ СЂР°Р·РґРµР»Рµ СЂСѓРєРѕРІРѕРґСЃС‚РІ РїРѕРєР° РЅРµС‚ С‚РµРј.</p>';
    return;
  }
  list.innerHTML = topics.map((topic) => `
    <a class="forum-topic-card-link" href="forum_topic.html?topicId=${encodeURIComponent(topic.id)}">
      <div class="topic-forum-title">${forumEscapeHtml(topic.forumTitle)}</div>
      <div class="forum-topic-card-head">
        <h3>${forumEscapeHtml(topic.title)}</h3>
        <div class="forum-topic-stats">${renderTopicMetrics(topic)}</div>
      </div>
      <p class="forum-topic-card-excerpt">${forumEscapeHtml(topic.excerpt)}</p>
    </a>
  `).join('');
}

function renderForumForums(forums) {
  const list = document.getElementById('forum-forums-list');
  const total = document.getElementById('forum-forums-total');
  if (!list || !total) return;
  total.textContent = `${forums.length} С„РѕСЂСѓРј`;
  if (!forums.length) {
    list.innerHTML = '<p class="forum-empty-state">Р¤РѕСЂСѓРјС‹ РЅРµ РЅР°Р№РґРµРЅС‹.</p>';
    return;
  }
  list.innerHTML = forums.map((forum) => `
    <a class="forum-forum-card" href="forum.html?forumSlug=${encodeURIComponent(forum.slug)}">
      <span class="forum-forum-card-label">Р¤РѕСЂСѓРј</span>
      <strong>${forumEscapeHtml(forum.title)}</strong>
      <span class="forum-forum-card-meta">РџРµСЂРµР№С‚Рё Рє РѕР±СЃСѓР¶РґРµРЅРёСЏРј, РІРѕРїСЂРѕСЃР°Рј Рё РіР°Р№РґР°Рј</span>
    </a>
  `).join('');
}

function renderTopicDetails(topic, currentUserId) {
  const card = document.getElementById('forum-topic-card');
  const backLink = document.getElementById('forum-back-to-forum');
  if (!card || !backLink) return;

  document.title = `${topic.title} | Project Forum`;
  backLink.href = `forum.html?forumSlug=${encodeURIComponent(topic.forumSlug)}&categoryId=${encodeURIComponent(topic.categoryId)}`;
  const currentUser = forumCurrentUser();
  const isOwner = Number(currentUserId) === Number(topic.userId);
  const canDelete = isOwner || Boolean(currentUser?.admin);

  card.innerHTML = `
    <div class="forum-topic-header">
      <div class="forum-topic-heading">
        <p class="forum-eyebrow">${forumEscapeHtml(String(topic.categoryName || 'РўРµРјР° С„РѕСЂСѓРјР°').toUpperCase())}</p>
        <h1 class="forum-topic-page-title">${forumEscapeHtml(topic.title)}</h1>
        <p class="forum-subtitle">${forumEscapeHtml(topic.forumTitle)}</p>
      </div>
      <div class="forum-topic-header-actions">
        ${canDelete ? `
          <div class="forum-comment-menu">
            <button type="button" class="forum-icon-btn forum-comment-menu-trigger" data-topic-menu="${topic.id}" aria-expanded="false">...</button>
            <div class="forum-comment-menu-dropdown" data-topic-menu-dropdown="${topic.id}" hidden>
              ${isOwner ? `<button type="button" class="forum-comment-menu-item" data-topic-edit="${topic.id}">Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ</button>` : ''}
              <button type="button" class="forum-comment-menu-item" data-topic-delete="${topic.id}">РЈРґР°Р»РёС‚СЊ</button>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
    <div class="forum-topic-main-head">
      <div class="forum-author-block">
        <a class="forum-avatar-link" href="${forumProfileUrl(topic.userId)}">
          <img class="forum-avatar" src="${topic.avatarUrl || DEFAULT_AVATAR}" alt="${forumEscapeHtml(topic.username)}" />
        </a>
        <div>
          <a class="forum-user-link" href="${forumProfileUrl(topic.userId)}"><strong>${forumEscapeHtml(topic.username)}</strong></a>
          <div class="forum-topic-main-meta">РђРІС‚РѕСЂ С‚РµРјС‹</div>
        </div>
      </div>
      <div class="forum-topic-stats">
        <div>РЎРѕР·РґР°РЅРѕ: ${forumFormatDate(topic.createdAt)}</div>
        <div>РџРѕСЃР»РµРґРЅСЏСЏ Р°РєС‚РёРІРЅРѕСЃС‚СЊ: ${forumFormatDate(topic.lastActivityAt)}</div>
      </div>
    </div>
    <div class="forum-topic-main-body">
      <p class="forum-topic-main-content">${forumEscapeHtml(topic.content)}</p>
      ${renderAttachment(topic.attachmentUrl, topic.attachmentType)}
    </div>
    <div class="forum-topic-main-footer forum-topic-icon-footer">
      <button type="button" class="forum-comment-icon-action ${topic.likedByCurrentUser ? 'active' : ''}" id="forum-topic-like-btn" aria-label="Р›Р°Р№Рє">+ <span id="forum-topic-like-count">${Number(topic.likesCount || 0)}</span></button>
      <button type="button" class="forum-comment-icon-action" id="forum-topic-comment-action" aria-label="РљРѕРјРјРµРЅС‚Р°СЂРёР№">рџ’¬ <span>${Number(topic.commentsCount || 0)}</span></button>
      <div class="forum-viewers-wrap">
        <button type="button" class="forum-comment-icon-action" id="forum-topic-viewers-btn" aria-expanded="false" aria-label="РџСЂРѕСЃРјРѕС‚СЂС‹">рџ‘Ѓ <span>${Number(topic.viewsCount || 0)}</span></button>
        <div class="forum-viewers-menu" id="forum-topic-viewers-menu" hidden></div>
      </div>
    </div>
  `;
}

function buildCommentTree(comments, sortMode) {
  const byId = new Map();
  const roots = [];
  comments.forEach((comment) => byId.set(comment.id, { ...comment, children: [] }));
  byId.forEach((comment) => {
    if (comment.parentCommentId && byId.has(comment.parentCommentId)) {
      byId.get(comment.parentCommentId).children.push(comment);
    } else {
      roots.push(comment);
    }
  });

  function hasPinnedDescendant(node) {
    return node.pinned || node.children.some(hasPinnedDescendant);
  }

  function sortNodes(nodes) {
    nodes.forEach((node) => sortNodes(node.children));
    nodes.sort((a, b) => {
      const aPinnedTree = hasPinnedDescendant(a);
      const bPinnedTree = hasPinnedDescendant(b);
      if (aPinnedTree !== bPinnedTree) return aPinnedTree ? -1 : 1;
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortMode === 'likes') {
        if (Number(a.likesCount || 0) !== Number(b.likesCount || 0)) return Number(b.likesCount || 0) - Number(a.likesCount || 0);
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  sortNodes(roots);
  return roots;
}

function commentHasPinnedInTree(comment) {
  return Boolean(comment.pinned || (comment.children || []).some(commentHasPinnedInTree));
}

function renderPinnedBranchPreview(comment, topicAuthorId, depth = 0) {
  const pinnedChildren = (comment.children || []).filter(commentHasPinnedInTree);
  const authorBadge = comment.authorComment
    ? '<span class="forum-author-badge-label">РђРІС‚РѕСЂ</span>'
    : '';
  return `
    <article class="forum-comment-item forum-pinned-preview-item ${comment.pinned ? 'is-pinned' : ''}" data-comment-depth="${depth}">
      <div class="forum-comment-head">
        <div class="forum-author-block">
          <a class="forum-avatar-link" href="${forumProfileUrl(comment.userId)}">
            <img class="forum-avatar" src="${comment.avatarUrl || DEFAULT_AVATAR}" alt="${forumEscapeHtml(comment.username)}" />
          </a>
          <div>
            <div class="forum-author-name-row">
              <a class="forum-user-link" href="${forumProfileUrl(comment.userId)}"><strong>${forumEscapeHtml(comment.username)}</strong></a>
              ${authorBadge}
            </div>
            <div class="forum-comment-date">${forumFormatDate(comment.createdAt)}${comment.edited ? ' вЂў РёР·РјРµРЅРµРЅРѕ' : ''}</div>
          </div>
        </div>
        <div class="forum-comment-head-actions">
          ${comment.pinned ? '<span class="forum-pinned-badge">Р—Р°РєСЂРµРїР»РµРЅРѕ</span>' : ''}
        </div>
      </div>
      <p class="forum-comment-content">${forumEscapeHtml(comment.content)}</p>
      ${renderAttachment(comment.attachmentUrl, comment.attachmentType)}
      ${pinnedChildren.length ? `
        <div class="forum-replies forum-pinned-preview-replies">
          ${pinnedChildren.map((child) => renderPinnedBranchPreview(child, topicAuthorId, depth + 1)).join('')}
        </div>
      ` : ''}
    </article>
  `;
}

function renderSingleComment(comment, topicAuthorId, currentUserId, depth = 0) {
  const authorBadge = comment.authorComment
    ? '<span class="forum-author-badge-label">РђРІС‚РѕСЂ</span>'
    : '';
  const commentDate = forumFormatDate(comment.createdAt);
  const currentUser = forumCurrentUser();
  const isOwner = Number(currentUserId) === Number(comment.userId);
  const canDelete = isOwner || Boolean(currentUser?.admin);
  const pinIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" class="forum-pin-icon ${comment.pinned ? 'is-pinned' : ''}">
      <path d="M15 3.5L20.5 9l-3 1.5v4.2l1.8 1.8v1h-6.3V22h-1v-4.5H5.7v-1l1.8-1.8v-4.2L4.5 9 10 3.5z"></path>
    </svg>
  `;
  const visibleChildren = comment.children || [];
  const pinnedPreviewChildren = visibleChildren.filter(commentHasPinnedInTree);
  const hiddenCount = visibleChildren.filter((reply, index) => index >= MAX_VISIBLE_REPLIES && !commentHasPinnedInTree(reply)).length;
  const repliesCount = visibleChildren.length;
  const childMarkup = visibleChildren.length ? `
    <button type="button" class="forum-text-action forum-branch-toggle" data-branch-toggle="${comment.id}" data-branch-count="${repliesCount}" aria-expanded="false">
      Р Р°СЃРєСЂС‹С‚СЊ РІРµС‚РєСѓ (${repliesCount})
    </button>
    ${pinnedPreviewChildren.length ? `
      <div class="forum-pinned-branch-preview" data-pinned-preview-for="${comment.id}">
        ${pinnedPreviewChildren.map((child) => renderPinnedBranchPreview(child, topicAuthorId, depth + 1)).join('')}
      </div>
    ` : ''}
    <div class="forum-replies" data-replies-for="${comment.id}" hidden>
      ${visibleChildren.map((reply, index) => `
        <div class="forum-reply-item ${index >= MAX_VISIBLE_REPLIES && !commentHasPinnedInTree(reply) ? 'is-hidden-reply' : ''}" data-reply-index="${index}">
          ${renderSingleComment(reply, topicAuthorId, currentUserId, depth + 1)}
        </div>
      `).join('')}
      ${hiddenCount > 0 ? `<button type="button" class="forum-text-action forum-replies-toggle" data-replies-toggle="${comment.id}" aria-expanded="false">РџРѕРєР°Р·Р°С‚СЊ РµС‰С‘ ${hiddenCount}</button>` : ''}
    </div>
  ` : '';

  return `
    <article class="forum-comment-item ${comment.pinned ? 'is-pinned' : ''}" data-comment-id="${comment.id}" data-comment-depth="${depth}">
      <div class="forum-comment-head">
        <div class="forum-author-block">
          <a class="forum-avatar-link" href="${forumProfileUrl(comment.userId)}">
            <img class="forum-avatar" src="${comment.avatarUrl || DEFAULT_AVATAR}" alt="${forumEscapeHtml(comment.username)}" />
          </a>
          <div>
            <div class="forum-author-name-row">
              <a class="forum-user-link" href="${forumProfileUrl(comment.userId)}"><strong>${forumEscapeHtml(comment.username)}</strong></a>
              ${authorBadge}
            </div>
            <div class="forum-comment-date">${commentDate}${comment.edited ? ' вЂў РёР·РјРµРЅРµРЅРѕ' : ''}</div>
          </div>
        </div>
        <div class="forum-comment-head-actions">
          ${comment.pinned ? '<span class="forum-pinned-badge">Р—Р°РєСЂРµРїР»РµРЅРѕ</span>' : ''}
          ${canDelete ? `
            <div class="forum-comment-menu">
              <button type="button" class="forum-icon-btn forum-comment-menu-trigger" data-comment-menu="${comment.id}" aria-expanded="false">...</button>
              <div class="forum-comment-menu-dropdown" data-comment-menu-dropdown="${comment.id}" hidden>
                ${isOwner ? `<button type="button" class="forum-comment-menu-item" data-comment-edit="${comment.id}">Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ</button>` : ''}
                <button type="button" class="forum-comment-menu-item" data-comment-delete="${comment.id}">РЈРґР°Р»РёС‚СЊ</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      <p class="forum-comment-content">${forumEscapeHtml(comment.content)}</p>
      ${renderAttachment(comment.attachmentUrl, comment.attachmentType)}
      <div class="forum-comment-footer">
        <button type="button" class="forum-comment-icon-action ${comment.likedByCurrentUser ? 'active' : ''}" data-comment-like="${comment.id}" aria-label="Р›Р°Р№Рє">+ <span>${Number(comment.likesCount || 0)}</span></button>
        <button type="button" class="forum-comment-icon-action" data-comment-reply="${comment.id}" data-comment-username="${forumEscapeHtml(comment.username)}" aria-label="РћС‚РІРµС‚РёС‚СЊ">в†©</button>
        ${Number(currentUserId) === Number(topicAuthorId) ? `<button type="button" class="forum-comment-icon-action ${comment.pinned ? 'active' : ''}" data-comment-pin="${comment.id}" aria-label="${comment.pinned ? 'РћС‚РєСЂРµРїРёС‚СЊ' : 'Р—Р°РєСЂРµРїРёС‚СЊ'}">${pinIcon}</button>` : ''}
      </div>
      ${childMarkup}
    </article>
  `;
}

function renderForumComments(comments, topicAuthorId, currentUserId) {
  const list = document.getElementById('forum-comment-list');
  const total = document.getElementById('forum-comments-total');
  if (!list || !total) return;
  total.textContent = `${comments.length} РєРѕРјРјРµРЅС‚Р°СЂРёРµРІ`;
  if (!comments.length) {
    list.innerHTML = '<p class="forum-empty-state">РџРѕРєР° РЅРµС‚ РєРѕРјРјРµРЅС‚Р°СЂРёРµРІ. РќР°С‡РЅРёС‚Рµ РѕР±СЃСѓР¶РґРµРЅРёРµ РїРµСЂРІС‹Рј.</p>';
    return;
  }
  const sortMode = document.getElementById('forum-comment-sort')?.value || 'newest';
  const tree = buildCommentTree(comments, sortMode);
  list.innerHTML = tree.map((comment) => renderSingleComment(comment, topicAuthorId, currentUserId)).join('');
}

function openTopicModal() {
  const modal = document.getElementById('forum-topic-modal');
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeTopicModal() {
  const modal = document.getElementById('forum-topic-modal');
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove('modal-open');
}

async function initForumPage() {
  if (!isCurrentPage('forum.html')) return;
  const params = new URLSearchParams(window.location.search);
  const forumId = params.get('forumId');
  const forumSlug = params.get('forumSlug');
  const currentUser = forumCurrentUser();
  const authNotice = document.getElementById('forum-auth-notice');
  document.getElementById('forum-topic-modal-close')?.addEventListener('click', closeTopicModal);
  document.querySelector('.forum-modal-backdrop')?.addEventListener('click', closeTopicModal);

  if (!forumSlug && !forumId) {
    const title = document.getElementById('forum-forum-title');
    const sectionTitle = document.getElementById('forum-section-title');
    const currentFilter = document.getElementById('forum-current-filter');
    const total = document.getElementById('forum-topic-total');
    const sidebar = document.getElementById('forum-category-list');
    const list = document.getElementById('forum-topic-list');
    const newTopicButton = document.getElementById('new-topic-btn');
    if (title) title.textContent = 'Р’С‹Р±РµСЂРёС‚Рµ С„РѕСЂСѓРј';
    if (sectionTitle) sectionTitle.textContent = 'РЎРїРёСЃРѕРє С„РѕСЂСѓРјРѕРІ';
    if (currentFilter) currentFilter.textContent = 'Р’СЃРµ С„РѕСЂСѓРјС‹';
    if (total) total.textContent = '0 С„РѕСЂСѓРјРѕРІ';
    if (sidebar) sidebar.innerHTML = '<p class="forum-empty-state">Р’С‹Р±РµСЂРёС‚Рµ С„РѕСЂСѓРјС‹ РёР· СЃРїРёСЃРєР° СЃРїСЂР°РІР°.</p>';
    if (newTopicButton) newTopicButton.hidden = true;
    if (authNotice) authNotice.hidden = true;
    try {
      const forums = await forumFetchJson(`${FORUM_API_BASE}/forums`);
      if (total) total.textContent = `${forums.length} С„РѕСЂСѓРј`;
      if (list) {
        list.innerHTML = forums.map((forum) => `
          <a class="forum-topic-card-link" href="forum.html?forumSlug=${encodeURIComponent(forum.slug)}">
            <div class="topic-forum-title">Р¤РѕСЂСѓРјС‹</div>
            <div class="forum-topic-card-head"><h3>${forumEscapeHtml(forum.title)}</h3></div>
            <p class="forum-topic-card-excerpt">РћС‚РєСЂС‹С‚СЊ РѕР±СЃСѓР¶РґРµРЅРёСЏ, РІРѕРїСЂРѕСЃС‹ РїРѕ ${forumEscapeHtml(forum.title)}.</p>
          </a>
        `).join('');
      }
    } catch (error) {
      if (list) list.innerHTML = `<p class="forum-empty-state">${forumEscapeHtml(error.message)}</p>`;
    }
    return;
  }

  if (!currentUser && authNotice) authNotice.hidden = false;

  try {
    const forum = forumSlug
      ? await forumFetchJson(`${FORUM_API_BASE}/forums/slug/${encodeURIComponent(forumSlug)}`)
      : await forumFetchJson(`${FORUM_API_BASE}/forums/${encodeURIComponent(forumId)}`);
    const title = document.getElementById('forum-forum-title');
    const backLink = document.getElementById('forum-back-to-forum');
    const categorySelect = document.getElementById('topic-category');
    const sectionTitle = document.getElementById('forum-section-title');
    const currentFilter = document.getElementById('forum-current-filter');
    const categoryList = document.getElementById('forum-category-list');
    const newTopicButton = document.getElementById('new-topic-btn');
    const topicForm = document.getElementById('forum-topic-form');
    const topicStatus = document.getElementById('forum-topic-status');
    let activeCategoryId = params.get('categoryId');

    document.title = `${forum.title} | Project Forum`;
    if (title) title.textContent = `${forum.title}: С„РѕСЂСѓРј`;
    if (backLink) backLink.href = 'forums.html';
    const categories = await forumFetchJson(`${FORUM_API_BASE}/forums/${forum.id}/categories`);
    if (categorySelect) {
      categorySelect.innerHTML = categories.map((category) => `
        <option value="${category.id}">${forumEscapeHtml(category.name)}</option>
      `).join('');
    }

    async function loadTopics() {
      const query = activeCategoryId ? `?categoryId=${encodeURIComponent(activeCategoryId)}` : '';
      const topics = await forumFetchJson(`${FORUM_API_BASE}/forums/${forum.id}/topics${query}`);
      renderForumCategories(categories, activeCategoryId);
      renderForumTopics(topics);
      const activeCategory = categories.find((category) => Number(category.id) === Number(activeCategoryId));
      if (currentFilter) currentFilter.textContent = activeCategory ? activeCategory.name : 'Р’СЃРµ РєР°С‚РµРіРѕСЂРёРё';
      if (sectionTitle) sectionTitle.textContent = activeCategory ? activeCategory.name : 'РџРѕСЃР»РµРґРЅРёРµ РѕР±СЃСѓР¶РґРµРЅРёСЏ';
    }

    await loadTopics();
    categoryList?.addEventListener('click', async (event) => {
      const button = event.target.closest('.forum-category-item');
      if (!button) return;
      activeCategoryId = button.dataset.categoryId || '';
      const nextUrl = new URL(window.location.href);
      if (activeCategoryId) nextUrl.searchParams.set('categoryId', activeCategoryId);
      else nextUrl.searchParams.delete('categoryId');
      window.history.replaceState({}, '', nextUrl);
      await loadTopics();
    });

    newTopicButton?.addEventListener('click', () => {
      if (!currentUser) {
        authNotice.hidden = false;
        return;
      }
      if (activeCategoryId && categorySelect) categorySelect.value = activeCategoryId;
      openTopicModal();
    });

    topicForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        forumId: forum.id,
        categoryId: Number(categorySelect?.value),
        title: document.getElementById('topic-title')?.value.trim(),
        content: document.getElementById('topic-content')?.value.trim()
      };
      if (!payload.title || !payload.content) {
        if (topicStatus) topicStatus.textContent = 'Р—Р°РїРѕР»РЅРёС‚Рµ Р·Р°РіРѕР»РѕРІРѕРє Рё РѕРїРёСЃР°РЅРёРµ С‚РµРјС‹.';
        return;
      }
      try {
        if (topicStatus) topicStatus.textContent = 'РџСѓР±Р»РёРєР°С†РёСЏ С‚РµРјС‹...';
        Object.assign(payload, await readAttachmentInput(document.getElementById('topic-attachment')));
        const createdTopic = await forumFetchJson(`${FORUM_API_BASE}/topics`, { method: 'POST', body: JSON.stringify(payload) });
        window.location.href = `forum_topic.html?topicId=${encodeURIComponent(createdTopic.id)}`;
      } catch (error) {
        if (topicStatus) topicStatus.textContent = error.message;
      }
    });
  } catch (error) {
    const list = document.getElementById('forum-topic-list');
    const title = document.getElementById('forum-forum-title');
    if (title) title.textContent = 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ С„РѕСЂСѓРј';
    if (list) list.innerHTML = `<p class="forum-empty-state">${forumEscapeHtml(error.message)}</p>`;
  }
}

async function initForumTopicPage() {
  if (!isCurrentPage('forum_topic.html')) return;
  const params = new URLSearchParams(window.location.search);
  const topicId = params.get('topicId');
  const currentUser = forumCurrentUser();
  const authNotice = document.getElementById('forum-comment-auth-notice');
  const form = document.getElementById('forum-comment-form');
  const commentToggle = document.getElementById('forum-comment-toggle-btn');
  const commentInput = document.getElementById('forum-comment-content');
  const status = document.getElementById('forum-comment-status');
  const sortSelect = document.getElementById('forum-comment-sort');
  const parentCommentInput = document.getElementById('forum-comment-parent-id');
  const replyTarget = document.getElementById('forum-reply-target');
  const cancelReplyButton = document.getElementById('forum-comment-cancel-reply');
  const topicCard = document.getElementById('forum-topic-card');
  if (!topicId) {
    const list = document.getElementById('forum-comment-list');
    if (list) list.innerHTML = '<p class="forum-empty-state">РќРµ РїРµСЂРµРґР°РЅ id С‚РµРјС‹.</p>';
    return;
  }

  let currentTopic = null;
  let editingCommentId = null;

  function closeAllCommentMenus() {
    document.querySelectorAll('[data-comment-menu-dropdown], [data-topic-menu-dropdown]').forEach((dropdown) => {
      dropdown.hidden = true;
    });
    document.querySelectorAll('[data-comment-menu], [data-topic-menu]').forEach((trigger) => {
      trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function resetReplyState() {
    editingCommentId = null;
    if (parentCommentInput) parentCommentInput.value = '';
    if (replyTarget) {
      replyTarget.hidden = true;
      replyTarget.textContent = '';
    }
    if (cancelReplyButton) cancelReplyButton.hidden = true;
    const submit = form?.querySelector('button[type="submit"]');
    if (submit) submit.textContent = 'РћС‚РїСЂР°РІРёС‚СЊ РєРѕРјРјРµРЅС‚Р°СЂРёР№';
  }

  async function loadTopicPage() {
    const sort = sortSelect?.value || 'newest';
    const expandedBranchIds = Array.from(document.querySelectorAll('[data-branch-toggle][aria-expanded="true"]'))
      .map((button) => button.dataset.branchToggle);
    const expandedReplyIds = Array.from(document.querySelectorAll('[data-replies-toggle][aria-expanded="true"]'))
      .map((button) => button.dataset.repliesToggle);
    const [topic, comments] = await Promise.all([
      forumFetchJson(`${FORUM_API_BASE}/topics/${topicId}`),
      forumFetchJson(`${FORUM_API_BASE}/topics/${topicId}/comments?sort=${encodeURIComponent(sort)}`)
    ]);
    currentTopic = topic;
    renderTopicDetails(topic, currentUser?.id);
    renderForumComments(comments, topic.userId, currentUser?.id);
    restoreExpandedCommentBranches(expandedBranchIds, expandedReplyIds);
  }

  function restoreExpandedCommentBranches(branchIds, replyIds) {
    branchIds.forEach((parentId) => {
      const branchToggle = document.querySelector(`[data-branch-toggle="${parentId}"]`);
      const container = document.querySelector(`[data-replies-for="${parentId}"]`);
      const preview = document.querySelector(`[data-pinned-preview-for="${parentId}"]`);
      if (!branchToggle || !container) return;
      container.hidden = false;
      if (preview) preview.hidden = true;
      branchToggle.setAttribute('aria-expanded', 'true');
      branchToggle.textContent = 'РЎРєСЂС‹С‚СЊ РІРµС‚РєСѓ';
    });
    replyIds.forEach((parentId) => {
      const repliesToggle = document.querySelector(`[data-replies-toggle="${parentId}"]`);
      const container = document.querySelector(`[data-replies-for="${parentId}"]`);
      const hiddenReplies = container?.querySelectorAll('.is-hidden-reply') || [];
      if (!repliesToggle) return;
      hiddenReplies.forEach((item) => item.classList.add('reply-expanded'));
      repliesToggle.setAttribute('aria-expanded', 'true');
      repliesToggle.textContent = 'РЎРІРµСЂРЅСѓС‚СЊ';
    });
  }

  if (!currentUser && authNotice) {
    authNotice.hidden = false;
    if (status) status.textContent = 'РђРІС‚РѕСЂРёР·СѓР№С‚РµСЃСЊ, С‡С‚РѕР±С‹ РїРёСЃР°С‚СЊ РєРѕРјРјРµРЅС‚Р°СЂРёРё Рё СЃС‚Р°РІРёС‚СЊ Р»Р°Р№РєРё.';
  }

  commentToggle?.addEventListener('click', () => {
    if (!form) return;
    const willOpen = form.hidden;
    form.hidden = !willOpen;
    commentToggle.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) commentInput?.focus();
  });

  cancelReplyButton?.addEventListener('click', () => {
    resetReplyState();
    if (form) form.hidden = true;
  });

  sortSelect?.addEventListener('change', loadTopicPage);

  try {
    await loadTopicPage();
  } catch (error) {
    const list = document.getElementById('forum-comment-list');
    if (list) list.innerHTML = `<p class="forum-empty-state">${forumEscapeHtml(error.message)}</p>`;
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.forum-comment-menu') && !event.target.closest('[data-topic-menu]')) {
      closeAllCommentMenus();
    }
  });

  topicCard?.addEventListener('click', async (event) => {
    const topicMenuTrigger = event.target.closest('[data-topic-menu]');
    const topicEditButton = event.target.closest('[data-topic-edit]');
    const topicDeleteButton = event.target.closest('[data-topic-delete]');
    const topicLikeButton = event.target.closest('#forum-topic-like-btn');
    const topicCommentButton = event.target.closest('#forum-topic-comment-action');
    const topicViewersButton = event.target.closest('#forum-topic-viewers-btn');
    if (topicMenuTrigger && currentTopic) {
      const dropdown = document.querySelector(`[data-topic-menu-dropdown="${currentTopic.id}"]`);
      const willOpen = dropdown?.hidden;
      closeAllCommentMenus();
      if (dropdown) {
        dropdown.hidden = !willOpen;
        topicMenuTrigger.setAttribute('aria-expanded', String(Boolean(willOpen)));
      }
      return;
    }
    if (topicLikeButton) {
      if (!currentUser?.id) {
        if (authNotice) authNotice.hidden = false;
        if (status) status.textContent = 'РђРІС‚РѕСЂРёР·СѓР№С‚РµСЃСЊ, С‡С‚РѕР±С‹ РїРѕСЃС‚Р°РІРёС‚СЊ Р»Р°Р№Рє.';
        return;
      }
      try {
        await forumFetchJson(`${FORUM_API_BASE}/topics/${topicId}/like`, { method: 'POST' });
        await loadTopicPage();
      } catch (error) {
        if (status) status.textContent = error.message;
      }
      return;
    }
    if (topicCommentButton) {
      if (!currentUser?.id) {
        if (authNotice) authNotice.hidden = false;
        if (status) status.textContent = 'РђРІС‚РѕСЂРёР·СѓР№С‚РµСЃСЊ, С‡С‚РѕР±С‹ РЅР°РїРёСЃР°С‚СЊ РєРѕРјРјРµРЅС‚Р°СЂРёР№.';
        return;
      }
      if (form && !form.hidden && !editingCommentId && !parentCommentInput?.value) {
        form.hidden = true;
        commentToggle?.setAttribute('aria-expanded', 'false');
        if (commentInput) commentInput.value = '';
        resetReplyState();
        return;
      }
      resetReplyState();
      if (form) form.hidden = false;
      commentToggle?.setAttribute('aria-expanded', 'true');
      commentInput?.focus();
      form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (topicViewersButton) {
      const menu = document.getElementById('forum-topic-viewers-menu');
      if (!menu) return;
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      topicViewersButton.setAttribute('aria-expanded', String(willOpen));
      if (willOpen && !menu.dataset.loaded) {
        menu.innerHTML = '<p>Р—Р°РіСЂСѓР·РєР°...</p>';
        try {
          const viewers = await forumFetchJson(`${FORUM_API_BASE}/topics/${topicId}/viewers`);
          menu.dataset.loaded = 'true';
          menu.innerHTML = viewers.length
            ? viewers.map((viewer) => `
              <a href="${forumProfileUrl(viewer.id)}">
                <img src="${viewer.avatarUrl || DEFAULT_AVATAR}" alt="${forumEscapeHtml(viewer.username || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ')}" />
                <span>${forumEscapeHtml(viewer.username || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ')}</span>
              </a>
            `).join('')
            : '<p>РџРѕРєР° РЅРµС‚ РїСЂРѕСЃРјРѕС‚СЂРѕРІ.</p>';
        } catch (error) {
          menu.innerHTML = `<p>${forumEscapeHtml(error.message)}</p>`;
        }
      }
      return;
    }
    if (topicEditButton && currentTopic) {
      const nextTitle = window.prompt('РќРѕРІС‹Р№ Р·Р°РіРѕР»РѕРІРѕРє С‚РµРјС‹:', currentTopic.title);
      if (nextTitle === null) return;
      const nextContent = window.prompt('РќРѕРІС‹Р№ С‚РµРєСЃС‚ С‚РµРјС‹:', currentTopic.content);
      if (nextContent === null) return;
      try {
        await forumFetchJson(`${FORUM_API_BASE}/topics/${topicId}`, {
          method: 'PUT',
          body: JSON.stringify({ forumId: currentTopic.forumId, categoryId: currentTopic.categoryId, title: nextTitle, content: nextContent })
        });
        closeAllCommentMenus();
        await loadTopicPage();
      } catch (error) {
        if (status) status.textContent = error.message;
      }
      return;
    }
    if (topicDeleteButton && currentTopic) {
      if (!window.confirm('РЈРґР°Р»РёС‚СЊ СЌС‚Сѓ С‚РµРјСѓ?')) return;
      try {
        await forumFetchJson(`${FORUM_API_BASE}/topics/${topicId}`, { method: 'DELETE' });
        window.location.href = `forum.html?forumSlug=${encodeURIComponent(currentTopic.forumSlug)}&categoryId=${encodeURIComponent(currentTopic.categoryId)}`;
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    }
  });

  document.getElementById('forum-comment-list')?.addEventListener('click', async (event) => {
    const menuTrigger = event.target.closest('[data-comment-menu]');
    const replyButton = event.target.closest('[data-comment-reply]');
    const likeCommentButton = event.target.closest('[data-comment-like]');
    const pinButton = event.target.closest('[data-comment-pin]');
    const branchToggle = event.target.closest('[data-branch-toggle]');
    const repliesToggle = event.target.closest('[data-replies-toggle]');
    const editButton = event.target.closest('[data-comment-edit]');
    const deleteButton = event.target.closest('[data-comment-delete]');

    if (menuTrigger) {
      const commentId = menuTrigger.dataset.commentMenu;
      const dropdown = document.querySelector(`[data-comment-menu-dropdown="${commentId}"]`);
      const willOpen = dropdown?.hidden;
      closeAllCommentMenus();
      if (dropdown) {
        dropdown.hidden = !willOpen;
        menuTrigger.setAttribute('aria-expanded', String(Boolean(willOpen)));
      }
      return;
    }

    if (pinButton) {
      event.preventDefault();
      event.stopPropagation();
      try {
        await forumFetchJson(`${FORUM_API_BASE}/comments/${pinButton.dataset.commentPin}/pin`, { method: 'POST' });
        await loadTopicPage();
      } catch (error) {
        if (status) status.textContent = error.message;
      }
      return;
    }

    if (branchToggle) {
      const parentId = branchToggle.dataset.branchToggle;
      const container = document.querySelector(`[data-replies-for="${parentId}"]`);
      const preview = document.querySelector(`[data-pinned-preview-for="${parentId}"]`);
      if (!container) return;
      const expanded = branchToggle.getAttribute('aria-expanded') === 'true';
      container.hidden = expanded;
      if (preview) preview.hidden = !expanded;
      branchToggle.setAttribute('aria-expanded', String(!expanded));
      const repliesCount = Number(branchToggle.dataset.branchCount || 0);
      branchToggle.textContent = expanded ? `Р Р°СЃРєСЂС‹С‚СЊ РІРµС‚РєСѓ (${repliesCount})` : 'РЎРєСЂС‹С‚СЊ РІРµС‚РєСѓ';
      return;
    }

    if (repliesToggle) {
      const parentId = repliesToggle.dataset.repliesToggle;
      const container = document.querySelector(`[data-replies-for="${parentId}"]`);
      const hiddenReplies = container?.querySelectorAll('.is-hidden-reply') || [];
      const expanded = repliesToggle.getAttribute('aria-expanded') === 'true';
      hiddenReplies.forEach((item) => item.classList.toggle('reply-expanded', !expanded));
      repliesToggle.setAttribute('aria-expanded', String(!expanded));
      repliesToggle.textContent = expanded ? `РџРѕРєР°Р·Р°С‚СЊ РµС‰С‘ ${hiddenReplies.length}` : 'РЎРІРµСЂРЅСѓС‚СЊ';
      return;
    }

    if (replyButton) {
      if (!currentUser?.id) {
        if (authNotice) authNotice.hidden = false;
        if (status) status.textContent = 'РђРІС‚РѕСЂРёР·СѓР№С‚РµСЃСЊ, С‡С‚РѕР±С‹ РѕС‚РІРµС‚РёС‚СЊ РЅР° РєРѕРјРјРµРЅС‚Р°СЂРёР№.';
        return;
      }
      resetReplyState();
      if (parentCommentInput) parentCommentInput.value = replyButton.dataset.commentReply;
      if (replyTarget) {
        replyTarget.hidden = false;
        replyTarget.textContent = `РћС‚РІРµС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»СЋ ${replyButton.dataset.commentUsername}`;
      }
      if (cancelReplyButton) cancelReplyButton.hidden = false;
      if (form) form.hidden = false;
      commentToggle?.setAttribute('aria-expanded', 'true');
      commentInput?.focus();
      return;
    }

    if (likeCommentButton) {
      if (!currentUser?.id) {
        if (authNotice) authNotice.hidden = false;
        if (status) status.textContent = 'РђРІС‚РѕСЂРёР·СѓР№С‚РµСЃСЊ, С‡С‚РѕР±С‹ РїРѕСЃС‚Р°РІРёС‚СЊ Р»Р°Р№Рє.';
        return;
      }
      try {
        await forumFetchJson(`${FORUM_API_BASE}/comments/${likeCommentButton.dataset.commentLike}/like`, { method: 'POST' });
        await loadTopicPage();
      } catch (error) {
        if (status) status.textContent = error.message;
      }
      return;
    }

    if (editButton) {
      const article = editButton.closest('[data-comment-id]');
      const contentNode = article?.querySelector('.forum-comment-content');
      if (contentNode && commentInput) {
        editingCommentId = editButton.dataset.commentEdit;
        commentInput.value = contentNode.textContent.trim();
        if (replyTarget) {
          replyTarget.hidden = false;
          replyTarget.textContent = 'Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ РєРѕРјРјРµРЅС‚Р°СЂРёСЏ';
        }
        if (cancelReplyButton) cancelReplyButton.hidden = false;
        const submit = form?.querySelector('button[type="submit"]');
        if (submit) submit.textContent = 'РЎРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ';
        if (form) form.hidden = false;
        commentToggle?.setAttribute('aria-expanded', 'true');
        commentInput.focus();
      }
      closeAllCommentMenus();
      return;
    }

    if (deleteButton) {
      try {
        await forumFetchJson(`${FORUM_API_BASE}/comments/${deleteButton.dataset.commentDelete}`, { method: 'DELETE' });
        closeAllCommentMenus();
        await loadTopicPage();
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    }
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const content = commentInput?.value.trim();
    if (!content) {
      if (status) status.textContent = 'РљРѕРјРјРµРЅС‚Р°СЂРёР№ РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РїСѓСЃС‚С‹Рј.';
      return;
    }
    try {
      if (status) status.textContent = editingCommentId ? 'РЎРѕС…СЂР°РЅСЏРµРј РєРѕРјРјРµРЅС‚Р°СЂРёР№...' : 'РћС‚РїСЂР°РІРєР° РєРѕРјРјРµРЅС‚Р°СЂРёСЏ...';
      const attachment = await readAttachmentInput(document.getElementById('forum-comment-attachment'));
      if (editingCommentId) {
        await forumFetchJson(`${FORUM_API_BASE}/comments/${editingCommentId}`, {
          method: 'PUT',
          body: JSON.stringify({ content, parentCommentId: null, ...attachment })
        });
      } else {
        await forumFetchJson(`${FORUM_API_BASE}/topics/${topicId}/comments`, {
          method: 'POST',
          body: JSON.stringify({
            content,
            parentCommentId: parentCommentInput?.value ? Number(parentCommentInput.value) : null,
            ...attachment
          })
        });
      }
      if (commentInput) commentInput.value = '';
      const attachmentInput = document.getElementById('forum-comment-attachment');
      if (attachmentInput) attachmentInput.value = '';
      const wasEditing = Boolean(editingCommentId);
      resetReplyState();
      if (form) form.hidden = true;
      commentToggle?.setAttribute('aria-expanded', 'false');
      if (status) status.textContent = wasEditing ? 'РљРѕРјРјРµРЅС‚Р°СЂРёР№ РѕР±РЅРѕРІР»С‘РЅ.' : 'РљРѕРјРјРµРЅС‚Р°СЂРёР№ РѕРїСѓР±Р»РёРєРѕРІР°РЅ.';
      await loadTopicPage();
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  });
}

async function initMyMessagesPage() {
  if (!isCurrentPage('my_messages.html')) return;
  const user = forumCurrentUser();
  const subtitle = document.getElementById('my-messages-subtitle');
  if (!user?.id) {
    if (subtitle) subtitle.textContent = 'Р’РѕР№РґРёС‚Рµ РІ Р°РєРєР°СѓРЅС‚, С‡С‚РѕР±С‹ РїРѕСЃРјРѕС‚СЂРµС‚СЊ СЃРІРѕРё С‚РµРјС‹ Рё РєРѕРјРјРµРЅС‚Р°СЂРёРё.';
    return;
  }
  try {
    const [topics, comments] = await Promise.all([
      forumFetchJson(`${FORUM_API_BASE}/users/${user.id}/topics`),
      forumFetchJson(`${FORUM_API_BASE}/users/${user.id}/comments`)
    ]);
    if (subtitle) subtitle.textContent = `РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ: ${user.username}`;
    const topicsList = document.getElementById('my-topics-list');
    const commentsList = document.getElementById('my-comments-list');
    const topicsCount = document.getElementById('my-topics-count');
    const commentsCount = document.getElementById('my-comments-count');
    if (topicsCount) topicsCount.textContent = `${topics.length} С‚РµРј`;
    if (commentsCount) commentsCount.textContent = `${comments.length} РєРѕРјРјРµРЅС‚Р°СЂРёРµРІ`;
    if (topicsList) topicsList.innerHTML = topics.map((topic) => `
      <a class="forum-topic-card-link" href="forum_topic.html?topicId=${encodeURIComponent(topic.id)}">
        <div class="forum-topic-card-head">
          <h3>${forumEscapeHtml(topic.title)}</h3>
          <div class="forum-topic-stats">${forumEscapeHtml(topic.forumTitle)}</div>
        </div>
        <p class="forum-topic-card-excerpt">${forumEscapeHtml(topic.excerpt)}</p>
      </a>
    `).join('');
    if (commentsList) commentsList.innerHTML = comments.map((comment) => `
      <article class="forum-comment-item">
        <div class="forum-comment-head">
          <strong>${forumEscapeHtml(comment.username)}</strong>
          <div class="forum-comment-date">${forumFormatDate(comment.createdAt)}</div>
        </div>
        <p class="forum-comment-content">${forumEscapeHtml(comment.content)}</p>
        <a class="forum-link-btn" style="margin-top:12px;" href="forum_topic.html?topicId=${encodeURIComponent(comment.topicId)}">РћС‚РєСЂС‹С‚СЊ С‚РµРјСѓ</a>
      </article>
    `).join('');
  } catch (error) {
    if (subtitle) subtitle.textContent = error.message;
  }
}

async function initHomePage() {
  if (!isCurrentPage('index.html') && window.location.pathname !== '/') return;
  const list = document.getElementById('popular-topics-list');
  if (!list) return;
  try {
    const topics = await forumFetchJson(`${FORUM_API_BASE}/topics/popular`);
    renderPopularTopics(topics);
  } catch (error) {
    list.innerHTML = `<p class="forum-empty-state">${forumEscapeHtml(error.message)}</p>`;
  }
}

async function initGuidesPage() {
  if (!isCurrentPage('guides.html')) return;
  const list = document.getElementById('guides-topics-list');
  if (!list) return;
  try {
    const topics = await forumFetchJson(`${FORUM_API_BASE}/topics/guides`);
    renderGuideTopics(topics);
  } catch (error) {
    list.innerHTML = `<p class="forum-empty-state">${forumEscapeHtml(error.message)}</p>`;
  }
}

async function initForumForumsPage() {
  if (!isCurrentPage('forums.html')) return;
  const list = document.getElementById('forum-forums-list');
  if (!list) return;
  try {
    const forums = await forumFetchJson(`${FORUM_API_BASE}/forums`);
    renderForumForums(forums);
  } catch (error) {
    list.innerHTML = `<p class="forum-empty-state">${forumEscapeHtml(error.message)}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (event) => {
    const media = event.target.closest('[data-media-open]');
    if (!media) return;
    openMediaViewer(media.dataset.mediaOpen, media.dataset.mediaType);
  });
  initHomePage();
  initGuidesPage();
  initForumForumsPage();
  initForumPage();
  initForumTopicPage();
  initMyMessagesPage();
});



