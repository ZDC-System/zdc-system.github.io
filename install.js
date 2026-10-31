// Страница «Установка»: язык, тема, копирование адресов и ссылка на последний комплект.
// Ссылки в разметке уже рабочие (архив ветки main) — скрипт лишь уточняет их по GitHub.
(() => {
  'use strict';

  const REPO = 'ZDC-System/ZDC-bin-release';
  const BRANCH = 'main';

  const I18N = window.ZDC_I18N;
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} },
  };

  // ---------------------------------------------------------------- язык и тема — как на главной
  const guessLang = () => {
    const saved = store.get('zdc-landing-lang');
    if (saved && I18N[saved]) return saved;
    const nav = (navigator.language || 'ru').slice(0, 2);
    return I18N[nav] ? nav : 'en';
  };
  let lang = guessLang();
  const t = (k) => I18N[lang][k] ?? I18N.ru[k] ?? k;
  // Текст состояния скачивания хранится ключом, чтобы переводиться при смене языка.
  let status = { key: 'in.dl.loading', arg: '' };

  function renderStatus() {
    $('#dl-status').textContent = t(status.key).replace('{v}', status.arg);
  }
  function applyLang(next) {
    lang = next;
    root.lang = lang;
    store.set('zdc-landing-lang', lang);
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('.lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
    document.title = t('in.doctitle');
    renderStatus();
  }
  $$('.lang button').forEach((b) => b.addEventListener('click', () => applyLang(b.dataset.lang)));
  $('.theme-btn').addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    store.set('zdc-landing-theme', next);
  });

  // ---------------------------------------------------------------- копирование
  let toastTimer;
  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  async function copy(text, okKey, fallbackEl) {
    try { await navigator.clipboard.writeText(text); toast(t(okKey)); }
    catch (_) {
      const r = document.createRange(); r.selectNodeContents(fallbackEl);
      getSelection().removeAllRanges(); getSelection().addRange(r);
    }
  }
  $$('.copy-mail').forEach((btn) => btn.addEventListener('click', () =>
    copy(btn.dataset.mail, 'st.copied', btn.previousElementSibling)));
  // Кнопка «копировать» у каждого блока команд.
  $$('pre.code').forEach((pre) => {
    const btn = document.createElement('button');
    btn.className = 'code-copy';
    btn.type = 'button';
    btn.dataset.i18n = 'in.copy';
    btn.textContent = t('in.copy');
    btn.addEventListener('click', () => copy($('code', pre).textContent, 'in.copied', $('code', pre)));
    pre.append(btn);
  });

  // ---------------------------------------------------------------- последняя версия комплекта
  // Принимаем только ссылки на github.com этого репозитория — ответ API не доверенный.
  const isRepoUrl = (u) => typeof u === 'string' && u.startsWith(`https://github.com/${REPO}/`);

  function showMeta(text) {
    const fields = {};
    text.split('\n').forEach((line) => {
      const m = /^([a-z_]+):\s*(.+)$/.exec(line.trim());
      if (m) fields[m[1]] = m[2];
    });
    const set = (id, v) => { $(id).textContent = v || '—'; };
    set('#m-version', fields.version);
    set('#m-built', fields.built && fields.built.replace('T', ' ').replace('Z', ' UTC'));
    set('#m-arch', fields.arch && `Linux ${fields.arch}`);
    set('#m-glibc', fields.glibc);
    $('#dl-meta').hidden = false;
    return fields;
  }

  async function latest() {
    // 1. Релиз на GitHub, если он есть, — его архив с бинарниками.
    try {
      // Список, а не /releases/latest: без релизов тот отвечает 404 и шумит в консоли.
      const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=1`, { headers: { Accept: 'application/vnd.github+json' } });
      const rel = r.ok ? (await r.json())[0] : null;
      if (rel && !rel.draft) {
        const asset = (rel.assets || []).find((a) => /\.(tar\.gz|tgz)$/.test(a.name) && isRepoUrl(a.browser_download_url));
        const zip = (rel.assets || []).find((a) => /\.zip$/.test(a.name) && isRepoUrl(a.browser_download_url));
        if (asset) $('#dl-main').href = asset.browser_download_url;
        else if (isRepoUrl(rel.tarball_url)) $('#dl-main').href = rel.tarball_url;
        if (zip) $('#dl-zip').href = zip.browser_download_url;
        status = { key: 'in.dl.release', arg: String(rel.tag_name || rel.name || '').slice(0, 40) };
        renderStatus();
      }
    } catch (_) { /* сеть или лимит API — остаются ссылки на ветку */ }

    // 2. Сведения о сборке — файл VERSION из ветки.
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/VERSION`, { cache: 'no-cache' });
      if (!r.ok) throw new Error(String(r.status));
      const fields = showMeta((await r.text()).slice(0, 4000));
      if (status.key === 'in.dl.loading') status = { key: 'in.dl.branch', arg: fields.version || BRANCH };
    } catch (_) {
      if (status.key === 'in.dl.loading') status = { key: 'in.dl.offline', arg: '' };
    }
    renderStatus();
  }

  applyLang(lang);
  latest();
})();
