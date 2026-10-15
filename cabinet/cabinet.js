/* Личный кабинет заказчика — демо-версия на тестовых данных.
   В боевой версии данные и вход по SMS будут идти с сервера (API), здесь всё хранится в браузере. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  };

  // ---------- тестовые данные ----------
  const DEMO_PHONE = '79879444030', DEMO_CODE = '1234';
  const CLIENT = { company: 'Демо-завод (тестовый заказчик)', object: 'Казань · производство' };
  const ROLES = [
    { id: 'loader', name: 'Грузчик', rate: 710, base: 6 },
    { id: 'picker', name: 'Комплектовщик', rate: 610, base: 4 },
    { id: 'worker', name: 'Разнорабочий', rate: 610, base: 5 }
  ];
  const PEOPLE = [
    ['Иванов Сергей Петрович', 'loader'], ['Сафин Ринат Ильдарович', 'loader'], ['Кузнецов Андрей Викторович', 'loader'],
    ['Гарипов Айдар Маратович', 'loader'], ['Смирнов Олег Николаевич', 'loader'], ['Хабибуллин Тимур Рустамович', 'loader'],
    ['Морозов Денис Алексеевич', 'loader'], ['Петрова Анна Сергеевна', 'picker'], ['Валиева Гульнара Ринатовна', 'picker'],
    ['Соколова Елена Игоревна', 'picker'], ['Ахметов Ильнур Фаридович', 'picker'], ['Николаева Ольга Павловна', 'picker'],
    ['Фёдоров Максим Юрьевич', 'worker'], ['Зарипов Рамиль Айратович', 'worker'], ['Волков Артём Дмитриевич', 'worker'],
    ['Мухаметшин Ленар Ильсурович', 'worker']
  ];
  const roleName = id => ROLES.find(r => r.id === id).name;
  const rnd = seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  const day = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
  const ru = iso => iso.split('-').reverse().slice(0, 2).join('.');
  const defaultOrder = () => Object.fromEntries(ROLES.map(r => [r.id, r.base]));
  const getOrder = date => (store.get('pk_orders', {})[date]) || defaultOrder();

  // ---------- вход ----------
  const session = () => store.get('pk_cab_session', null);
  const digits = s => (s || '').replace(/\D/g, '').replace(/^8/, '7');
  let codeSent = false;

  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const msg = $('#lMsg'); msg.className = 'form__msg';
    const phone = digits($('#lPhone').value);
    if (!codeSent) {
      if (phone.length !== 11) { msg.classList.add('err'); msg.textContent = 'Введите номер телефона полностью.'; return; }
      if (phone !== DEMO_PHONE) { msg.classList.add('err'); msg.textContent = 'Этот номер не привязан к заказчику. Обратитесь к вашему менеджеру.'; return; }
      codeSent = true;
      $('#codeWrap').hidden = false; $('#lCode').focus();
      $('#lBtn').textContent = 'Войти';
      msg.classList.add('ok'); msg.textContent = 'Код отправлен (в демо-версии — 1234).';
      return;
    }
    if ($('#lCode').value.trim() !== DEMO_CODE) { msg.classList.add('err'); msg.textContent = 'Неверный код.'; return; }
    store.set('pk_cab_session', { phone, at: Date.now() });
    show();
  });
  $('#logout').addEventListener('click', () => { try { localStorage.removeItem('pk_cab_session'); } catch (_) {} location.reload(); });

  // ---------- вкладки ----------
  $$('.tabs button').forEach(b => b.addEventListener('click', () => {
    $$('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    $$('.tab').forEach(t => t.hidden = t.id !== 'tab-' + b.dataset.tab);
  }));

  // ---------- кто где ----------
  function assign(order) {
    // распределяем людей по ролям согласно заявке; не хватает людей — «подбираем»
    const out = [];
    ROLES.forEach(r => {
      const pool = PEOPLE.filter(p => p[1] === r.id);
      for (let i = 0; i < order[r.id]; i++) out.push(pool[i] ? { name: pool[i][0], role: r.id } : { name: 'Подбираем сотрудника', role: r.id, pending: true });
    });
    return out;
  }

  function renderNow() {
    const list = assign(getOrder(day(0)));
    const r = rnd(7);
    const rows = list.map((p, i) => {
      const x = r();
      const st = p.pending ? ['st--plan', 'Подбираем'] : i === 3 ? ['st--late', 'Опаздывает, будет к 08:40'] : i === 8 ? ['st--repl', 'Не вышел — замена в пути'] : ['', 'На объекте'];
      const time = st[0] === '' ? `с 07:${String(40 + Math.floor(x * 20)).padStart(2, '0')}` : '—';
      return row([p.name, roleName(p.role), time, `<span class="st ${st[0]}">${st[1]}</span>`]);
    });
    $('#nowList').innerHTML = row(['ФИО', 'Должность', 'Отметка', 'Статус'], 'tbl__head') + rows.join('');
    $('#kNow').textContent = list.filter((p, i) => !p.pending && i !== 8).length;
  }

  function renderTomorrow() {
    const list = assign(getOrder(day(1)));
    $('#tomorrowList').innerHTML = row(['ФИО', 'Должность', 'Смена', 'Статус'], 'tbl__head') +
      list.map(p => row([p.name, roleName(p.role), '08:00–20:00', p.pending ? '<span class="st st--plan">Подбираем</span>' : '<span class="st">Подтвердил выход</span>'])).join('');
    $('#kTomorrow').textContent = list.length;
  }

  function renderWorked() {
    const r = rnd(42);
    const start = new Date(); start.setDate(1);
    const days = Math.max(1, new Date().getDate() - 1);
    let tH = 0, tS = 0;
    const rows = PEOPLE.slice(0, 15).map(([name, role]) => {
      const shifts = Math.max(1, Math.round(days * (0.45 + r() * 0.3)));
      const hours = shifts * 11;
      const sum = hours * ROLES.find(x => x.id === role).rate;
      tH += hours; tS += sum;
      return row([name, roleName(role), `${shifts} смен · ${hours} ч`, `${fmt(sum)} ₽`]);
    });
    $('#workedList').innerHTML = row(['ФИО', 'Должность', 'Отработано', 'Сумма без НДС'], 'tbl__head') + rows.join('') +
      row([`Итого с ${ru(start.toISOString().slice(0, 10))}`, '', `${fmt(tH)} ч`, `${fmt(tS)} ₽`], 'tbl__total');
    $('#kHours').textContent = fmt(tH);
    $('#kSum').textContent = fmt(tS) + ' ₽';
  }

  function renderHistory() {
    const h = store.get('pk_history', null) || [
      { at: day(-14), text: 'Старт: 3 человека (грузчики)', status: 'Выполнено' },
      { at: day(-9), text: 'Увеличение заявки до 6 человек', status: 'Выполнено' },
      { at: day(-2), text: 'Увеличение заявки до 15 человек', status: 'Выполнено' }
    ];
    $('#historyList').innerHTML = row(['Изменение', '', 'Дата', 'Статус'], 'tbl__head') +
      h.slice().reverse().map(e => row([e.text, '', ru(e.at), `<span class="st ${e.status === 'Выполнено' ? '' : 'st--plan'}">${e.status}</span>`])).join('');
    return h;
  }

  const row = (cells, cls = '') => `<div class="tbl__row ${cls}">${cells.map(c => `<span>${c}</span>`).join('')}</div>`;

  // ---------- заявка ----------
  let draft = {};
  function renderOrder() {
    const date = $('#oDate').value;
    const saved = getOrder(date);
    draft = { ...saved };
    $('#orderRows').innerHTML = ROLES.map(r => `
      <div class="order__row" data-role="${r.id}">
        <div><b>${r.name}</b><small>${fmt(r.rate)} ₽/ч без НДС</small></div>
        <div class="stepper"><button type="button" data-d="-1" aria-label="Меньше">−</button><output>${saved[r.id]}</output><button type="button" data-d="1" aria-label="Больше">+</button></div>
      </div>`).join('');
    $$('.order__row').forEach(el => el.addEventListener('click', e => {
      const d = +((e.target.closest('button') || {}).dataset || {}).d; if (!d) return;
      const id = el.dataset.role;
      draft[id] = Math.max(0, Math.min(99, draft[id] + d));
      $('output', el).textContent = draft[id];
      el.classList.toggle('is-changed', draft[id] !== saved[id]);
    }));
  }

  $('#oSend').addEventListener('click', () => {
    const date = $('#oDate').value, saved = getOrder(date), msg = $('#oMsg');
    msg.className = 'form__msg';
    const changes = ROLES.filter(r => draft[r.id] !== saved[r.id]).map(r => `${r.name} ${saved[r.id]} → ${draft[r.id]}`);
    if (!changes.length) { msg.classList.add('err'); msg.textContent = 'Вы ничего не изменили в заявке.'; return; }
    const orders = store.get('pk_orders', {}); orders[date] = { ...draft }; store.set('pk_orders', orders);
    const h = renderHistory();
    const comment = $('#oComment').value.trim();
    h.push({ at: day(0), text: `На ${ru(date)}: ${changes.join(', ')}${comment ? ' — ' + comment : ''}`, status: 'Принято менеджером' });
    store.set('pk_history', h);
    $('#oComment').value = '';
    msg.classList.add('ok'); msg.textContent = 'Изменения отправлены менеджеру. Подтверждение придёт в течение 15 минут.';
    renderAll();
  });
  $('#oDate').addEventListener('change', renderOrder);

  function renderAll() { renderOrder(); renderNow(); renderTomorrow(); renderWorked(); renderHistory(); }

  function show() {
    if (!session()) return;
    $('#login').hidden = true; $('#dash').hidden = false; $('#logout').hidden = false;
    $('#dCompany').textContent = CLIENT.company;
    $('#dObject').textContent = CLIENT.object;
    const d = $('#oDate'); d.min = day(0); if (!d.value) d.value = day(1);
    renderAll();
  }
  show();
})();
