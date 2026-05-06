const { useEffect, useMemo, useRef, useState } = React;

const API_BASE = '/api';
const DEFAULT_AVATAR = 'https://api.dicebear.com/8.x/initials/svg?backgroundColor=e8f3ff&fontFamily=Arial&seed=User';
const ATTACHMENT_TYPES = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'video/webm', 'video/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg',
  'application/pdf', 'text/plain', 'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const Icon = ({ name, size = 18 }) => {
  const icons = {
    search: 'M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
    trend: 'M3 17l6-6 4 4 7-8M14 7h6v6',
    pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z',
    bookmark: 'M6 4h12v17l-6-4-6 4V4Z',
    message: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z',
    heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z',
    eye: 'M2.1 12.3C3.7 8.4 7.5 6 12 6s8.3 2.4 9.9 6.3c-1.6 3.9-5.4 6.3-9.9 6.3s-8.3-2.4-9.9-6.3ZM12 15.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z',
    plus: 'M12 5v14M5 12h14',
    grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
    user: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
    clip: 'M21.4 11.6 12 21a6 6 0 0 1-8.5-8.5l9.7-9.7a4 4 0 0 1 5.7 5.7l-9.7 9.7a2 2 0 1 1-2.8-2.8l8.9-8.9',
    code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
    poll: 'M5 19V9M12 19V5M19 19v-7',
    reply: 'M9 17l-5-5 5-5M4 12h10a6 6 0 0 1 6 6v1',
    pin: 'M14 3l7 7-4 1-5 5v5l-2 2-3-7-7-3 2-2h5l5-5 1-4Z',
    logout: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
    chevron: 'M9 18l6-6-6-6',
    star: 'M12 2.8l2.1 7.1 7.1 2.1-7.1 2.1-2.1 7.1-2.1-7.1-7.1-2.1 7.1-2.1L12 2.8Z',
    x: 'M18 6 6 18M6 6l12 12',
    sun: 'M12 4V2m0 20v-2M4.93 4.93 3.52 3.52m16.96 16.96-1.41-1.41M4 12H2m20 0h-2M4.93 19.07l-1.41 1.41M20.48 3.52l-1.41 1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    moon: 'M21 12.8A8.5 8.5 0 1 1 11.2 3 6.8 6.8 0 0 0 21 12.8Z'
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[name] || icons.message} /></svg>;
};

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
}

function saveCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify({
    id: user.id,
    username: user.username,
    email: user.email,
    avatar_url: user.avatarUrl || user.avatar_url || '',
    bio: user.bio || '',
    admin: Boolean(user.admin),
    blocked: Boolean(user.blocked)
  }));
}

async function fetchJson(path, options = {}) {
  const user = getCurrentUser();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(user?.id ? { 'X-User-Id': String(user.id) } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'РќРµ СѓРґР°Р»РѕСЃСЊ РІС‹РїРѕР»РЅРёС‚СЊ Р·Р°РїСЂРѕСЃ');
  return data;
}

function setRoute(route) { window.location.hash = route; }

function useRoute() {
  const [route, setCurrentRoute] = useState(window.location.hash.replace('#', '') || window.__INITIAL_ROUTE__ || '/');
  useEffect(() => {
    const onHashChange = () => setCurrentRoute(window.location.hash.replace('#', '') || window.__INITIAL_ROUTE__ || '/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return route;
}

function formatTime(value) {
  if (!value) return 'РЅРµРґР°РІРЅРѕ';
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  if (days === 0) return 'СЃРµРіРѕРґРЅСЏ';
  if (days === 1) return '1 РґРµРЅСЊ РЅР°Р·Р°Рґ';
  return `${days} РґРЅ. РЅР°Р·Р°Рґ`;
}

function splitTags(tags) {
  return String(tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
}

function sanitizeRichText(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/<(?!\/?(b|strong|i|em|span|br|font)\b)[^>]*>/gi, '')
    .replace(/<font color="([^"]+)"[^>]*>/gi, '<span style="color:$1">')
    .replace(/<\/font>/gi, '</span>');
}

function plainRichText(value) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = String(value || '');
  const decoded = textarea.value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n');
  const template = document.createElement('template');
  template.innerHTML = decoded
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
  return (template.content.textContent || decoded)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeEditorHtml(root) {
  root?.querySelectorAll('font').forEach((node) => {
    const span = document.createElement('span');
    if (node.color) span.style.color = node.color;
    span.innerHTML = node.innerHTML;
    node.replaceWith(span);
  });
  return root?.innerHTML || '';
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve({ attachmentUrl: null, attachmentType: null, attachmentName: '' });
    if (!ATTACHMENT_TYPES.includes(file.type)) return reject(new Error('Р­С‚РѕС‚ С‚РёРї С„Р°Р№Р»Р° РїРѕРєР° РЅРµ РїРѕРґРґРµСЂР¶РёРІР°РµС‚СЃСЏ.'));
    const limit = attachmentLimit(file.type);
    if (file.size > limit) return reject(new Error(`Р¤Р°Р№Р» ${file.name} РїСЂРµРІС‹С€Р°РµС‚ Р»РёРјРёС‚ ${Math.round(limit / 1024 / 1024)} РњР‘.`));
    const reader = new FileReader();
    reader.onload = () => resolve({ url: reader.result, type: file.type, name: file.name, size: file.size });
    reader.onerror = () => reject(new Error('РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ С„Р°Р№Р».'));
    reader.readAsDataURL(file);
  });
}

function attachmentLimit(type) {
  if (type.startsWith('video/')) return 100 * 1024 * 1024;
  if (type.startsWith('image/')) return 10 * 1024 * 1024;
  return 30 * 1024 * 1024;
}

function isPreviewableAttachment(file) {
  return file?.type?.startsWith('image/') || file?.type?.startsWith('video/') || file?.type?.startsWith('audio/');
}

function packAttachments(files) {
  return files.length
    ? { attachmentUrl: JSON.stringify(files), attachmentType: 'application/json' }
    : { attachmentUrl: null, attachmentType: null };
}

