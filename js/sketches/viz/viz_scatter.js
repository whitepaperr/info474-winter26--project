// viz_scatter.js
(function () {
  function avgTuition(d) {
    if (d.tuition_public_4yr == null || d.tuition_private_4yr == null) return null;
    return (d.tuition_public_4yr + d.tuition_private_4yr) / 2;
  }
  function yoy(cur, prev) {
    if (cur == null || prev == null || prev === 0) return null;
    return (cur - prev) / prev * 100;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  window.VizScatter = {
    draw: function (p, manager, ai, progress) {
      const data = manager.data || [];
      const x0 = (manager.offsetX || 80);
      const w = manager.width || 600;
      const h = manager.height || 520;

      p.background(255);

      if (data.length < 2) {
        p.fill(0); p.noStroke();
        p.text("Not enough data for YoY heatmap.", 20, 30);
        return;
      }

      const margin = { l: x0, r: 40, t: 88, b: 70 };
      const px = margin.l, py = margin.t;
      const cw = w - margin.r;
      const ch = h - (margin.t + margin.b);

      // title/subtitle
      p.noStroke();
      p.fill(30);
      p.textAlign(p.LEFT, p.TOP);
      p.textStyle(p.BOLD);
      p.textSize(18);
      p.text("YoY heatmap (darker = bigger change)", px, 18);
      p.textStyle(p.NORMAL);
      p.textSize(12);
      p.text("Top row: Avg tuition YoY (%)  |  Bottom row: Debt YoY (%)", px, 46);

      const years = [];
      const tVals = [];
      const dVals = [];
      for (let i = 1; i < data.length; i++) {
        const cur = data[i], prev = data[i - 1];
        const t = yoy(avgTuition(cur), avgTuition(prev));
        const d = yoy(cur.debt_total_billions, prev.debt_total_billions);
        if (t == null || d == null) continue;
        years.push(cur.year);
        tVals.push(t);
        dVals.push(d);
      }

      const n = years.length;
      if (n < 2) return;

      let maxAbs = 1;
      for (let i = 0; i < n; i++) {
        maxAbs = Math.max(maxAbs, Math.abs(tVals[i]), Math.abs(dVals[i]));
      }

      function intensity(v) {
        const a = Math.abs(v);
        return clamp(a / maxAbs, 0, 1);
      }

      function heatColor(t) {
        const stops = [
          [255, 247, 228],
          [65,  182, 196],
          [44,  127, 184],
          [8,   29,  88]
        ];
        const scaled = t * (stops.length - 1);
        const lo = Math.floor(scaled);
        const hi = Math.min(lo + 1, stops.length - 1);
        const f  = scaled - lo;
        return [
          Math.round(stops[lo][0] + f * (stops[hi][0] - stops[lo][0])),
          Math.round(stops[lo][1] + f * (stops[hi][1] - stops[lo][1])),
          Math.round(stops[lo][2] + f * (stops[hi][2] - stops[lo][2]))
        ];
      }

      const bandW = cw / n;
      const rowH = ch / 2;

      // axis frame
      p.stroke(30);
      p.strokeWeight(1);
      p.noFill();
      p.rect(px, py, cw, ch);

      // row labels
      p.noStroke();
      p.fill(30);
      p.textAlign(p.RIGHT, p.CENTER);
      p.textSize(14);
      p.text("Tuition YoY", px - 14, py + rowH / 2);
      p.text("Debt YoY", px - 14, py + rowH + rowH / 2);

      // draw cells
      for (let i = 0; i < n; i++) {
        const x = px + i * bandW;

        // tuition row
        const it = intensity(tVals[i]);
        const c1 = heatColor(it);
        p.noStroke();
        p.fill(c1[0], c1[1], c1[2]);
        p.rect(x, py, bandW, rowH);

        // debt row
        const id = intensity(dVals[i]);
        const c2 = heatColor(id);
        p.fill(c2[0], c2[1], c2[2]);
        p.rect(x, py + rowH, bandW, rowH);

        // subtle separators
        p.stroke(255, 90);
        p.line(x, py, x, py + ch);
      }

      // x ticks
      p.noStroke();
      p.fill(30);
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(12);
      const ticks = [0, Math.floor(n / 2), n - 1];
      for (let i = 0; i < ticks.length; i++) {
        const idx = ticks[i];
        const xx = px + (idx + 0.5) * bandW;
        p.text(String(years[idx]), xx, py + ch + 10);
      }

      // legend (bottom-right): light -> dark
      const lx = px + cw - 170;
      const ly = py + ch - 34;
      p.noStroke();
      p.fill(255, 245);
      p.rect(lx, ly, 160, 28, 10);

      for (let i = 0; i < 50; i++) {
        const t = i / 49;
        const c = heatColor(t);
        p.fill(c[0], c[1], c[2]);
        p.rect(lx + 8 + i * 2.7, ly + 10, 3, 10);
      }
      p.fill(30);
      p.textAlign(p.LEFT, p.CENTER);
      p.textSize(11);
      p.text("smaller", lx + 8, ly + 6);
      p.textAlign(p.RIGHT, p.CENTER);
      p.text("bigger", lx + 152, ly + 6);

      // hover tooltip
      const mx = p.mouseX, my = p.mouseY;
      if (mx >= px && mx <= px + cw && my >= py && my <= py + ch) {
        let idx = Math.floor((mx - px) / bandW);
        idx = clamp(idx, 0, n - 1);

        const xx = px + (idx + 0.5) * bandW;
        p.stroke(0, 70);
        p.line(xx, py, xx, py + ch);

        const lines = [
          String(years[idx]),
          "Tuition YoY: " + (Math.round(tVals[idx] * 10) / 10) + "%",
          "Debt YoY: " + (Math.round(dVals[idx] * 10) / 10) + "%"
        ];

        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(12);
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