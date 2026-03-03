/**
 * PFIS Data Engine
 * Loan: 1,850,000 EGP only, 42,910 EGP/month only. No duplicates.
 * Income: gross, deductions line by line (Tax, Car Insurance GIG, Mobile Bill 010, Social Insurance, Honoring Martyrs Fund), net.
 * Expenses: spent only (no planned/actual).
 */
(function () {
  const STORAGE_KEY = 'pfis_database';
  const LOANS_KEY = 'pfis_loans';
  const CREDIT_KEY = 'pfis_credit';
  const TRIPS_KEY = 'pfis_trips';
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // From salary statement (Feb 2026 pay slip): Total Earnings 144,740 | Net Pay 99,354.11
  const DEFAULT_GROSS = 144740;
  const DEFAULT_NET = 99354;

  // Deductions (mandatory) as per salary statement
  const DEFAULT_DEDUCTIONS = [
    { name: 'Monthly Tax Payable', amount: 36340 },
    { name: 'Total EE Contribution', amount: 1837 },
    { name: "Martyr's Fund Deduction", amount: 72 },
    { name: 'Mobile Bill', amount: 60 },
    { name: 'Monthly installments', amount: 7077 }
  ];

  // Main categories and subcategories (one box per category, entries inside)
  const MAIN_CATEGORIES = [
    'Apartment',
    'Pet-Mylo',
    'Luxury',
    'Super Luxury',
    'Entertainment',
    'Car',
    'Loans',
    'Food',
    'Utilities',
    'Other'
  ];

  const CATEGORY_SUBCATEGORIES = {
    'Apartment': ['Rent', 'Electricity', 'Water', 'N. Gas', 'WE Landline', 'WE Internet', 'Maintenance Diff.'],
    'Pet-Mylo': ['Buying', 'Grooming + Boarding', 'Vaccines', 'Diapers'],
    'Luxury': ['Charity', 'LinkedIn Premium', 'Cigarettes', 'Gas for Car'],
    'Super Luxury': ['Car Wash', 'UBER', 'Nails', 'Barber Shop', 'Garage'],
    'Entertainment': ['Netflix', 'OSN', 'Shahid VIP', 'Amazon Prime', 'VPN', 'Watch It', 'Apple ONE', 'Youtube Premium'],
    'Car': ['Service', 'EV charge', 'Addons', 'Accessories', 'Cleaning'],
    'Loans': ['Car loan'],
    'Food': ['Groceries', 'Delivery', 'Coffee', 'Restaurants'],
    'Utilities': ['Electricity', 'Water', 'Internet', 'Phone'],
    'Other': ['Charity giving', 'ATM withdrawal']
  };

  const CATEGORY_ICONS = {
    'Apartment': '🏠',
    'Pet-Mylo': '🐕',
    'Luxury': '✨',
    'Super Luxury': '💎',
    'Entertainment': '🎬',
    'Car': '🚗',
    'Loans': '📋',
    'Food': '🍽️',
    'Utilities': '💡',
    'Other': '📁'
  };

  function getYearMonth(year, monthNum) {
    return year + '-' + String(monthNum).padStart(2, '0');
  }

  function loadDatabase() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveDatabase(db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getMonthData(db, year, monthNum) {
    const key = getYearMonth(year, monthNum);
    return db[key] || null;
  }

  function ensureMonth(db, year, monthNum, templateKey) {
    const key = getYearMonth(year, monthNum);
    if (db[key]) {
      if (db[key].cashPocketMonthly == null) db[key].cashPocketMonthly = DEFAULT_CASH_POCKET;
      if (db[key].annualBonus == null) db[key].annualBonus = 0;
      if (db[key].savingFromLastMonth == null) db[key].savingFromLastMonth = 0;
      return db[key];
    }
    if (templateKey && db[templateKey]) {
      const t = db[templateKey];
      db[key] = {
        grossIncome: t.grossIncome,
        deductions: (t.deductions || []).map(d => ({ name: d.name, amount: d.amount })),
        income: t.income,
        annualBonus: t.annualBonus != null ? t.annualBonus : 0,
        savingFromLastMonth: t.savingFromLastMonth != null ? t.savingFromLastMonth : 0,
        expenses: (t.expenses || []).map(e => normalizeExpense(e)),
        cashPocketMonthly: t.cashPocketMonthly != null ? t.cashPocketMonthly : DEFAULT_CASH_POCKET
      };
    } else {
      const prevKey = monthNum === 1 ? getYearMonth(year - 1, 12) : getYearMonth(year, monthNum - 1);
      if (db[prevKey]) {
        const t = db[prevKey];
        db[key] = {
          grossIncome: t.grossIncome,
          deductions: (t.deductions || []).map(d => ({ name: d.name, amount: d.amount })),
          income: t.income,
          annualBonus: t.annualBonus != null ? t.annualBonus : 0,
          savingFromLastMonth: t.savingFromLastMonth != null ? t.savingFromLastMonth : 0,
          expenses: (t.expenses || []).map(e => normalizeExpense(e)),
          cashPocketMonthly: t.cashPocketMonthly != null ? t.cashPocketMonthly : DEFAULT_CASH_POCKET
        };
      } else {
        const defDeductions = DEFAULT_DEDUCTIONS.map(d => ({ name: d.name, amount: d.amount }));
        const defGross = DEFAULT_GROSS != null ? DEFAULT_GROSS : 0;
        const defDedSum = defDeductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);
        const defNet = Math.max(0, defGross - defDedSum);
        db[key] = {
          grossIncome: defGross,
          deductions: defDeductions,
          income: defNet,
          annualBonus: 0,
          savingFromLastMonth: 0,
          expenses: getDefaultExpensesForMonth().map(normalizeExpense),
          cashPocketMonthly: DEFAULT_CASH_POCKET
        };
      }
    }
    saveDatabase(db);
    return db[key];
  }

  const DEFAULT_CASH_POCKET = 12500;

  function normalizeExpense(e) {
    const amount = e.amount != null ? Number(e.amount) : (e.spent != null ? Number(e.spent) : (Number(e.actual) || 0));
    const currency = (e.currency || 'EGP').toUpperCase();
    const amountEGP = e.amountEGP != null ? Number(e.amountEGP) : (currency === 'EGP' ? amount : (Number(e.spent) || amount));
    const spent = amountEGP;
    let method = (e.paymentMethod || 'debit').toString();
    let creditCardId = e.creditCardId || null;
    if (method.startsWith('credit:')) {
      creditCardId = method.slice(7) || null;
      method = 'credit';
    } else if (!['debit', 'credit', 'cash', 'other'].includes(method.toLowerCase())) method = 'debit';
    else method = method.toLowerCase();
    return {
      category: e.category || '',
      subcategory: e.subcategory || '',
      spent: spent,
      amount: amount,
      currency: currency,
      amountEGP: amountEGP,
      paymentMethod: method,
      creditCardId: creditCardId || undefined
    };
  }

  function getNetIncome(monthData) {
    if (!monthData) return 0;
    let net = 0;
    if (monthData.grossIncome != null && monthData.deductions && monthData.deductions.length) {
      const sum = monthData.deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);
      net = Math.max(0, (Number(monthData.grossIncome) || 0) - sum);
    } else {
      net = Number(monthData.income) || 0;
    }
    const bonus = Number(monthData.annualBonus) || 0;
    const savingLast = Number(monthData.savingFromLastMonth) || 0;
    return net + bonus + savingLast;
  }

  function setGrossAndDeductions(db, year, monthNum, gross, deductions, annualBonus, savingFromLastMonth) {
    const data = ensureMonth(db, year, monthNum);
    data.grossIncome = Number(gross) || 0;
    data.deductions = Array.isArray(deductions) ? deductions.map(d => ({ name: d.name || '', amount: Number(d.amount) || 0 })) : (data.deductions || []);
    const sum = data.deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    data.income = Math.max(0, data.grossIncome - sum);
    if (annualBonus !== undefined) data.annualBonus = Math.max(0, Number(annualBonus) || 0);
    if (savingFromLastMonth !== undefined) data.savingFromLastMonth = Math.max(0, Number(savingFromLastMonth) || 0);
    saveDatabase(db);
    return data;
  }

  function setExpenses(db, year, monthNum, expenses) {
    const data = ensureMonth(db, year, monthNum);
    data.expenses = Array.isArray(expenses) ? expenses.map(e => normalizeExpense(e)) : [];
    saveDatabase(db);
    return data;
  }

  function addExpenseRow(db, year, monthNum, row) {
    const data = ensureMonth(db, year, monthNum);
    data.expenses.push(normalizeExpense(row));
    saveDatabase(db);
    return data.expenses;
  }

  function updateExpenseRow(db, year, monthNum, index, row) {
    const data = ensureMonth(db, year, monthNum);
    if (index < 0 || index >= (data.expenses || []).length) return null;
    const cur = data.expenses[index];
    const next = normalizeExpense({
      category: row.category !== undefined ? row.category : cur.category,
      subcategory: row.subcategory !== undefined ? row.subcategory : cur.subcategory,
      spent: row.spent !== undefined ? row.spent : cur.spent,
      amount: row.amount !== undefined ? row.amount : cur.amount,
      currency: row.currency !== undefined ? row.currency : (cur.currency || 'EGP'),
      amountEGP: row.amountEGP !== undefined ? row.amountEGP : cur.amountEGP,
      paymentMethod: row.paymentMethod !== undefined ? row.paymentMethod : (cur.paymentMethod || 'debit'),
      creditCardId: row.creditCardId !== undefined ? row.creditCardId : cur.creditCardId
    });
    data.expenses[index] = next;
    saveDatabase(db);
    return data.expenses[index];
  }

  function deleteExpenseRow(db, year, monthNum, index) {
    const data = ensureMonth(db, year, monthNum);
    if (!data.expenses || index < 0 || index >= data.expenses.length) return false;
    data.expenses.splice(index, 1);
    saveDatabase(db);
    return true;
  }

  function totalSpent(expenses) {
    return (expenses || []).reduce((s, e) => s + (Number(e.amountEGP) ?? Number(e.spent) ?? Number(e.actual) ?? 0), 0);
  }

  function totalSpentByPaymentMethod(expenses, method) {
    return (expenses || []).reduce((s, e) => {
      const pm = (e.paymentMethod || 'debit').toLowerCase();
      const amt = Number(e.amountEGP) ?? Number(e.spent) ?? Number(e.actual) ?? 0;
      if (method === 'credit' && pm === 'credit') return s + amt;
      if (method === 'debit' && pm === 'debit') return s + amt;
      if (method === 'cash' && pm === 'cash') return s + amt;
      if (method === 'other' && pm === 'other') return s + amt;
      return s;
    }, 0);
  }

  function getTotalCreditSpent(db, asOfYear, asOfMonth) {
    const keys = getMonthKeysSorted(db);
    let total = 0;
    keys.forEach(key => {
      const [y, m] = key.split('-').map(Number);
      if (asOfYear != null && (y > asOfYear || (y === asOfYear && m > asOfMonth))) return;
      const data = db[key];
      total += totalSpentByPaymentMethod((data && data.expenses) || [], 'credit');
    });
    return total;
  }

  function getTotalCreditSpentPerCard(db, cardId, asOfYear, asOfMonth) {
    if (!cardId) return getTotalCreditSpent(db, asOfYear, asOfMonth);
    const keys = getMonthKeysSorted(db);
    let total = 0;
    keys.forEach(key => {
      const [y, m] = key.split('-').map(Number);
      if (asOfYear != null && (y > asOfYear || (y === asOfYear && m > asOfMonth))) return;
      const data = db[key];
      (data && data.expenses || []).forEach(e => {
        const pm = (e.paymentMethod || '').toLowerCase();
        if (pm !== 'credit') return;
        const cid = e.creditCardId || (typeof e.paymentMethod === 'string' && e.paymentMethod.startsWith('credit:') ? e.paymentMethod.slice(7) : null);
        if (cid === cardId) total += Number(e.amountEGP) ?? Number(e.spent) ?? 0;
      });
    });
    return total;
  }

  function setCashPocketMonthly(db, year, monthNum, amount) {
    const data = ensureMonth(db, year, monthNum);
    data.cashPocketMonthly = Number(amount) >= 0 ? Number(amount) : DEFAULT_CASH_POCKET;
    saveDatabase(db);
    return data.cashPocketMonthly;
  }

  function netSavings(income, expenses) {
    return (Number(income) || 0) - totalSpent(expenses);
  }

  function savingsRate(income, expenses) {
    const inc = Number(income) || 0;
    if (inc <= 0) return 0;
    return (netSavings(income, expenses) / inc) * 100;
  }

  function categoryContribution(expenses) {
    const total = totalSpent(expenses);
    if (total <= 0) return [];
    const byCat = {};
    (expenses || []).forEach(e => {
      const c = e.category || 'Uncategorized';
      const amt = Number(e.amountEGP) ?? Number(e.spent) ?? Number(e.actual) ?? 0;
      byCat[c] = (byCat[c] || 0) + amt;
    });
    return Object.entries(byCat).map(([category, amount]) => ({
      category,
      amount,
      percent: (amount / total) * 100
    })).sort((a, b) => b.amount - a.amount);
  }

  function getMonthKeysSorted(db) {
    return Object.keys(db).filter(k => /^\d{4}-\d{2}$/.test(k)).sort();
  }

  function copyPreviousMonth(db, year, monthNum) {
    const prevKey = monthNum === 1 ? getYearMonth(year - 1, 12) : getYearMonth(year, monthNum - 1);
    ensureMonth(db, year, monthNum, prevKey);
    return getMonthData(db, year, monthNum);
  }

  // --- Loan: 1,850,000 EGP total, taken September, first payment November 42,910 EGP
  const LOAN_START_YEAR = 2025;
  const LOAN_START_MONTH = 9;
  const LOAN_FIRST_PAYMENT_YEAR = 2025;
  const LOAN_FIRST_PAYMENT_MONTH = 11;
  const LOAN_PRINCIPAL = 1850000;
  const LOAN_MONTHLY_PAYMENT = 42910;

  function loadLoans() {
    const defaultLoan = [{
      id: 'car-loan-1',
      name: 'Car Loan',
      principal: LOAN_PRINCIPAL,
      monthlyPayment: LOAN_MONTHLY_PAYMENT,
      startYear: LOAN_START_YEAR,
      startMonth: LOAN_START_MONTH,
      firstPaymentYear: LOAN_FIRST_PAYMENT_YEAR,
      firstPaymentMonth: LOAN_FIRST_PAYMENT_MONTH
    }];
    try {
      const raw = localStorage.getItem(LOANS_KEY);
      if (!raw) {
        saveLoans(defaultLoan);
        return defaultLoan;
      }
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length === 0) {
        saveLoans(defaultLoan);
        return defaultLoan;
      }
      // Normalize car loan so wrong saved values (e.g. principal 50000) are fixed
      const car = arr[0];
      if (car && (car.id === 'car-loan-1' || (car.name && car.name.toLowerCase().includes('car')))) {
        car.principal = LOAN_PRINCIPAL;
        car.monthlyPayment = LOAN_MONTHLY_PAYMENT;
        car.startYear = LOAN_START_YEAR;
        car.startMonth = LOAN_START_MONTH;
        car.firstPaymentYear = LOAN_FIRST_PAYMENT_YEAR;
        car.firstPaymentMonth = LOAN_FIRST_PAYMENT_MONTH;
        saveLoans(arr);
      }
      return arr;
    } catch (e) {
      saveLoans(defaultLoan);
      return defaultLoan;
    }
  }

  function saveLoans(loans) {
    try {
      localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
      return true;
    } catch (e) {
      return false;
    }
  }

  function recalcRemainingBalance(loan, asOfYear, asOfMonth) {
    const firstY = loan.firstPaymentYear != null ? loan.firstPaymentYear : LOAN_FIRST_PAYMENT_YEAR;
    const firstM = loan.firstPaymentMonth != null ? loan.firstPaymentMonth : LOAN_FIRST_PAYMENT_MONTH;
    let monthsPaid = 0;
    if (asOfYear > firstY || (asOfYear === firstY && asOfMonth >= firstM)) {
      monthsPaid = (asOfYear - firstY) * 12 + (asOfMonth - firstM) + 1;
    }
    const pay = Number(loan.monthlyPayment) || LOAN_MONTHLY_PAYMENT;
    const paid = monthsPaid * pay;
    const principal = Number(loan.principal) || LOAN_PRINCIPAL;
    const rem = Math.max(0, principal - paid);
    return { remainingBalance: rem, monthsPaid, remainingMonths: pay > 0 ? Math.ceil(rem / pay) : 0 };
  }

  /** Loan paid from first payment to asOf: use DB when month exists, else assume LOAN_MONTHLY_PAYMENT (no history created). */
  function getLoanPaidFromExpenses(db, asOfYear, asOfMonth) {
    const firstY = LOAN_FIRST_PAYMENT_YEAR;
    const firstM = LOAN_FIRST_PAYMENT_MONTH;
    let totalPaid = 0;
    let monthsWithPayment = 0;
    let y = firstY;
    let m = firstM;
    while (y < asOfYear || (y === asOfYear && m <= asOfMonth)) {
      const key = getYearMonth(y, m);
      const data = db[key];
      let monthCarLoan = 0;
      if (data && data.expenses && data.expenses.length) {
        data.expenses.forEach(e => {
          const cat = (e.category || '').toLowerCase();
          const sub = (e.subcategory || '').toLowerCase();
          if ((cat === 'loans' && (sub.includes('car') || sub === 'car loan')) || (cat === 'loans' && !sub)) {
            const v = Number(e.spent);
            monthCarLoan += (typeof v === 'number' && !isNaN(v)) ? v : (Number(e.actual) || 0);
          }
        });
      }
      if (monthCarLoan <= 0) monthCarLoan = LOAN_MONTHLY_PAYMENT;
      totalPaid += monthCarLoan;
      monthsWithPayment += 1;
      m++;
      if (m > 12) { m = 1; y++; }
    }
    const principal = LOAN_PRINCIPAL;
    const pay = LOAN_MONTHLY_PAYMENT;
    const remaining = Math.max(0, principal - totalPaid);
    return {
      totalPaid,
      remainingBalance: remaining,
      monthsWithPayment,
      remainingMonths: pay > 0 ? Math.ceil(remaining / pay) : 0
    };
  }

  // --- Credit cards (array); Egypt typical rate ~30%
  const CREDIT_DEFAULT_INTEREST_EGYPT = 30;
  const CREDIT_DEFAULT = { id: 'cc-1', limit: 100000, available: 95000, interestRateAnnual: CREDIT_DEFAULT_INTEREST_EGYPT, name: 'QNB Platinum' };

  function loadCredit() {
    try {
      const raw = localStorage.getItem(CREDIT_KEY);
      if (!raw) return [{ ...CREDIT_DEFAULT }];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
      return [{ ...CREDIT_DEFAULT, ...(typeof parsed === 'object' ? parsed : {}) }];
    } catch (e) {
      return [{ ...CREDIT_DEFAULT }];
    }
  }

  function saveCredit(arr) {
    try {
      const list = Array.isArray(arr) ? arr : [arr];
      localStorage.setItem(CREDIT_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  function addCreditCard(template) {
    const list = loadCredit();
    const t = template || list[0] || CREDIT_DEFAULT;
    const id = 'cc-' + Date.now();
    list.push({
      id,
      name: (t.name || 'New card') + ' (2)',
      limit: t.limit != null ? t.limit : 100000,
      interestRateAnnual: t.interestRateAnnual != null ? t.interestRateAnnual : CREDIT_DEFAULT_INTEREST_EGYPT
    });
    saveCredit(list);
    return list;
  }

  function deleteCreditCard(id) {
    const list = loadCredit().filter(c => c.id !== id);
    if (list.length === 0) list.push({ ...CREDIT_DEFAULT, id: 'cc-1' });
    saveCredit(list);
    return list;
  }

  // --- Travel trips
  function loadTrips() {
    try {
      const raw = localStorage.getItem(TRIPS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveTrips(trips) {
    try {
      localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
      return true;
    } catch (e) {
      return false;
    }
  }

  function addTrip(trip) {
    const trips = loadTrips();
    const id = 'trip-' + Date.now();
    trips.push({ id, name: trip.name || 'Trip', date: trip.date || '', expenses: (trip.expenses || []).map(normalizeExpense) });
    saveTrips(trips);
    return trips;
  }

  // Full default expenses (no empty categories) — user can edit afterwards; paymentMethod defaults to debit
  function getDefaultExpensesForMonth() {
    return [
      { category: 'Apartment', subcategory: 'Rent', spent: 13500, paymentMethod: 'debit' },
      { category: 'Apartment', subcategory: 'Electricity', spent: 1025, paymentMethod: 'debit' },
      { category: 'Apartment', subcategory: 'Water', spent: 0, paymentMethod: 'debit' },
      { category: 'Apartment', subcategory: 'N. Gas', spent: 0, paymentMethod: 'debit' },
      { category: 'Apartment', subcategory: 'WE Landline', spent: 30, paymentMethod: 'debit' },
      { category: 'Apartment', subcategory: 'WE Internet', spent: 569, paymentMethod: 'debit' },
      { category: 'Apartment', subcategory: 'Maintenance Diff.', spent: 0, paymentMethod: 'debit' },
      { category: 'Pet-Mylo', subcategory: 'Buying', spent: 0, paymentMethod: 'debit' },
      { category: 'Pet-Mylo', subcategory: 'Grooming + Boarding', spent: 0, paymentMethod: 'debit' },
      { category: 'Pet-Mylo', subcategory: 'Vaccines', spent: 0, paymentMethod: 'debit' },
      { category: 'Pet-Mylo', subcategory: 'Diapers', spent: 0, paymentMethod: 'debit' },
      { category: 'Luxury', subcategory: 'Charity', spent: 0, paymentMethod: 'debit' },
      { category: 'Luxury', subcategory: 'LinkedIn Premium', spent: 285, paymentMethod: 'debit' },
      { category: 'Luxury', subcategory: 'Cigarettes', spent: 9900, paymentMethod: 'debit' },
      { category: 'Luxury', subcategory: 'Gas for Car', spent: 3500, paymentMethod: 'debit' },
      { category: 'Super Luxury', subcategory: 'Car Wash', spent: 60, paymentMethod: 'debit' },
      { category: 'Super Luxury', subcategory: 'UBER', spent: 10500, paymentMethod: 'debit' },
      { category: 'Super Luxury', subcategory: 'Nails', spent: 250, paymentMethod: 'debit' },
      { category: 'Super Luxury', subcategory: 'Barber Shop', spent: 250, paymentMethod: 'debit' },
      { category: 'Super Luxury', subcategory: 'Garage', spent: 0, paymentMethod: 'debit' },
      { category: 'Entertainment', subcategory: 'Netflix', spent: 252, paymentMethod: 'debit' },
      { category: 'Entertainment', subcategory: 'VPN', spent: 670, paymentMethod: 'debit' },
      { category: 'Entertainment', subcategory: 'Watch It', spent: 120, paymentMethod: 'debit' },
      { category: 'Entertainment', subcategory: 'Apple ONE', spent: 249, paymentMethod: 'debit' },
      { category: 'Entertainment', subcategory: 'Youtube Premium', spent: 121, paymentMethod: 'debit' },
      { category: 'Entertainment', subcategory: 'Amazon Prime', spent: 20, paymentMethod: 'debit' },
      { category: 'Car', subcategory: 'Service', spent: 0, paymentMethod: 'debit' },
      { category: 'Car', subcategory: 'EV charge', spent: 0, paymentMethod: 'debit' },
      { category: 'Car', subcategory: 'Addons', spent: 0, paymentMethod: 'debit' },
      { category: 'Car', subcategory: 'Accessories', spent: 0, paymentMethod: 'debit' },
      { category: 'Car', subcategory: 'Cleaning', spent: 0, paymentMethod: 'debit' },
      { category: 'Loans', subcategory: 'Car loan', spent: LOAN_MONTHLY_PAYMENT, paymentMethod: 'debit' },
      { category: 'Food', subcategory: 'Groceries', spent: 8500, paymentMethod: 'debit' },
      { category: 'Food', subcategory: 'Delivery', spent: 15000, paymentMethod: 'debit' },
      { category: 'Food', subcategory: 'Coffee', spent: 7500, paymentMethod: 'debit' },
      { category: 'Food', subcategory: 'Restaurants', spent: 0, paymentMethod: 'debit' },
      { category: 'Utilities', subcategory: 'Mobile Bill', spent: 881, paymentMethod: 'debit' },
      { category: 'Other', subcategory: 'Charity giving', spent: 0, paymentMethod: 'debit' }
    ];
  }

  function exportToJSON(db) {
    return JSON.stringify(db, null, 2);
  }

  function exportToCSV(db) {
    const keys = getMonthKeysSorted(db);
    const rows = ['YearMonth,Gross,Net,Category,Subcategory,Spent'];
    keys.forEach(key => {
      const d = db[key];
      const gross = (d && d.grossIncome) != null ? d.grossIncome : (d && d.income) || 0;
      const net = getNetIncome(d);
      (d && d.expenses || []).forEach(e => {
        rows.push([key, gross, net, e.category || '', e.subcategory || '', e.spent ?? e.actual ?? 0].join(','));
      });
    });
    return rows.join('\n');
  }

  function importFromJSON(str) {
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed !== 'object' || parsed === null) return { success: false, error: 'Invalid JSON' };
      const db = loadDatabase();
      Object.assign(db, parsed);
      saveDatabase(db);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  window.DataEngine = {
    STORAGE_KEY,
    LOANS_KEY,
    CREDIT_KEY,
    TRIPS_KEY,
    MONTH_NAMES,
    DEFAULT_DEDUCTIONS,
    MAIN_CATEGORIES,
    CATEGORY_SUBCATEGORIES,
    CATEGORY_ICONS,
    getYearMonth,
    loadDatabase,
    saveDatabase,
    getMonthData,
    ensureMonth,
    getNetIncome,
    setGrossAndDeductions,
    setExpenses,
    addExpenseRow,
    updateExpenseRow,
    deleteExpenseRow,
    totalSpent,
    netSavings,
    savingsRate,
    categoryContribution,
    getMonthKeysSorted,
    copyPreviousMonth,
    exportToJSON,
    exportToCSV,
    importFromJSON,
    loadLoans,
    saveLoans,
    recalcRemainingBalance,
    getLoanPaidFromExpenses,
    LOAN_PRINCIPAL,
    LOAN_MONTHLY_PAYMENT,
    LOAN_START_YEAR,
    LOAN_START_MONTH,
    LOAN_FIRST_PAYMENT_YEAR,
    LOAN_FIRST_PAYMENT_MONTH,
    DEFAULT_GROSS,
    DEFAULT_NET,
    loadCredit,
    saveCredit,
    addCreditCard,
    deleteCreditCard,
    CREDIT_DEFAULT,
    CREDIT_DEFAULT_INTEREST_EGYPT,
    loadTrips,
    saveTrips,
    addTrip,
    getDefaultExpensesForMonth,
    normalizeExpense,
    totalSpentByPaymentMethod,
    getTotalCreditSpent,
    getTotalCreditSpentPerCard,
    setCashPocketMonthly,
    DEFAULT_CASH_POCKET
  };
})();
