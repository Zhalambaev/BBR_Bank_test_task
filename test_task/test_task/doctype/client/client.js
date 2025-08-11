const METHOD = 'test_task.api.dadata_get_data';
const FIELDS = {
  designation: 'designation',
  inn: 'inn',
  kpp: 'kpp',
  address: 'address'
};

// простой debounce для избежания частых запросов.
function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

//Достаём input/textarea у поля формы
function getInputEl(frm, fieldname) {
  const df = frm.get_field(fieldname);
  if (!df) return null;
  // ищем input ИЛИ textarea (если поле Small Text)
  const $el = df.$wrapper.find('input, textarea');
  return $el && $el.length ? $el[0] : null;
}

frappe.ui.form.on('Client', {
  refresh(frm) {
    // Подключаем подсказки
    attachAutocomplete(frm, FIELDS.designation, 'designation');
    attachAutocomplete(frm, FIELDS.inn, 'inn');

    // Кнопка "Получить адрес"
    if (!frm._addr_btn_added) {
      frm._addr_btn_added = true;
      frm.add_custom_button('Получить адрес', async () => {
        const inn = frm.doc[FIELDS.inn] || '';
        if (!inn) {
          frappe.msgprint({ message: 'Сначала заполните ИНН.', indicator: 'red' });
          return;
        }
        try {
          const { message } = await frappe.call({
            method: METHOD,
            args: { key: 'get_address', query: inn }
          });
          const address = typeof message === 'string' ? message : '';
          if (address) {
            frm.set_value(FIELDS.address, address);
            alert(address);
            frappe.show_alert({ message: 'Адрес получен и подставлен', indicator: 'green' });
          } else {
            frappe.msgprint({ message: 'Адрес не найден', indicator: 'orange' });
          }
        } catch (e) {
          console.error(e);
          frappe.msgprint({ message: 'Ошибка при получении адреса', indicator: 'red' });
        }
      });
    }
  },
});

// --- Awesomplete для поля DocType формы ---
function attachAutocomplete(frm, fieldname, key) {
  const el = getInputEl(frm, fieldname);
  if (!el) return;

  const aw = new Awesomplete(el, {
    minChars: 2,
    maxItems: 8,
    autoFirst: true,
    // все фильтрации делает сервер — не режем варианты на клиенте
    filter: () => true,
    sort: false
  });

  const cache = new Map();

  el.addEventListener('input', debounce(async (e) => {
    const q = (e.target.value || '');
    if (q.length < 2) { aw.list = []; return; }

    try {
      const { message } = await frappe.call({
        method: METHOD,
        args: { key, query: q }
      });
      const list = Array.isArray(message) ? message : [];
      cache.clear();

      const labels = list.map(item => {
        const label = `${item.designation || ''} — ${item.inn || ''}${item.kpp ? ' / ' + item.kpp : ''}`.trim();
        cache.set(label, item);
        return label;
      });

      aw.list = labels;
      aw.evaluate();
      aw.open();
    } catch (err) {
      console.error('suggest error', err);
      aw.list = [];
    }
  }, 200));

  el.addEventListener('awesomplete-selectcomplete', () => {
    const picked = cache.get(el.value);
    if (!picked) return;
    frm.set_value(FIELDS.designation, picked.designation || '');
    frm.set_value(FIELDS.inn, picked.inn || '');
    frm.set_value(FIELDS.kpp, picked.kpp || '');
  });
}
