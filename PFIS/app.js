/**
 * PFIS - Dashboard: income box left (gross, deductions, net), category boxes with Spent only, Travel tab, charts
 */
(function () {
  const DE = DataEngine;
  const MONTH_NAMES = DE.MONTH_NAMES;
  const MAIN_CATEGORIES = DE.MAIN_CATEGORIES || [];
  const CATEGORY_ICONS = DE.CATEGORY_ICONS || {};
  const CATEGORY_SUBCATEGORIES = DE.CATEGORY_SUBCATEGORIES || {};
  const DEFAULT_DEDUCTIONS = DE.DEFAULT_DEDUCTIONS || [];

  const APP_START_YEAR = 2026;
  const APP_START_MONTH = 3;
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth() + 1;
  if (currentYear < APP_START_YEAR || (currentYear === APP_START_YEAR && currentMonth < APP_START_MONTH)) {
    currentYear = APP_START_YEAR;
    currentMonth = APP_START_MONTH;
  }

  const $ = (id) => document.getElementById(id);

  // --- GitHub token: leave empty here. If you put it in code and push, GitHub may revoke it when you "allow secret".
  // Use Settings in the app to enter your token on each device; it stays until you change it or it expires.
  const PFIS_GITHUB_DEFAULT = { token: '', repo: 'EgyptSeal/BUD' };

  function getDb() {
    return DE.loadDatabase();
  }

  function getCurrentMonthData() {
    const db = getDb();
    return DE.getMonthData(db, currentYear, currentMonth);
  }

  function getExpenses() {
    const data = getCurrentMonthData();
    return (data && data.expenses) ? data.expenses : [];
  }

  function getIncome() {
    const data = getCurrentMonthData();
    return DE.getNetIncome ? DE.getNetIncome(data) : (Number(data && data.income) || 0);
  }

  function formatMoney(n) {
    const x = Number(n);
    if (isNaN(x)) return '—';
    return x.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function escapeAttr(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function fillYearMonthSelectors() {
    const selectYear = $('select-year');
    const selectMonth = $('select-month');
    if (!selectYear || !selectMonth) return;
    const startYear = APP_START_YEAR;
    const endYear = currentYear + 1;
    if (endYear < startYear) return;
    selectYear.innerHTML = '';
    for (let y = startYear; y <= endYear; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      selectYear.appendChild(opt);
    }
    selectMonth.innerHTML = '';
    const startMonth = (currentYear === APP_START_YEAR) ? APP_START_MONTH : 1;
    for (let monthNum = startMonth; monthNum <= 12; monthNum++) {
      const opt = document.createElement('option');
      opt.value = monthNum;
      opt.textContent = MONTH_NAMES[monthNum - 1] || monthNum;
      if (monthNum === currentMonth) opt.selected = true;
      selectMonth.appendChild(opt);
    }
  }

  function onYearMonthChange() {
    const sy = $('select-year');
    const sm = $('select-month');
    currentYear = sy ? parseInt(sy.value, 10) : currentYear;
    const hadMonth = sm ? parseInt(sm.value, 10) : currentMonth;
    fillYearMonthSelectors();
    currentMonth = sm ? parseInt(sm.value, 10) : hadMonth;
    if (currentMonth < (currentYear === APP_START_YEAR ? APP_START_MONTH : 1)) currentMonth = (currentYear === APP_START_YEAR ? APP_START_MONTH : 1);
    if (sm) sm.value = currentMonth;
    loadMonthIntoUI();
  }

  // --- Income box: display and edit; cash pocket (rent in cash) — remaining = monthly − cash spent
  function renderIncomeSummary() {
    const data = getCurrentMonthData();
    const gross = (data && data.grossIncome != null) ? Number(data.grossIncome) : (Number(data && data.income) || 0);
    const deductions = (data && data.deductions) ? data.deductions : DEFAULT_DEDUCTIONS.map(d => ({ name: d.name, amount: d.amount }));
    const net = DE.getNetIncome ? DE.getNetIncome(data) : (gross - deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0));
    const expenses = getExpenses();
    const cashSpent = DE.totalSpentByPaymentMethod ? DE.totalSpentByPaymentMethod(expenses, 'cash') : 0;
    const cashMonthly = (data && data.cashPocketMonthly != null) ? Number(data.cashPocketMonthly) : (DE.DEFAULT_CASH_POCKET || 12500);
    const cashRemaining = Math.max(0, cashMonthly - cashSpent);

    const annualBonus = (data && data.annualBonus != null) ? Number(data.annualBonus) : 0;
    const savingLastMonth = (data && data.savingFromLastMonth != null) ? Number(data.savingFromLastMonth) : 0;
    if ($('disp-gross')) $('disp-gross').textContent = formatMoney(gross);
    const listEl = $('income-deductions-list');
    if (listEl) {
      listEl.innerHTML = deductions.map(d => `
        <div class="income-row"><span>${escapeAttr(d.name)}</span><span>${formatMoney(d.amount)}</span></div>
      `).join('');
    }
    if ($('disp-annual-bonus')) $('disp-annual-bonus').textContent = formatMoney(annualBonus);
    if ($('disp-saving-last-month')) $('disp-saving-last-month').textContent = formatMoney(savingLastMonth);
    if ($('disp-net')) $('disp-net').textContent = formatMoney(net);
    renderCashPocketPanel();
  }

  function showIncomeEdit() {
    const data = getCurrentMonthData();
    const gross = (data && data.grossIncome != null) ? data.grossIncome : (data && data.income) || 0;
    const annualBonus = (data && data.annualBonus != null) ? data.annualBonus : 0;
    const deductions = (data && data.deductions && data.deductions.length) ? data.deductions : DEFAULT_DEDUCTIONS.map(d => ({ name: d.name, amount: d.amount }));

    $('input-gross').value = gross;
    if ($('input-annual-bonus')) $('input-annual-bonus').value = annualBonus;
    const listEl = $('deductions-edit-list');
    if (listEl) {
      listEl.innerHTML = deductions.map((d, i) => `
        <div class="deduction-edit-row">
          <input type="text" class="deduction-name" data-i="${i}" value="${escapeAttr(d.name)}" placeholder="Name" />
          <input type="number" class="deduction-amount" data-i="${i}" value="${d.amount}" min="0" step="100" placeholder="0" />
        </div>
      `).join('');
    }
    $('income-panel').style.display = 'none';
    $('income-edit-panel').style.display = 'block';
  }

  function cancelIncomeEdit() {
    $('income-edit-panel').style.display = 'none';
    $('income-panel').style.display = 'block';
  }

  function saveIncomeFromEdit() {
    const gross = Number($('input-gross').value) || 0;
    const deductionRows = ($('deductions-edit-list') || {}).querySelectorAll && $('deductions-edit-list').querySelectorAll('.deduction-edit-row');
    const deductions = [];
    if (deductionRows && deductionRows.length) {
      deductionRows.forEach(row => {
        const nameInp = row.querySelector('.deduction-name');
        const amtInp = row.querySelector('.deduction-amount');
        deductions.push({
          name: nameInp ? nameInp.value.trim() : '',
          amount: amtInp ? (Number(amtInp.value) || 0) : 0
        });
      });
    }
    if (deductions.length === 0) {
      (DEFAULT_DEDUCTIONS || []).forEach(d => deductions.push({ name: d.name, amount: d.amount }));
    }
    const annualBonus = Number($('input-annual-bonus') && $('input-annual-bonus').value) || 0;
    const savingLastMonth = Number($('input-saving-last-month') && $('input-saving-last-month').value) || 0;
    const db = getDb();
    DE.ensureMonth(db, currentYear, currentMonth);
    DE.setGrossAndDeductions(db, currentYear, currentMonth, gross, deductions, annualBonus, savingLastMonth);
    cancelIncomeEdit();
    renderIncomeSummary();
    refreshOverviewAndCharts();
    refreshTips();
  }

  // --- Category grid: one box per main category, entries inside with Spent only. Current month gets full default numbers.
  function loadMonthIntoUI() {
    const db = getDb();
    DE.ensureMonth(db, currentYear, currentMonth);
    const data = DE.getMonthData(db, currentYear, currentMonth);
    const defaults = DE.getDefaultExpensesForMonth ? DE.getDefaultExpensesForMonth() : [];
    const defaultCount = defaults.length;
    if (defaultCount && (!data.expenses || data.expenses.length === 0)) {
      DE.setExpenses(db, currentYear, currentMonth, defaults.map(e => ({
        category: e.category, subcategory: e.subcategory, spent: e.spent != null ? e.spent : 0, amount: e.spent != null ? e.spent : 0, currency: 'EGP', amountEGP: e.spent != null ? e.spent : 0, paymentMethod: e.paymentMethod || 'debit'
      })));
      return loadMonthIntoUI();
    }
    const copyPrevBtn = $('btn-copy-prev');
    if (copyPrevBtn) copyPrevBtn.style.display = (currentYear === APP_START_YEAR && currentMonth === APP_START_MONTH) ? 'none' : '';
    renderIncomeSummary();
    renderCashPocketPanel();
    renderCategoryGrid();
    refreshOverviewAndCharts();
    refreshTips();
    renderLoanSummary();
  }

  function renderCategoryGrid() {
    const grid = $('category-grid');
    if (!grid) return;

    const expenses = getExpenses();
    const byCategory = {};
    expenses.forEach((row, index) => {
      const cat = row.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ ...row, _index: index });
    });

    const order = MAIN_CATEGORIES.length ? MAIN_CATEGORIES : ['Apartment', 'Pet-Mylo', 'Luxury', 'Super Luxury', 'Entertainment', 'Car', 'Loans', 'Food', 'Other'];
    grid.innerHTML = '';

    order.forEach(cat => {
      const rows = byCategory[cat] || [];
      const section = document.createElement('div');
      section.className = 'category-box';
      const icon = CATEGORY_ICONS[cat] || '📁';
      const subs = CATEGORY_SUBCATEGORIES[cat] || [];
      const listId = 'datalist-' + (cat.replace(/\s+/g, '-'));
      section.innerHTML = `
        <div class="category-box-title">${icon} ${escapeAttr(cat)}</div>
        <datalist id="${listId}"></datalist>
        <div class="category-box-body">
          <div class="category-row header-row">
            <span class="col-sub">Item</span>
            <span class="col-amount">Amount</span>
            <span class="col-currency">Curr.</span>
            <span class="col-pay">Pay with</span>
            <span class="col-action"></span>
          </div>
        </div>
      `;
      const body = section.querySelector('.category-box-body');
      const dl = section.querySelector('datalist');
      if (dl && subs.length) subs.forEach(s => { const o = document.createElement('option'); o.value = s; dl.appendChild(o); });

      const CURRENCIES = ['EGP', 'USD', 'EUR', 'UAD', 'SAR'];
      const creditCards = DE.loadCredit ? (DE.loadCredit() || []) : [];
      const cardsList = Array.isArray(creditCards) ? creditCards : [creditCards];
      const payWithOptions = [
        { value: 'debit', label: 'Debit' },
        ...cardsList.map(c => ({ value: 'credit:' + (c.id || ''), label: 'Credit - ' + (c.name || 'Card') })),
        { value: 'cash', label: 'Cash' },
        { value: 'other', label: 'Other' }
      ];
      rows.forEach(row => {
        const idx = row._index;
        let amount = Number(row.amount) ?? Number(row.spent);
        if (typeof amount !== 'number' || isNaN(amount)) amount = Number(row.actual) || 0;
        const currency = (row.currency || 'EGP').toUpperCase();
        const amountEGP = Number(row.amountEGP) ?? amount;
        const pm = row.paymentMethod || 'debit';
        const cid = row.creditCardId;
        const payValue = pm === 'credit' ? (cid ? 'credit:' + cid : (cardsList[0] ? 'credit:' + cardsList[0].id : 'credit')) : pm;
        const tr = document.createElement('div');
        tr.className = 'category-row';
        tr.innerHTML = `
          <span class="col-sub">
            <input type="text" data-index="${idx}" data-field="subcategory" value="${escapeAttr(row.subcategory || '')}" placeholder="Item" list="${listId}" />
          </span>
          <span class="col-amount"><input type="number" data-index="${idx}" data-field="amount" data-currency="${currency}" value="${amount}" min="0" step="100" title="EGP equivalent: ${amountEGP}" /></span>
          <span class="col-currency">
            <select data-index="${idx}" data-field="currency">
              ${CURRENCIES.map(c => `<option value="${c}" ${currency === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </span>
          <span class="col-pay">
            <select data-index="${idx}" data-field="paymentMethod">
              ${payWithOptions.map(o => `<option value="${escapeAttr(o.value)}" ${payValue === o.value ? 'selected' : ''}>${escapeAttr(o.label)}</option>`).join('')}
            </select>
          </span>
          <span class="col-action"><button type="button" class="btn-delete" data-index="${idx}">Delete</button></span>
        `;
        body.appendChild(tr);
      });

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn btn-ghost btn-add-in-category';
      addBtn.textContent = '+ Add line';
      addBtn.dataset.category = cat;
      addBtn.addEventListener('click', () => addRowInCategory(cat));
      body.appendChild(addBtn);

      grid.appendChild(section);
    });

    bindCategoryInputs();
  }

  function bindCategoryInputs() {
    const grid = $('category-grid');
    if (!grid) return;
    grid.querySelectorAll('input[data-field], select[data-field]').forEach(el => {
      el.addEventListener('change', function () { persistExpenseField(this); });
    });
    grid.querySelectorAll('input[data-field="subcategory"]').forEach(input => {
      input.addEventListener('blur', function () { persistExpenseField(this); });
    });
    grid.querySelectorAll('input[data-field="amount"]').forEach(input => {
      input.addEventListener('blur', function () { persistExpenseField(this); });
    });
    grid.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', function () {
        const index = parseInt(this.getAttribute('data-index'), 10);
        deleteRow(index);
      });
    });
  }

  function persistExpenseField(input) {
    const index = parseInt(input.getAttribute('data-index'), 10);
    const field = input.getAttribute('data-field');
    const row = getExpenses()[index];
    if (!row) return;
    let val = (input.tagName === 'SELECT') ? input.value : (input.type === 'number' ? Number(input.value) || 0 : input.value);
    const next = { ...row, [field]: val };
    if (field === 'paymentMethod') {
      if (typeof val === 'string' && val.startsWith('credit:')) {
        next.paymentMethod = 'credit';
        next.creditCardId = val.slice(7) || undefined;
      } else {
        next.paymentMethod = val;
        next.creditCardId = (val === 'credit' ? (row.creditCardId || undefined) : undefined);
      }
    }
    if (field === 'amount' || field === 'currency') {
      const currency = (field === 'currency' ? val : (row.currency || 'EGP')).toUpperCase();
      const amount = field === 'amount' ? Number(val) || 0 : (Number(row.amount) ?? Number(row.spent) ?? 0);
      if (currency === 'EGP') {
        next.amountEGP = amount; next.spent = amount; next.amount = amount; next.currency = 'EGP';
      } else {
        convertToEGPAndPersist(index, amount, currency, next, row);
        return;
      }
    }
    if (next.paymentMethod === 'cash') {
      const data = getCurrentMonthData();
      const cashMonthly = (data && data.cashPocketMonthly != null) ? Number(data.cashPocketMonthly) : 12500;
      const expenses = getExpenses();
      const cashSpentOther = (expenses || []).reduce((s, e, i) => {
        if (i === index) return s;
        return (e.paymentMethod || '').toLowerCase() === 'cash' ? s + (Number(e.amountEGP) ?? Number(e.spent) ?? 0) : s;
      }, 0);
      const cashRemaining = Math.max(0, cashMonthly - cashSpentOther);
      const amt = Number(next.amountEGP) ?? Number(next.spent) ?? 0;
      if (amt > cashRemaining) {
        next.spent = cashRemaining; next.amountEGP = cashRemaining; next.amount = cashRemaining;
      }
    }
    const db = getDb();
    DE.updateExpenseRow(db, currentYear, currentMonth, index, next);
    refreshOverviewAndCharts();
    refreshTips();
    renderIncomeSummary();
    renderCashPocketPanel();
    if (typeof loadCreditIntoUI === 'function') loadCreditIntoUI();
  }

  function convertToEGPAndPersist(index, amount, currency, next, row) {
    fetchExchangeRate(currency).then(rate => {
      const amountEGP = Math.round(amount * rate * 1.03);
      next.amountEGP = amountEGP; next.spent = amountEGP; next.amount = amount; next.currency = currency;
      const db = getDb();
      DE.updateExpenseRow(db, currentYear, currentMonth, index, next);
      loadMonthIntoUI();
      refreshOverviewAndCharts();
      renderIncomeSummary();
      renderCashPocketPanel();
      if (typeof loadCreditIntoUI === 'function') loadCreditIntoUI();
    }).catch(() => {
      const fallback = { USD: 50, EUR: 52, UAD: 13.6, SAR: 13.3 };
      const rate = fallback[currency] || 1;
      next.amountEGP = Math.round(amount * rate * 1.03); next.spent = next.amountEGP; next.amount = amount; next.currency = currency;
      const db = getDb();
      DE.updateExpenseRow(db, currentYear, currentMonth, index, next);
      loadMonthIntoUI();
    });
  }

  let exchangeRatesCache = { USD: 50, EUR: 52, UAD: 13.6, SAR: 13.3 };
  function fetchExchangeRate(foreignCurrency) {
    if (foreignCurrency === 'EGP') return Promise.resolve(1);
    return fetch('https://api.exchangerate-api.com/v4/latest/EGP').then(r => r.json()).then(data => {
      const rates = data.rates || {};
      const egpPerOneForeign = rates[foreignCurrency];
      if (egpPerOneForeign) exchangeRatesCache[foreignCurrency] = 1 / egpPerOneForeign;
      return exchangeRatesCache[foreignCurrency] || 50;
    }).catch(() => exchangeRatesCache[foreignCurrency] || 50);
  }

  function renderCashPocketPanel() {
    const data = getCurrentMonthData();
    const expenses = getExpenses();
    const cashSpent = DE.totalSpentByPaymentMethod ? DE.totalSpentByPaymentMethod(expenses, 'cash') : 0;
    const cashMonthly = (data && data.cashPocketMonthly != null) ? Number(data.cashPocketMonthly) : (DE.DEFAULT_CASH_POCKET || 12500);
    const cashRemaining = Math.max(0, cashMonthly - cashSpent);
    const cashInput = $('cash-pocket-monthly');
    if (cashInput) cashInput.value = cashMonthly;
    if ($('disp-cash-pocket-remaining')) $('disp-cash-pocket-remaining').textContent = formatMoney(cashRemaining) + ' EGP';
  }

  function deleteRow(index) {
    const db = getDb();
    DE.deleteExpenseRow(db, currentYear, currentMonth, index);
    loadMonthIntoUI();
  }

  function addRowInCategory(category) {
    const db = getDb();
    DE.addExpenseRow(db, currentYear, currentMonth, { category: category, subcategory: '', spent: 0, amount: 0, currency: 'EGP', amountEGP: 0, paymentMethod: 'debit' });
    loadMonthIntoUI();
  }

  function copyPreviousMonth() {
    const db = getDb();
    DE.copyPreviousMonth(db, currentYear, currentMonth);
    loadMonthIntoUI();
  }

  // --- Overview & charts
  function refreshOverviewAndCharts() {
    const income = getIncome();
    const expenses = getExpenses();
    const totalSpent = DE.totalSpent(expenses);
    const savings = DE.netSavings(income, expenses);
    const rate = DE.savingsRate(income, expenses);

    if ($('overview-expense')) $('overview-expense').textContent = formatMoney(totalSpent);
    const os = $('overview-savings');
    if (os) {
      os.textContent = formatMoney(savings);
      os.className = 'card-value ' + (savings < 0 ? 'negative' : 'positive');
    }
    if ($('overview-rate')) $('overview-rate').textContent = rate.toFixed(1) + '%';

    const db = getDb();
    let monthKeys = DE.getMonthKeysSorted(db);
    monthKeys = monthKeys.filter(key => {
      const [y, m] = key.split('-').map(Number);
      return y < currentYear || (y === currentYear && m <= currentMonth);
    });
    let totalSavingsSum = 0;
    monthKeys.forEach(key => {
      const [y, m] = key.split('-');
      const d = DE.getMonthData(db, parseInt(y, 10), parseInt(m, 10));
      const inc = DE.getNetIncome ? DE.getNetIncome(d) : (d && d.income) || 0;
      const sp = DE.totalSpent(d && d.expenses ? d.expenses : []);
      totalSavingsSum += (inc - sp);
    });
    const totalSavingsEl = $('overview-total-savings');
    if (totalSavingsEl) {
      totalSavingsEl.textContent = formatMoney(totalSavingsSum);
      totalSavingsEl.className = 'card-value ' + (totalSavingsSum < 0 ? 'negative' : 'positive');
    }

    const travelTotal = (expenses || []).reduce((s, e) => ((e.category || '').toLowerCase() === 'travel' ? s + (Number(e.amountEGP) ?? Number(e.spent) ?? 0) : s), 0);
    const travelWrap = $('card-travel-wrap');
    if (travelWrap) {
      travelWrap.style.display = travelTotal > 0 ? '' : 'none';
      const travelVal = $('overview-travel');
      if (travelVal) travelVal.textContent = formatMoney(travelTotal);
    }

    const health = getFinancialHealth(rate, savings, income);
    if ($('health-badge')) {
      $('health-badge').textContent = health.label;
      $('health-badge').className = 'health-badge ' + health.class;
    }

    const tipBox = $('savings-negative-tip');
    const tipContent = $('savings-negative-tip-content');
    if (tipBox && tipContent) {
      if (savings < 0 && income > 0) {
        tipBox.style.display = '';
        const creditUsed = DE.getTotalCreditSpent ? DE.getTotalCreditSpent(db, null, null) : 0;
        const cards = DE.loadCredit();
        const list = Array.isArray(cards) ? cards : [cards];
        const totalLimit = list.reduce((s, c) => s + (c.limit || 0), 0);
        const room = Math.max(0, totalLimit - creditUsed);
        const cover = Math.min(-savings, room);
        const rate = list[0] && list[0].interestRateAnnual != null ? list[0].interestRateAnnual : 30;
        const monthlyRate = rate / 12 / 100;
        const interestNext = cover * monthlyRate;
        tipContent.innerHTML = `You can cover <strong>${formatMoney(cover)}</strong> EGP with credit this month. Room on cards: ${formatMoney(room)} EGP. Approx. interest next month if unpaid: ${formatMoney(Math.round(interestNext))} EGP. Use only if needed.`;
      } else tipBox.style.display = 'none';
    }

    const monthlySpend = monthKeys.map(key => {
      const [y, m] = key.split('-');
      const d = DE.getMonthData(db, parseInt(y, 10), parseInt(m, 10));
      return { label: `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`, spend: DE.totalSpent(d && d.expenses ? d.expenses : []), savings: (DE.getNetIncome ? DE.getNetIncome(d) : (d && d.income) || 0) - DE.totalSpent(d && d.expenses ? d.expenses : []) };
    });
    const contribution = DE.categoryContribution(expenses);
    const contributionWithTravel = contribution.slice();
    if (travelTotal > 0 && !contributionWithTravel.find(c => (c.category || '').toLowerCase() === 'travel')) {
      contributionWithTravel.push({ category: 'Travel', amount: travelTotal, percent: totalSpent > 0 ? (travelTotal / totalSpent) * 100 : 0 });
    }

    if (typeof PFISCharts !== 'undefined') {
      PFISCharts.updateAll(
        monthlySpend.map(d => ({ label: d.label, spend: d.spend })),
        monthlySpend.map(d => ({ label: d.label, savings: d.savings })),
        contribution,
        contributionWithTravel
      );
    }
  }

  function getFinancialHealth(rate, savings, income) {
    let score = 50;
    if (income > 0) {
      if (rate >= 25) score = 85 + Math.min(15, (rate - 25) / 2);
      else if (rate >= 20) score = 75 + (rate - 20);
      else if (rate >= 10) score = 55 + (rate - 10);
      else if (rate >= 0) score = 45 + rate;
      else score = Math.max(0, 45 + rate);
    }
    score = Math.round(Math.min(100, Math.max(0, score)));
    let label = 'Good';
    let cls = 'green';
    if (score < 40) { label = 'At risk'; cls = 'red'; }
    else if (score < 65) { label = 'Fair'; cls = 'yellow'; }
    return { score, label, class: cls };
  }

  // --- Tips: realistic, no “reduce loan”; focus on discretionary spend
  function refreshTips() {
    const income = getIncome();
    const expenses = getExpenses();
    const totalSpent = DE.totalSpent(expenses);
    const savings = DE.netSavings(income, expenses);
    const rate = DE.savingsRate(income, expenses);
    const contribution = DE.categoryContribution(expenses).filter(c => (c.category || '').toLowerCase() !== 'loans');

    const tips = [];

    if (contribution.length > 0) {
      const top = contribution[0];
      const pct = totalSpent > 0 ? ((top.amount / totalSpent) * 100).toFixed(0) : 0;
      tips.push(`<strong>Largest flexible category:</strong> ${top.category} (${formatMoney(top.amount)} — ${pct}%). Focus cuts here for quick impact.`);
      if (income > 0 && top.amount > 0 && (top.category || '').toLowerCase() !== 'loans') {
        const save10 = Math.round(top.amount * 0.1);
        tips.push(`<strong>Idea:</strong> Trimming ${top.category} by 10% saves ${formatMoney(save10)}/month (e.g. one fewer delivery, or pausing a subscription).`);
      }
    }

    if (rate < 20 && income > 0) {
      const target = Math.round(income * 0.2);
      tips.push(`<strong>Target:</strong> Try to save 20% of income (${formatMoney(target)}/month). You're at ${rate.toFixed(1)}%. Small wins: fewer takeaways, compare utilities or insurance.`);
    }
    if (rate >= 20 && income > 0) {
      tips.push(`<strong>On track:</strong> You're saving ${rate.toFixed(1)}%. Consider an emergency fund (3–6 months of expenses) or a specific goal.`);
    }

    if (savings < 0 && income > 0) {
      tips.push(`<strong>Heads up:</strong> Spending is ${formatMoney(-savings)} over income. Easiest levers: Luxury, Super Luxury, Entertainment, and Food delivery.`);
    }

    if (contribution.length >= 2) {
      const second = contribution[1];
      if ((second.category || '').toLowerCase() !== 'loans') {
        tips.push(`<strong>Next lever:</strong> ${second.category} (${formatMoney(second.amount)}). Check for subscriptions or habits you can trim.`);
      }
    }

    tips.push(`<strong>Note:</strong> Loan payments are fixed; tips focus on categories you can adjust.`);
    if (tips.length <= 1) tips.unshift('Add income and expenses. Tips will suggest where to save.');
    const el = $('ai-insights');
    if (el) el.innerHTML = tips.map(t => `<p class="insight-item">${t}</p>`).join('');
  }

  // --- Tabs
  function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const pane = $('pane-' + tabId);
    const btn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
    if (pane) pane.classList.add('active');
    if (btn) btn.classList.add('active');
    if (tabId === 'dashboard') {
      loadMonthIntoUI();
      refreshOverviewAndCharts();
    }
    if (tabId === 'loans') renderLoanSummary();
    if (tabId === 'credit') loadCreditIntoUI();
    if (tabId === 'travel') renderTripsList();
  }

  // --- Loan: dynamic from main spent (read-only dashboard)
  function renderLoanSummary() {
    const el = $('loan-summary');
    if (!el) return;
    const loans = DE.loadLoans();
    const MONTH_NAMES = DE.MONTH_NAMES || [];
    const db = getDb();
    const dynamic = DE.getLoanPaidFromExpenses ? DE.getLoanPaidFromExpenses(db, currentYear, currentMonth) : null;
    if (loans.length === 0) {
      el.innerHTML = '<p class="loan-desc">Car loan: 1,850,000 EGP. First payment Nov 2025 (42,910 EGP/month). Values below are from your main dashboard spent (Loans → Car loan).</p>';
      if (dynamic) {
        el.innerHTML += `
          <div class="loan-summary-card">
            <div class="loan-summary-row"><span>Principal</span><span>1,850,000 EGP</span></div>
            <div class="loan-summary-row"><span>Total paid (from expenses)</span><span>${formatMoney(dynamic.totalPaid)} EGP</span></div>
            <div class="loan-summary-row"><span>Months with payment recorded</span><span>${dynamic.monthsWithPayment}</span></div>
            <div class="loan-summary-row"><span>Remaining balance</span><span>${formatMoney(dynamic.remainingBalance)} EGP</span></div>
            <div class="loan-summary-row"><span>Remaining months (est.)</span><span>${dynamic.remainingMonths}</span></div>
          </div>
        `;
      }
      return;
    }
    const loan = loans[0];
    const principalDisplay = (DE.LOAN_PRINCIPAL != null) ? DE.LOAN_PRINCIPAL : (loan.principal || 1850000);
    const monthlyPaymentDisplay = (DE.LOAN_MONTHLY_PAYMENT != null) ? DE.LOAN_MONTHLY_PAYMENT : (loan.monthlyPayment || 42910);
    const takenStr = loan.startYear && loan.startMonth ? `${MONTH_NAMES[loan.startMonth - 1] || ''} ${loan.startYear}` : 'Sept 2025';
    const recalc = DE.recalcRemainingBalance(loan, currentYear, currentMonth);
    const totalPaid = dynamic ? dynamic.totalPaid : (recalc.monthsPaid * monthlyPaymentDisplay);
    const monthsCount = dynamic ? dynamic.monthsWithPayment : recalc.monthsPaid;
    const remaining = dynamic ? dynamic.remainingBalance : recalc.remainingBalance;
    const remainingMonths = dynamic ? dynamic.remainingMonths : recalc.remainingMonths;
    el.innerHTML = `
      <p class="loan-desc">Values are computed from your main dashboard spent (Loans → Car loan). Edit amounts there; this view updates automatically.</p>
      <div class="loan-summary-card loan-summary-readonly">
        <div class="loan-summary-row"><span>Principal</span><span>${formatMoney(principalDisplay)} EGP</span></div>
        <div class="loan-summary-row"><span>Loan taken</span><span>${takenStr}</span></div>
        <div class="loan-summary-row"><span>Monthly payment</span><span>${formatMoney(monthlyPaymentDisplay)} EGP</span></div>
        <div class="loan-summary-row"><span>Total paid (from main spent)</span><span>${formatMoney(totalPaid)} EGP</span></div>
        <div class="loan-summary-row"><span>Months with payment (to ${MONTH_NAMES[currentMonth - 1]} ${currentYear})</span><span>${monthsCount}</span></div>
        <div class="loan-summary-row"><span>Remaining balance</span><span>${formatMoney(remaining)} EGP</span></div>
        <div class="loan-summary-row"><span>Remaining months (est.)</span><span>${remainingMonths}</span></div>
      </div>
    `;
  }

  // --- Credit: multiple cards; only limit and rate editable; available = limit − per-card credit spend
  function loadCreditIntoUI() {
    const list = DE.loadCredit();
    const db = getDb();
    const totalCreditUsed = DE.getTotalCreditSpent ? DE.getTotalCreditSpent(db, null, null) : 0;
    const cards = Array.isArray(list) ? list : [list];
    const listEl = $('credit-cards-list');
    if (!listEl) return;
    listEl.innerHTML = cards.map((c, i) => {
      const limit = c.limit != null ? c.limit : 100000;
      const usedOnCard = DE.getTotalCreditSpentPerCard ? DE.getTotalCreditSpentPerCard(db, c.id, null, null) : 0;
      const available = Math.max(0, limit - usedOnCard);
      return `
        <div class="credit-card-block" data-id="${c.id || 'cc-' + i}">
          <div class="form-group"><label>Card name</label><input type="text" class="credit-name-inp" data-id="${c.id}" value="${escapeAttr(c.name || 'Card ' + (i + 1))}" placeholder="Card name" /></div>
          <div class="credit-form">
            <div class="form-group form-group-readonly"><label>Available (EGP)</label><span class="readonly-value">${formatMoney(available)} EGP</span></div>
            <div class="form-group"><label>Limit (EGP)</label><input type="number" class="credit-limit-inp" data-id="${c.id}" value="${limit}" min="0" step="1000" /></div>
            <div class="form-group form-group-readonly"><label>Used on card (EGP)</label><span class="readonly-value">${formatMoney(usedOnCard)} EGP</span></div>
            <div class="form-group"><label>Interest rate (%/year)</label><input type="number" class="credit-rate-inp" data-id="${c.id}" value="${c.interestRateAnnual != null ? c.interestRateAnnual : DE.CREDIT_DEFAULT_INTEREST_EGYPT || 30}" min="0" step="0.5" /></div>
            <button type="button" class="btn btn-primary credit-save-btn" data-id="${c.id}">Save</button>
            ${cards.length > 1 ? `<button type="button" class="btn btn-ghost credit-delete-btn" data-id="${c.id}">Remove</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.credit-save-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        const list2 = DE.loadCredit();
        const card = (Array.isArray(list2) ? list2 : [list2]).find(c => c.id === id);
        if (!card) return;
        const block = this.closest('.credit-card-block');
        const nameInp = block && block.querySelector('.credit-name-inp');
        const limInp = block && block.querySelector('.credit-limit-inp');
        const rateInp = block && block.querySelector('.credit-rate-inp');
        if (nameInp) card.name = (nameInp.value && nameInp.value.trim()) || card.name;
        card.limit = limInp ? Number(limInp.value) || card.limit : card.limit;
        card.interestRateAnnual = rateInp ? Number(rateInp.value) : card.interestRateAnnual;
        const arr = DE.loadCredit();
        const idx = arr.findIndex(c => c.id === id);
        if (idx >= 0) arr[idx] = card;
        DE.saveCredit(arr);
        loadCreditIntoUI();
      });
    });
    listEl.querySelectorAll('.credit-delete-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        if (!confirm('Remove this card?')) return;
        DE.deleteCreditCard(this.getAttribute('data-id'));
        loadCreditIntoUI();
      });
    });

    const reportEl = $('credit-status-report');
    if (reportEl) {
      const totalLimit = cards.reduce((s, c) => s + (c.limit || 0), 0);
      reportEl.innerHTML = `
        <div class="credit-report-grid">
          <div class="credit-report-item"><span class="label">Total limit</span><span class="value">${formatMoney(totalLimit)} EGP</span></div>
          <div class="credit-report-item"><span class="label">Total used</span><span class="value">${formatMoney(totalCreditUsed)} EGP</span></div>
          <div class="credit-report-item"><span class="label">Status</span><span class="value">${totalCreditUsed <= totalLimit * 0.3 ? 'Low use' : totalCreditUsed <= totalLimit * 0.7 ? 'Moderate' : 'High use'}</span></div>
          <div class="credit-report-item"><span class="label">Utilization</span><span class="value">${totalLimit > 0 ? ((totalCreditUsed / totalLimit) * 100).toFixed(1) : 0}%</span></div>
        </div>
      `;
    }
  }

  function saveCreditFromUI() {
    loadCreditIntoUI();
  }

  // --- Travel
  function renderTripsList() {
    const el = $('trips-list');
    if (!el) return;
    const trips = DE.loadTrips();
    if (trips.length === 0) {
      el.innerHTML = '<p class="empty-state">No trips yet. Click "Add trip" to plan one.</p>';
      return;
    }
    el.innerHTML = trips.map(t => {
      const total = DE.totalSpent(t.expenses || []);
      return `
        <div class="trip-card">
          <strong>${escapeAttr(t.name)}</strong> ${escapeAttr(t.date)}
          <span class="trip-total">${formatMoney(total)} EGP</span>
        </div>
      `;
    }).join('');
  }

  function showTripForm() {
    $('trip-name').value = '';
    $('trip-date').value = '';
    const rowContainer = $('trip-expenses-rows');
    if (rowContainer) rowContainer.innerHTML = '';
    $('trips-list').closest('.panel').style.display = 'none';
    $('trip-form-panel').style.display = 'block';
    addTripExpenseRow();
  }

  function addTripExpenseRow() {
    const rowContainer = $('trip-expenses-rows');
    if (!rowContainer) return;
    const div = document.createElement('div');
    div.className = 'trip-expense-row';
    div.innerHTML = `
      <input type="text" class="trip-exp-cat" placeholder="Category" />
      <input type="text" class="trip-exp-sub" placeholder="Item" />
      <input type="number" class="trip-exp-amount" placeholder="0" min="0" step="100" />
    `;
    rowContainer.appendChild(div);
  }

  function saveTripFromForm() {
    const name = ($('trip-name') && $('trip-name').value.trim()) || 'Trip';
    const date = ($('trip-date') && $('trip-date').value.trim()) || '';
    const rows = ($('trip-expenses-rows') && $('trip-expenses-rows').querySelectorAll('.trip-expense-row')) || [];
    const expenses = [];
    rows.forEach(row => {
      const cat = (row.querySelector('.trip-exp-cat') && row.querySelector('.trip-exp-cat').value.trim()) || 'Travel';
      const sub = (row.querySelector('.trip-exp-sub') && row.querySelector('.trip-exp-sub').value.trim()) || '';
      const amt = Number(row.querySelector('.trip-exp-amount') && row.querySelector('.trip-exp-amount').value) || 0;
      if (cat || sub || amt) expenses.push({ category: cat, subcategory: sub, spent: amt });
    });
    DE.addTrip({ name, date, expenses });

    const db = getDb();
    DE.ensureMonth(db, currentYear, currentMonth);
    const data = DE.getMonthData(db, currentYear, currentMonth);
    const existing = (data && data.expenses) ? data.expenses : [];
    expenses.forEach(e => existing.push(DE.normalizeExpense({ ...e, category: e.category || 'Travel' })));
    DE.setExpenses(db, currentYear, currentMonth, existing);

    $('trip-form-panel').style.display = 'none';
    $('trips-list').closest('.panel').style.display = 'block';
    renderTripsList();
    loadMonthIntoUI();
    alert('Trip saved and expenses added to current month.');
  }

  function cancelTripForm() {
    $('trip-form-panel').style.display = 'none';
    $('trips-list').closest('.panel').style.display = 'block';
  }

  // --- Theme: auto by time (light 6am–6pm, dark otherwise); manual toggle still works
  function getThemeByTime() {
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
  }
  function applyThemeByTime() {
    document.documentElement.setAttribute('data-theme', getThemeByTime());
  }
  function toggleTheme() {
    const html = document.documentElement;
    const isDark = !html.getAttribute('data-theme') || html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  }

  // --- GitHub backup: save payload to repo as database/backup.json
  const GITHUB_TOKEN_KEY = 'pfis_github_token';
  const GITHUB_REPO_KEY = 'pfis_github_repo';

  function getGitHubConfig() {
    return {
      token: localStorage.getItem(GITHUB_TOKEN_KEY) || PFIS_GITHUB_DEFAULT.token || '',
      repo: (localStorage.getItem(GITHUB_REPO_KEY) || PFIS_GITHUB_DEFAULT.repo || 'EgyptSeal/BUD').trim() || 'EgyptSeal/BUD'
    };
  }

  function applyDefaultGitHubToStorage() {
    if (PFIS_GITHUB_DEFAULT.token && !localStorage.getItem(GITHUB_TOKEN_KEY)) {
      localStorage.setItem(GITHUB_TOKEN_KEY, PFIS_GITHUB_DEFAULT.token);
      localStorage.setItem(GITHUB_REPO_KEY, PFIS_GITHUB_DEFAULT.repo || 'EgyptSeal/BUD');
    }
  }

  function base64Encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function saveToGitHub(payload) {
    const { token, repo } = getGitHubConfig();
    if (!token || !repo) return Promise.resolve(false);
    const path = 'database/backup.json';
    const url = 'https://api.github.com/repos/' + repo + '/contents/' + path;
    const content = base64Encode(JSON.stringify(payload, null, 2));
    const message = 'Backup ' + new Date().toISOString();
    const headers = {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
    return fetch(url, { method: 'GET', headers: headers })
      .then(r => {
        if (r.status === 401) return r.json().then(() => { throw new Error('TOKEN_EXPIRED'); });
        return r.status === 200 ? r.json() : null;
      })
      .then(file => {
        const body = { message: message, content: content };
        if (file && file.sha) body.sha = file.sha;
        return fetch(url, { method: 'PUT', headers: headers, body: JSON.stringify(body) });
      })
      .then(r => {
        if (r.status === 401) return r.json().then(() => { throw new Error('TOKEN_EXPIRED'); });
        if (!r.ok) return r.json().then(err => { throw new Error(err.message || 'GitHub save failed'); });
        return true;
      });
  }

  // --- Sync current form values to localStorage before Save (so unsaved input changes are included)
  function syncFormToStorage() {
    const grid = $('category-grid');
    if (grid) {
      grid.querySelectorAll('input[data-field], select[data-field]').forEach(function (el) {
        persistExpenseField(el);
      });
    }
    refreshOverviewAndCharts();
    refreshTips();
    renderIncomeSummary();
    renderCashPocketPanel();
  }

  // --- Save: push backup to GitHub only (cloud)
  function saveAllToDatabase() {
    syncFormToStorage();
    const payload = {
      database: JSON.parse(localStorage.getItem(DE.STORAGE_KEY) || '{}'),
      loans: JSON.parse(localStorage.getItem(DE.LOANS_KEY) || '[]'),
      credit: JSON.parse(localStorage.getItem(DE.CREDIT_KEY) || '[]'),
      trips: JSON.parse(localStorage.getItem(DE.TRIPS_KEY) || '[]'),
      exportedAt: new Date().toISOString()
    };
    const { token } = getGitHubConfig();
    if (!token) {
      alert('Open Settings and add your GitHub Personal Access Token so Save can store the backup on GitHub.');
      return;
    }
    saveToGitHub(payload).then(function (ok) {
      if (ok) alert('Saved to GitHub. On other devices click "Load from cloud" or refresh; it may take up to 1 min to see changes.');
      else alert('Could not save to GitHub.');
    }).catch(function (err) {
      const msg = err && err.message ? err.message : '';
      if (msg === 'TOKEN_EXPIRED') {
        alert('Your GitHub token has expired or is invalid.\n\nCreate a new token: GitHub.com → your profile → Settings → Developer settings → Personal access tokens → Generate new token (classic), enable "repo", then copy it.\n\nUpdate the token in app.js: find PFIS_GITHUB_DEFAULT and replace the token value, then push to GitHub.');
      } else {
        alert('GitHub save failed: ' + msg);
      }
    });
  }

  function openSettingsModal() {
    const cfg = getGitHubConfig();
    if ($('settings-repo')) $('settings-repo').value = cfg.repo;
    if ($('settings-token')) $('settings-token').value = cfg.token;
    if ($('settings-modal')) $('settings-modal').style.display = 'flex';
  }

  function closeSettingsModal() {
    if ($('settings-modal')) $('settings-modal').style.display = 'none';
  }

  function saveGitHubSettings() {
    const repo = ($('settings-repo') && $('settings-repo').value.trim()) || 'EgyptSeal/BUD';
    const token = ($('settings-token') && $('settings-token').value) ? $('settings-token').value.trim() : '';
    localStorage.setItem(GITHUB_REPO_KEY, repo);
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
    closeSettingsModal();
    alert('Settings saved. Use Save to push backup to GitHub.');
  }

  // --- Fetch latest backup: use Commits API then Contents at that SHA to avoid long CDN delay
  var NO_CACHE = { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' } };
  function fetchBackupFromGitHub() {
    const repo = (localStorage.getItem(GITHUB_REPO_KEY) || 'EgyptSeal/BUD').trim() || 'EgyptSeal/BUD';
    const path = 'database/backup.json';
    const ts = Date.now();
    const commitsUrl = 'https://api.github.com/repos/' + repo + '/commits?path=' + encodeURIComponent(path) + '&per_page=1&t=' + ts;
    return fetch(commitsUrl, NO_CACHE)
      .then(r => (!r.ok) ? null : r.json())
      .then(function (commits) {
        var ref = (commits && commits[0] && commits[0].sha) ? commits[0].sha : 'main';
        return fetch('https://api.github.com/repos/' + repo + '/contents/' + path + '?ref=' + ref + '&t=' + ts, NO_CACHE);
      })
      .then(r => (r && r.ok) ? r.json() : null)
      .then(function (apiRes) {
        if (!apiRes || !apiRes.content) return null;
        try {
          var b64 = (apiRes.content || '').replace(/\n/g, '');
          return JSON.parse(decodeURIComponent(escape(atob(b64))));
        } catch (e) { return null; }
      })
      .catch(function () {
        var fallback = 'https://api.github.com/repos/' + repo + '/contents/' + path + '?ref=main&t=' + Date.now();
        return fetch(fallback, NO_CACHE).then(function (r) { return r.ok ? r.json() : null; }).then(function (apiRes) {
          if (!apiRes || !apiRes.content) return null;
          try {
            var b64 = (apiRes.content || '').replace(/\n/g, '');
            return JSON.parse(decodeURIComponent(escape(atob(b64))));
          } catch (e) { return null; }
        });
      });
  }

  function applyBackupPayload(payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (payload.database != null) localStorage.setItem(DE.STORAGE_KEY, JSON.stringify(payload.database));
    if (payload.loans != null) localStorage.setItem(DE.LOANS_KEY, JSON.stringify(payload.loans));
    if (payload.credit != null) localStorage.setItem(DE.CREDIT_KEY, JSON.stringify(payload.credit));
    if (payload.trips != null) localStorage.setItem(DE.TRIPS_KEY, JSON.stringify(payload.trips));
    return true;
  }

  function loadFromGitHubOnStartup() {
    return fetchBackupFromGitHub().then(function (payload) {
      return applyBackupPayload(payload) ? true : null;
    });
  }

  function loadFromCloudAndRefresh() {
    const btn = $('btn-load-cloud');
    if (btn) btn.disabled = true;
    fetchBackupFromGitHub().then(function (payload) {
      if (applyBackupPayload(payload)) {
        location.reload();
      } else {
        alert('Could not load from cloud. After saving on the other device, wait ~1 min then click "Load from cloud" again.');
      }
      if (btn) btn.disabled = false;
    });
  }

  function resetAllData() {
    if (!confirm('Reset all data to default values? This cannot be undone.')) return;
    localStorage.removeItem(DE.STORAGE_KEY);
    localStorage.removeItem(DE.LOANS_KEY);
    localStorage.removeItem(DE.CREDIT_KEY);
    localStorage.removeItem(DE.TRIPS_KEY);
    location.reload();
  }

  // --- Init: attach all button listeners FIRST so cloud and slow networks never leave app unclickable
  function init() {
    var selectYear = $('select-year');
    var selectMonth = $('select-month');
    if (selectYear) selectYear.addEventListener('change', onYearMonthChange);
    if (selectMonth) selectMonth.addEventListener('change', onYearMonthChange);

    if ($('btn-edit-income')) $('btn-edit-income').addEventListener('click', showIncomeEdit);
    if ($('btn-save-income')) $('btn-save-income').addEventListener('click', saveIncomeFromEdit);
    if ($('btn-cancel-income')) $('btn-cancel-income').addEventListener('click', cancelIncomeEdit);
    if ($('btn-copy-prev')) $('btn-copy-prev').addEventListener('click', copyPreviousMonth);

    var tabList = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < tabList.length; i++) {
      (function (btn) { btn.addEventListener('click', function () { switchTab(btn.getAttribute('data-tab')); }); })(tabList[i]);
    }

    if ($('btn-add-credit-card')) $('btn-add-credit-card').addEventListener('click', function () {
      DE.addCreditCard();
      loadCreditIntoUI();
    });
    if ($('btn-atm-add')) $('btn-atm-add').addEventListener('click', function () {
      var amt = Number($('atm-amount') && $('atm-amount').value) || 0;
      if (amt <= 0) return;
      var income = getIncome();
      var expenses = getExpenses();
      var debitSpent = DE.totalSpentByPaymentMethod ? DE.totalSpentByPaymentMethod(expenses, 'debit') : 0;
      var remainingDebit = Math.max(0, income - debitSpent);
      var toAdd = Math.min(amt, remainingDebit);
      if (toAdd <= 0) {
        alert('Remaining debit balance is ' + formatMoney(remainingDebit) + ' EGP. You cannot withdraw more than your total debit income this month.');
        return;
      }
      if (toAdd < amt) alert('Capped to remaining debit balance: ' + formatMoney(toAdd) + ' EGP.');
      var db = getDb();
      DE.addExpenseRow(db, currentYear, currentMonth, { category: 'Other', subcategory: 'ATM withdrawal', spent: toAdd, amount: toAdd, currency: 'EGP', amountEGP: toAdd, paymentMethod: 'debit' });
      if ($('atm-amount')) $('atm-amount').value = '';
      loadMonthIntoUI();
    });

    if ($('btn-add-trip')) $('btn-add-trip').addEventListener('click', showTripForm);
    if ($('trip-add-expense')) $('trip-add-expense').addEventListener('click', addTripExpenseRow);
    if ($('trip-save')) $('trip-save').addEventListener('click', saveTripFromForm);
    if ($('trip-cancel')) $('trip-cancel').addEventListener('click', cancelTripForm);
    if ($('btn-theme')) $('btn-theme').addEventListener('click', toggleTheme);
    if ($('btn-save-db')) $('btn-save-db').addEventListener('click', saveAllToDatabase);
    if ($('btn-load-cloud')) $('btn-load-cloud').addEventListener('click', loadFromCloudAndRefresh);
    if ($('btn-reset-db')) $('btn-reset-db').addEventListener('click', resetAllData);
    if ($('btn-settings')) $('btn-settings').addEventListener('click', openSettingsModal);
    if ($('settings-save')) $('settings-save').addEventListener('click', saveGitHubSettings);
    if ($('settings-cancel')) $('settings-cancel').addEventListener('click', closeSettingsModal);
    if ($('settings-backdrop')) $('settings-backdrop').addEventListener('click', closeSettingsModal);

    var cashInput = $('cash-pocket-monthly');
    if (cashInput) {
      cashInput.addEventListener('change', function () {
        var db = getDb();
        var val = Number(this.value) || 0;
        if (DE.setCashPocketMonthly) DE.setCashPocketMonthly(db, currentYear, currentMonth, val);
        renderIncomeSummary();
      });
    }

    try {
      applyThemeByTime();
      setInterval(applyThemeByTime, 60000);
      applyDefaultGitHubToStorage();
      fillYearMonthSelectors();
      loadMonthIntoUI();
      renderLoanSummary();
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) console.error('Budget app init:', e);
    }

    loadFromGitHubOnStartup().then(function (applied) {
      if (applied) {
        try {
          fillYearMonthSelectors();
          loadMonthIntoUI();
          renderLoanSummary();
        } catch (err) {}
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