function unpackAttachments(url, type) {
  if (!url) return [];
  if (type === 'application/json') {
    try {
      const parsed = JSON.parse(url);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [{ url, type, name: 'Р’Р»РѕР¶РµРЅРёРµ' }];
}

function highlightCode(code) {
  const escaped = String(code || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/(".*?"|'.*?')/g, '<span class="code-string">$1</span>')
    .replace(/\b(public|class|static|void|new|return|if|else|for|while|const|let|function|import|from|def|print|int|String|boolean)\b/g, '<span class="code-keyword">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="code-number">$1</span>')
    .replace(/(\/\/.*?$|#.*?$)/gm, '<span class="code-comment">$1</span>');
}

function formatAiSummary(text) {
  return String(text || '')
    .split(/\n+/)
    .map((line) => line
      .replace(/^\s{0,3}(#{1,6}|\*+|-+|вЂў)\s*/u, '')
      .replace(/^\s{0,3}\d+[.)]\s*/, '')
      .replace(/\*\*/g, '')
      .trim())
    .filter(Boolean)
    .join('\n\n');
}

function Header({ user, onLogout, route, theme, onThemeToggle }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('');
  const userMenuRef = useRef(null);
  const goSection = (target) => {
    const active = target === '/'
      ? route === '/' || route.startsWith('/?')
      : route === target;
    if (active) {
      if (window.location.hash !== `#${target}`) window.location.hash = target;
      window.location.reload();
      return;
    }
    setRoute(target);
  };
  const submitHeaderSearch = (event) => {
    event.preventDefault();
    const value = headerSearch.trim();
    if (!value) return;
    window.dispatchEvent(new CustomEvent('forum-header-search', { detail: value }));
    setRoute(`/?search=${encodeURIComponent(value)}`);
    setSearchResults([]);
  };
  useEffect(() => {
    const query = headerSearch.trim();
    if (!query || !searchOpen) {
      setSearchResults([]);
      setSearchStatus('');
      return undefined;
    }
    setSearchStatus('Р—Р°РіСЂСѓР·РєР°...');
    const timer = setTimeout(async () => {
      try {
        const results = await fetchJson(`/forum/search?query=${encodeURIComponent(query)}`);
        setSearchResults(results);
        setSearchStatus(results.length ? '' : 'РќРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ');
      } catch {
        setSearchResults([]);
        setSearchStatus('РћС€РёР±РєР° РїРѕРёСЃРєР°');
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [headerSearch, searchOpen]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!userMenuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [menuOpen]);
  const chooseSearchResult = (item) => {
    setHeaderSearch('');
    setSearchResults([]);
    setSearchStatus('');
    setSearchOpen(false);
    if (item.type === 'tag') {
      const tag = String(item.title || '').replace(/^#/, '');
      window.dispatchEvent(new CustomEvent('forum-tag-filter', { detail: tag }));
      setRoute(`/?tag=${encodeURIComponent(tag)}`);
      return;
    }
    if (item.url?.startsWith('forum_topic.html?topicId=')) {
      const params = new URLSearchParams(item.url.split('?')[1] || '');
      const topicId = params.get('topicId');
      if (topicId) setRoute(`/topic/${topicId}`);
      return;
    }
    if (item.url?.startsWith('forum.html?forumSlug=')) {
      const params = new URLSearchParams(item.url.split('?')[1] || '');
      const slug = params.get('forumSlug');
      if (slug) setRoute(`/forums`);
      return;
    }
    window.location.href = item.url || 'index.html';
  };
  return (
    <header className="gf-header">
      <div className="gf-brand">
        <button className="gf-logo" onClick={() => goSection('/')}><span className="gf-brand-mark"></span><span>Project Forum</span></button>
        <button className="gf-theme-toggle" type="button" onClick={onThemeToggle} title={theme === 'dark' ? 'РЎРІРµС‚Р»Р°СЏ С‚РµРјР°' : 'РўРµРјРЅР°СЏ С‚РµРјР°'} aria-label={theme === 'dark' ? 'РЎРІРµС‚Р»Р°СЏ С‚РµРјР°' : 'РўРµРјРЅР°СЏ С‚РµРјР°'}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
        </button>
      </div>
      <nav className="gf-nav" aria-label="РќР°РІРёРіР°С†РёСЏ">
        <button onClick={() => goSection('/')} className="gf-nav-btn">РўРµРјС‹</button>
        <button onClick={() => goSection('/forums')} className="gf-nav-btn">Р¤РѕСЂСѓРјС‹</button>
        <button onClick={() => goSection('/guides')} className="gf-nav-btn">Р“Р°Р№РґС‹</button>
      </nav>
      <div className="gf-header-actions">
        <form className={`gf-header-search ${searchOpen ? 'open' : ''}`} onSubmit={submitHeaderSearch}>
          <button className="gf-icon-btn" type="button" title="РџРѕРёСЃРє" onClick={() => setSearchOpen((open) => !open)}><Icon name="search" /></button>
          <input value={headerSearch} onChange={(event) => setHeaderSearch(event.target.value)} placeholder="РџРѕРёСЃРє С‚РµРјС‹" aria-label="РџРѕРёСЃРє С‚РµРјС‹" />
          {searchOpen && (headerSearch.trim() || searchStatus) && (
            <div className="gf-header-search-menu">
              {searchStatus && <p>{searchStatus}</p>}
              {!searchStatus && searchResults.map((item) => (
                <button type="button" key={`${item.type}-${item.id}`} onClick={() => chooseSearchResult(item)}>
                  <span>{item.type}</span>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle || ''}</small>
                </button>
              ))}
            </div>
          )}
        </form>
        <button className="gf-icon-btn" title="РЎРѕР·РґР°С‚СЊ С‚РµРјСѓ" onClick={() => setRoute('/new')}><Icon name="plus" /></button>
        {user ? (
          <div className="gf-header-user" ref={userMenuRef}>
            <button className="gf-user-chip" onClick={() => setMenuOpen(!menuOpen)}>
              <img src={user.avatar_url || DEFAULT_AVATAR} alt={user.username || 'РџСЂРѕС„РёР»СЊ'} />
              <span>{user.username || 'РџСЂРѕС„РёР»СЊ'}</span>
            </button>
            {menuOpen && <div className="gf-menu-popover gf-header-menu">
              <button onClick={() => { setMenuOpen(false); setRoute(`/user/${user.id}`); }}>РџСЂРѕС„РёР»СЊ</button>
              <button onClick={() => { setMenuOpen(false); setRoute('/profile'); }}>Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ</button>
              <button onClick={() => { setMenuOpen(false); onLogout(); }}>Р’С‹Р№С‚Рё</button>
            </div>}
          </div>
        ) : (
          <a className="gf-login-button" href="login.html">Р’РѕР№С‚Рё</a>
        )}
      </div>
    </header>
  );
}

function SearchTabs({ active, onActive, query, onQuery, popularTags }) {
  const tagQuery = query.trim().startsWith('#') ? query.trim().slice(1).toLowerCase() : null;
  const visibleTags = tagQuery === null
    ? []
    : popularTags.filter((tag) => tag.toLowerCase().includes(tagQuery)).slice(0, 8);
  return (
    <section className="gf-filter-panel">
      <div className="gf-search-wrap">
        <label className="gf-search">
          <Icon name="search" />
          <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="РџРѕРёСЃРє С‚РµРјС‹, С‚РµРіР° РёР»Рё С„РѕСЂСѓРјР°" />
        </label>
        {tagQuery !== null && !!visibleTags.length && (
          <div className="gf-tag-suggestions">
            {visibleTags.map((tag) => <button type="button" key={tag} onMouseDown={(event) => event.preventDefault()} onClick={() => onQuery(`#${tag}`)}>#{tag}</button>)}
          </div>
        )}
      </div>
      <div className="gf-tabs">
        <button className={active === 'latest' ? 'active' : ''} onClick={() => onActive('latest')}>РџРѕСЃР»РµРґРЅРёРµ РІРѕРїСЂРѕСЃС‹</button>
        <button className={active === 'trending' ? 'active' : ''} onClick={() => onActive('trending')}>РџРѕРїСѓР»СЏСЂРЅС‹Рµ С‚РµРјС‹</button>
        <button className={active === 'answered' ? 'active' : ''} onClick={() => onActive('answered')}>Р‘РѕР»СЊС€Рµ РѕС‚РІРµС‚РѕРІ</button>
      </div>
    </section>
  );
}

function TagButton({ tag, onTag }) {
  return <button type="button" className="gf-tag-button" onClick={() => onTag?.(tag)}>#{tag}</button>;
}

function TopicCard({ topic, onLike, onToast, onDeleted }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(() => JSON.parse(localStorage.getItem('savedTopics') || '[]').includes(topic.id));
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const liked = Boolean(topic.likedByCurrentUser);
  const tags = splitTags(topic.tags);
  const currentUser = getCurrentUser();
  const canDelete = currentUser?.admin || Number(currentUser?.id) === Number(topic.userId);
  const canEdit = Number(currentUser?.id) === Number(topic.userId);
  topic.excerpt = plainRichText(topic.excerpt);

  const shareTopic = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/topic/${topic.id}`;
    try {
      if (navigator.share) await navigator.share({ title: topic.title, url });
      else await navigator.clipboard.writeText(url);
      onToast('РЎСЃС‹Р»РєР° РЅР° С‚РµРјСѓ СЃРєРѕРїРёСЂРѕРІР°РЅР°.');
    } catch {
      onToast('РџРѕРґРµР»РёС‚СЊСЃСЏ РЅРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ.');
    }
  };

  const toggleSaved = () => {
    const list = new Set(JSON.parse(localStorage.getItem('savedTopics') || '[]'));
    saved ? list.delete(topic.id) : list.add(topic.id);
    localStorage.setItem('savedTopics', JSON.stringify([...list]));
    setSaved(!saved);
    onToast(saved ? 'РўРµРјР° СѓР±СЂР°РЅР° РёР· СЃРѕС…СЂР°РЅС‘РЅРЅС‹С….' : 'РўРµРјР° СЃРѕС…СЂР°РЅРµРЅР°.');
  };

  const deleteTopic = async () => {
    if (!canDelete) return;
    await fetch(`${API_BASE}/forum/topics/${topic.id}`, {
      method: 'DELETE',
      headers: { 'X-User-Id': String(currentUser.id) }
    });
    onToast('РўРµРјР° СѓРґР°Р»РµРЅР°.');
    onDeleted?.(topic.id);
  };

  const sendQuickComment = async (event) => {
    event.preventDefault();
    if (!currentUser?.id) {
      window.location.href = 'login.html';
      return;
    }
    if (!commentText.trim()) return;
    await fetchJson(`/forum/topics/${topic.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: commentText.trim() })
    });
    setCommentText('');
    setCommentOpen(false);
    onToast('РљРѕРјРјРµРЅС‚Р°СЂРёР№ РґРѕР±Р°РІР»РµРЅ.');
  };

  return (
    <article className="gf-topic-card">
      <div className="gf-topic-top">
        <span className="gf-category-dot"></span>
        <span className="gf-category-name">{topic.forumTitle || 'Р¤РѕСЂСѓРј'}</span>
        <div className="gf-card-menu">
          <button className="gf-menu-dot" title="Р”РµР№СЃС‚РІРёСЏ" onClick={() => setMenuOpen(!menuOpen)}>вЂўвЂўвЂў</button>
          {menuOpen && (
            <div className="gf-menu-popover">
              <button onClick={shareTopic}>РЎРєРѕРїРёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ</button>
              <button onClick={toggleSaved}>{saved ? 'РЈР±СЂР°С‚СЊ РёР· СЃРѕС…СЂР°РЅС‘РЅРЅС‹С…' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}</button>
              <button onClick={() => setRoute(`/topic/${topic.id}`)}>РћС‚РєСЂС‹С‚СЊ С‚РµРјСѓ</button>
              {canEdit && <button onClick={() => setRoute(`/edit/${topic.id}`)}>Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ</button>}
              {canDelete && <button className="danger" onClick={deleteTopic}>РЈРґР°Р»РёС‚СЊ</button>}
            </div>
          )}
        </div>
      </div>
      <button className="gf-topic-title" onClick={() => setRoute(`/topic/${topic.id}`)}>{topic.title}</button>
      <div className="gf-tags">
        {[...tags, topic.categoryName].filter(Boolean).slice(0, 5).map((tag) => <TagButton key={tag} tag={tag} onTag={(value) => {
          window.dispatchEvent(new CustomEvent('forum-tag-filter', { detail: value }));
          setRoute(`/?tag=${encodeURIComponent(value)}`);
        }} />)}
      </div>
      <div className="gf-topic-meta">{formatTime(topic.createdAt)} вЂў {Number(topic.commentsCount || 0)} РѕС‚РІРµС‚РѕРІ</div>
      <div className="gf-topic-actions">
        <button onClick={shareTopic}><Icon name="trend" size={16} /> РџРѕРґРµР»РёС‚СЊСЃСЏ</button>
        <button onClick={() => setCommentOpen(!commentOpen)}><Icon name="message" size={16} /> РљРѕРјРјРµРЅС‚Р°СЂРёР№</button>
        <button onClick={toggleSaved} className={saved ? 'active' : ''}><Icon name="bookmark" size={16} /> {saved ? 'РЎРѕС…СЂР°РЅРµРЅРѕ' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}</button>
        <button className={`gf-score ${liked ? 'liked' : ''}`} onClick={async () => {
          if (!getCurrentUser()?.id) {
            window.location.href = 'login.html';
            return;
          }
          await onLike(topic);
        }}><Icon name="heart" size={15} /> {Number(topic.likesCount || 0)}</button>
      </div>
      {commentOpen && (
        <form className="gf-quick-comment" onSubmit={sendQuickComment}>
          <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="РќР°РїРёС€РёС‚Рµ РєРѕРјРјРµРЅС‚Р°СЂРёР№" rows="3"></textarea>
          <button type="submit">РћС‚РїСЂР°РІРёС‚СЊ</button>
        </form>
      )}
      <div className="gf-answer-preview">
        <div className="gf-answer-person">
          <button className="gf-person-link" onClick={() => setRoute(`/user/${topic.userId}`)}><img src={topic.avatarUrl || DEFAULT_AVATAR} alt={topic.username || 'РђРІС‚РѕСЂ'} /></button>
          <div><button className="gf-name-link" onClick={() => setRoute(`/user/${topic.userId}`)}>{topic.username || 'РђРІС‚РѕСЂ'}</button><span>{formatTime(topic.lastActivityAt)}</span></div>
        </div>
        <p>{topic.excerpt || 'РћС‚РєСЂРѕР№С‚Рµ РѕР±СЃСѓР¶РґРµРЅРёРµ, С‡С‚РѕР±С‹ РїСЂРѕС‡РёС‚Р°С‚СЊ РѕС‚РІРµС‚С‹ Рё РїСЂРёСЃРѕРµРґРёРЅРёС‚СЊСЃСЏ Рє СЂР°Р·РіРѕРІРѕСЂСѓ.'}</p>
        <button className="gf-read-answers" onClick={() => setRoute(`/topic/${topic.id}`)}>Р§РёС‚Р°С‚СЊ РѕС‚РІРµС‚С‹</button>
      </div>
    </article>
  );
}

function Sidebar({ topics, forums }) {
  const [forumsOpen, setForumsOpen] = useState(false);
  const [topUsers, setTopUsers] = useState([]);
  const user = getCurrentUser();
  useEffect(() => {
    fetchJson('/forum/users/top').then(setTopUsers).catch(() => setTopUsers([]));
  }, []);
  return (
    <aside className="gf-left-rail">
      <section>
        <h2>РњРѕС‘ РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІРѕ</h2>
        <button onClick={() => user ? setRoute('/profile?tab=topics') : window.location.href = 'login.html'}><Icon name="message" /> РЎРѕР·РґР°РЅРЅС‹Рµ С‚РµРјС‹</button>
        <button onClick={() => user ? setRoute('/profile?tab=comments') : window.location.href = 'login.html'}><Icon name="pen" /> РњРѕРё РєРѕРјРјРµРЅС‚Р°СЂРёРё</button>
        <button onClick={() => user ? setRoute('/profile?tab=saved') : window.location.href = 'login.html'}><Icon name="bookmark" /> РЎРѕС…СЂР°РЅС‘РЅРЅС‹Рµ</button>
        <button onClick={() => setForumsOpen(!forumsOpen)}><Icon name="grid" /> Р¤РѕСЂСѓРјС‹ <span>{forumsOpen ? 'в€’' : '+'}</span></button>
        {forumsOpen && (
          <div className="gf-rail-nested">
            {forums.slice(0, 8).map((forum) => <button key={forum.id} onClick={() => setRoute(`/forum/${forum.id}`)}>{forum.title}</button>)}
          </div>
        )}
      </section>
      <section className="gf-side-card">
        <h2>РўРѕРї РѕР±СЃСѓР¶РґРµРЅРёР№</h2>
        <div className="gf-top-question-list">
          {topics.slice(0, 5).map((topic, index) => (
            <button key={topic.id} onClick={() => setRoute(`/topic/${topic.id}`)} className="gf-top-question">
              <span>#{index + 1}</span>
              <strong>{topic.title}</strong>
              <small>{Number(topic.commentsCount || 0)} РѕС‚РІРµС‚РѕРІ</small>
            </button>
          ))}
        </div>
      </section>
      <section className="gf-side-card">
        <h2>РўРѕРї РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№</h2>
        <div className="gf-top-user-list">
          {topUsers.slice(0, 5).map((item, index) => (
            <button key={item.id} onClick={() => setRoute(`/user/${item.id}`)} className="gf-top-user">
              <span>#{index + 1}</span>
              <img src={item.avatarUrl || DEFAULT_AVATAR} alt={item.username || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ'} />
              <strong>{item.username || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ'}</strong>
              <small>{Number(item.likesCount || 0)} Р»Р°Р№РєРѕРІ</small>
            </button>
          ))}
          {!topUsers.length && <p className="gf-side-empty">РџРѕРєР° РЅРµС‚ Р»Р°Р№РєРѕРІ.</p>}
        </div>
      </section>
    </aside>
  );
}

function Home({ mode = 'home' }) {
  const [topics, setTopics] = useState([]);
  const [forums, setForums] = useState([]);
  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams((window.location.hash.split('?')[1] || ''));
    const tag = params.get('tag');
    const search = params.get('search');
    return tag ? `#${tag}` : (search || '');
  });
  const [tab, setTab] = useState(mode === 'guides' ? 'answered' : 'latest');
  const [status, setStatus] = useState('Р—Р°РіСЂСѓР¶Р°РµРј С„РѕСЂСѓРј...');
  const [toast, setToast] = useState('');

  const load = async () => {
    const path = mode === 'guides' ? '/forum/topics/guides' : '/forum/topics/popular';
    const [nextTopics, nextForums] = await Promise.all([fetchJson(path), fetchJson('/forum/forums')]);
    setTopics(nextTopics);
    setForums(nextForums);
    setStatus('');
  };

  useEffect(() => { load().catch((error) => setStatus(error.message)); }, [mode]);
  useEffect(() => {
    const handler = (event) => setQuery(`#${event.detail}`);
    window.addEventListener('forum-tag-filter', handler);
    return () => window.removeEventListener('forum-tag-filter', handler);
  }, []);
  useEffect(() => {
    const handler = (event) => setQuery(String(event.detail || ''));
    window.addEventListener('forum-header-search', handler);
    return () => window.removeEventListener('forum-header-search', handler);
  }, []);
  useEffect(() => { if (toast) setTimeout(() => setToast(''), 2400); }, [toast]);

  const popularTags = useMemo(() => {
    const counts = new Map();
    topics.forEach((topic) => {
      [...splitTags(topic.tags), topic.categoryName].filter(Boolean).forEach((tag) => {
        const normalized = tag.trim();
        if (!normalized) return;
        counts.set(normalized, (counts.get(normalized) || 0) + Number(topic.commentsCount || 0) + Number(topic.likesCount || 0) + 1);
      });
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
      .map(([tag]) => tag);
  }, [topics]);

  const filteredTopics = useMemo(() => {
    const text = query.trim().toLowerCase();
    let result = topics;
    if (text.startsWith('#')) {
      const tag = text.slice(1);
      if (tag) result = topics.filter((topic) => splitTags(topic.tags).some((item) => item.toLowerCase() === tag) || String(topic.categoryName || '').toLowerCase() === tag);
    } else if (text) {
      result = topics.filter((topic) => `${topic.title} ${topic.excerpt} ${topic.forumTitle} ${topic.categoryName} ${topic.tags}`.toLowerCase().includes(text));
    }
    if (tab === 'trending') result = [...result].sort((a, b) => (b.likesCount + b.viewsCount) - (a.likesCount + a.viewsCount));
    if (tab === 'answered') result = [...result].sort((a, b) => b.commentsCount - a.commentsCount);
    return result;
  }, [topics, query, tab]);

  const likeTopic = async (topic) => {
    if (!getCurrentUser()?.id) { window.location.href = 'login.html'; return; }
    try {
      const updated = await fetchJson(`/forum/topics/${topic.id}/like`, { method: 'POST' });
      setTopics((items) => items.map((item) => item.id === topic.id ? { ...item, likesCount: updated.likesCount, likedByCurrentUser: updated.likedByCurrentUser } : item));
    } catch (error) { setToast(error.message); }
  };

  return (
    <main className="gf-page">
      {toast && <div className="gf-toast">{toast}</div>}
      <Sidebar topics={topics} forums={forums} />
      <section className="gf-main-column">
        <SearchTabs active={tab} onActive={setTab} query={query} onQuery={setQuery} popularTags={popularTags} />
        {status && <div className="gf-state">{status}</div>}
        {!status && filteredTopics.map((topic) => <TopicCard key={topic.id} topic={topic} onLike={likeTopic} onToast={setToast} onDeleted={(id) => setTopics((items) => items.filter((item) => item.id !== id))} />)}
        {!status && !filteredTopics.length && <div className="gf-state">РџРѕРґС…РѕРґСЏС‰РёС… С‚РµРј РЅРµ РЅР°Р№РґРµРЅРѕ.</div>}
      </section>
    </main>
  );
}

function Forums() {
  const [forums, setForums] = useState([]);
  const [topics, setTopics] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Р—Р°РіСЂСѓР¶Р°РµРј С„РѕСЂСѓРјС‹...');
  useEffect(() => {
    Promise.all([fetchJson('/forum/forums'), fetchJson('/forum/topics/popular')])
      .then(([data, nextTopics]) => { setForums(data); setTopics(nextTopics); setStatus(''); })
      .catch((error) => setStatus(error.message));
  }, []);
  const filtered = forums.filter((forum) => forum.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <main className="gf-page">
      <Sidebar topics={topics} forums={forums} />
      <section className="gf-directory">
        <h1>Р¤РѕСЂСѓРјС‹</h1>
        <p>Р’С‹Р±РµСЂРёС‚Рµ СЂР°Р·РґРµР» РґР»СЏ РІРѕРїСЂРѕСЃРѕРІ, РіР°Р№РґРѕРІ Рё РѕР±СЃСѓР¶РґРµРЅРёР№.</p>
        <label className="gf-search gf-forum-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="РџРѕРёСЃРє С„РѕСЂСѓРјРѕРІ" /></label>
        {status && <div className="gf-state">{status}</div>}
        <div className="gf-forum-grid">
          {filtered.map((forum) => (
            <button key={forum.id} onClick={() => setRoute(`/forum/${forum.id}`)} className="gf-forum-card">
              <Icon name="grid" /><strong>{forum.title}</strong><span>РћС‚РєСЂС‹С‚СЊ С‚РµРјС‹ Рё РєР°С‚РµРіРѕСЂРёРё</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function ForumView({ forumId }) {
  const [topics, setTopics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [forum, setForum] = useState(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [status, setStatus] = useState('Р—Р°РіСЂСѓР¶Р°РµРј С‚РµРјС‹...');
  useEffect(() => {
    Promise.all([fetchJson(`/forum/forums/${forumId}`), fetchJson(`/forum/forums/${forumId}/topics`), fetchJson(`/forum/forums/${forumId}/categories`)])
      .then(([nextForum, nextTopics, nextCategories]) => { setForum(nextForum); setTopics(nextTopics); setCategories(nextCategories); setStatus(''); })
      .catch((error) => setStatus(error.message));
  }, [forumId]);
  const filtered = activeCategory ? topics.filter((topic) => Number(topic.categoryId) === Number(activeCategory)) : topics;
  const likeTopic = async (topic) => {
    if (!getCurrentUser()?.id) {
      window.location.href = 'login.html';
      return;
    }
    const updated = await fetchJson(`/forum/topics/${topic.id}/like`, { method: 'POST' });
    setTopics((items) => items.map((item) => item.id === topic.id ? { ...item, likesCount: updated.likesCount, likedByCurrentUser: updated.likedByCurrentUser } : item));
  };
  return (
    <main className="gf-page">
      <Sidebar topics={topics} forums={forum ? [forum] : []} />
      <section className="gf-main-column">
        <section className="gf-filter-panel compact">
          <button className="gf-back" onClick={() => setRoute('/forums')}>Р’СЃРµ С„РѕСЂСѓРјС‹</button>
          <h1 className="gf-forum-title">{forum?.title || 'Р¤РѕСЂСѓРј'}</h1>
          <div className="gf-tabs wrap">
            <button className={!activeCategory ? 'active' : ''} onClick={() => setActiveCategory('')}>Р’СЃРµ С‚РµРјС‹</button>
            {categories.map((category) => <button key={category.id} className={Number(activeCategory) === Number(category.id) ? 'active' : ''} onClick={() => setActiveCategory(category.id)}>{category.name}</button>)}
          </div>
        </section>
        {status && <div className="gf-state">{status}</div>}
        {!status && filtered.map((topic) => <TopicCard key={topic.id} topic={topic} onLike={likeTopic} onToast={() => {}} onDeleted={(id) => setTopics((items) => items.filter((item) => item.id !== id))} />)}
      </section>
    </main>
  );
}

function LegacyForumView() {
  const [forumId, setForumId] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('forumId') || params.get('gameId');
    const slug = params.get('forumSlug') || params.get('gameSlug');
    if (id) setForumId(id);
    else if (slug) fetchJson(`/forum/forums/slug/${encodeURIComponent(slug)}`).then((forum) => setForumId(forum.id)).catch(() => setRoute('/forums'));
    else setRoute('/forums');
  }, []);
  return forumId ? <ForumView forumId={forumId} /> : <main className="gf-page gf-single"><div className="gf-state">РћС‚РєСЂС‹РІР°РµРј С„РѕСЂСѓРј...</div></main>;
}

function buildCommentTree(comments) {
  const byId = new Map();
  const roots = [];
  comments.forEach((comment) => byId.set(comment.id, { ...comment, children: [] }));
  byId.forEach((comment) => {
    if (comment.parentCommentId && byId.has(comment.parentCommentId)) byId.get(comment.parentCommentId).children.push(comment);
    else roots.push(comment);
  });
  const sort = (items) => items
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(a.createdAt) - new Date(b.createdAt))
    .map((item) => ({ ...item, children: sort(item.children || []) }));
  return sort(roots);
}

function saveCommentLocal(comment) {
  const list = JSON.parse(localStorage.getItem('savedComments') || '[]').filter((item) => Number(item.id) !== Number(comment.id));
  localStorage.setItem('savedComments', JSON.stringify([{ ...comment, savedAt: new Date().toISOString() }, ...list]));
}

function removeSavedComment(commentId) {
  const list = JSON.parse(localStorage.getItem('savedComments') || '[]').filter((item) => Number(item.id) !== Number(commentId));
  localStorage.setItem('savedComments', JSON.stringify(list));
}

function CommentItem({ item, topic, currentUser, onReload, onReply, depth = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.content || '');
  const [saved, setSaved] = useState(() => JSON.parse(localStorage.getItem('savedComments') || '[]').some((savedItem) => Number(savedItem.id) === Number(item.id)));
  const canEdit = currentUser?.admin || Number(currentUser?.id) === Number(item.userId);
  const isTopicAuthor = Number(currentUser?.id) === Number(topic.userId);

  const requireUser = () => {
    if (!currentUser?.id) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  };
  const like = async () => {
    if (!requireUser()) return;
    await fetchJson(`/forum/comments/${item.id}/like`, { method: 'POST' });
    await onReload();
  };
  const pin = async () => {
    if (!requireUser() || !isTopicAuthor) return;
    await fetchJson(`/forum/comments/${item.id}/pin`, { method: 'POST' });
    await onReload();
  };
  const deleteComment = async () => {
    if (!requireUser() || !canEdit) return;
    await fetch(`${API_BASE}/forum/comments/${item.id}`, { method: 'DELETE', headers: { 'X-User-Id': String(currentUser.id) } });
    removeSavedComment(item.id);
    await onReload();
  };
  const updateComment = async (event) => {
    event.preventDefault();
    if (!editText.trim()) return;
    await fetchJson(`/forum/comments/${item.id}`, { method: 'PUT', body: JSON.stringify({ content: editText.trim() }) });
    setEditing(false);
    await onReload();
  };
  const toggleSaved = () => {
    if (saved) removeSavedComment(item.id);
    else saveCommentLocal(item);
    setSaved(!saved);
  };

  return (
    <article className={`gf-comment ${item.pinned ? 'pinned' : ''}`} style={{ marginLeft: depth ? Math.min(depth, 3) * 4 : 0 }}>
      <button className="gf-person-link" onClick={() => setRoute(`/user/${item.userId}`)}><img src={item.avatarUrl || DEFAULT_AVATAR} alt={item.username || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ'} /></button>
      <div className="gf-comment-body">
        <div className="gf-comment-head">
          <div>
            <button className="gf-name-link" onClick={() => setRoute(`/user/${item.userId}`)}>{item.username || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ'}</button>
            <span>{formatTime(item.createdAt)}{item.edited ? ' вЂў РёР·РјРµРЅРµРЅРѕ' : ''}{item.authorComment ? ' вЂў Р°РІС‚РѕСЂ С‚РµРјС‹' : ''}</span>
          </div>
          <div className="gf-card-menu">
            {item.pinned && <span className="gf-pin-badge"><Icon name="pin" size={13} /> Р—Р°РєСЂРµРїР»РµРЅРѕ</span>}
            <button className="gf-menu-dot" onClick={() => setMenuOpen(!menuOpen)}>вЂўвЂўвЂў</button>
            {menuOpen && <div className="gf-menu-popover">
              {canEdit && <button onClick={() => { setEditing(true); setMenuOpen(false); }}>Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ</button>}
              {canEdit && <button className="danger" onClick={deleteComment}>РЈРґР°Р»РёС‚СЊ</button>}
            </div>}
          </div>
        </div>
        {editing ? (
          <form className="gf-comment-edit" onSubmit={updateComment}>
            <textarea value={editText} onChange={(event) => setEditText(event.target.value)} rows="3"></textarea>
            <div><button type="button" onClick={() => setEditing(false)}>РћС‚РјРµРЅР°</button><button type="submit">РЎРѕС…СЂР°РЅРёС‚СЊ</button></div>
          </form>
        ) : <p>{item.content}</p>}
        <div className="gf-comment-actions">
          <button className={item.likedByCurrentUser ? 'active' : ''} onClick={like}><Icon name="heart" size={15} /> {Number(item.likesCount || 0)}</button>
          <button onClick={() => onReply(item)}><Icon name="reply" size={15} /> РћС‚РІРµС‚РёС‚СЊ</button>
          <button className={saved ? 'active' : ''} onClick={toggleSaved}><Icon name="bookmark" size={15} /> {saved ? 'РЎРѕС…СЂР°РЅРµРЅРѕ' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}</button>
          {isTopicAuthor && <button className={item.pinned ? 'active' : ''} onClick={pin}><Icon name="pin" size={15} /> {item.pinned ? 'РћС‚РєСЂРµРїРёС‚СЊ' : 'Р—Р°РєСЂРµРїРёС‚СЊ'}</button>}
        </div>
        {!!item.children?.length && <div className="gf-comment-children">{item.children.map((child) => <CommentItem key={child.id} item={child} topic={topic} currentUser={currentUser} onReload={onReload} onReply={onReply} depth={depth + 1} />)}</div>}
      </div>
    </article>
  );
}

function TopicView({ topicId }) {
  const aiAbortRef = useRef(null);
  const [topic, setTopic] = useState(null);
  const [comments, setComments] = useState([]);
  const [forums, setForums] = useState([]);
  const [popular, setPopular] = useState([]);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [commentFormOpen, setCommentFormOpen] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [status, setStatus] = useState('Р—Р°РіСЂСѓР¶Р°РµРј РѕР±СЃСѓР¶РґРµРЅРёРµ...');
  const load = async () => {
    const [nextTopic, nextComments, nextForums, nextPopular] = await Promise.all([
      fetchJson(`/forum/topics/${topicId}`),
      fetchJson(`/forum/topics/${topicId}/comments?sort=newest`),
      fetchJson('/forum/forums'),
      fetchJson('/forum/topics/popular')
    ]);
    setTopic(nextTopic); setComments(nextComments); setForums(nextForums); setPopular(nextPopular); setStatus('');
  };
  useEffect(() => {
    aiAbortRef.current?.abort();
    setAiSummary(null);
    setAiOpen(false);
    setAiError('');
    setCommentFormOpen(false);
    setReplyTo(null);
    setComment('');
    setViewersOpen(false);
    setViewers([]);
    load().catch((error) => setStatus(error.message));
    return () => aiAbortRef.current?.abort();
  }, [topicId]);
  const sendComment = async (event) => {
    event.preventDefault();
    if (!getCurrentUser()?.id) { window.location.href = 'login.html'; return; }
    if (!comment.trim()) return;
    await fetchJson(`/forum/topics/${topicId}/comments`, { method: 'POST', body: JSON.stringify({ content: comment.trim(), parentCommentId: replyTo?.id || null }) });
    setComment('');
    setReplyTo(null);
    setCommentFormOpen(false);
    await load();
  };
  const currentUser = getCurrentUser();
  const canDelete = topic && (currentUser?.admin || Number(currentUser?.id) === Number(topic.userId));
  const canEditTopic = topic && Number(currentUser?.id) === Number(topic.userId);
  const deleteTopic = async () => {
    await fetch(`${API_BASE}/forum/topics/${topicId}`, {
      method: 'DELETE',
      headers: { 'X-User-Id': String(currentUser.id) }
    });
    setRoute(`/forum/${topic.forumId}`);
  };
  const loadAiSummary = async () => {
    setAiOpen(true);
    setAiError('');
    if (aiSummary?.summary) return;
    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiLoading(true);
    try {
      const summary = await fetchJson(`/forum/topics/${topicId}/ai-summary`, { method: 'POST', signal: controller.signal });
      setAiSummary(summary);
    } catch (error) {
      if (error.name === 'AbortError') return;
      setAiError(error.message);
    } finally {
      if (aiAbortRef.current === controller) {
        aiAbortRef.current = null;
        setAiLoading(false);
      }
    }
  };
  const closeAiSummary = () => {
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setAiLoading(false);
    setAiOpen(false);
  };
  const toggleTopicLike = async () => {
    if (!getCurrentUser()?.id) { window.location.href = 'login.html'; return; }
    const updated = await fetchJson(`/forum/topics/${topicId}/like`, { method: 'POST' });
    setTopic(updated);
  };
  const openCommentForm = () => {
    setCommentFormOpen((open) => {
      const nextOpen = !open;
      if (!nextOpen) {
        setReplyTo(null);
        setComment('');
      } else {
        setTimeout(() => document.getElementById('answer')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
      }
      return nextOpen;
    });
  };
  const toggleViewers = async () => {
    const nextOpen = !viewersOpen;
    setViewersOpen(nextOpen);
    if (!nextOpen || viewers.length) return;
    setViewersLoading(true);
    try {
      setViewers(await fetchJson(`/forum/topics/${topicId}/viewers`));
    } finally {
      setViewersLoading(false);
    }
  };
  const attachments = topic ? unpackAttachments(topic.attachmentUrl, topic.attachmentType) : [];
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);
  return (
    <main className="gf-page">
      <Sidebar topics={popular} forums={forums} />
      <section className="gf-main-column">
      {status && <div className="gf-state">{status}</div>}
      {topic && (
        <>
        <article className="gf-detail">
          <button className="gf-back gf-back-icon" title="РќР°Р·Р°Рґ" onClick={() => window.history.length > 1 ? window.history.back() : setRoute(`/forum/${topic.forumId}`)}>вЂ№</button>
          <div className="gf-topic-top">
            <span className="gf-category-dot"></span>
            <span className="gf-category-name">{topic.forumTitle}</span>
            <div className="gf-topic-tools">
              <button className={`gf-ai-button ${aiOpen ? 'active' : ''}`} title="РР-СЂР°Р·Р±РѕСЂ С‚РµРјС‹" onClick={loadAiSummary} disabled={aiLoading}>
                <Icon name="star" size={17} />
              </button>
              <div className="gf-card-menu">
                <button className="gf-menu-dot" onClick={() => setMenuOpen(!menuOpen)}>вЂўвЂўвЂў</button>
                {menuOpen && <div className="gf-menu-popover">
                  {canEditTopic && <button onClick={() => setRoute(`/edit/${topic.id}`)}>Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ</button>}
                  {canDelete && <button className="danger" onClick={deleteTopic}>РЈРґР°Р»РёС‚СЊ</button>}
                </div>}
              </div>
            </div>
          </div>
          <h1>{topic.title}</h1>
          <div className="gf-tags">{splitTags(topic.tags).map((tag) => <TagButton key={tag} tag={tag} onTag={(value) => setRoute(`/?tag=${encodeURIComponent(value)}`)} />)}</div>
          <div className="gf-detail-author"><button className="gf-person-link" onClick={() => setRoute(`/user/${topic.userId}`)}><img src={topic.avatarUrl || DEFAULT_AVATAR} alt={topic.username || 'РђРІС‚РѕСЂ'} /></button><div><button className="gf-name-link" onClick={() => setRoute(`/user/${topic.userId}`)}>{topic.username}</button><span>{formatTime(topic.createdAt)} вЂў {topic.categoryName}</span></div></div>
          <div className="gf-detail-content" dangerouslySetInnerHTML={{ __html: sanitizeRichText(topic.content).replace(/\n/g, '<br>') }}></div>
          {topic.codeBlock && <div className="gf-code-block">
            <div className="gf-code-label"><span>{topic.codeLanguage || 'code'}</span><strong>РљРѕРґ</strong></div>
            <pre className="gf-code"><code>{topic.codeBlock}</code></pre>
          </div>}
          {topic.pollQuestion && <PollDisplay topicId={topic.id} question={topic.pollQuestion} options={String(topic.pollOptions || '').split('\n').filter(Boolean)} />}
          {!!attachments.length && <AttachmentGallery files={attachments} />}
          <div className="gf-detail-metrics">
            <button type="button" onClick={openCommentForm} className={commentFormOpen ? 'active' : ''}><Icon name="message" /> {topic.commentsCount}</button>
            <button type="button" onClick={toggleTopicLike} className={topic.likedByCurrentUser ? 'active liked' : ''}><Icon name="heart" /> {topic.likesCount}</button>
            <div className="gf-viewers-wrap">
              <button type="button" onClick={toggleViewers} className={viewersOpen ? 'active' : ''}><Icon name="eye" /> {topic.viewsCount}</button>
              {viewersOpen && <div className="gf-viewers-menu">
                {viewersLoading && <p>Р—Р°РіСЂСѓР·РєР°...</p>}
                {!viewersLoading && !viewers.length && <p>РџРѕРєР° РЅРµС‚ РїСЂРѕСЃРјРѕС‚СЂРѕРІ.</p>}
                {!viewersLoading && viewers.map((viewer) => (
                  <button type="button" key={viewer.id} onClick={() => setRoute(`/user/${viewer.id}`)}>
                    <img src={viewer.avatarUrl || DEFAULT_AVATAR} alt={viewer.username || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ'} />
                    <span>{viewer.username || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ'}</span>
                  </button>
                ))}
              </div>}
            </div>
          </div>
          {(commentFormOpen || replyTo) && <form id="answer" className="gf-comment-form" onSubmit={sendComment}>
            {replyTo && <div className="gf-reply-target">РћС‚РІРµС‚ РґР»СЏ {replyTo.username}<button type="button" onClick={() => setReplyTo(null)}>РћС‚РјРµРЅРёС‚СЊ</button></div>}
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={replyTo ? 'РќР°РїРёС€РёС‚Рµ РѕС‚РІРµС‚ РЅР° РєРѕРјРјРµРЅС‚Р°СЂРёР№' : 'РќР°РїРёС€РёС‚Рµ РѕС‚РІРµС‚'} rows="4"></textarea>
            <button type="submit">РћС‚РїСЂР°РІРёС‚СЊ</button>
          </form>}
          <h2>РћС‚РІРµС‚С‹</h2>
          <div className="gf-comments">{commentTree.map((item) => <CommentItem key={item.id} item={item} topic={topic} currentUser={currentUser} onReload={load} onReply={(target) => { setReplyTo(target); setCommentFormOpen(true); setComment(`@${target.username} `); setTimeout(() => document.getElementById('answer')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0); }} />)}</div>
        </article>
        {aiOpen && (
          <aside className="gf-ai-chat" role="dialog" aria-label="РР-СЂР°Р·Р±РѕСЂ РѕР±СЃСѓР¶РґРµРЅРёСЏ">
            <div className="gf-ai-chat-head">
              <div><Icon name="star" size={18} /><strong>РР-СЂР°Р·Р±РѕСЂ</strong></div>
              <button type="button" title="Р—Р°РєСЂС‹С‚СЊ" onClick={closeAiSummary}><Icon name="x" size={16} /></button>
            </div>
            <div className="gf-ai-chat-body">
              <div className="gf-ai-message assistant">
                <strong>Project Forum AI</strong>
                {aiLoading && <p>Р§РёС‚Р°СЋ РїРѕСЃС‚ Рё РєРѕРјРјРµРЅС‚Р°СЂРёРё, СЃРѕР±РёСЂР°СЋ РїРѕРЅСЏС‚РЅС‹Р№ СЂР°Р·Р±РѕСЂ...</p>}
                {aiError && <p className="gf-ai-error">{aiError}</p>}
                {aiSummary?.summary && <div className="gf-ai-summary-text">{formatAiSummary(aiSummary.summary)}</div>}
              </div>
            </div>
          </aside>
        )}
        </>
      )}
      </section>
    </main>
  );
}

function AttachmentGallery({ files, onRemove }) {
  return (
    <div className="gf-attachment-gallery">
      {files.map((file, index) => (
        <div className="gf-attachment-item" key={`${file.name}-${index}`}>
          {file.type?.startsWith('image/') && <img src={file.url} alt={file.name || 'Р’Р»РѕР¶РµРЅРёРµ'} />}
          {file.type?.startsWith('video/') && <video src={file.url} controls></video>}
          {file.type?.startsWith('audio/') && <audio src={file.url} controls></audio>}
          {!isPreviewableAttachment(file) && <a href={file.url} target="_blank">{file.name || 'Р”РѕРєСѓРјРµРЅС‚'}</a>}
          <span>{file.name || 'Р¤Р°Р№Р»'}</span>
          {onRemove && <button className="gf-attachment-remove" type="button" onClick={() => onRemove(index)}>Г—</button>}
        </div>
      ))}
    </div>
  );
}

function PollDisplay({ topicId, question, options }) {
  const storageKey = `poll-vote-${topicId}`;
  const countKey = `poll-counts-${topicId}`;
  const makeCounts = () => {
    const saved = localStorage.getItem(countKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === options.length) return parsed.map((item) => Number(item) || 0);
      } catch {}
    }
    return options.map((option, index) => {
      const raw = `${topicId}-${option}-${index}`;
      let hash = 0;
      for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) % 997;
      return 2 + (hash % 9);
    });
  };
  const [selected, setSelected] = useState(() => localStorage.getItem(storageKey) || '');
  const [counts, setCounts] = useState(makeCounts);
  const vote = (option) => {
    setCounts((items) => {
      const next = [...items];
      const prevIndex = options.indexOf(selected);
      const nextIndex = options.indexOf(option);
      if (prevIndex >= 0 && selected !== option) next[prevIndex] = Math.max(0, next[prevIndex] - 1);
      if (nextIndex >= 0 && selected !== option) next[nextIndex] += 1;
      localStorage.setItem(countKey, JSON.stringify(next));
      return next;
    });
    setSelected(option);
    localStorage.setItem(storageKey, option);
  };
  const totalVotes = Math.max(1, counts.reduce((sum, item) => sum + item, 0));
  return (
    <div className="gf-topic-poll">
      <strong>{question}</strong>
      {options.map((item, index) => {
        const percent = Math.round((counts[index] || 0) * 100 / totalVotes);
        return (
          <button className={selected === item ? 'active' : ''} key={item} onClick={() => vote(item)}>
            <span className="gf-poll-fill" style={{ width: `${percent}%` }}></span>
            <span className="gf-poll-text">{item}</span>
            <span className="gf-poll-percent">{percent}%</span>
          </button>
        );
      })}
      {selected && <span>Р’Р°С€ РІС‹Р±РѕСЂ: {selected}</span>}
    </div>
  );
}

function NewTopic({ editId = null }) {
  const user = getCurrentUser();
  const fileInput = useRef(null);
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const undoStackRef = useRef([]);
  const [forums, setForums] = useState([]);
  const [categories, setCategories] = useState([]);
  const [forumQuery, setForumQuery] = useState('');
  const [status, setStatus] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [fontSize, setFontSize] = useState('16');
  const [textColor, setTextColor] = useState('#151923');
  const [showStyles, setShowStyles] = useState(true);
  const [form, setForm] = useState({ forumId: '', categoryId: '', title: '', content: '', tags: '', pollQuestion: '', codeBlock: '', codeLanguage: '', attachmentName: '' });
  const [attachments, setAttachments] = useState([]);
  const isEditing = Boolean(editId);

  useEffect(() => { fetchJson('/forum/forums').then(setForums).catch((error) => setStatus(error.message)); }, []);
  useEffect(() => { if (form.forumId) fetchJson(`/forum/forums/${form.forumId}/categories`).then(setCategories).catch((error) => setStatus(error.message)); }, [form.forumId]);
  useEffect(() => {
    if (!editId) return;
    fetchJson(`/forum/topics/${editId}`)
      .then((topic) => {
        if (!user?.id || Number(user.id) !== Number(topic.userId)) {
          setStatus('Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ С‚РµРјСѓ РјРѕР¶РµС‚ С‚РѕР»СЊРєРѕ Р°РІС‚РѕСЂ.');
          return;
        }
        setForm({
          forumId: topic.forumId || '',
          categoryId: topic.categoryId || '',
          title: topic.title || '',
          content: topic.content || '',
          tags: topic.tags || '',
          pollQuestion: topic.pollQuestion || '',
          codeBlock: topic.codeBlock || '',
          codeLanguage: topic.codeLanguage || '',
          attachmentName: ''
        });
        const nextPollOptions = String(topic.pollOptions || '').split('\n').filter(Boolean);
        setPollOptions(nextPollOptions.length ? nextPollOptions : ['', '']);
        setAttachments(unpackAttachments(topic.attachmentUrl, topic.attachmentType));
        setTimeout(() => {
          if (editorRef.current) editorRef.current.innerHTML = topic.content || '';
        }, 0);
      })
      .catch((error) => setStatus(error.message));
  }, [editId]);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const selectedForum = forums.find((forum) => Number(forum.id) === Number(form.forumId));
  const filteredForums = forums.filter((forum) => forum.title.toLowerCase().includes(forumQuery.toLowerCase())).slice(0, 5);
  const togglePoll = () => {
    update('pollQuestion', form.pollQuestion ? '' : 'Р’РѕРїСЂРѕСЃ РѕРїСЂРѕСЃР°');
    if (!form.pollQuestion) setPollOptions(['', '']);
  };
  const detectLanguage = (code) => {
    if (/public\s+class|System\.out|@Override/.test(code)) return 'java';
    if (/function|const |let |=>/.test(code)) return 'javascript';
    if (/def |import |print\(/.test(code)) return 'python';
    if (/<\/?[a-z][\s\S]*>/i.test(code)) return 'html';
    if (/#include|int main/.test(code)) return 'cpp';
    return 'code';
  };
  const toggleCode = () => update('codeBlock', form.codeBlock ? '' : '// РІСЃС‚Р°РІСЊС‚Рµ РєРѕРґ СЃСЋРґР°');
  const pushEditorHistory = () => {
    const html = editorRef.current?.innerHTML || '';
    const stack = undoStackRef.current;
    if (stack[stack.length - 1] !== html) {
      stack.push(html);
      if (stack.length > 80) stack.shift();
    }
  };
  const undoEditor = () => {
    const previous = undoStackRef.current.pop();
    if (previous === undefined || !editorRef.current) return;
    editorRef.current.innerHTML = previous;
    update('content', normalizeEditorHtml(editorRef.current));
    editorRef.current.focus();
  };
  const syncEditor = () => update('content', normalizeEditorHtml(editorRef.current));
  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return;
    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    const range = savedRangeRef.current;
    if (!range) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };
  const applyCommand = (command, value = null) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    syncEditor();
    saveSelection();
  };
  const applyInlineElement = (tagName) => {
    editorRef.current?.focus();
    restoreSelection();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed || !editorRef.current?.contains(range.commonAncestorContainer)) return;
    pushEditorHistory();
    document.execCommand(tagName === 'strong' ? 'bold' : 'italic', false, null);
    syncEditor();
    saveSelection();
  };
  const applyInlineStyle = (styleName, value) => {
    editorRef.current?.focus();
    restoreSelection();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;
    pushEditorHistory();
    const span = document.createElement('span');
    span.style[styleName] = value;
    try {
      range.surroundContents(span);
    } catch {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    selection.addRange(nextRange);
    savedRangeRef.current = nextRange.cloneRange();
    syncEditor();
  };
  const applyFontSize = (size) => {
    setFontSize(size);
    applyInlineStyle('fontSize', `${size}px`);
  };
  const chooseFile = async (event) => {
    try {
      const selected = Array.from(event.target.files || []);
      if (attachments.length + selected.length > 3) throw new Error('РњРѕР¶РЅРѕ РїСЂРёРєСЂРµРїРёС‚СЊ РјР°РєСЃРёРјСѓРј 3 С„Р°Р№Р»Р°.');
      const nextFiles = await Promise.all(selected.map(fileToDataUrl));
      setAttachments((items) => [...items, ...nextFiles].slice(0, 3));
      event.target.value = '';
    } catch (error) { setStatus(error.message); }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!user?.id) { window.location.href = 'login.html'; return; }
    if (!form.forumId || !form.categoryId) {
      setStatus('Р’С‹Р±РµСЂРёС‚Рµ С„РѕСЂСѓРј Рё РєР°С‚РµРіРѕСЂРёСЋ СЃРїСЂР°РІР°.');
      return;
    }
    if (!String(form.content || '').replace(/<[^>]*>/g, '').trim()) {
      setStatus('РћРїРёС€РёС‚Рµ РІРѕРїСЂРѕСЃ РёР»Рё РёРґРµСЋ.');
      return;
    }
    try {
      setStatus(isEditing ? 'РЎРѕС…СЂР°РЅСЏРµРј С‚РµРјСѓ...' : 'РџСѓР±Р»РёРєСѓРµРј С‚РµРјСѓ...');
      const saved = await fetchJson(isEditing ? `/forum/topics/${editId}` : '/forum/topics', {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...form,
          ...packAttachments(attachments),
          forumId: Number(form.forumId),
          categoryId: Number(form.categoryId),
          pollOptions: form.pollQuestion ? pollOptions.filter(Boolean).join('\n') : '',
          codeLanguage: form.codeBlock ? detectLanguage(form.codeBlock) : ''
        })
      });
      setRoute(`/topic/${saved.id}`);
    } catch (error) { setStatus(error.message); }
  };
  return (
    <main className="gf-compose-page">
      <aside className="gf-compose-tools">
        <button type="button" className={showStyles ? 'active tool-on' : ''} onClick={() => setShowStyles(!showStyles)}><Icon name="pen" /> РЎС‚РёР»Рё</button>
        <button type="button" onClick={() => fileInput.current?.click()}><Icon name="clip" /> Р¤Р°Р№Р»</button>
        <button type="button" className={form.pollQuestion ? 'active tool-on' : ''} onClick={togglePoll}><Icon name="poll" /> РћРїСЂРѕСЃ</button>
        <button type="button" className={form.codeBlock ? 'active tool-on' : ''} onClick={toggleCode}><Icon name="code" /> РљРѕРґ</button>
      </aside>
      <form className="gf-compose-editor" onSubmit={submit}>
        <div className="gf-compose-head">
          <button type="button" onClick={() => isEditing ? setRoute(`/topic/${editId}`) : setRoute('/')}>РќР°Р·Р°Рґ</button>
          <strong>{isEditing ? 'Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ С‚РµРјСѓ' : 'РќРѕРІР°СЏ С‚РµРјР°'}</strong>
          <button type="submit">{isEditing ? 'РЎРѕС…СЂР°РЅРёС‚СЊ' : 'РћРїСѓР±Р»РёРєРѕРІР°С‚СЊ'}</button>
        </div>
        <div className="gf-compose-layout">
          <div className="gf-compose-main">
        {showStyles && <div className="gf-text-toolbar">
          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyInlineElement('strong'); }}>B</button>
          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyInlineElement('em'); }}>I</button>
          <select className="gf-size-select" value={fontSize} onMouseDown={saveSelection} onChange={(event) => applyFontSize(event.target.value)}>
            {Array.from({ length: 13 }, (_, index) => 12 + index).map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <input type="color" value={textColor} onMouseDown={saveSelection} onChange={(event) => { setTextColor(event.target.value); applyInlineStyle('color', event.target.value); }} />
        </div>}
        <input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Р—Р°РіРѕР»РѕРІРѕРє" maxLength="200" required />
        <input value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="РўРµРіРё" />
        <div id="topic-content-editor" ref={editorRef} className="gf-rich-editor" contentEditable="true" data-placeholder="РћРїРёС€РёС‚Рµ РІРѕРїСЂРѕСЃ РёР»Рё РёРґРµСЋ" onBeforeInput={pushEditorHistory} onInput={syncEditor} onMouseUp={saveSelection} onKeyUp={saveSelection} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undoEditor(); } }}></div>
        <input ref={fileInput} type="file" multiple hidden accept={ATTACHMENT_TYPES.join(',')} onChange={chooseFile} />
        <AttachmentGallery files={attachments} onRemove={(index) => setAttachments((items) => items.filter((_, itemIndex) => itemIndex !== index))} />
        {form.pollQuestion && <section className="gf-compose-extra gf-poll-editor">
          <input value={form.pollQuestion} onChange={(event) => update('pollQuestion', event.target.value)} placeholder="Р’РѕРїСЂРѕСЃ РѕРїСЂРѕСЃР°" />
          {pollOptions.map((option, index) => (
            <div className="gf-poll-option-row" key={index}>
              <input value={option} onChange={(event) => setPollOptions((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Р’Р°СЂРёР°РЅС‚ ${index + 1}`} />
              <button type="button" onClick={() => setPollOptions((items) => items.filter((_, itemIndex) => itemIndex !== index))}>РЈРґР°Р»РёС‚СЊ</button>
            </div>
          ))}
          <button type="button" onClick={() => setPollOptions((items) => [...items, ''])}>+</button>
        </section>}
        {form.codeBlock && <section className="gf-code-editor">
          <div><span>{detectLanguage(form.codeBlock)}</span><strong>РљРѕРґ</strong></div>
          <textarea value={form.codeBlock} onChange={(event) => update('codeBlock', event.target.value)} rows="9" spellCheck="false" placeholder="// РєРѕРґ"></textarea>
        </section>}
        <p className="gf-form-status">{status}</p>
          </div>
          <aside className="gf-compose-side">
            <label className="gf-search"><Icon name="search" /><input value={forumQuery} onChange={(event) => setForumQuery(event.target.value)} placeholder="РџРѕРёСЃРє С„РѕСЂСѓРјРѕРІ" /></label>
            <div className="gf-compose-forums">
              {filteredForums.map((forum) => <button type="button" key={forum.id} className={Number(form.forumId) === Number(forum.id) ? 'active' : ''} onClick={() => { update('forumId', forum.id); update('categoryId', ''); }}>{forum.title}</button>)}
            </div>
            <h3>{selectedForum ? 'РљР°С‚РµРіРѕСЂРёРё' : 'Р’С‹Р±РµСЂРёС‚Рµ С„РѕСЂСѓРј'}</h3>
            <div className="gf-compose-categories">
              {categories.map((category) => <button type="button" key={category.id} className={Number(form.categoryId) === Number(category.id) ? 'active' : ''} onClick={() => update('categoryId', category.id)}>{category.name}</button>)}
            </div>
          </aside>
        </div>
      </form>
    </main>
  );
}

function Profile({ onLogout, onUserChange }) {
  const user = getCurrentUser();
  const [tab, setTab] = useState(new URLSearchParams((window.location.hash.split('?')[1] || '')).get('tab') || 'profile');
  const [profile, setProfile] = useState(user);
  const [topics, setTopics] = useState([]);
  const [comments, setComments] = useState([]);
  const [forums, setForums] = useState([]);
  const [savedTopics, setSavedTopics] = useState([]);
  const [savedComments, setSavedComments] = useState([]);
  const [status, setStatus] = useState('');
  const [accountForm, setAccountForm] = useState({ email: '', currentPassword: '', newPassword: '' });
  const [cropImage, setCropImage] = useState('');
  const [cropZoom, setCropZoom] = useState(1);
  const avatarInput = useRef(null);

  useEffect(() => {
    if (!user?.id) { window.location.href = 'login.html'; return; }
    Promise.all([fetchJson(`/auth/users/${user.id}`), fetchJson(`/forum/users/${user.id}/topics`), fetchJson(`/forum/users/${user.id}/comments`), fetchJson('/forum/forums')])
      .then(([nextProfile, nextTopics, nextComments, nextForums]) => {
        setProfile(nextProfile);
        setAccountForm((prev) => ({ ...prev, email: nextProfile.email || '' }));
        setTopics(nextTopics);
        setComments(nextComments);
        setForums(nextForums);
      })
      .catch((error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    if (tab !== 'saved') return;
    const topicIds = JSON.parse(localStorage.getItem('savedTopics') || '[]');
    setSavedComments(JSON.parse(localStorage.getItem('savedComments') || '[]'));
    Promise.all(topicIds.map((id) => fetchJson(`/forum/topics/${id}`).catch(() => null)))
      .then((items) => setSavedTopics(items.filter(Boolean)))
      .catch((error) => setStatus(error.message));
  }, [tab]);

  const saveProfile = async () => {
    try {
      const updated = await fetchJson(`/auth/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          username: profile.username,
          avatarUrl: profile.avatarUrl || null,
          bio: profile.bio || '',
          email: accountForm.email,
          currentPassword: accountForm.currentPassword,
          newPassword: accountForm.newPassword
        })
      });
      saveCurrentUser(updated);
      onUserChange(getCurrentUser());
      setAccountForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }));
      setStatus('РџСЂРѕС„РёР»СЊ СЃРѕС…СЂР°РЅС‘РЅ.');
    } catch (error) { setStatus(error.message); }
  };

  const totalLikes = topics.reduce((sum, item) => sum + Number(item.likesCount || 0), 0) + comments.reduce((sum, item) => sum + Number(item.likesCount || 0), 0);
  const totalViews = topics.reduce((sum, item) => sum + Number(item.viewsCount || 0), 0);

  const chooseAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setStatus('Р¤РѕС‚Рѕ РїСЂРѕС„РёР»СЏ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ png РёР»Рё jpg.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('Р¤РѕС‚Рѕ РїСЂРѕС„РёР»СЏ РЅРµ РґРѕР»Р¶РЅРѕ РїСЂРµРІС‹С€Р°С‚СЊ 10 РњР‘.');
      return;
    }
    const data = await fileToDataUrl(file);
    setCropImage(data.url);
    setCropZoom(1);
  };

  const applyAvatarCrop = () => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 320;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const sourceSize = Math.min(image.width, image.height) / cropZoom;
      const sx = (image.width - sourceSize) / 2;
      const sy = (image.height - sourceSize) / 2;
      ctx.drawImage(image, sx, sy, sourceSize, sourceSize, 0, 0, size, size);
      setProfile((prev) => ({ ...prev, avatarUrl: canvas.toDataURL('image/jpeg', 0.92) }));
      setCropImage('');
    };
    image.src = cropImage;
  };

  return (
    <main className="gf-settings-page">
      <section className="gf-settings-modal">
        <nav className="gf-settings-tabs">
          <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>РџСЂРѕС„РёР»СЊ</button>
          <button className={tab === 'account' ? 'active' : ''} onClick={() => setTab('account')}>РђРєРєР°СѓРЅС‚</button>
          <button className={tab === 'topics' ? 'active' : ''} onClick={() => setTab('topics')}>РЎРѕР·РґР°РЅРЅС‹Рµ С‚РµРјС‹</button>
          <button className={tab === 'comments' ? 'active' : ''} onClick={() => setTab('comments')}>РљРѕРјРјРµРЅС‚Р°СЂРёРё</button>
          <button className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>РЎРѕС…СЂР°РЅС‘РЅРЅС‹Рµ</button>
          {user?.admin && <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>РџР°РЅРµР»СЊ СѓРїСЂР°РІР»РµРЅРёСЏ</button>}
          <button className="danger" onClick={onLogout}>Р’С‹Р№С‚Рё</button>
        </nav>
        <div className="gf-settings-content">
          {tab === 'profile' && profile && (
            <>
              <label>Р¤РѕС‚Рѕ РїСЂРѕС„РёР»СЏ</label>
              <div className="gf-avatar-row"><img src={profile.avatarUrl || DEFAULT_AVATAR} alt={profile.username} /><button onClick={() => avatarInput.current?.click()}>РР·РјРµРЅРёС‚СЊ С„РѕС‚Рѕ</button><button className="danger" onClick={() => setProfile((prev) => ({ ...prev, avatarUrl: '' }))}>РЈРґР°Р»РёС‚СЊ С„РѕС‚Рѕ</button></div>
              <input ref={avatarInput} type="file" hidden accept="image/*" onChange={chooseAvatar} />
              <label>РРјСЏ РїСЂРѕС„РёР»СЏ</label>
              <input value={profile.username || ''} onChange={(event) => setProfile((prev) => ({ ...prev, username: event.target.value }))} />
              <label>Email</label>
              <input value={profile.email || ''} disabled />
              <label>Рћ СЃРµР±Рµ</label>
              <textarea rows="5" value={profile.bio || ''} onChange={(event) => setProfile((prev) => ({ ...prev, bio: event.target.value }))} placeholder="Р Р°СЃСЃРєР°Р¶РёС‚Рµ РїР°СЂСѓ СЃР»РѕРІ Рѕ СЃРµР±Рµ"></textarea>
              <div className="gf-profile-stats">
                <div><Icon name="message" /><strong>{topics.length}</strong><span>СЃРѕР·РґР°РЅРЅС‹С… РѕР±СЃСѓР¶РґРµРЅРёР№</span></div>
                <div><Icon name="heart" /><strong>{totalLikes}</strong><span>РїРѕР»СѓС‡РµРЅРЅС‹С… Р»Р°Р№РєРѕРІ</span></div>
                <div><Icon name="eye" /><strong>{totalViews}</strong><span>РїСЂРѕСЃРјРѕС‚СЂРѕРІ С‚РµРј</span></div>
              </div>
              <button className="gf-save-button" onClick={saveProfile}>РЎРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ</button>
            </>
          )}
          {tab === 'account' && <div className="gf-account-form">
            <h2>РђРєРєР°СѓРЅС‚</h2>
            <label>Email</label>
            <input value={accountForm.email} onChange={(event) => setAccountForm((prev) => ({ ...prev, email: event.target.value }))} />
            <label>РўРµРєСѓС‰РёР№ РїР°СЂРѕР»СЊ</label>
            <input type="password" value={accountForm.currentPassword} onChange={(event) => setAccountForm((prev) => ({ ...prev, currentPassword: event.target.value }))} />
            <label>РќРѕРІС‹Р№ РїР°СЂРѕР»СЊ</label>
            <input type="password" value={accountForm.newPassword} onChange={(event) => setAccountForm((prev) => ({ ...prev, newPassword: event.target.value }))} />
            <p>РЎС‚Р°С‚СѓСЃ: {profile?.blocked ? 'РѕРіСЂР°РЅРёС‡РµРЅ' : 'Р°РєС‚РёРІРµРЅ'}</p>
            <button className="gf-save-button" onClick={saveProfile}>РЎРѕС…СЂР°РЅРёС‚СЊ Р°РєРєР°СѓРЅС‚</button>
          </div>}
          {tab === 'topics' && <ContentList title="РЎРѕР·РґР°РЅРЅС‹Рµ С‚РµРјС‹" items={topics} type="topic" />}
          {tab === 'comments' && <ContentList title="РљРѕРјРјРµРЅС‚Р°СЂРёРё" items={comments} type="comment" />}
          {tab === 'saved' && <div className="gf-saved-space">
            <ContentList title="РЎРѕС…СЂР°РЅС‘РЅРЅС‹Рµ С‚РµРјС‹" items={savedTopics} type="topic" />
            <ContentList title="РЎРѕС…СЂР°РЅС‘РЅРЅС‹Рµ РєРѕРјРјРµРЅС‚Р°СЂРёРё" items={savedComments} type="comment" />
          </div>}
          {tab === 'admin' && user?.admin && <AdminPanel />}
        </div>
        {status && <p className="gf-form-status">{status}</p>}
      </section>
      {cropImage && <div className="gf-crop-modal">
        <div className="gf-crop-card">
          <h2>РћР±СЂРµР·РєР° С„РѕС‚Рѕ</h2>
          <div className="gf-crop-preview"><img src={cropImage} style={{ transform: `scale(${cropZoom})` }} /></div>
          <input type="range" min="1" max="2" step="0.05" value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} />
          <div className="gf-crop-actions"><button onClick={() => setCropImage('')}>РћС‚РјРµРЅР°</button><button onClick={applyAvatarCrop}>РџСЂРёРјРµРЅРёС‚СЊ</button></div>
        </div>
      </div>}
    </main>
  );
}

