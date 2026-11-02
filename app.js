// Лендинг ZDC Systems: без сборки и зависимостей — открывается прямо с GitHub Pages.
(() => {
  'use strict';

  const I18N = window.ZDC_I18N;
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------------------------------------------------------------- язык
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} },
  };
  const guessLang = () => {
    const saved = store.get('zdc-landing-lang');
    if (saved && I18N[saved]) return saved;
    const nav = (navigator.language || 'ru').slice(0, 2);
    return I18N[nav] ? nav : 'en';
  };
  let lang = guessLang();
  const t = (k) => I18N[lang][k] ?? I18N.ru[k] ?? k;
  const langListeners = [];

  function applyLang(next) {
    lang = next;
    root.lang = lang;
    store.set('zdc-landing-lang', lang);
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('.lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
    langListeners.forEach((fn) => fn());
  }
  $$('.lang button').forEach((b) => b.addEventListener('click', () => applyLang(b.dataset.lang)));

  // ---------------------------------------------------------------- тема
  const themeListeners = [];
  $('.theme-btn').addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    store.set('zdc-landing-theme', next);
    themeListeners.forEach((fn) => fn());
  });

  // ---------------------------------------------------------------- toast
  let toastTimer;
  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------------------------------------------------------------- «расшифровка» заголовка
  const GLYPHS = '01<>/{}[]#$%&*+=?;:ЖЯЮЁΣλΩ';
  function scramble(el) {
    const target = el.textContent;
    if (reduced) return;
    let frame = 0;
    const total = 26;
    cancelAnimationFrame(el._raf);
    const tick = () => {
      frame++;
      const done = Math.floor((frame / total) * target.length);
      el.textContent = [...target].map((ch, i) => {
        if (i < done || ch === ' ') return ch;
        return GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }).join('');
      if (frame < total) el._raf = requestAnimationFrame(tick);
      else el.textContent = target;
    };
    tick();
  }
  const scrambleHero = () => $$('[data-scramble]').forEach((el, i) => setTimeout(() => scramble(el), i * 180));
  langListeners.push(scrambleHero);

  // ---------------------------------------------------------------- поле кода в hero
  function codeField(cv) {
    const ctx = cv.getContext('2d');
    const CODE = [
      'fn claim(conn: &mut PgConnection) -> Result<Report> {', '  let row = reports.filter(status.eq("pending"))',
      '    .for_update().skip_locked().first(conn)?;', 'cur.execute(f"SELECT * FROM users WHERE id={uid}")',
      'subprocess.run(cmd, shell=True)', 'app.run(debug=True, host="0.0.0.0")', 'const token = req.headers.authorization;',
      'if (!user) return res.status(401).end();', 'RUN curl -sSL https://get.sh | sh', 'privileged: true',
      'volumes: ["/var/run/docker.sock:/var/run/docker.sock"]', 'password = "hunter2"', 'open("uploads/" + name)',
      'impl ScopeGuard { fn check(&self, t: &Target) }', 'SELECT id FROM reports FOR UPDATE SKIP LOCKED;',
      'eval(request.body.expr)', 'yaml.load(data)', 'pickle.loads(blob)', 'res.send(`<div>${q}</div>`)',
      'router.get("/admin", handler)', 'FROM python:latest', 'USER root', 'hostNetwork: true',
      'let hash = Sha256::digest(token);', 'listen 80;', 'jwt.decode(t, verify=False)', 'md5(password)',
      'redirect(request.args["next"])', 'fetch(url).then(r => r.json())', 'uses: actions/checkout@v4',
    ];
    const BAD = /shell=True|debug=True|curl -sSL|privileged|docker\.sock|hunter2|eval\(|yaml\.load|pickle|\$\{q\}|latest|USER root|hostNetwork|verify=False|md5|\{uid\}|"uploads\/" \+|args\["next"\]|@v4/;
    const SEV = ['CRITICAL', 'HIGH', 'MEDIUM'];
    let W, H, cols, lineH, dpr;
    const streams = [];

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lineH = W < 700 ? 18 : 22;
      cols = Math.max(2, Math.floor(W / 380));
      streams.length = 0;
      for (let c = 0; c < cols; c++) {
        const lines = [];
        const n = Math.ceil(H / lineH) + 4;
        for (let i = 0; i < n; i++) lines.push(mkLine());
        streams.push({ x: 24 + c * (W / cols), off: Math.random() * lineH, speed: 0.15 + Math.random() * 0.25, lines });
      }
    }
    function mkLine() {
      const text = CODE[(Math.random() * CODE.length) | 0];
      return { text, bad: BAD.test(text), lit: 0, sev: SEV[(Math.random() * 3) | 0], indent: ((Math.random() * 3) | 0) * 2 };
    }
    let t0 = performance.now();
    function frame(now) {
      const dt = Math.min(64, now - t0); t0 = now;
      // Скрытый холст (другая страница) не рисуем; показали — пересчитать размер.
      if (!cv.clientWidth) { requestAnimationFrame(frame); return; }
      if (cv.clientWidth !== W || cv.clientHeight !== H) resize();
      const css = getComputedStyle(root);
      const fg = css.getPropertyValue('--code-dim').trim();
      // Найденные «уязвимые» строки подсвечиваются зелёным, как в матрице.
      const hit = css.getPropertyValue('--c1').trim();
      const dark = root.dataset.theme !== 'light';
      const beamC = css.getPropertyValue('--c1').trim();
      ctx.clearRect(0, 0, W, H);
      const beamY = ((now / 4200) % 1) * (H + 160) - 80;

      // луч
      const g = ctx.createLinearGradient(0, beamY - 70, 0, beamY + 4);
      g.addColorStop(0, 'transparent'); g.addColorStop(1, beamC);
      ctx.globalAlpha = 0.16; ctx.fillStyle = g; ctx.fillRect(0, beamY - 70, W, 74);
      ctx.globalAlpha = 0.9; ctx.fillRect(0, beamY, W, 1.5);
      ctx.globalAlpha = 1;

      ctx.font = `${W < 700 ? 11 : 13}px "JetBrains Mono", monospace`;
      ctx.textBaseline = 'middle';
      for (const s of streams) {
        s.off -= s.speed * dt * 0.06;
        if (s.off < -lineH) { s.off += lineH; s.lines.shift(); s.lines.push(mkLine()); }
        s.lines.forEach((ln, i) => {
          const y = s.off + i * lineH;
          if (ln.bad && Math.abs(y - beamY) < lineH / 2) ln.lit = 1;
          ln.lit = Math.max(0, ln.lit - dt / 3200);
          const x = s.x + ln.indent * 7;
          if (ln.lit > 0) {
            ctx.globalAlpha = 0.18 * ln.lit; ctx.fillStyle = hit;
            ctx.fillRect(x - 6, y - lineH / 2 + 2, Math.min(ctx.measureText(ln.text).width + 12, W / cols - 30), lineH - 4);
            ctx.globalAlpha = 0.4 + 0.6 * ln.lit; ctx.fillStyle = hit;
            if (dark) { ctx.shadowColor = hit; ctx.shadowBlur = 8 * ln.lit; }
            ctx.fillText(ln.text, x, y);
            ctx.font = `700 ${W < 700 ? 9 : 10}px "JetBrains Mono", monospace`;
            ctx.fillText('▲ ' + ln.sev, x, y - lineH / 2 - 1);
            ctx.font = `${W < 700 ? 11 : 13}px "JetBrains Mono", monospace`;
            ctx.shadowBlur = 0;
          } else {
            ctx.globalAlpha = 1; ctx.fillStyle = fg; ctx.fillText(ln.text, x, y);
          }
        });
      }
      ctx.globalAlpha = 1;
      if (!reduced) requestAnimationFrame(frame);
    }
    resize();
    addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- терминал воркера
  async function terminal(pre) {
    let run = 0;
    langListeners.push(() => { run++; loop(run); });
    async function loop(id) {
      while (id === run) {
        pre.innerHTML = '';
        const start = Date.UTC(2026, 9, 30, 9, 41, 7);
        let i = 0;
        for (const [lvl, text] of t('term')) {
          if (id !== run) return;
          const row = document.createElement('div');
          row.className = 'tl ' + lvl;
          const ts = new Date(start + i * 1700 + Math.random() * 900).toISOString().slice(11, 19);
          const tag = { srv: 'SRV ', info: 'INFO', warn: 'WARN', ok: 'DONE' }[lvl];
          row.innerHTML = `<span class="ts">${ts}</span> <span class="lv">${tag}</span> <span class="tx"></span>`;
          pre.appendChild(row);
          const tx = $('.tx', row);
          if (reduced) tx.textContent = text;
          else for (let c = 1; c <= text.length; c++) { if (id !== run) return; tx.textContent = text.slice(0, c); await sleep(9); }
          pre.scrollTop = pre.scrollHeight;
          i++;
          await sleep(lvl === 'ok' ? 300 : 260 + Math.random() * 380);
          // На скрытой странице не печатаем — ждём, пока её покажут.
          while (id === run && !pre.clientWidth) await sleep(400);
        }
        const cur = document.createElement('div');
        cur.className = 'tl cursor'; cur.innerHTML = '<span class="ts">        </span> <span class="blink">▍</span>';
        pre.appendChild(cur);
        await sleep(reduced ? 600000 : 5200);
      }
    }
    loop(run);
  }

  // ---------------------------------------------------------------- бегущая строка
  function ticker() {
    const items = [
      ['crit', 'SQL injection', 'app/catalog.py:48'], ['high', 'GitHub token', 'deploy/ci.env:3'],
      ['crit', 'RCE · shell=True', 'app/delivery.py:23'], ['med', 'privileged: true', 'k8s/worker.yaml:31'],
      ['high', 'path traversal', 'app/files.py:31'], ['med', 'IDOR', 'app/orders.py:57'],
      ['low', 'cookie without Secure', 'app/config.py:12'], ['high', 'docker.sock mounted', 'compose.yml:19'],
      ['med', 'nginx without TLS', 'deploy/nginx.conf:4'], ['low', 'actions without SHA', '.github/workflows/ci.yml:14'],
      ['crit', 'jwt verify=False', 'api/auth.py:77'], ['med', 'image :latest', 'Dockerfile:1'],
    ];
    const html = items.map(([s, n, l]) => `<span class="ti ${s}"><i></i>${n}<em>${l}</em></span>`).join('');
    $('#ticker-track').innerHTML = html + html;
  }

  // ---------------------------------------------------------------- интерактивный сканер
  function scanner() {
    // Токен собирается на лету: в репозитории нет ничего, что выглядит как настоящий секрет.
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const fake = 'gh' + 'p_' + Array.from({ length: 36 }, () => abc[(Math.random() * abc.length) | 0]).join('');
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const hl = (s) => esc(s)
      .replace(/(&quot;|"[^"]*")/g, '<span class="s">$1</span>')
      .replace(/\b(from|import|def|return|if|for|in)\b/g, '<span class="k">$1</span>')
      .replace(/(@app\.route)/g, '<span class="d">$1</span>')
      .replace(/(#.*)$/g, '<span class="cm">$1</span>');
    const LINES = [
      'from flask import Flask, request, send_file, jsonify',
      'import sqlite3, subprocess',
      '',
      'app = Flask(__name__)',
      `GITHUB_TOKEN = "${fake}"`,
      '',
      '@app.route("/search")',
      'def search():',
      '    q = request.args.get("q")',
      '    cur = db().cursor()',
      '    cur.execute(f"SELECT * FROM items WHERE name LIKE \'%{q}%\'")',
      '    return jsonify(cur.fetchall())',
      '',
      '@app.route("/track")',
      'def track():',
      '    code = request.args["code"]',
      '    return subprocess.check_output(f"tracker {code}", shell=True)',
      '',
      '@app.route("/file")',
      'def file():',
      '    return send_file("uploads/" + request.args["name"])',
      '',
      'if __name__ == "__main__":',
      '    app.run(debug=True, host="0.0.0.0")',
    ];
    const HITS = [
      { line: 5, key: 'token', sev: 'high', tool: 'gitleaks', redact: true },
      { line: 11, key: 'sqli', sev: 'critical', tool: 'llm_review' },
      { line: 17, key: 'cmd', sev: 'critical', tool: 'semgrep' },
      { line: 21, key: 'path', sev: 'high', tool: 'llm_review' },
      { line: 24, key: 'debug', sev: 'medium', tool: 'deploy_rules' },
    ];
    const ol = $('#code');
    ol.innerHTML = LINES.map((l) => `<li><code>${hl(l) || '&nbsp;'}</code></li>`).join('');
    const lis = $$('li', ol);
    const list = $('#finding-list');
    const btn = $('#scan-btn');
    const beam = $('#beam');
    let found = [];
    let busy = false;

    function renderList() {
      if (!found.length) {
        list.innerHTML = `<li class="placeholder">${esc(t('scan.idle'))}</li>`;
      } else {
        list.innerHTML = found.map((h) => {
          const [title, fix] = t('findings')[h.key];
          return `<li class="fd ${h.sev}" data-line="${h.line}">
            <div class="fd-top"><span class="sev">${esc(t('sev')[h.sev])}</span><code>app/shop.py:${h.line}</code></div>
            <b>${esc(title)}</b><p>${esc(fix)}</p><small>${h.tool}${h.redact ? ' · ' + esc(t('redacted')) : ''}</small></li>`;
        }).join('');
        $$('.fd', list).forEach((li) => {
          const ln = lis[li.dataset.line - 1];
          li.addEventListener('mouseenter', () => ln.classList.add('focus'));
          li.addEventListener('mouseleave', () => ln.classList.remove('focus'));
        });
      }
      $('#found-count').textContent = found.length;
      const c = found.filter((f) => f.sev === 'critical').length;
      const h = found.filter((f) => f.sev === 'high').length;
      const m = found.filter((f) => f.sev === 'medium').length;
      const bar = $('.meter .bar');
      bar.querySelector('.c').style.flexGrow = c; bar.querySelector('.h').style.flexGrow = h; bar.querySelector('.m').style.flexGrow = m;
      bar.classList.toggle('empty', !found.length);
    }
    function label() {
      btn.querySelector('span').textContent = t(busy ? 'scan.running' : found.length ? 'scan.again' : 'scan.run');
    }

    async function run() {
      if (busy) return;
      busy = true; found = []; renderList(); label();
      btn.disabled = true;
      lis.forEach((li) => li.className = '');
      lis[4].querySelector('code').innerHTML = hl(LINES[4]);
      const body = $('.ed-body');
      beam.classList.add('on');
      const step = reduced ? 0 : 110;
      for (let i = 0; i < lis.length; i++) {
        const li = lis[i];
        beam.style.transform = `translateY(${li.offsetTop + li.offsetHeight}px)`;
        li.classList.add('seen');
        const hit = HITS.find((h) => h.line === i + 1);
        if (hit) {
          await sleep(step);
          li.classList.add('hit', hit.sev);
          if (hit.redact) {
            const code = li.querySelector('code');
            code.innerHTML = hl('GITHUB_TOKEN = "' + fake + '"');
            if (!reduced) for (let k = fake.length; k >= 0; k -= 3) {
              code.innerHTML = hl('GITHUB_TOKEN = "' + fake.slice(0, k) + '*'.repeat(fake.length - k) + '"');
              await sleep(14);
            }
            code.innerHTML = hl('GITHUB_TOKEN = "***"') + ' <span class="redacted">redact</span>';
          }
          found.push(hit); renderList();
          await sleep(step * 2);
        }
        await sleep(step / 2);
      }
      beam.classList.remove('on');
      body.classList.add('done');
      busy = false; btn.disabled = false; label();
    }
    btn.addEventListener('click', run);
    langListeners.push(() => { renderList(); label(); });
    renderList();

    // Сам запустится, когда секция впервые попадёт в экран.
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); setTimeout(run, 500); }
    }, { threshold: 0.3 });
    io.observe($('.editor'));
  }

  // ---------------------------------------------------------------- наклон карточек
  function tilt() {
    if (reduced || matchMedia('(hover: none)').matches) return;
    $$('.tilt').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${-y * 9}deg) rotateY(${x * 11}deg) translateZ(0)`;
        card.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
        card.style.setProperty('--my', `${(y + 0.5) * 100}%`);
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  // ---------------------------------------------------------------- конвейер
  function pipeline() {
    const info = $('#pipe-info');
    let current = 'dash';
    const show = (key) => {
      current = key;
      $$('.node').forEach((n) => n.classList.toggle('active', n.dataset.node === key));
      info.innerHTML = `<b>${t(`pipe.d.${key}.t`)}</b><p>${t(`pipe.d.${key}.p`)}</p>`;
      info.classList.remove('pop'); void info.offsetWidth; info.classList.add('pop');
    };
    $$('.node').forEach((n) => {
      n.setAttribute('tabindex', '0');
      n.addEventListener('mouseenter', () => show(n.dataset.node));
      n.addEventListener('focus', () => show(n.dataset.node));
      n.addEventListener('click', () => show(n.dataset.node));
    });
    // Без наведения — сам обходит узлы по кругу.
    const order = ['dash', 'srv', 'wrk', 'scan', 'llm', 'redact', 'report'];
    let hover = false;
    $('.pipe').addEventListener('mouseenter', () => { hover = true; });
    $('.pipe').addEventListener('mouseleave', () => { hover = false; });
    setInterval(() => { if (!hover && !reduced) show(order[(order.indexOf(current) + 1) % order.length]); }, 3200);
    langListeners.push(() => show(current));
    show('dash');
  }

  // ---------------------------------------------------------------- песочница
  function sandbox() {
    let left = 24 * 3600 - 1;
    const timer = $('#scope-timer');
    setInterval(() => {
      left = left > 0 ? left - 1 : 24 * 3600 - 1;
      const p = (n) => String(n).padStart(2, '0');
      timer.textContent = `${p((left / 3600) | 0)}:${p(((left / 60) | 0) % 60)}:${p(left % 60)}`;
    }, 1000);
    let hits = 0;
    const hp = $('#hp'); const hitsEl = $('#hits');
    setInterval(() => {
      if (reduced) return;
      hits = hits >= 14 ? 0 : hits + 1;
      hp.style.width = `${100 - (hits / 14) * 100}%`;
      hitsEl.textContent = `${hits} findings`;
      $('.target-box').classList.remove('hurt'); void $('.target-box').offsetWidth; $('.target-box').classList.add('hurt');
    }, 900);
  }

  // ---------------------------------------------------------------- орбита провайдеров
  function orbit() {
    const local = ['Ollama', 'llama.cpp'];
    const cloud = ['Claude', 'OpenAI', 'Gemini', 'DeepSeek', 'Grok', 'OpenRouter', 'Mistral', 'Kimi', 'Z.ai GLM', 'Qwen'];
    const fill = (ring, names, kind) => {
      ring.innerHTML = names.map((n, i) => {
        const a = (360 / names.length) * i;
        return `<div class="slot" style="--a:${a}deg"><div class="unrot" style="--a:${a}deg"><span class="pchip ${kind}">${n}</span></div></div>`;
      }).join('');
    };
    fill($('.ring.r1'), local, 'local');
    fill($('.ring.r2'), cloud, 'cloud');
    const o = $('#orbit');
    o.dataset.mode = 'local';
    // Радиусы колец считаются от фактической ширины орбиты.
    new ResizeObserver(([e]) => o.style.setProperty('--ow', e.contentRect.width + 'px')).observe(o);
    $$('#llm .switch button').forEach((b) => b.addEventListener('click', () => {
      $$('#llm .switch button').forEach((x) => x.classList.toggle('on', x === b));
      o.dataset.mode = b.dataset.mode;
      const p = $('#llm-text');
      p.dataset.i18n = b.dataset.mode === 'local' ? 'llm.localp' : 'llm.cloudp';
      p.textContent = t(p.dataset.i18n);
    }));
  }

  // ---------------------------------------------------------------- галерея
  function gallery() {
    const SHOTS = [
      ['reports', 'reports'], ['findings', 'report-code-findings'], ['running', 'report-running'],
      ['new', 'new'], ['pentest', 'report-pentest'], ['scope', 'scope'], ['settings', 'settings'], ['audit', 'audit'],
    ];
    const PATH = { reports: 'reports', findings: 'reports/87e3dc8d', running: 'reports/b67c5c5e', new: 'new',
      pentest: 'reports/2c3bd2b5', scope: 'scope', settings: 'settings/llm', audit: 'audit' };
    const tabs = $('#shot-tabs');
    const img = $('#shot'); const phone = $('#phone'); const bar = $('#shot-progress');
    let idx = 0; let paused = false; let elapsed = 0;
    const DUR = 5200;
    const src = (file) => `assets/shots/${root.dataset.theme}-${file}.webp`;

    tabs.innerHTML = SHOTS.map(([k], i) => `<button role="tab" data-i="${i}" data-i18n="shot.${k}">${t('shot.' + k)}</button>`).join('');
    function show(i, instant) {
      idx = i; elapsed = 0;
      $$('button', tabs).forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', j === i); });
      const [k, file] = SHOTS[i];
      $('#shot-path').textContent = PATH[k];
      img.alt = t('shot.' + k);
      if (instant) { img.src = src(file); return; }
      img.classList.add('swap');
      const next = new Image();
      next.src = src(file);
      next.decode().catch(() => {}).then(() => { img.src = next.src; img.classList.remove('swap'); });
    }
    $$('button', tabs).forEach((b) => b.addEventListener('click', () => show(+b.dataset.i)));
    const view = $('.devices');
    view.addEventListener('mouseenter', () => { paused = true; });
    view.addEventListener('mouseleave', () => { paused = false; });
    let last = performance.now();
    const loop = (now) => {
      const dt = now - last; last = now;
      if (!paused && !reduced && !document.hidden) {
        elapsed += dt;
        if (elapsed >= DUR) show((idx + 1) % SHOTS.length);
      }
      bar.style.transform = `scaleX(${Math.min(1, elapsed / DUR)})`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const setPhone = () => { phone.src = `assets/shots/${root.dataset.theme}-mobile-reports.webp`; };
    themeListeners.push(() => { show(idx, true); setPhone(); });
    langListeners.push(() => { img.alt = t('shot.' + SHOTS[idx][0]); });
    show(0, true); setPhone();
    phone.alt = 'ZDC Systems mobile';
    img.addEventListener('click', () => lightbox(img.src, img.alt));
    phone.addEventListener('click', () => lightbox(phone.src, phone.alt));
  }

  // ---------------------------------------------------------------- увеличение скриншота
  function lightbox(src, caption) {
    const box = $('#lightbox');
    $('img', box).src = src;
    $('img', box).alt = caption;
    $('p', box).textContent = caption;
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('open'));
    $('.lb-close', box).focus();
  }
  function lightboxInit() {
    const box = $('#lightbox');
    const close = () => { box.classList.remove('open'); setTimeout(() => { box.hidden = true; }, 250); };
    box.addEventListener('click', (e) => { if (e.target !== $('img', box)) close(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) close(); });
  }

  // ---------------------------------------------------------------- анонс облачной версии
  // Скриншоты настоящего облачного кабинета; переключаются вместе с темой.
  function cloudShots() {
    const SHOTS = [['account', 'cloud-account', 'account'], ['buy', 'cloud-buy', 'account/buy'], ['register', 'cloud-register', 'register']];
    const tabs = $('#cloud-tabs');
    const img = $('#cloud-img');
    let idx = 0;
    function show(i) {
      idx = i;
      const [k, file, path] = SHOTS[i];
      $$('button', tabs).forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', j === i); });
      $('#cloud-path').textContent = path;
      img.src = `assets/shots/${root.dataset.theme}-${file}.webp`;
      img.alt = t('cl.tab.' + k);
    }
    tabs.innerHTML = SHOTS.map(([k], i) => `<button role="tab" data-i="${i}" data-i18n="cl.tab.${k}">${t('cl.tab.' + k)}</button>`).join('');
    $$('button', tabs).forEach((b) => b.addEventListener('click', () => show(+b.dataset.i)));
    img.addEventListener('click', () => lightbox(img.src, img.alt));
    themeListeners.push(() => show(idx));
    langListeners.push(() => show(idx));
    show(0);
  }

  // ---------------------------------------------------------------- развитие проекта
  // Даты, теги и скриншоты — общие; тексты событий — в i18n.js (`hist`, по индексу).
  function history() {
    const META = [
      { date: '2026-10-17', shot: 'new', tags: ['llm', 'mcp', 'ui', 'srv', 'ui'] },
      { date: '2026-10-19', shot: 'report-code-findings', tags: ['llm', 'sec', 'sec', 'sec'] },
      { date: '2026-10-23', shot: 'report-running', tags: ['mcp', 'mcp', 'srv', 'llm', 'ui'] },
      { date: '2026-10-24', shot: 'scope', tags: ['llm', 'mcp', 'mcp', 'mcp', 'ui'] },
      { date: '2026-10-25', shot: 'audit', tags: ['ui', 'sec', 'srv', 'llm'] },
      { date: '2026-10-26', shot: 'report-deploy', tags: ['sec', 'mcp', 'mcp'] },
      { date: '2026-10-28', shot: 'settings', tags: ['sec', 'sec', 'llm', 'llm'] },
      { date: '2026-10-30', shot: 'mobile-menu', mobile: true, tags: ['sec', 'ui', 'ui', 'ui', 'ui'] },
      { date: '2026-10-31', shot: 'demo', tags: ['sec', 'srv', 'ui', 'sec', 'srv'] },
      { date: '2026-11-01', shot: 'cloud-account', tags: ['sec', 'sec', 'sec', 'llm', 'ui', 'srv', 'ui'] },
    ];
    const TAGS = ['llm', 'mcp', 'srv', 'ui', 'sec'];
    const tl = $('#timeline');
    const filter = $('#hist-filter');
    let active = 'all';
    const day0 = Date.parse(META[0].date);
    // У узбекской локали в браузерах часто нет названий месяцев — пишем сами.
    const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
    const fmt = (d) => {
      const date = new Date(d + 'T12:00:00Z');
      if (lang === 'uz') return `${date.getUTCDate()}-${UZ_MONTHS[date.getUTCMonth()]}`;
      return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date);
    };

    function render() {
      filter.innerHTML = ['all', ...TAGS].map((k) =>
        `<button data-tag="${k}" class="${k === active ? 'on' : ''} t-${k}">${t(k === 'all' ? 'hist.all' : 'hist.tag.' + k)}</button>`).join('');
      $$('button', filter).forEach((b) => b.addEventListener('click', () => { active = b.dataset.tag; render(); }));
      $$('.ev', tl).forEach((el) => el.remove());
      const texts = t('hist');
      META.forEach((m, i) => {
        const tx = texts[i];
        const items = tx.i.map((text, j) => ({ text, tag: m.tags[j] }));
        const shown = active === 'all' ? items : items.filter((it) => it.tag === active);
        const day = Math.round((Date.parse(m.date) - day0) / 864e5) + 1;
        const el = document.createElement('article');
        el.className = 'ev' + (i % 2 ? ' right' : '') + (shown.length ? '' : ' dim');
        const src = `assets/shots/${root.dataset.theme}-${m.shot}.webp`;
        el.innerHTML = `
          <div class="ev-dot"></div>
          <div class="ev-card">
            <div class="ev-date"><time datetime="${m.date}">${fmt(m.date)}</time><span>${t('hist.day')} ${day}</span></div>
            <h3>${tx.t}</h3>
            <ul>${(shown.length ? shown : items).map((it) => `<li><i class="t-${it.tag}">${t('hist.tag.' + it.tag)}</i>${it.text}</li>`).join('')}</ul>
          </div>
          <button class="ev-shot${m.mobile ? ' mobile' : ''}" aria-label="${tx.cap}">
            <img src="${src}" alt="${tx.cap}" loading="lazy" /><span>${tx.cap}</span>
          </button>`;
        $('.ev-shot', el).addEventListener('click', () => lightbox(`assets/shots/${root.dataset.theme}-${m.shot}.webp`, `${fmt(m.date)} · ${tx.cap}`));
        tl.appendChild(el);
        evObserver.observe(el);
      });
      onScroll();
    }
    const evObserver = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('shown');
    }), { rootMargin: '0px 0px -10% 0px' });

    // Линия времени заполняется по мере прокрутки, точки загораются, когда линия их догнала.
    const fill = $('#rail-fill');
    function onScroll() {
      const r = tl.getBoundingClientRect();
      const mark = innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, (mark - r.top) / r.height));
      fill.style.transform = `scaleY(${p})`;
      $$('.ev', tl).forEach((ev) => {
        const d = $('.ev-dot', ev).getBoundingClientRect();
        ev.classList.toggle('lit', d.top < mark);
      });
    }
    addEventListener('scroll', onScroll, { passive: true });
    langListeners.push(render);
    themeListeners.push(render);
    render();
  }

  // ---------------------------------------------------------------- счётчики и появление
  function reveal() {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
      $$('[data-count]', e.target).forEach(count);
    }), { rootMargin: '0px 0px -15% 0px' });
    $$('.section, .finale').forEach((s) => io.observe(s));
    function count(el) {
      const to = +el.dataset.count; const suf = el.dataset.suffix || '';
      if (reduced || to === 0) { el.textContent = to + suf; return; }
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 1400);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }

  // ---------------------------------------------------------------- контакт
  function install() {
    $$('.copy-mail').forEach((btn) => btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(btn.dataset.mail); toast(t('st.copied')); }
      catch (_) {
        const r = document.createRange(); r.selectNodeContents(btn.previousElementSibling);
        getSelection().removeAllRanges(); getSelection().addRange(r);
      }
    }));
  }

  // ---------------------------------------------------------------- курсор-прожектор, шапка
  function chrome() {
    const spot = $('.spot');
    if (!reduced && matchMedia('(hover: hover)').matches) {
      addEventListener('pointermove', (e) => {
        spot.style.setProperty('--x', e.clientX + 'px');
        spot.style.setProperty('--y', e.clientY + 'px');
      }, { passive: true });
    }
    const top = $('.top');
    const onScroll = () => top.classList.toggle('scrolled', scrollY > 30);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------------------------------------------------------------- стартовая страница
  // Без якоря (или #intro) открыта стартовая; любой якорь раздела — прежний лендинг.
  function views() {
    const isIntro = () => !location.hash || location.hash === '#intro';
    function show() {
      const intro = isIntro();
      const was = root.classList.contains('on-intro');
      root.classList.toggle('on-intro', intro);
      if (intro) { if (!was) { scrollTo(0, 0); scrambleHero(); } return; }
      // Лендинг был скрыт — браузер не прокрутил к якорю сам.
      const el = document.getElementById(location.hash.slice(1));
      if (was) {
        if (el && location.hash !== '#top') requestAnimationFrame(() => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
        else scrollTo(0, 0);
      }
    }
    addEventListener('hashchange', show);
    show();
    // Прямая ссылка на раздел: картинки выше грузятся позже и сдвигают разметку —
    // докрутить ещё раз, пока пользователь сам не прокрутил.
    if (!isIntro()) {
      let touched = false;
      ['wheel', 'touchstart', 'keydown'].forEach((e) => addEventListener(e, () => { touched = true; }, { once: true, passive: true }));
      const fix = () => { const el = document.getElementById(location.hash.slice(1)); if (el && !touched) el.scrollIntoView({ behavior: 'instant', block: 'start' }); };
      addEventListener('load', () => { fix(); setTimeout(fix, 400); setTimeout(fix, 1200); });
    }
  }

  // ---------------------------------------------------------------- пасхалка: код Konami
  function konami() {
    const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let pos = 0;
    const toggle = () => {
      const on = root.classList.toggle('redteam');
      toast(t(on ? 'egg.on' : 'egg.off'));
    };
    addEventListener('keydown', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = k === seq[pos] ? pos + 1 : (k === seq[0] ? 1 : 0);
      if (pos === seq.length) { pos = 0; toggle(); }
    });
    $('.egg').addEventListener('click', toggle);
  }

  // ---------------------------------------------------------------- старт
  applyLang(lang);
  codeField($('#intro-field'));
  terminal($('#intro-term'));
  views();
  ticker();
  scanner();
  tilt();
  pipeline();
  sandbox();
  orbit();
  gallery();
  reveal();
  install();
  lightboxInit();
  cloudShots();
  history();
  chrome();
  konami();
})();
