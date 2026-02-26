// viz_bar.js
(function () {
  const COLORS = {
    avg: [255, 152, 0],
    debt: [0, 150, 136],
    axis: [30, 30, 30],
    grid: [220, 220, 220],
    text: [30, 30, 30]
  };

  function avgTuition(d) {
    if (d.tuition_public_4yr == null || d.tuition_private_4yr == null) return null;
    return (d.tuition_public_4yr + d.tuition_private_4yr) / 2;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  window.VizBar = {
    draw: function (p, manager, ai, progress) {
      const data = manager.data || [];
      const x0 = (manager.offsetX || 80);
      const w = manager.width || 600;
      const h = manager.height || 520;

      p.background(255);

      if (!data.length) {
        p.fill(0); p.noStroke();
        p.text("Loading data...", 20, 30);
        return;
      }

      // layout
      const margin = { l: x0, r: 40, t: 88, b: 70 };
      const px = margin.l, py = margin.t;
      const cw = w - margin.r;
      const ch = h - (margin.t + margin.b);

      // title/subtitle
      p.noStroke();
      p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      p.textAlign(p.LEFT, p.TOP);
      p.textStyle(p.BOLD);
      p.textSize(18);
      p.text("Index gap: Debt growth minus Avg tuition growth", px, 18);
      p.textStyle(p.NORMAL);
      p.textSize(12);
      p.text("Positive values mean debt grew faster than tuition (index-based, start year = 100).", px, 46);

      // build index gap series
      const start = data[0];
      const startAvg = avgTuition(start);
      const startDebt = start.debt_total_billions;

      const years = [];
      const gaps = [];
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        const av = avgTuition(d);
        if (av == null || d.debt_total_billions == null || startAvg == null || startDebt == null) continue;

        const tuitionIndex = av / startAvg * 100;
        const debtIndex = d.debt_total_billions / startDebt * 100;
        const gap = debtIndex - tuitionIndex;

        years.push(d.year);
        gaps.push(gap);
      }

      if (years.length < 2) {
        p.fill(0); p.noStroke();
        p.text("Not enough data for index gap.", 20, 30);
        return;
      }

      // y scale symmetric-ish around 0
      let maxAbs = 1;
      for (let i = 0; i < gaps.length; i++) maxAbs = Math.max(maxAbs, Math.abs(gaps[i]));
      maxAbs = maxAbs * 1.15;

      const yScale = v => py + (1 - (v + maxAbs) / (2 * maxAbs)) * ch;

      // grid
      p.push();
      p.stroke(COLORS.grid[0], COLORS.grid[1], COLORS.grid[2]);
      p.strokeWeight(1);
      for (let t = 0; t <= 4; t++) {
        const yy = py + (t / 4) * ch;
        p.line(px, yy, px + cw, yy);
      }
      p.pop();

      // axes
      p.push();
      p.stroke(COLORS.axis[0], COLORS.axis[1], COLORS.axis[2]);
      p.strokeWeight(1.2);
      p.line(px, py + ch, px + cw, py + ch);
      p.line(px, py, px, py + ch);
      p.pop();

      // zero line
      const y0line = yScale(0);
      p.stroke(0, 140);
      p.strokeWeight(1.2);
      p.line(px, y0line, px + cw, y0line);

      // bars (band-based x so centered)
      const n = gaps.length;
      const bandW = cw / n;
      const barW = bandW * 0.72;

      for (let i = 0; i < n; i++) {
        const v = gaps[i];
        const x = px + (i + 0.5) * bandW;
        const y = yScale(v);
        const by = Math.min(y, y0line);
        const bh = Math.abs(y0line - y);

        // color by sign (same hue, different alpha)
        p.noStroke();
        p.fill(60, 60, 60, v >= 0 ? 210 : 90);
        p.rect(x - barW / 2, by, barW, bh);
      }

      // y tick labels
      p.noStroke();
      p.fill(0);
      p.textAlign(p.RIGHT, p.CENTER);
      p.textSize(12);
      for (let t = 0; t <= 4; t++) {
        const val = maxAbs - (t / 4) * (2 * maxAbs);
        const yy = py + (t / 4) * ch;
        p.stroke(0, 120);
        p.line(px - 5, yy, px, yy);
        p.noStroke();
        p.text(Math.round(val) + " pts", px - 10, yy);
      }

      // x ticks
      const ticks = [0, Math.floor(n / 2), n - 1];
      p.textAlign(p.CENTER, p.TOP);
      for (let i = 0; i < ticks.length; i++) {
        const idx = ticks[i];
        const xx = px + (idx + 0.5) * bandW;
        p.stroke(0, 120);
        p.line(xx, py + ch, xx, py + ch + 5);
        p.noStroke();
        p.text(String(years[idx]), xx, py + ch + 8);
      }

      // hover tooltip
      const mx = p.mouseX, my = p.mouseY;
      if (mx >= px && mx <= px + cw && my >= py && my <= py + ch) {
        let idx = Math.floor((mx - px) / bandW);
        idx = clamp(idx, 0, n - 1);
        const xx = px + (idx + 0.5) * bandW;

        p.stroke(0, 60);
        p.line(xx, py, xx, py + ch);

        const lines = [
          String(years[idx]),
          "Gap: " + (Math.round(gaps[idx] * 10) / 10) + " index points",
          "(Debt index - Tuition index)"
        ];

        p.noStroke(); p.textAlign(p.LEFT, p.TOP); p.textSize(12);
        let tw = 0;
        for (let i = 0; i < lines.length; i++) tw = Math.max(tw, p.textWidth(lines[i]));
        tw += 16;
        const th = 10 + lines.length * 16;

        const bx = clamp(xx + 10, 6, p.width - tw - 6);
        const by = clamp(my - th - 10, 6, p.height - th - 6);

        p.fill(255);
        p.stroke(0, 80);
        p.rect(bx, by, tw, th, 8);

        p.noStroke();
        p.fill(0);
        for (let i = 0; i < lines.length; i++) p.text(lines[i], bx + 8, by + 6 + i * 16);
      }
    }
  };
})();