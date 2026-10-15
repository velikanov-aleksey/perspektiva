/* «Перспектива»: меню, калькулятор, карта, заявка, PWA */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Math.round(n).toLocaleString('ru-RU');

  // ---------- меню ----------
  const nav = $('.nav');
  const onScroll = () => {
    nav && nav.classList.toggle('is-solid', scrollY > 40 || !$('.hero'));
    const fab = $('.fab'); if (fab) fab.classList.toggle('is-on', scrollY > innerHeight * 0.8);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('.nav__burger');
  if (burger) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open);
      nav.classList.add('is-solid');
    });
    $$('.nav__links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('is-open')));
  }
  const fabBtn = $('.fab__btn'), fabMenu = $('#fabMenu');
  if (fabBtn) {
    const setFab = open => { fabMenu.hidden = !open; fabBtn.setAttribute('aria-expanded', open); fabBtn.textContent = open ? '✕' : '💬'; };
    fabBtn.addEventListener('click', () => setFab(fabMenu.hidden));
    $$('a', fabMenu).forEach(a => a.addEventListener('click', () => setFab(false)));
  }
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  // ---------- живые фото: видео в карточках и галерее ----------
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loadVid = v => { if (!v.src && v.dataset.src) v.src = v.dataset.src; };
  const playVid = v => { loadVid(v); const p = v.play(); if (p) p.catch(() => {}); };
  $$('.card--photo').forEach(card => {
    const v = $('video', card); if (!v) return;
    card.addEventListener('mouseenter', () => { playVid(v); card.classList.add('is-playing'); });
    card.addEventListener('mouseleave', () => { v.pause(); card.classList.remove('is-playing'); });
  });
  if (!reduce) {
    // на телефоне наведения нет — карточка оживает, когда видна на экране
    const touch = matchMedia('(hover: none)').matches;
    const vio = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target, card = v.closest('.card--photo');
      if (e.isIntersecting) { playVid(v); card && card.classList.add('is-playing'); }
      else { v.pause(); card && card.classList.remove('is-playing'); }
    }), { threshold: 0.5 });
    $$('.gallery video').forEach(v => vio.observe(v));
    if (touch) $$('.card--photo video').forEach(v => vio.observe(v));
    // команда разворачивает баннер — один раз, когда блок на экране
    const bandVid = $('video.band__img');
    if (bandVid) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); playVid(bandVid); } }, { threshold: 0.45 }).observe(bandVid);
  }

  // ---------- счётчики в цифрах ----------
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, start = end > 1000 && end < 2100 ? end - 16 : 0, t0 = performance.now();
    if (reduce) return;
    const step = t => { const k = Math.min(1, (t - t0) / 1400), v = start + (end - start) * (1 - Math.pow(1 - k, 3)); el.textContent = Math.round(v); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  // ---------- появление блоков ----------
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$('.section h2, .card, .benefits>div, .steps li, .compare, .calc, .case__nums div, .post-card').forEach(el => { el.classList.add('rv'); io.observe(el); });

  // ---------- калькулятор ----------
  const calc = $('#calcForm');
  if (calc) {
    const role = $('#cRole'), people = $('#cPeople'), hours = $('#cHours'), shifts = $('#cShifts');
    const val = name => parseFloat((calc.querySelector(`input[name=${name}]:checked`) || {}).value || 1);
    // Формула из «Прайс_01.09_расчет_на_руки.xlsx»:
    // тариф без НДС = на руки + НДФЛ + взносы + рентабельность; на сотрудника идёт 75% тарифа, рентабельность 25%.
    // на руки = тариф × 0,75 × 0,87 / 1,32  →  тариф = на руки / 0,87 × 1,32 / 0,75
    const PRICING = {
      ndfl: 0.13,
      fees: 0.32,     // страховые взносы от (на руки + НДФЛ)
      staffShare: 0.75,
      vat: 0.22
    };
    // Ставка исполнителю «на руки», ₽/ч, по типу объекта. null — такой позиции на объекте нет.
    // Магазин: грузчик 150–170 (со слов руководства), остальные — по прайсу от 01.09; производство: грузчик 350.
    // Склад и прочие позиции производства — оценка, уточнить.
    const NET = {
      loader:    { shop: 150, wh: 200, prod: 350 },
      picker:    { shop: null, wh: 200, prod: 300 },
      packer:    { shop: 125, wh: 170, prod: 250 },
      worker:    { shop: 130, wh: 180, prod: 300 },
      assembler: { shop: null, wh: 190, prod: 300 },
      merch:     { shop: 118, wh: null, prod: null },
      cashier:   { shop: 120, wh: null, prod: null },
      cleaner:   { shop: 120, wh: 140, prod: 170 }
    };
    function update() {
      const opt = role.selectedOptions[0];
      const heavyApplies = opt.dataset.heavy === '1';
      $('#cLoadWrap').classList.toggle('is-hidden', !heavyApplies);
      const n = +people.value, h = +hours.value, s = +shifts.value;
      const nets = NET[opt.value];
      // недоступные для должности объекты блокируем и переключаемся на первый доступный
      $$('input[name=obj]', calc).forEach(i => { i.disabled = nets[i.value] == null; });
      let objIn = calc.querySelector('input[name=obj]:checked');
      if (!objIn || objIn.disabled) { objIn = calc.querySelector('input[name=obj]:not(:disabled)'); objIn.checked = true; }
      let net = nets[objIn.value];
      if (heavyApplies) net *= val('load');
      net *= val('temp') * val('geo');
      if ($('#cDirty').checked) net *= 1.1;
      if ($('#cUrgent').checked) net *= 1.1;
      const tariff = net / (1 - PRICING.ndfl) * (1 + PRICING.fees) / PRICING.staffShare;
      // в калькуляторе показываем тариф без НДС; НДС — отдельной строкой
      const rate = Math.ceil(tariff / 10) * 10;

      const manHours = n * h * s;
      $('#cPeopleV').textContent = n; $('#cHoursV').textContent = h; $('#cShiftsV').textContent = s;
      $('#cRate').textContent = fmt(rate);
      $('#cTotal').textContent = fmt(rate * manHours);
      $('#cVat').textContent = `+ НДС ${PRICING.vat * 100}%: ${fmt(rate * manHours * PRICING.vat)} ₽ · с НДС ${fmt(rate * manHours * (1 + PRICING.vat))} ₽`;
      $('#cHoursTotal').textContent = `${fmt(manHours)} человеко-часов в месяц`;
      $('#cEta').textContent = $('#cUrgent').checked && n <= 5 ? '1–2 дня'
        : n <= 5 ? '1–3 дня' : n <= 20 ? 'до 15 дней' : 'поэтапно, по плану набора';

      const summary = `${opt.textContent} (${objIn.parentElement.querySelector('span').firstChild.textContent.toLowerCase()}), ${n} чел., ${h} ч × ${s} смен; ставка от ${rate} ₽/ч без НДС, ~${fmt(rate * manHours)} ₽/мес без НДС`;
      const hidden = $('#leadForm input[name=calc]'); if (hidden) hidden.value = summary;
    }
    calc.addEventListener('input', update);
    calc.addEventListener('change', update);
    update();
    $('#cToLead').addEventListener('click', () => {
      const task = $('#leadForm textarea[name=task]');
      if (task && !task.value) task.value = $('#leadForm input[name=calc]').value;
    });
  }

  // ---------- переоформление своего персонала: от суммы «на руки» к тарифу ----------
  const own = $('#ownForm');
  if (own) {
    const upd = () => {
      const net = +$('#oNet').value, n = +$('#oPeople').value, h = +$('#oHours').value;
      $('#oNetV').textContent = net; $('#oPeopleV').textContent = n; $('#oHoursV').textContent = h;
      // та же формула, что в прайсе: тариф без НДС = на руки / 0,87 × 1,32 / 0,75
      const rate = Math.round(net / 0.87 * 1.32 / 0.75 * 100) / 100;
      const total = rate * n * h;
      $('#oRate').textContent = rate.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
      $('#oTotal').textContent = fmt(total) + ' ₽';
      $('#oVat').textContent = `без НДС · с НДС 22%: ${fmt(total * 1.22)} ₽`;
    };
    own.addEventListener('input', upd); upd();
  }

  // ---------- карта и города ----------
  // Подразделения и их руководители (из «Схемы взаимодействия»). На всех номерах есть MAX.
  const BRANCHES = [
    { hub: 'Самара', main: true, cities: ['Самара', 'Тольятти'], head: 'Мякишев Владимир Владимирович', post: 'Менеджер по работе с клиентами', phone: '+79171304044', email: 'info@perspektiva63.com' },
    { hub: 'Казань', cities: ['Казань'], head: 'Сотникова Марина Дмитриевна', phone: '+79220381784', email: 'perspektiva.kazan@mail.ru' },
    { hub: 'Набережные Челны', cities: ['Набережные Челны', 'Альметьевск', 'Чебоксары'], head: 'Сурин Максим Александрович', phone: '+79631570348', email: 'perspektiva.nabchelny@mail.ru' },
    { hub: 'Ульяновск', cities: ['Ульяновск', 'Димитровград'], head: 'Лобзинёв Валерий Викторович', phone: '+79061462725', email: 'perspektiva.ulyanovsk@mail.ru' },
    { hub: 'Нижний Новгород', cities: ['Нижний Новгород', 'Владимир', 'Рязань', 'Тула', 'Тверь', 'Ярославль', 'Кострома', 'Иваново'], head: 'Бекер Евгений Иосифович', phone: '+79092944464', email: 'perspektiva.nnovgorog@bk.ru' },
    { hub: 'Уфа', cities: ['Уфа'], head: 'Фомичёв Михаил Владимирович', phone: '+79228044434', email: 'perspektiva.ufa@inbox.ru' },
    { hub: 'Оренбург', cities: ['Оренбург', 'Саратов'], head: 'Янбулатов Ринат Шамилевич', phone: '+79228464434', email: 'perspektivaorenburg@mail.ru' },
    { hub: 'Челябинск', cities: ['Челябинск', 'Нижний Тагил', 'Пермь', 'Новосибирск'], head: 'Ионова Елена Александровна', phone: '+79068702178', email: 'perspektiva774@mail.ru' },
    { hub: 'Тюмень', cities: ['Тюмень', 'Екатеринбург', 'Курган', 'Сургут', 'Нефтеюганск', 'ХМАО', 'ЯНАО'], head: 'Шаруев Александр Павлович', phone: '+79673857725', email: 'perspektiva072@mail.ru' },
    { hub: 'Красноярск', cities: ['Красноярск'], head: 'Брехова Екатерина Александровна', phone: '+79233535839', email: 'perspektiva.krsn24@mail.ru' }
  ];
  const EXTRA = [['Москва', 'work', 'Работаем с базой сотрудников'], ['Алтайский край', 'soon', 'Скоро открываемся']];
  const telFmt = p => p.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 ($1) $2-$3-$4');
  const contactHtml = b => `<b>${b.head}</b><br><span>${b.post || 'Руководитель подразделения'}</span><br>
    <a href="tel:${b.phone}">${telFmt(b.phone)}</a> · есть MAX<br><a href="mailto:${b.email}">${b.email}</a>`;

  const geoList = $('#branchList');
  if (geoList) geoList.innerHTML = BRANCHES.map(b => `<details class="branch" data-hub="${b.hub}"${b.main ? ' open' : ''}><summary><b>${b.hub}${b.main ? ' — главный офис' : ''}</b><small>${b.cities.join(' · ')}</small></summary><p>${contactHtml(b)}</p></details>`).join('');
  const dl = $('#cityList');
  if (dl) dl.innerHTML = BRANCHES.flatMap(b => b.cities).concat('Москва').map(c => `<option value="${c}">`).join('');

  // ---------- карта: своя SVG-карта России (данные — assets/map-data.js) ----------
  const mapEl = $('#map');
  if (mapEl && window.MAP_DATA) {
    const D = window.MAP_DATA, P = D.cities, NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
    const svg = el('svg', { viewBox: `0 0 ${D.w} ${D.h}`, class: 'rumap', role: 'img', 'aria-label': 'Карта подразделений «Перспективы»' });
    svg.innerHTML = `<defs>
      <linearGradient id="ruFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a4fe0"/><stop offset=".55" stop-color="#1a2f9a"/><stop offset="1" stop-color="#0f1c66"/></linearGradient>
      <pattern id="ruDots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.1" fill="#8fb0ff" fill-opacity=".35"/></pattern>
      <radialGradient id="pinGlow"><stop offset="0" stop-color="#ffb21e" stop-opacity=".9"/><stop offset="1" stop-color="#ffb21e" stop-opacity="0"/></radialGradient>
      <clipPath id="ruClip"><path d="${D.russia}"/></clipPath>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>`;
    const gN = el('g', { class: 'rumap__nb' }, svg);
    D.neighbors.forEach(d => el('path', { d }, gN));
    el('path', { d: D.russia, class: 'rumap__shadow', filter: 'url(#soft)' }, svg);
    el('path', { d: D.russia, class: 'rumap__land', fill: 'url(#ruFill)' }, svg);
    el('rect', { x: 0, y: 0, width: D.w, height: D.h, fill: 'url(#ruDots)', 'clip-path': 'url(#ruClip)' }, svg);
    el('path', { d: D.russia, class: 'rumap__edge' }, svg);

    const gArcs = el('g', { class: 'rumap__arcs' }, svg), gPins = el('g', {}, svg), gLabels = el('g', { class: 'rumap__labels' }, svg);
    const arc = (a, b) => { const [x1, y1] = a, [x2, y2] = b, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1; return `M${x1},${y1} Q${mx - dy * .25},${my + dx * .25} ${x2},${y2}`; };
    const items = [];
    BRANCHES.forEach(b => {
      const H = P[b.hub];
      b.cities.filter(c => c !== b.hub).forEach((c, i) => {
        const d = arc(H, P[c]);
        const p = el('path', { d, class: 'rumap__arc', 'data-hub': b.hub }, gArcs);
        p.style.animationDelay = (0.3 + i * 0.12) + 's';
        if (!reduce) { const dot = el('circle', { r: 3.6, class: 'rumap__flow' }, gArcs); dot.innerHTML = `<animateMotion dur="${2.6 + i * .3}s" repeatCount="indefinite" path="${d}"/>`; }
      });
      b.cities.forEach(c => items.push({ name: c, type: c === b.hub ? 'office' : 'work', branch: b, xy: P[c] }));
    });
    EXTRA.forEach(([c, type, note]) => items.push({ name: c, type, note, xy: P[c] }));

    items.forEach(it => {
      const [x, y] = it.xy, g = el('g', { class: `rumap__pin rumap__pin--${it.type}`, tabindex: 0, role: 'button', 'aria-label': it.name, 'data-hub': it.branch ? it.branch.hub : '' }, gPins);
      g.setAttribute('transform', `translate(${x},${y})`);
      if (it.type === 'office') {
        el('circle', { r: 22, fill: 'url(#pinGlow)' }, g);
        if (!reduce) el('circle', { r: 9, class: 'rumap__pulse' }, g);
        el('circle', { r: it.branch.main ? 10 : 8, class: 'rumap__dot' }, g);
        const t = el('text', { x: x + 14, y: y + 6, class: 'rumap__label' + (it.branch.main ? ' rumap__label--main' : '') }, gLabels); t.textContent = it.name;
      } else {
        el('circle', { r: 10, class: 'rumap__hit' }, g);
        el('circle', { r: it.type === 'soon' ? 6 : 5, class: 'rumap__dot' }, g);
      }
      const show = () => openCard(it);
      g.addEventListener('click', show);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } });
      g.addEventListener('mouseenter', () => highlight(it.branch && it.branch.hub));
      g.addEventListener('mouseleave', () => highlight(null));
    });

    const card = document.createElement('div'); card.className = 'rumap__card'; card.hidden = true;
    mapEl.append(svg, card);
    const order = name => `<a class="rumap__order" href="#lead" data-city="${name}">Заказать персонал здесь →</a>`;
    function openCard(it) {
      const b = it.branch;
      const head = b ? (it.type === 'office' ? (b.main ? 'Главный офис «Перспективы»' : 'Подразделение «Перспективы»') : 'Курирует подразделение ' + b.hub) : it.note;
      card.innerHTML = `<button class="rumap__x" aria-label="Закрыть">×</button><b class="rumap__city">${it.name}</b><span class="rumap__note">${head}</span>
        ${b ? contactHtml(b) : '<a href="tel:+78462037001">+7 (846) 203-70-01</a>'}<br>${order(it.name)}`;
      const [x, y] = it.xy, r = svg.getBoundingClientRect(), k = r.width / D.w;
      card.hidden = false;
      // на узкой карте карточка не помещается поверх — показываем её под картой
      const below = r.width < 620;
      card.classList.toggle('rumap__card--below', below);
      if (below) { card.style.left = card.style.top = ''; highlight(b && b.hub, true); return; }
      const left = Math.min(Math.max(8, x * k - card.offsetWidth / 2), r.width - card.offsetWidth - 8);
      const top = y * k - card.offsetHeight - 16;
      card.style.left = left + 'px'; card.style.top = (top < 8 ? y * k + 18 : top) + 'px';
      highlight(b && b.hub, true);
    }
    let pinned = null;
    function highlight(hub, pin) {
      if (pin !== undefined) pinned = hub;
      const h = hub || pinned;
      svg.classList.toggle('is-focus', !!h);
      $$('[data-hub]', svg).forEach(n => n.classList.toggle('is-on', !!h && n.dataset.hub === h));
    }
    card.addEventListener('click', e => {
      if (e.target.closest('.rumap__x')) { card.hidden = true; highlight(null, null); }
      const o = e.target.closest('.rumap__order'); if (o) { const f = $('#leadForm [name=city]'); if (f) f.value = o.dataset.city; }
    });
    $$('.branch summary').forEach(s => s.addEventListener('click', () => { const d = s.parentElement; if (!d.open) { const it = items.find(i => i.name === d.dataset.hub); if (it) openCard(it); } }));
    // анимация «прорисовки» связей, когда карта появилась на экране
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { svg.classList.add('is-in'); o.disconnect(); } }, { threshold: 0.25 }).observe(mapEl);
  }

  // ---------- заявка ----------
  const form = $('#leadForm');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = $('.form__msg', form);
      msg.className = 'form__msg';
      const fd = new FormData(form);
      const phone = (fd.get('phone') || '').replace(/\D/g, '');
      if (!fd.get('name') || phone.length < 10) { msg.classList.add('err'); msg.textContent = 'Укажите имя и телефон.'; return; }
      if (!fd.get('consent')) { msg.classList.add('err'); msg.textContent = 'Нужно согласие на обработку персональных данных.'; return; }
      const btn = $('button[type=submit]', form);
      btn.disabled = true; btn.textContent = 'Отправляем…';
      try {
        const r = await Promise.reject(new Error('preview'));
        const j = await r.json();
        if (!j.ok) throw new Error();
        form.reset();
        msg.classList.add('ok'); msg.textContent = 'Спасибо! Менеджер свяжется с вами в ближайшее время.';
        if (window.ym) try { ym(window.YM_ID, 'reachGoal', 'lead'); } catch (_) {}
      } catch (_) {
        msg.classList.add('err');
        msg.innerHTML = 'Не удалось отправить. Позвоните: <a href="tel:+78462037001">+7 (846) 203-70-01</a>';
      } finally { btn.disabled = false; btn.textContent = 'Получить предложение'; }
    });
  }

  // ---------- PWA: установка ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:' || location.hostname === 'localhost') {
    addEventListener('load', () => 0);
  }
  let deferred;
  const installBtn = $('#installBtn');
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; if (installBtn) installBtn.hidden = false; });
  if (installBtn) installBtn.addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; installBtn.hidden = true; });
})();
