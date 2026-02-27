// viz_line.js
(function () {
	const COLORS = {
		public: [33, 150, 243],
		private: [156, 39, 176],
		avg: [255, 152, 0],
		debt: [0, 150, 136],
		axis: [30, 30, 30],
		grid: [220, 220, 220],
		text: [30, 30, 30],
		bg: [255, 255, 255]
	};

	function extent(arr, fn) {
		let mn = Infinity, mx = -Infinity;
		for (let i = 0; i < arr.length; i++) {
			const v = fn(arr[i]);
			if (v == null || !isFinite(v)) continue;
			mn = Math.min(mn, v);
			mx = Math.max(mx, v);
		}
		if (mn === Infinity) mn = 0;
		if (mx === -Infinity) mx = 1;
		return [mn, mx];
	}

	function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

	function formatMoney(v) { return "$" + Math.round(v).toLocaleString("en-US"); }
	function formatBillions(v) { return "$" + (Math.round(v * 10) / 10).toLocaleString("en-US") + "B"; }

	function avgTuition(d) {
		if (d.tuition_public_4yr == null || d.tuition_private_4yr == null) return null;
		return (d.tuition_public_4yr + d.tuition_private_4yr) / 2;
	}

	function drawGrid(p, x0, y0, cw, ch, ticks) {
		ticks = ticks || 4;
		p.push();
		p.stroke(COLORS.grid[0], COLORS.grid[1], COLORS.grid[2]);
		p.strokeWeight(1);
		for (let i = 0; i <= ticks; i++) {
		const yy = y0 + (i / ticks) * ch;
		p.line(x0, yy, x0 + cw, yy);
		}
		p.pop();
	}

	function drawAxes(p, x0, y0, cw, ch) {
		p.push();
		p.stroke(COLORS.axis[0], COLORS.axis[1], COLORS.axis[2]);
		p.strokeWeight(1.2);
		p.line(x0, y0 + ch, x0 + cw, y0 + ch);
		p.line(x0, y0, x0, y0 + ch);
		p.pop();
	}

	function drawDualFrame(p, x0, y0, cw, ch) {
		p.push();
		p.stroke(COLORS.axis[0], COLORS.axis[1], COLORS.axis[2]);
		p.strokeWeight(1.2);
		p.line(x0, y0 + ch, x0 + cw, y0 + ch);
		p.line(x0, y0, x0, y0 + ch);
		p.line(x0 + cw, y0, x0 + cw, y0 + ch);
		p.pop();
	}

	function drawLine(p, xs, ys, color, weight) {
		p.push();
		p.noFill();
		p.stroke(color[0], color[1], color[2]);
		p.strokeWeight(weight || 2);
		p.beginShape();
		for (let i = 0; i < xs.length; i++) p.vertex(xs[i], ys[i]);
		p.endShape();
		p.pop();
	}

	function drawMarkers(p, xs, ys, color, r) {
		p.push();
		p.noStroke();
		p.fill(color[0], color[1], color[2]);
		for (let i = 0; i < xs.length; i++) p.circle(xs[i], ys[i], r || 4);
		p.pop();
	}

	function drawLegendBox(p, x, y, items) {
		p.push();
		p.textSize(12);
		let w = 0;
		for (let i = 0; i < items.length; i++) w = Math.max(w, p.textWidth(items[i].label));
		w = w + 46;
		const h = items.length * 18 + 14;

		p.noStroke();
		p.fill(255, 245);
		p.rect(x, y, w, h, 10);

		let cy = y + 10;
		for (let i = 0; i < items.length; i++) {
		const it = items[i];
		const c = it.color;

		if (it.style === "dot") {
			p.fill(c[0], c[1], c[2]);
			p.circle(x + 12, cy + 4, 6);
		} else {
			p.stroke(c[0], c[1], c[2]);
			p.strokeWeight(3);
			p.line(x + 6, cy + 4, x + 18, cy + 4);
			p.noStroke();
		}

		p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
		p.textAlign(p.LEFT, p.TOP);
		p.text(it.label, x + 26, cy - 2);
		cy += 18;
		}
		p.pop();
	}

	function ensureYearControls(p, manager, years) {
		if (!manager._yearControls) {
		const parentId = "vis";
		const startSel = p.createSelect();
		const endSel = p.createSelect();

		startSel.parent(parentId);
		endSel.parent(parentId);

		startSel.style("padding", "6px 8px");
		startSel.style("border", "1px solid #ddd");
		startSel.style("border-radius", "8px");
		startSel.style("font-size", "12px");
		startSel.style("background", "white");

		endSel.style("padding", "6px 8px");
		endSel.style("border", "1px solid #ddd");
		endSel.style("border-radius", "8px");
		endSel.style("font-size", "12px");
		endSel.style("background", "white");

		manager._yearControls = { startSel, endSel, built: false };
		}

    	const ctr = manager._yearControls;

		if (!ctr.built || ctr._count !== years.length) {
		ctr.startSel.elt.innerHTML = "";
		ctr.endSel.elt.innerHTML = "";

		for (let i = 0; i < years.length; i++) {
			ctr.startSel.option(String(years[i]), String(years[i]));
			ctr.endSel.option(String(years[i]), String(years[i]));
		}

		const first = years[0];
		const last = years[years.length - 1];

		const prev = manager._yearRange || { start: first, end: last };
		const s = years.includes(prev.start) ? prev.start : first;
		const e = years.includes(prev.end) ? prev.end : last;

		ctr.startSel.value(String(s));
		ctr.endSel.value(String(e));

		manager._yearRange = { start: s, end: e };

		ctr.startSel.changed(function () {
			const ns = Number(ctr.startSel.value());
			const cur = manager._yearRange || {};
			const ne = cur.end;

			if (ne != null && ns >= ne) {
			const idx = years.indexOf(ns);
			const next = years[Math.min(idx + 1, years.length - 1)];
			ctr.endSel.value(String(next));
			manager._yearRange = { start: ns, end: next };
			} else {
			manager._yearRange = { start: ns, end: ne };
			}
		});

		ctr.endSel.changed(function () {
			const ne = Number(ctr.endSel.value());
			const cur = manager._yearRange || {};
			const ns = cur.start;

			if (ns != null && ne <= ns) {
			const idx = years.indexOf(ne);
			const prevYear = years[Math.max(idx - 1, 0)];
			ctr.startSel.value(String(prevYear));
			manager._yearRange = { start: prevYear, end: ne };
			} else {
			manager._yearRange = { start: ns, end: ne };
			}
		});

		ctr.built = true;
		ctr._count = years.length;
	}
		return ctr;
	}

	function setControlsVisible(manager, visible) {
		const ctr = manager._yearControls;
		if (!ctr) return;
		const disp = visible ? "block" : "none";
		ctr.startSel.style("display", disp);
		ctr.endSel.style("display", disp);
	}

	window.VizLine = {
		hideControls: function (manager) {
			setControlsVisible(manager, false);
		},
		draw: function (p, manager, ai, progress) {
		const data = manager.data || [];
		const offsetX = manager.offsetX || 80;
		const w = manager.width || 600;
		const h = manager.height || 520;

		p.background(COLORS.bg[0], COLORS.bg[1], COLORS.bg[2]);

		if (!data.length) {
			p.fill(0); p.noStroke();
			p.text("Loading data...", 20, 30);
			return;
		}

		setControlsVisible(manager, ai === 3);

		const margin = { l: offsetX, r: 70, t: 88, b: 78 };
		const x0 = margin.l, y0 = margin.t;
		const cw = w - margin.r;
		const ch = h - (margin.t + margin.b);

		const [xMin, xMax] = extent(data, d => d.year);
		const xScale = yr => x0 + (yr - xMin) / (xMax - xMin) * cw;

		function drawTitle(title, subtitle) {
			p.push();
			p.noStroke();
			p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
			p.textAlign(p.LEFT, p.TOP);

			p.textStyle(p.BOLD);
			p.textSize(18);
			p.text(title, x0, 18);

			p.textStyle(p.NORMAL);
			p.textSize(12);
			p.text(subtitle, x0, 46);
			p.pop();
		}

		function drawXTicks(bottomY) {
			p.push();
			p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
			p.noStroke();
			p.textAlign(p.CENTER, p.TOP);
			p.textSize(12);

			const yrs = [xMin, Math.round((xMin + xMax) / 2), xMax];
			for (let i = 0; i < yrs.length; i++) {
			const xx = xScale(yrs[i]);
			p.stroke(COLORS.axis[0], COLORS.axis[1], COLORS.axis[2]);
			p.strokeWeight(1);
			p.line(xx, bottomY, xx, bottomY + 5);
			p.noStroke();
			p.text(String(yrs[i]), xx, bottomY + 8);
			}
			p.pop();
		}

		// -----------------------------
		// ai=1: tuition lines
		// -----------------------------
		if (ai === 1) {
			drawTitle(
				"Tuition over time",
				"4-year institutions (Public vs Private) + Average"
			);

			const yExtPub = extent(data, d => d.tuition_public_4yr);
			const yExtPriv = extent(data, d => d.tuition_private_4yr);
			const yExtAvg = extent(data, d => avgTuition(d));
			let yMin = Math.min(yExtPub[0], yExtPriv[0], yExtAvg[0]);
			let yMax = Math.max(yExtPub[1], yExtPriv[1], yExtAvg[1]);
			const pad = (yMax - yMin) * 0.10;
			yMin = Math.max(0, yMin - pad);
			yMax = yMax + pad;

			const yScale = v => y0 + (1 - (v - yMin) / (yMax - yMin)) * ch;

			drawGrid(p, x0, y0, cw, ch, 4);
			drawAxes(p, x0, y0, cw, ch);

			p.push();
			p.noStroke();
			p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
			p.textSize(12);
			p.textAlign(p.LEFT, p.BOTTOM);
			p.text("Tuition (USD)", x0, y0 - 10);
			p.pop();

			const xs = [], pubYs = [], privYs = [], avgYs = [];
			for (let i = 0; i < data.length; i++) {
				xs.push(xScale(data[i].year));
				pubYs.push(yScale(data[i].tuition_public_4yr));
				privYs.push(yScale(data[i].tuition_private_4yr));
				avgYs.push(yScale(avgTuition(data[i])));
			}

			drawLine(p, xs, pubYs, COLORS.public, 3);
			drawLine(p, xs, privYs, COLORS.private, 3);
			drawLine(p, xs, avgYs, COLORS.avg, 2);
			drawMarkers(p, xs, avgYs, COLORS.avg, 4);

			p.push();
			p.noStroke();
			p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
			p.textAlign(p.RIGHT, p.CENTER);
			p.textSize(12);
			for (let t = 0; t <= 4; t++) {
			const tt = t / 4;
			const v = yMin + (1 - tt) * (yMax - yMin);
			const yy = y0 + tt * ch;
			p.stroke(0, 120);
			p.line(x0 - 5, yy, x0, yy);
			p.noStroke();
			p.text(formatMoney(v), x0 - 10, yy);
			}
			p.pop();

			drawXTicks(y0 + ch);

			drawLegendBox(p, x0 + cw - 100, y0 + ch + 30, [
				{ label: "Public", color: COLORS.public, style: "line" },
				{ label: "Private", color: COLORS.private, style: "line" },
				{ label: "Average", color: COLORS.avg, style: "dot" }
			]);

			// hover tooltip
			var mx = p.mouseX, my = p.mouseY;
			var inside = (mx >= x0 && mx <= x0 + cw && my >= y0 && my <= y0 + ch);
			if (inside) {
				var best = null, bestDist = 1e9;
				for (var u = 0; u < data.length; u++) {
					var dx = Math.abs(xScale(data[u].year) - mx);
					if (dx < bestDist) { bestDist = dx; best = data[u]; }
				}
				if (best && bestDist < 18) {
					var px = xScale(best.year);

					p.push();
					p.stroke(0, 60);
					p.strokeWeight(1);
					p.line(px, y0, px, y0 + ch);
					p.pop();

					var av2 = avgTuition(best);
					var lines = [
					String(best.year),
					"Public: " + formatMoney(best.tuition_public_4yr),
					"Private: " + formatMoney(best.tuition_private_4yr),
					"Average: " + (av2 == null ? "N/A" : formatMoney(av2))
					];

					p.push();
					p.noStroke(); p.textAlign(p.LEFT, p.TOP); p.textSize(12);
					var tw = 0;
					for (var q = 0; q < lines.length; q++) tw = Math.max(tw, p.textWidth(lines[q]));
					tw += 16;
					var th = 10 + lines.length * 16;

					var bx = Math.min(px + 10, (manager.canvasWidth || p.width) - tw - 6);
					var by = clamp(my - th - 10, 6, (manager.canvasHeight || p.height) - th - 6);

					p.fill(255);
					p.stroke(0, 80);
					p.rect(bx, by, tw, th, 8);

					p.noStroke();
					p.fill(0);
					for (var q2 = 0; q2 < lines.length; q2++) p.text(lines[q2], bx + 8, by + 6 + q2 * 16);
					p.pop();
				}
			}

			p.pop();
			return;
		}

		// -----------------------------
		// ai=2: avg tuition vs debt (dual axis)
		// -----------------------------
		if (ai === 2) {
			drawTitle(
				"Average tuition vs total student loan debt",
				"Left axis: tuition (USD)  |  Right axis: debt (USD, billions)"
			);

			const tExt = extent(data, d => avgTuition(d));
			const dExt = extent(data, d => d.debt_total_billions);

			let tMin = Math.max(0, tExt[0] - (tExt[1] - tExt[0]) * 0.10);
			let tMax = tExt[1] + (tExt[1] - tExt[0]) * 0.10;

			let dMin = Math.max(0, dExt[0] - (dExt[1] - dExt[0]) * 0.10);
			let dMax = dExt[1] + (dExt[1] - dExt[0]) * 0.10;

			const yScaleT = v => y0 + (1 - (v - tMin) / (tMax - tMin)) * ch;
			const yScaleD = v => y0 + (1 - (v - dMin) / (dMax - dMin)) * ch;

			drawGrid(p, x0, y0, cw, ch, 4);
			drawDualFrame(p, x0, y0, cw, ch);

			const xs = [], tYs = [], dYs = [];
			for (let i = 0; i < data.length; i++) {
				xs.push(xScale(data[i].year));
				tYs.push(yScaleT(avgTuition(data[i])));
				dYs.push(yScaleD(data[i].debt_total_billions));
			}

			drawLine(p, xs, tYs, COLORS.avg, 3);
			drawLine(p, xs, dYs, COLORS.debt, 3);

			// left ticks
			p.push();
			p.noStroke();
			p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
			p.textAlign(p.RIGHT, p.CENTER);
			p.textSize(12);
			for (let t = 0; t <= 4; t++) {
				const tt = t / 4;
				const vT = tMin + (1 - tt) * (tMax - tMin);
				const yy = y0 + tt * ch;
				p.stroke(0, 120); p.line(x0 - 5, yy, x0, yy);
				p.noStroke();
				p.text(formatMoney(vT), x0 - 10, yy);
			}
			p.pop();

			// right ticks
			p.push();
			p.noStroke();
			p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
			p.textAlign(p.LEFT, p.CENTER);
			p.textSize(12);
			for (let t = 0; t <= 4; t++) {
				const tt = t / 4;
				const vD = dMin + (1 - tt) * (dMax - dMin);
				const yy = y0 + tt * ch;
				p.stroke(0, 120); p.line(x0 + cw, yy, x0 + cw + 5, yy);
				p.noStroke();
				p.text(formatBillions(vD), x0 + cw + 10, yy);
			}
			p.pop();

			drawXTicks(y0 + ch);

			drawLegendBox(p, x0 + cw - 100, y0 + ch + 30, [
				{ label: "Avg tuition", color: COLORS.avg, style: "line" },
				{ label: "Debt", color: COLORS.debt, style: "line" }
			]);

			return;
		}

		// -----------------------------
		// ai=3: dumbbell + dropdown year range + % change
		// -----------------------------
		if (ai === 3) {
			// build year list and lookup
			const years = data.map(d => d.year).filter(v => v != null);
			const byYear = {};
			for (let i = 0; i < data.length; i++) byYear[data[i].year] = data[i];

			const ctr = ensureYearControls(p, manager, years);

			ctr.startSel.position(x0 + cw - 450, y0 + ch + 5);
			ctr.endSel.position(x0 + cw - 350, y0 + ch + 5);

			p.push();
			p.noStroke();
			p.fill(30);
			p.textSize(11);
			p.textAlign(p.LEFT, p.TOP);
			p.text("Start", x0 + cw - 435, y0 + ch - 10);
			p.text("End", x0 + cw - 335, y0 + ch - 10);
			p.pop();

			const range = manager._yearRange || { start: years[0], end: years[years.length - 1] };
			const startYear = range.start;
			const endYear = range.end;

			const start = byYear[startYear];
			const end = byYear[endYear];

			function pctChange(endVal, startVal) {
				if (endVal == null || startVal == null || startVal === 0) return null;
				return (endVal / startVal - 1) * 100;
			}

			const startAvg = avgTuition(start);
			const endAvg = avgTuition(end);

			const rows = [
			{
				label: "Public tuition",
				start: start?.tuition_public_4yr,
				end: end?.tuition_public_4yr,
				color: COLORS.public,
				isDebt: false
			},
			{
				label: "Private tuition",
				start: start?.tuition_private_4yr,
				end: end?.tuition_private_4yr,
				color: COLORS.private,
				isDebt: false
			},
			{
				label: "Avg tuition",
				start: startAvg,
				end: endAvg,
				color: COLORS.avg,
				isDebt: false
			},
			{
				label: "Debt (billions)",
				start: start?.debt_total_billions,
				end: end?.debt_total_billions,
				color: COLORS.debt,
				isDebt: true
			}
			].filter(r => r.start != null && r.end != null);

			drawTitle(
			"How much did it grow?",
			"Pick two years to compare (values + percent change)"
			);

			const leftX = x0 + 140;
			const rightX = x0 + cw - 30;
			const topY = y0 + 26;
			const rowH = (ch - 50) / rows.length;

			p.push();
			p.noStroke();
			p.fill(30);
			p.textAlign(p.CENTER, p.BOTTOM);
			p.textSize(12);
			p.text(String(startYear), leftX, topY + 10);
			p.text(String(endYear), rightX, topY + 10);
			p.pop();

			for (let i = 0; i < rows.length; i++) {
				const r = rows[i];
				const y = topY + i * rowH + rowH / 2;

				// label
				p.noStroke();
				p.fill(30);
				p.textAlign(p.RIGHT, p.CENTER);
				p.textSize(12);
				p.text(r.label, leftX - 18, y);

				// connector
				p.stroke(0, 120);
				p.strokeWeight(2);
				p.line(leftX, y, rightX, y);

				// endpoints
				p.noStroke();
				p.fill(r.color[0], r.color[1], r.color[2]);
				p.circle(leftX, y, 10);
				p.circle(rightX, y, 10);

				// values
				const startTxt = r.isDebt ? formatBillions(r.start) : formatMoney(r.start);
				const endTxt = r.isDebt ? formatBillions(r.end) : formatMoney(r.end);
				const pct = pctChange(r.end, r.start);

				p.noStroke();
				p.fill(0);
				p.textAlign(p.LEFT, p.CENTER);
				p.text(startTxt, leftX - 15, y + 15);

				p.textAlign(p.RIGHT, p.CENTER);
				p.text(endTxt, rightX + 15, y + 15);
					
				if (pct != null) {
					const badge = (pct > 0 ? "+" : "") + Math.round(pct) + "%";
					p.push();
					p.noStroke();
					p.fill(r.color[0], r.color[1], r.color[2]);
					p.textAlign(p.CENTER, p.CENTER);
					p.textSize(12);
					p.text(badge, rightX + 50, y);
					p.pop();
				}
			}

			drawLegendBox(p, x0 + cw - 100, y0 + ch - 10, [
				{ label: "Public", color: COLORS.public, style: "dot" },
				{ label: "Private", color: COLORS.private, style: "dot" },
				{ label: "Average", color: COLORS.avg, style: "dot" },
				{ label: "Debt", color: COLORS.debt, style: "dot" }
			]);

			return;
		}

	}
  };
})();