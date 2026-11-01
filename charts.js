/* Chart builders for the Candy Haul page. Depends on d3 v7 and window.HAUL. */
(function () {
  const H = window.HAUL;
  const KIDS = H.kids;
  const CATS = H.categories;
  const CAT_ORDER = Object.keys(CATS).sort((a, b) => CATS[a].order - CATS[b].order);
  const CAT_COLOR = { chocolate: 'var(--cat-chocolate)', chewy: 'var(--cat-chewy)', hard: 'var(--cat-hard)', other: 'var(--cat-other)' };
  const KID_COLOR = { girl: 'var(--girl)', boy: 'var(--boy)' };
  const GAP = 2; // surface gap between touching fills

  // ---------- tooltip ----------
  const tipEl = document.getElementById('tooltip');
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function tipRow(kidKey, label, value) {
    const r = el('div', 'tip-row');
    const k = el('span', 'k' + (kidKey ? ' ' + kidKey : ''));
    r.append(k, el('span', 'v', String(value)), el('span', 'l', label));
    return r;
  }
  function placeTip(x, y) {
    const pad = 14, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let left = x + pad, top = y + pad;
    if (left + w > window.innerWidth - 8) left = x - w - pad;
    if (top + h > window.innerHeight - 8) top = y - h - pad;
    tipEl.style.transform = `translate(${Math.max(4, left)}px,${Math.max(4, top)}px)`;
  }
  function showTip(build, x, y) {
    tipEl.replaceChildren();
    build(tipEl);
    tipEl.hidden = false;
    placeTip(x, y);
  }
  function showTipAtElement(node, build) {
    const r = node.getBoundingClientRect();
    showTip(build, r.left + Math.min(r.width / 2, 160), r.top + r.height / 2);
  }
  function hideTip() { tipEl.hidden = true; }

  function candyTip(c) {
    return (box) => {
      const head = el('div', 'tip-head');
      const img = el('img', 'tip-img');
      img.src = c.img; img.alt = '';
      const t = el('div');
      t.append(el('div', 'tip-title', c.name));
      t.append(el('div', 'tip-sub', `${CATS[c.cat].label} · about ${c.kcal} calories each`));
      head.append(img, t);
      const rows = el('div', 'tip-rows');
      rows.append(tipRow('girl', KIDS.girl.short, c.girl));
      rows.append(tipRow('boy', KIDS.boy.short, c.boy));
      rows.append(tipRow(null, 'together', c.girl + c.boy));
      box.append(head, rows);
      const total = c.girl + c.boy;
      const share = d3.format('.0%')(total / H.totalPieces);
      box.append(el('div', 'tip-foot', `${share} of all ${H.totalPieces} pieces`));
    };
  }

  // Attach hover + keyboard-focus tooltips to a d3 selection.
  function attachTip(sel, build) {
    sel.on('pointerenter pointermove', (e, d) => showTip(build(d), e.clientX, e.clientY))
      .on('pointerleave', hideTip)
      .on('focus', (e, d) => showTipAtElement(e.currentTarget, build(d)))
      .on('blur', hideTip);
  }

  // ---------- 1. share bar ----------
  function shareBar(container, girl, boy) {
    const total = girl + boy;
    const W = container.clientWidth || 600, Hh = 44, barH = 22, y0 = 10;
    const x = d3.scaleLinear().domain([0, total]).range([0, W]);
    const svg = d3.select(container).html('').append('svg').attr('viewBox', `0 0 ${W} ${Hh}`).attr('width', W).attr('height', Hh);
    svg.append('rect').attr('x', 0).attr('y', y0).attr('width', x(girl) - GAP / 2).attr('height', barH).attr('fill', KID_COLOR.girl);
    svg.append('rect').attr('x', x(girl) + GAP / 2).attr('y', y0).attr('width', W - x(girl) - GAP / 2).attr('height', barH).attr('fill', KID_COLOR.boy);
    // 50% tick
    svg.append('line').attr('x1', W / 2).attr('x2', W / 2).attr('y1', y0 - 6).attr('y2', y0 + barH + 6).attr('stroke', '#222').attr('stroke-width', 2);
    svg.append('text').attr('x', W / 2).attr('y', Hh).attr('text-anchor', 'middle').attr('fill', '#888').text('50%');
    svg.append('text').attr('x', 8).attr('y', y0 + barH / 2 + 4).attr('fill', '#fff').attr('font-weight', 700).text(`${girl} pieces`);
    svg.append('text').attr('x', W - 8).attr('y', y0 + barH / 2 + 4).attr('text-anchor', 'end').attr('fill', '#fff').attr('font-weight', 700).text(`${boy} pieces`);
  }

  // ---------- 2. ranked stacked bars (HTML rows) ----------
  const SORTERS = {
    total: (a, b) => d3.descending(a.girl + a.boy, b.girl + b.boy) || d3.ascending(a.name, b.name),
    girl: (a, b) => d3.descending(a.girl, b.girl) || d3.descending(a.boy, b.boy) || d3.ascending(a.name, b.name),
    boy: (a, b) => d3.descending(a.boy, b.boy) || d3.descending(a.girl, b.girl) || d3.ascending(a.name, b.name),
    margin: (a, b) => d3.descending(Math.abs(a.boy - a.girl), Math.abs(b.boy - b.girl)) || d3.descending(a.girl + a.boy, b.girl + b.boy) || d3.ascending(a.name, b.name)
  };
  function rankedBars(container, candies, sortKey, limit = Infinity) {
    const max = d3.max(candies, d => d.girl + d.boy);
    const pct = v => `${(v / max) * 100}%`;
    const data = candies.slice().sort(SORTERS[sortKey] || SORTERS.total).slice(0, limit);
    const rows = d3.select(container).selectAll('.rank-row').data(data, d => d.name)
      .join(enter => {
        const r = enter.append('div').attr('class', 'rank-row').attr('tabindex', 0)
          .attr('aria-label', d => `${d.name}: ${d.girl} for the girl, ${d.boy} for the boy`);
        r.append('img').attr('class', 'thumb').attr('src', d => d.img).attr('alt', '').attr('loading', 'lazy');
        r.append('div').attr('class', 'rank-name').text(d => d.name);
        const tr = r.append('div').attr('class', 'bar-track');
        tr.append('div').attr('class', 'seg girl');
        tr.append('div').attr('class', 'seg boy');
        r.append('div').attr('class', 'rank-total');
        return r;
      });
    rows.order();
    rows.select('.seg.girl')
      .style('width', d => d.girl ? pct(d.girl) : '0')
      .classed('end', d => d.boy === 0);
    rows.select('.seg.boy')
      .style('left', d => d.girl ? `calc(${pct(d.girl)} + ${GAP}px)` : '0')
      .style('width', d => d.boy ? `calc(${pct(d.boy)} - ${d.girl ? GAP : 0}px)` : '0')
      .classed('end', d => d.boy > 0);
    rows.select('.rank-total').text(d => d.girl + d.boy);
    attachTip(rows, candyTip);
  }

  // ---------- 3. diverging margin bars ----------
  function divergingBars(container, candies, minAbs) {
    const data = candies.filter(d => Math.abs(d.boy - d.girl) >= minAbs)
      .sort((a, b) => d3.ascending(a.boy - a.girl, b.boy - b.girl) || d3.ascending(a.name, b.name));
    const W = container.clientWidth || 600, rowH = 24, top = 30, bottom = 6;
    const Hh = top + data.length * rowH + bottom;
    const narrow = W < 520;
    const span = Math.max(60, Math.min(W / 2 - (narrow ? 118 : 180), 320));
    const maxAbs = d3.max(data, d => Math.abs(d.boy - d.girl)) || 1;
    const x = d3.scaleLinear().domain([-maxAbs, maxAbs]).range([W / 2 - span, W / 2 + span]);
    const svg = d3.select(container).html('').append('svg').attr('viewBox', `0 0 ${W} ${Hh}`).attr('width', W).attr('height', Hh);

    svg.append('text').attr('class', 'axis-label').attr('x', x(0) - 8).attr('y', 12).attr('text-anchor', 'end').text('← more for her');
    svg.append('text').attr('class', 'axis-label').attr('x', x(0) + 8).attr('y', 12).text('more for him →');
    svg.append('line').attr('class', 'baseline').attr('x1', x(0)).attr('x2', x(0)).attr('y1', top - 8).attr('y2', Hh - bottom);

    const row = svg.selectAll('.row').data(data, d => d.name).join('g').attr('class', 'row').attr('tabindex', 0)
      .attr('transform', (d, i) => `translate(0,${top + i * rowH})`)
      .attr('aria-label', d => `${d.name}: ${d.boy - d.girl > 0 ? 'boy' : 'girl'} by ${Math.abs(d.boy - d.girl)}`);
    row.append('rect').attr('class', 'hit').attr('x', 0).attr('y', 0).attr('width', W).attr('height', rowH);
    row.append('rect').attr('class', 'bar')
      .attr('x', d => (d.boy - d.girl) > 0 ? x(0) + GAP / 2 : x(d.boy - d.girl))
      .attr('y', 4).attr('height', rowH - 8)
      .attr('width', d => Math.abs(x(d.boy - d.girl) - x(0)) - GAP / 2)
      .attr('rx', 3)
      .attr('fill', d => (d.boy - d.girl) > 0 ? KID_COLOR.boy : KID_COLOR.girl);
    row.append('text').attr('class', 'name')
      .attr('x', d => (d.boy - d.girl) > 0 ? x(0) - 8 : x(0) + 8)
      .attr('y', rowH / 2 + 4)
      .attr('text-anchor', d => (d.boy - d.girl) > 0 ? 'end' : 'start')
      .attr('font-size', narrow ? 12 : 13)
      .text(d => d.name);
    row.append('text').attr('class', 'value')
      .attr('x', d => (d.boy - d.girl) > 0 ? x(d.boy - d.girl) + 6 : x(d.boy - d.girl) - 6)
      .attr('y', rowH / 2 + 4)
      .attr('text-anchor', d => (d.boy - d.girl) > 0 ? 'start' : 'end')
      .text(d => (d.boy - d.girl > 0 ? '+' : '') + (d.boy - d.girl));
    attachTip(row, candyTip);
  }

  // ---------- 4. category 100% stacks ----------
  function categoryLegend(container) {
    const leg = d3.select(container).html('');
    CAT_ORDER.forEach(k => {
      const s = leg.append('span');
      s.append('span').attr('class', 'key').style('background', CAT_COLOR[k]);
      s.append('span').text(CATS[k].label);
    });
  }
  function categoryStack(container, candies) {
    const W = container.clientWidth || 600, left = W < 520 ? 60 : 90, right = 8, rowH = 30, gap = 16, top = 6;
    const kids = ['girl', 'boy'];
    const Hh = top + kids.length * rowH + (kids.length - 1) * gap + 6;
    const svg = d3.select(container).html('').append('svg').attr('viewBox', `0 0 ${W} ${Hh}`).attr('width', W).attr('height', Hh);
    const x = d3.scaleLinear().domain([0, 1]).range([left, W - right]);
    kids.forEach((kid, i) => {
      const total = d3.sum(candies, d => d[kid]);
      let acc = 0;
      const segs = CAT_ORDER.map(c => {
        const v = d3.sum(candies.filter(d => d.cat === c), d => d[kid]);
        const s = { cat: c, kid, v, share: v / total, x0: acc / total, x1: (acc + v) / total };
        acc += v; return s;
      }).filter(s => s.v > 0);
      const y = top + i * (rowH + gap);
      svg.append('text').attr('class', 'name').attr('x', left - 10).attr('y', y + rowH / 2 + 5).attr('text-anchor', 'end').attr('font-weight', 700).text(KIDS[kid].short);
      const g = svg.selectAll(`.seg-${kid}`).data(segs).join('g').attr('class', `row seg-${kid}`).attr('tabindex', 0)
        .attr('aria-label', d => `${KIDS[kid].short}: ${CATS[d.cat].label} ${d.v} pieces, ${d3.format('.0%')(d.share)}`);
      g.append('rect').attr('class', 'bar')
        .attr('x', (d, j) => x(d.x0) + (j ? GAP / 2 : 0))
        .attr('y', y).attr('height', rowH)
        .attr('width', (d, j) => Math.max(0, x(d.x1) - x(d.x0) - (j ? GAP / 2 : 0) - (j < segs.length - 1 ? GAP / 2 : 0)))
        .attr('fill', d => CAT_COLOR[d.cat]);
      g.append('text').attr('class', 'inlabel')
        .attr('x', d => (x(d.x0) + x(d.x1)) / 2).attr('y', y + rowH / 2 + 4).attr('text-anchor', 'middle').attr('fill', '#fff')
        .text(d => (x(d.x1) - x(d.x0)) >= 38 ? d3.format('.0%')(d.share) : '');
      attachTip(g, d => (box) => {
        box.append(el('div', 'tip-title', `${KIDS[kid].label}: ${CATS[d.cat].label}`));
        const rows = el('div', 'tip-rows');
        rows.append(tipRow(kid, 'pieces', d.v));
        rows.append(tipRow(null, 'of the bag', d3.format('.0%')(d.share)));
        box.append(rows);
      });
    });
  }

  // ---------- 5. runway line chart ----------
  // A day-by-day simulation rather than a straight line:
  //  - weekends and school breaks run at the chosen pace ("full speed")
  //  - school days run at half pace (candy only after dinner)
  //  - the first three days after Halloween are a free-for-all (double)
  //  - optionally Dad takes a piece or two from each bag every night
  const START = new Date(2026, 10, 1); // Nov 1, 2026 (a Sunday)
  const BINGE_DAYS = 3;
  const SCHOOL_BREAKS = [
    { from: new Date(2026, 10, 25), to: new Date(2026, 10, 27), label: 'Thanksgiving break' },
    { from: new Date(2026, 11, 21), to: new Date(2027, 0, 1), label: 'Winter break' },
    { from: new Date(2027, 0, 18), to: new Date(2027, 0, 18), label: 'MLK Day' },
    { from: new Date(2027, 1, 15), to: new Date(2027, 1, 15), label: "Presidents' Day" }
  ];
  const HOLIDAYS = [
    { date: new Date(2026, 10, 26), label: 'Thanksgiving' },
    { date: new Date(2026, 11, 25), label: 'Christmas' },
    { date: new Date(2027, 0, 1), label: 'New Year' },
    { date: new Date(2027, 1, 14), label: "Valentine's" }
  ];
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const sameOrBetween = (d, a, b) => d >= a && d < addDays(b, 1);
  const fmtDay = d3.timeFormat('%b %-d');
  function isDayOff(d) {
    const dow = d.getDay();
    return dow === 0 || dow === 6 || SCHOOL_BREAKS.some(b => sameOrBetween(d, b.from, b.to));
  }
  function kidEats(date, dayIndex, rate) {
    if (dayIndex < BINGE_DAYS) return rate * 2;
    return isDayOff(date) ? rate : rate / 2;
  }
  function simulate(total, rate, dad) {
    const pts = [{ date: START, v: total, dadTotal: 0 }];
    let left = total, dadTotal = 0, i = 0;
    while (left > 0 && i < 400) {
      const date = addDays(START, i);           // consumption during day i
      const eat = Math.min(left, kidEats(date, i, rate));
      left -= eat;
      const dadBite = Math.min(left, dad);
      left -= dadBite; dadTotal += dadBite;
      i += 1;
      pts.push({ date: addDays(START, i), v: left, dadTotal });
    }
    return { pts, days: i, end: addDays(START, i), dadTotal };
  }
  function runwaySeries(totals, rate, dad = 0) {
    return ['girl', 'boy'].map(kid => {
      const total = totals[kid];
      const withDad = simulate(total, rate, dad);
      const noDad = dad > 0 ? simulate(total, rate, 0) : null;
      return { kid, total, ...withDad, noDad };
    });
  }
  function runwayChart(container, totals, rate, dad = 0) {
    const series = runwaySeries(totals, rate, dad);
    const W = container.clientWidth || 600, narrow = W < 520, Hh = narrow ? 260 : Math.min(420, Math.round(W * 0.38)), m = { top: 26, right: narrow ? 138 : 160, bottom: 30, left: 52 };
    const maxDays = d3.max(series, s => Math.max(s.days, s.noDad ? s.noDad.days : 0));
    const x = d3.scaleTime().domain([START, addDays(START, maxDays)]).range([m.left, W - m.right]);
    const y = d3.scaleLinear().domain([0, Math.max(100, d3.max(series, s => s.total))]).nice().range([Hh - m.bottom, m.top]);
    const svg = d3.select(container).html('').append('svg').attr('viewBox', `0 0 ${W} ${Hh}`).attr('width', W).attr('height', Hh);

    // shaded bands for weekends and school breaks
    const bands = svg.append('g').attr('class', 'bands');
    let runStart = null;
    for (let i = 0; i <= maxDays; i++) {
      const d = addDays(START, i), off = i < maxDays && isDayOff(d);
      if (off && runStart === null) runStart = d;
      if (!off && runStart !== null) { bands.append('rect').attr('x', x(runStart)).attr('y', m.top).attr('width', x(d) - x(runStart)).attr('height', y(0) - m.top); runStart = null; }
    }

    const grid = svg.append('g').attr('class', 'grid');
    y.ticks(5).forEach(t => {
      grid.append('line').attr('x1', m.left).attr('x2', W - m.right).attr('y1', y(t)).attr('y2', y(t));
      svg.append('text').attr('x', m.left - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text(t);
    });
    svg.append('text').attr('class', 'axis-label').attr('x', m.left - 6).attr('y', m.top - 10).attr('text-anchor', 'end').text('pieces');
    svg.append('line').attr('class', 'baseline').attr('x1', m.left).attr('x2', W - m.right).attr('y1', y(0)).attr('y2', y(0));
    const want = Math.max(2, Math.floor((W - m.left - m.right) / 95));
    let ticks = x.ticks(want);
    if (ticks.length > want + 1) { const k = Math.ceil(ticks.length / (want + 1)); ticks = ticks.filter((t, i) => i % k === 0); }
    ticks.forEach(t => svg.append('text').attr('x', x(t)).attr('y', Hh - m.bottom + 18).attr('text-anchor', 'middle').attr('font-size', narrow ? 11 : 12).text(fmtDay(t)));

    const ann = svg.append('g').attr('class', 'annot');
    let lastLabelX = -Infinity, stagger = 0;
    HOLIDAYS.filter(h => h.date <= x.domain()[1]).forEach(h => {
      const hx = x(h.date);
      stagger = (hx - lastLabelX < 90) ? stagger + 12 : 0;
      lastLabelX = hx;
      ann.append('line').attr('x1', hx).attr('x2', hx).attr('y1', m.top - 2).attr('y2', y(0));
      ann.append('text').attr('x', hx + 4).attr('y', m.top + 8 + stagger).text(h.label);
    });

    const line = d3.line().x(d => x(d.date)).y(d => y(d.v)).curve(d3.curveMonotoneX);
    series.forEach(s => {
      if (s.noDad) svg.append('path').attr('d', line(s.noDad.pts)).attr('fill', 'none').attr('stroke', KID_COLOR[s.kid]).attr('stroke-opacity', 0.3).attr('stroke-width', 2);
      svg.append('path').attr('d', line(s.pts)).attr('fill', 'none').attr('stroke', KID_COLOR[s.kid]).attr('stroke-width', 2.5).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
      svg.append('circle').attr('cx', x(s.end)).attr('cy', y(0)).attr('r', 4).attr('fill', KID_COLOR[s.kid]).attr('stroke', '#fff').attr('stroke-width', 2);
      const ly = y(0) - (s.kid === 'girl' ? 24 : 8), lx = x(x.domain()[1]) + 12;
      svg.append('circle').attr('cx', lx).attr('cy', ly - 4).attr('r', 3.5).attr('fill', KID_COLOR[s.kid]);
      svg.append('text').attr('class', 'value').attr('x', lx + 8).attr('y', ly).attr('font-size', narrow ? 11 : 12).text(`${KIDS[s.kid].short} out ${fmtDay(s.end)}`);
    });

    // crosshair + tooltip
    const valueAt = (s, day) => (s.pts[Math.min(day, s.pts.length - 1)]);
    const cross = svg.append('line').attr('class', 'crosshair').attr('y1', m.top).attr('y2', y(0)).style('display', 'none');
    const dots = svg.selectAll('.dot').data(series).join('circle').attr('class', 'dot').attr('r', 5).attr('fill', d => KID_COLOR[d.kid]).attr('stroke', '#fff').attr('stroke-width', 2).style('display', 'none');
    svg.append('rect').attr('class', 'hit').attr('x', m.left).attr('y', m.top).attr('width', W - m.left - m.right).attr('height', y(0) - m.top)
      .on('pointermove', (e) => {
        const [px] = d3.pointer(e);
        const day = Math.max(0, Math.min(maxDays, Math.round((x.invert(px) - START) / 864e5)));
        const date = addDays(START, day);
        cross.attr('x1', x(date)).attr('x2', x(date)).style('display', null);
        dots.attr('cx', x(date)).attr('cy', d => y(valueAt(d, day).v)).style('display', null);
        showTip((box) => {
          const kind = day === 0 ? 'haul day' : (day <= BINGE_DAYS ? 'free-for-all' : (isDayOff(addDays(START, day - 1)) ? 'day off' : 'school day'));
          box.append(el('div', 'tip-title', `${fmtDay(date)} · ${kind}`));
          const rows = el('div', 'tip-rows');
          series.forEach(s => rows.append(tipRow(s.kid, `${KIDS[s.kid].short} has left`, Math.round(valueAt(s, day).v))));
          if (dad > 0) rows.append(tipRow(null, 'eaten by Dad so far', Math.round(d3.sum(series, s => valueAt(s, day).dadTotal))));
          box.append(rows);
        }, e.clientX, e.clientY);
      })
      .on('pointerleave', () => { cross.style('display', 'none'); dots.style('display', 'none'); hideTip(); });
    return series;
  }

  // ---------- 6. data table ----------
  function dataTable(table, candies) {
    const t = d3.select(table).html('');
    const cols = ['Candy', 'Category', 'Girl', 'Boy', 'Total', 'Est. cal/piece'];
    t.append('thead').append('tr').selectAll('th').data(cols).join('th').attr('class', (d, i) => i >= 2 ? 'num' : null).text(d => d);
    const rows = candies.slice().sort(SORTERS.total);
    t.append('tbody').selectAll('tr').data(rows).join('tr').selectAll('td')
      .data(d => [d.name, CATS[d.cat].label, d.girl, d.boy, d.girl + d.boy, d.kcal])
      .join('td').attr('class', (d, i) => i >= 2 ? 'num' : null).text(d => d);
  }

  window.Charts = { shareBar, rankedBars, divergingBars, categoryLegend, categoryStack, runwayChart, runwaySeries, dataTable, CAT_ORDER, CAT_COLOR, fmtDay };
})();
