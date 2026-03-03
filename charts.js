/**
 * PFIS Charts: Monthly spend trend, Monthly savings trend, Bar by main category (spend only)
 */
const PFISCharts = (function () {
  function themeAware() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: dark ? '#f1f5f9' : '#1e293b',
      grid: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
    };
  }
  const COLORS = {
    line: 'rgba(14, 165, 233, 0.9)',
    lineFill: 'rgba(14, 165, 233, 0.1)',
    bar: 'rgba(14, 165, 233, 0.8)'
  };

  const CHART_COLORS = [
    'rgba(14, 165, 233, 0.85)',
    'rgba(34, 197, 94, 0.85)',
    'rgba(234, 179, 8, 0.85)',
    'rgba(239, 68, 68, 0.85)',
    'rgba(168, 85, 247, 0.85)',
    'rgba(236, 72, 153, 0.85)',
    'rgba(20, 184, 166, 0.85)',
    'rgba(249, 115, 22, 0.85)'
  ];

  function defaultOptions() {
    const t = themeAware();
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: {
          grid: { color: t.grid },
          ticks: { color: t.text, maxRotation: 45 }
        },
        y: {
          grid: { color: t.grid },
          ticks: { color: t.text }
        }
      }
    };
  }

  let spendChart = null;
  let savingsChart = null;
  let barChart = null;
  let pieChart = null;

  function destroy(inst) {
    if (inst) {
      inst.destroy();
      return null;
    }
    return null;
  }

  function renderSpendTrend(canvasId, monthlySpendData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    destroy(spendChart);
    const labels = (monthlySpendData || []).map(d => d.label);
    const values = (monthlySpendData || []).map(d => d.spend);
    spendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Spend',
          data: values,
          borderColor: COLORS.line,
          backgroundColor: COLORS.lineFill,
          fill: true,
          tension: 0.3
        }]
      },
      options: defaultOptions()
    });
  }

  function renderSavingsTrend(canvasId, monthlySavingsData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    destroy(savingsChart);
    const labels = (monthlySavingsData || []).map(d => d.label);
    const values = (monthlySavingsData || []).map(d => d.savings);
    savingsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Savings',
          data: values,
          borderColor: 'rgba(34, 197, 94, 0.9)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: defaultOptions()
    });
  }

  function renderPieChart(canvasId, categoryContributionData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    destroy(pieChart);
    const data = categoryContributionData || [];
    const labels = data.map(d => d.category + ' (' + (d.percent != null ? d.percent.toFixed(1) : 0) + '%)');
    const values = data.map(d => d.amount);
    const t = themeAware();
    pieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: CHART_COLORS.slice(0, values.length),
          borderColor: t.grid,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: t.text } },
          tooltip: {
            callbacks: {
              label: function (item) {
                const total = item.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((item.raw / total) * 100).toFixed(1) : 0;
                return item.label + ': ' + (item.raw || 0).toLocaleString() + ' EGP (' + pct + '%)';
              }
            }
          }
        }
      }
    });
  }

  function renderBarByCategory(canvasId, categoryContributionData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    destroy(barChart);
    const labels = (categoryContributionData || []).map(d => d.category);
    const data = (categoryContributionData || []).map(d => d.amount);
    barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Spent',
          data,
          backgroundColor: CHART_COLORS.slice(0, data.length),
          borderWidth: 0
        }]
      },
      options: (() => {
        const t = themeAware();
        return {
          ...defaultOptions(),
          indexAxis: 'y',
          scales: {
            x: {
              grid: { color: t.grid },
              ticks: { color: t.text }
            },
            y: {
              grid: { display: false },
              ticks: { color: t.text }
            }
          }
        };
      })()
    });
  }

  function updateAll(monthlySpendData, monthlySavingsData, categoryContributionData, categoryContributionWithTravel) {
    const pieData = categoryContributionWithTravel && categoryContributionWithTravel.length ? categoryContributionWithTravel : categoryContributionData;
    renderPieChart('chart-pie', pieData);
    renderSpendTrend('chart-spend', monthlySpendData);
    renderSavingsTrend('chart-savings', monthlySavingsData);
    renderBarByCategory('chart-bar', categoryContributionData);
  }

  return {
    renderSpendTrend,
    renderSavingsTrend,
    renderBarByCategory,
    renderPieChart,
    updateAll
  };
})();
