const route = document.body.dataset.initialRoute;
if (route) {
  window.__INITIAL_ROUTE__ = route;
}

[
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
].reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve())
  .then(loadForumApp);

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    if (src.startsWith('https://')) script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
  });
}

async function loadForumApp() {
  const response = await fetch('js/react-forum-app.jsx?v=20260505-8', { cache: 'no-store' });
  const source = await response.text();
  const script = document.createElement('script');
  script.textContent = Babel.transform(source, { presets: ['react'] }).code;
  document.body.appendChild(script);
}