function PublicUserPage({ userId }) {
  const [profile, setProfile] = useState(null);
  const [topics, setTopics] = useState([]);
  const [comments, setComments] = useState([]);
  const [forums, setForums] = useState([]);
  const [popular, setPopular] = useState([]);
  const [status, setStatus] = useState('Р—Р°РіСЂСѓР¶Р°РµРј РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ...');
  const [toast, setToast] = useState('');

  useEffect(() => {
    Promise.all([
      fetchJson(`/auth/users/${userId}`),
      fetchJson(`/forum/users/${userId}/topics`),
      fetchJson(`/forum/users/${userId}/comments`),
      fetchJson('/forum/forums'),
      fetchJson('/forum/topics/popular')
    ]).then(([nextProfile, nextTopics, nextComments, nextForums, nextPopular]) => {
      setProfile(nextProfile);
      setTopics(nextTopics);
      setComments(nextComments);
      setForums(nextForums);
      setPopular(nextPopular);
      setStatus('');
    }).catch((error) => setStatus(error.message));
  }, [userId]);

  const totalLikes = topics.reduce((sum, item) => sum + Number(item.likesCount || 0), 0) + comments.reduce((sum, item) => sum + Number(item.likesCount || 0), 0);
  const totalViews = topics.reduce((sum, item) => sum + Number(item.viewsCount || 0), 0);
  const isOnline = Number(getCurrentUser()?.id) === Number(userId);
  const likeTopic = async (topic) => {
    if (!getCurrentUser()?.id) { window.location.href = 'login.html'; return; }
    const updated = await fetchJson(`/forum/topics/${topic.id}/like`, { method: 'POST' });
    setTopics((items) => items.map((item) => item.id === topic.id ? { ...item, likesCount: updated.likesCount, likedByCurrentUser: updated.likedByCurrentUser } : item));
  };

  return (
    <main className="gf-page">
      {toast && <div className="gf-toast">{toast}</div>}
      <Sidebar topics={popular} forums={forums} />
      <section className="gf-main-column">
        {status && <div className="gf-state">{status}</div>}
        {profile && <section className="gf-public-profile">
          <div className="gf-public-head">
            <img src={profile.avatarUrl || DEFAULT_AVATAR} alt={profile.username} />
            <div>
              <h1>{profile.username}</h1>
              <p className="gf-user-status"><span className={isOnline ? 'online' : ''}></span>{isOnline ? 'РћРЅР»Р°Р№РЅ' : 'РћС„С„Р»Р°Р№РЅ'}</p>
              <p className="gf-user-bio">{profile.bio || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РїРѕРєР° РЅРµ РґРѕР±Р°РІРёР» РѕРїРёСЃР°РЅРёРµ Рѕ СЃРµР±Рµ.'}</p>
            </div>
          </div>
          <div className="gf-profile-stats">
            <div><Icon name="message" /><strong>{topics.length}</strong><span>С‚РµРј</span></div>
            <div><Icon name="heart" /><strong>{totalLikes}</strong><span>Р»Р°Р№РєРѕРІ</span></div>
            <div><Icon name="eye" /><strong>{totalViews}</strong><span>РїСЂРѕСЃРјРѕС‚СЂРѕРІ</span></div>
          </div>
        </section>}
        {topics.map((topic) => <TopicCard key={topic.id} topic={topic} onLike={likeTopic} onToast={setToast} onDeleted={(id) => setTopics((items) => items.filter((item) => item.id !== id))} />)}
        {!status && !topics.length && <div className="gf-state">РЈ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РїРѕРєР° РЅРµС‚ С‚РµРј.</div>}
      </section>
    </main>
  );
}

function ContentList({ title, items, type }) {
  return <div className="gf-list"><h2>{title}</h2>{items.map((item) => <button key={`${type}-${item.id}`} onClick={() => type === 'forum' ? setRoute(`/forum/${item.id}`) : setRoute(`/topic/${item.topicId || item.id}`)}>
    <strong>{type === 'comment' ? item.topicTitle : (item.title || item.content)}</strong>
    {type === 'comment' && <p>{item.content}</p>}
    <span>{item.forumTitle || item.subtitle || ''}</span>
  </button>)}{!items.length && <p>РџРѕРєР° РїСѓСЃС‚Рѕ.</p>}</div>;
}

function AdminPanel() {
  const [forums, setForums] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('');
  const [forumForm, setForumForm] = useState({ title: '', slug: '' });
  const [topicForm, setTopicForm] = useState({ forumId: '', categoryId: '', title: '', content: '' });
  const [commentForm, setCommentForm] = useState({ topicId: '', content: '' });

  const loadAdmin = async () => {
    const [nextForums, nextUsers] = await Promise.all([fetchJson('/forum/forums'), fetchJson('/admin/users')]);
    setForums(nextForums);
    setUsers(nextUsers);
    if (!topicForm.forumId && nextForums[0]) setTopicForm((prev) => ({ ...prev, forumId: String(nextForums[0].id) }));
  };

  useEffect(() => { loadAdmin().catch((error) => setStatus(error.message)); }, []);
  useEffect(() => {
    if (!topicForm.forumId) return;
    fetchJson(`/forum/forums/${topicForm.forumId}/categories`).then((items) => {
      setCategories(items);
      if (!items.some((item) => String(item.id) === String(topicForm.categoryId))) {
        setTopicForm((prev) => ({ ...prev, categoryId: items[0] ? String(items[0].id) : '' }));
      }
    }).catch((error) => setStatus(error.message));
  }, [topicForm.forumId]);

  const createForum = async (event) => {
    event.preventDefault();
    await fetchJson('/admin/forums', { method: 'POST', body: JSON.stringify(forumForm) });
    setForumForm({ title: '', slug: '' });
    setStatus('Р¤РѕСЂСѓРј РґРѕР±Р°РІР»РµРЅ.');
    await loadAdmin();
  };

  const deleteForum = async (id) => {
    await fetch(`${API_BASE}/admin/forums/${id}`, { method: 'DELETE', headers: { 'X-User-Id': String(getCurrentUser().id) } });
    await loadAdmin();
  };

  const toggleBlock = async (item) => {
    await fetchJson(`/admin/users/${item.id}/status`, { method: 'PUT', body: JSON.stringify({ blocked: !item.blocked }) });
    await loadAdmin();
  };

  const deleteUser = async (id) => {
    await fetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE', headers: { 'X-User-Id': String(getCurrentUser().id) } });
    await loadAdmin();
  };

  const createTopic = async (event) => {
    event.preventDefault();
    await fetchJson('/forum/topics', { method: 'POST', body: JSON.stringify({ ...topicForm, forumId: Number(topicForm.forumId), categoryId: Number(topicForm.categoryId) }) });
    setTopicForm((prev) => ({ ...prev, title: '', content: '' }));
    setStatus('РўРµРјР° РґРѕР±Р°РІР»РµРЅР°.');
  };

  const createComment = async (event) => {
    event.preventDefault();
    await fetchJson(`/forum/topics/${commentForm.topicId}/comments`, { method: 'POST', body: JSON.stringify({ content: commentForm.content }) });
    setCommentForm({ topicId: '', content: '' });
    setStatus('РљРѕРјРјРµРЅС‚Р°СЂРёР№ РґРѕР±Р°РІР»РµРЅ.');
  };

  return (
    <div className="gf-admin-panel">
      <h2>РџР°РЅРµР»СЊ СѓРїСЂР°РІР»РµРЅРёСЏ</h2>
      <section>
        <h3>Р¤РѕСЂСѓРјС‹</h3>
        <form onSubmit={createForum} className="gf-admin-form"><input value={forumForm.title} onChange={(e) => setForumForm((p) => ({ ...p, title: e.target.value }))} placeholder="РќР°Р·РІР°РЅРёРµ С„РѕСЂСѓРјР°" required /><input value={forumForm.slug} onChange={(e) => setForumForm((p) => ({ ...p, slug: e.target.value }))} placeholder="Slug" /><button>Р”РѕР±Р°РІРёС‚СЊ</button></form>
        <div className="gf-admin-list">{forums.map((forum) => <div key={forum.id}><strong>{forum.title}</strong><span>{forum.slug}</span><button onClick={() => deleteForum(forum.id)}>РЈРґР°Р»РёС‚СЊ</button></div>)}</div>
      </section>
      <section>
        <h3>РџРѕР»СЊР·РѕРІР°С‚РµР»Рё</h3>
        <div className="gf-admin-list">{users.map((item) => <div key={item.id}><strong>{item.username}</strong><span>{item.email}{item.admin ? ' В· Р°РґРјРёРЅ' : ''}</span><button onClick={() => toggleBlock(item)}>{item.blocked ? 'Р Р°Р·Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ' : 'Р—Р°Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ'}</button><button onClick={() => deleteUser(item.id)}>РЈРґР°Р»РёС‚СЊ</button></div>)}</div>
      </section>
      <section>
        <h3>РЎРѕР·РґР°РЅРёРµ РєРѕРЅС‚РµРЅС‚Р°</h3>
        <form onSubmit={createTopic} className="gf-admin-form">
          <select value={topicForm.forumId} onChange={(e) => setTopicForm((p) => ({ ...p, forumId: e.target.value }))}>{forums.map((forum) => <option key={forum.id} value={forum.id}>{forum.title}</option>)}</select>
          <select value={topicForm.categoryId} onChange={(e) => setTopicForm((p) => ({ ...p, categoryId: e.target.value }))}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <input value={topicForm.title} onChange={(e) => setTopicForm((p) => ({ ...p, title: e.target.value }))} placeholder="РќР°Р·РІР°РЅРёРµ С‚РµРјС‹" required />
          <textarea value={topicForm.content} onChange={(e) => setTopicForm((p) => ({ ...p, content: e.target.value }))} placeholder="РўРµРєСЃС‚ С‚РµРјС‹" required></textarea>
          <button>Р”РѕР±Р°РІРёС‚СЊ С‚РµРјСѓ</button>
        </form>
        <form onSubmit={createComment} className="gf-admin-form">
          <input type="number" value={commentForm.topicId} onChange={(e) => setCommentForm((p) => ({ ...p, topicId: e.target.value }))} placeholder="ID С‚РµРјС‹" required />
          <textarea value={commentForm.content} onChange={(e) => setCommentForm((p) => ({ ...p, content: e.target.value }))} placeholder="РљРѕРјРјРµРЅС‚Р°СЂРёР№" required></textarea>
          <button>Р”РѕР±Р°РІРёС‚СЊ РєРѕРјРјРµРЅС‚Р°СЂРёР№</button>
        </form>
      </section>
      {status && <p className="gf-form-status">{status}</p>}
    </div>
  );
}

function App() {
  const route = useRoute();
  const [user, setUser] = useState(getCurrentUser());
  const [theme, setTheme] = useState(() => localStorage.getItem('forumTheme') || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('forumTheme', theme);
  }, [theme]);
  const logout = () => { localStorage.removeItem('currentUser'); setUser(null); setRoute('/'); };
  const forumMatch = route.match(/^\/forum\/(\d+)/);
  const topicMatch = route.match(/^\/topic\/(\d+)/);
  const editMatch = route.match(/^\/edit\/(\d+)/);
  const userMatch = route.match(/^\/user\/(\d+)/);
  return (
    <>
      <Header user={user} onLogout={logout} route={route} theme={theme} onThemeToggle={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} />
      {(route === '/' || route.startsWith('/?')) && <Home />}
      {route === '/guides' && <Home mode="guides" />}
      {route === '/forums' && <Forums />}
      {route === '/new' && <NewTopic />}
      {editMatch && <NewTopic editId={editMatch[1]} />}
      {route.startsWith('/profile') && <Profile onLogout={logout} onUserChange={setUser} />}
      {userMatch && <PublicUserPage userId={userMatch[1]} />}
      {route === '/legacy-forum' && <LegacyForumView />}
      {forumMatch && <ForumView forumId={forumMatch[1]} />}
      {topicMatch && <TopicView topicId={topicMatch[1]} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

