/* Page wiring: compute the numbers from window.HAUL, fill the page, draw the charts. */
(function () {
  const H = window.HAUL, C = window.Charts, KIDS = H.kids;
  const candies = H.candies;
  const sum = (kid, filter = () => true) => d3.sum(candies.filter(filter), d => d[kid]);
  const fmt1 = d3.format('.1f'), fmtPct = d3.format('.0%'), fmtInt = d3.format(',');
  const TOP_N = 15;

  // ---------- the numbers ----------
  const G = sum('girl'), B = sum('boy'), T = G + B;
  H.totalPieces = T;
  const distinct = kid => candies.filter(d => d[kid] > 0).length;
  const shared = candies.filter(d => d.girl > 0 && d.boy > 0).length;
  const kcal = kid => d3.sum(candies, d => d[kid] * d.kcal);
  const biggest = kid => candies.slice().sort((a, b) => d3.descending(a[kid], b[kid]) || d3.descending(a.girl + a.boy, b.girl + b.boy))[0];

  const fills = {
    updated: H.updated, total: T, shared,
    girlShare: fmtPct(G / T), boyShare: fmtPct(B / T), girlTotal: G, boyTotal: B,
    margin: Math.abs(B - G), girlPerYear: fmt1(G / KIDS.girl.age), boyPerYear: fmt1(B / KIDS.boy.age)
  };
  document.querySelectorAll('[data-fill]').forEach(n => { n.textContent = fills[n.dataset.fill]; });

  // ---------- stat tiles ----------
  function tiles(container, items) {
    const root = d3.select(container).html('');
    items.forEach(it => {
      const s = root.append('div').attr('class', 'stat');
      s.append('div').attr('class', 'label').text(it.label);
      const pair = s.append('div').attr('class', 'pair');
      pair.append('span').attr('class', 'value').html('<span class="swatch girl"></span>').append('span').text(it.girl);
      pair.append('span').attr('class', 'vs').text('vs');
      pair.append('span').attr('class', 'value').html('<span class="swatch boy"></span>').append('span').text(it.boy);
      if (it.sub) s.append('div').attr('class', 'sub').text(it.sub);
    });
  }
  const bg = biggest('girl'), bb = biggest('boy');
  tiles('#statrow', [
    { label: 'Pieces per year of age', girl: fmt1(G / KIDS.girl.age), boy: fmt1(B / KIDS.boy.age), sub: `She is ${KIDS.girl.age}, he is ${KIDS.boy.age}. Do the math.` },
    { label: 'Different kinds of candy', girl: distinct('girl'), boy: distinct('boy'), sub: `out of ${candies.length} kinds total` },
    { label: 'Biggest single pile', girl: bg.girl, boy: bb.boy, sub: bg.name === bb.name ? `${bg.name} for both` : `${bg.name} · ${bb.name}` }
  ]);

  // ---------- top five ----------
  function topList(container, kid) {
    const top = candies.slice().sort((a, b) => d3.descending(a[kid], b[kid]) || d3.descending(a.girl + a.boy, b.girl + b.boy) || d3.ascending(a.name, b.name)).slice(0, 5);
    const li = d3.select(container).html('').selectAll('li').data(top).join('li');
    li.append('span').attr('class', 'rank').text((d, i) => i + 1);
    li.append('img').attr('class', 'thumb').attr('src', d => d.img).attr('alt', '').attr('loading', 'lazy');
    li.append('span').text(d => d.name);
    li.append('span').attr('class', 'n').text(d => d[kid]);
  }
  topList('#top-girl', 'girl');
  topList('#top-boy', 'boy');

  // ---------- one-kid-only candies ----------
  function chips(container, kid, other) {
    const list = candies.filter(d => d[kid] > 0 && d[other] === 0).sort((a, b) => d3.descending(a[kid], b[kid]) || d3.ascending(a.name, b.name));
    const li = d3.select(container).html('').selectAll('li').data(list).join('li').attr('class', `chip ${kid}`);
    li.append('img').attr('src', d => d.img).attr('alt', '').attr('loading', 'lazy');
    li.append('span').text(d => d.name);
    li.append('span').attr('class', 'n').text(d => `×${d[kid]}`);
  }
  chips('#only-girl', 'girl', 'boy');
  chips('#only-boy', 'boy', 'girl');

  // ---------- calories ----------
  const kg = kcal('girl'), kb = kcal('boy');
  tiles('#calstats', [
    { label: 'Rough calorie count', girl: fmtInt(kg), boy: fmtInt(kb), sub: `about ${Math.round((kg + kb) / T)} calories a piece, give or take` },
    { label: 'Miles of walking to burn it off', girl: Math.round(kg / 100), boy: Math.round(kb / 100), sub: 'at roughly 100 calories a mile' }
  ]);

  // ---------- charts + controls ----------
  const state = { sort: 'total', showAll: false, rate: 3, dad: 0 };
  const totals = { girl: G, boy: B };
  const showAllBtn = document.getElementById('show-all');
  function renderRanked() {
    C.rankedBars(document.getElementById('rank-bars'), candies, state.sort, state.showAll ? Infinity : TOP_N);
    showAllBtn.textContent = state.showAll ? `Show just the top ${TOP_N}` : `Show all ${candies.length} kinds`;
  }
  function renderDiverging() { C.divergingBars(document.getElementById('diverging'), candies, 2); }
  function renderCategory() { C.categoryStack(document.getElementById('category-stack'), candies); }
  function runwayLegend() {
    const leg = d3.select('#runway-legend').html('');
    const item = (cls, style, text) => { const sp = leg.append('span'); sp.append('span').attr('class', cls).attr('style', style); sp.append('span').text(text); };
    item('key line', 'background:var(--girl)', 'Girl');
    item('key line', 'background:var(--boy)', 'Boy');
    item('key', 'background:#ececec', 'Weekends and days off school');
    if (state.dad > 0) item('key line', 'background:#bbb', 'Same bag if Dad kept his hands off');
  }
  function renderRunway() {
    const [g, b] = C.runwayChart(document.getElementById('runway-chart'), totals, state.rate, state.dad);
    runwayLegend();
    const each = state.rate === 1 ? 'one piece' : `${state.rate} pieces`;
    let text = `At ${each} a day on weekends and about half that on school days, her bag is empty on ${C.fmtDay(g.end)} and his on ${C.fmtDay(b.end)}.`;
    if (state.dad > 0) {
      const lost = Math.round(g.dadTotal + b.dadTotal);
      text += ` Dad's bedtime snack costs the kids ${lost} pieces and moves those dates up from ${C.fmtDay(g.noDad.end)} and ${C.fmtDay(b.noDad.end)} (the faint lines are the no-Dad version). Nobody is checking.`;
    }
    text += ' Shaded columns are weekends and school breaks; the thin vertical lines are holidays.';
    document.getElementById('runway-note').textContent = text;
  }
  C.shareBar(document.getElementById('share-bar'), G, B);
  renderRanked(); renderDiverging(); C.categoryLegend('#cat-legend'); renderCategory(); renderRunway();
  C.dataTable(document.getElementById('data-table'), candies);

  function segControl(id, attr, onChange, parse = v => v) {
    const box = document.getElementById(id);
    box.addEventListener('click', e => {
      const btn = e.target.closest('button'); if (!btn) return;
      box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      onChange(parse(btn.dataset[attr]));
    });
  }
  segControl('sort-control', 'sort', v => { state.sort = v; renderRanked(); });
  segControl('rate-control', 'rate', v => { state.rate = v; renderRunway(); }, Number);
  segControl('dad-control', 'dad', v => { state.dad = v; renderRunway(); }, Number);
  showAllBtn.addEventListener('click', () => { state.showAll = !state.showAll; renderRanked(); });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { C.shareBar(document.getElementById('share-bar'), G, B); renderDiverging(); renderCategory(); renderRunway(); }, 150);
  });

  // ---------- credits ----------
  const seen = new Map();
  candies.forEach(d => { if (!seen.has(d.img)) seen.set(d.img, { names: [], credit: d.credit }); seen.get(d.img).names.push(d.name); });
  const li = d3.select('#credits').selectAll('li').data([...seen.values()]).join('li');
  li.append('span').text(d => `${d.names.join(' / ')}: `);
  li.append('a').attr('href', d => d.credit.page || '#').attr('target', '_blank').attr('rel', 'noopener').text(d => d.credit.artist);
  li.append('span').text(d => ` (${d.credit.license})`);

  // ---------- nav highlighting ----------
  const links = [...document.querySelectorAll('.tabs a')];
  const sections = links.map(a => document.querySelector(a.getAttribute('href')));
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  sections.forEach(s => s && obs.observe(s));
})();
