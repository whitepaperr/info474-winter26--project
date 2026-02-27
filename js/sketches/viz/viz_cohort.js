// viz_cohort.js
// "What if you graduated in [year]?" cohort visualization
// Shows tuition at enrollment, 4-year cost, debt comparison, and % change from baseline
(function () {
    const COLORS = {
        public:  [33,  150, 243],
        private: [156,  39, 176],
        avg:     [255, 152,   0],
        debt:    [0,  150, 136],
        cohort:  [220,  53,  69],
        axis:    [30,   30,  30],
        grid:    [220, 220, 220],
        text:    [30,   30,  30],
        bg:      [255, 255, 255]
    };

    // The earliest year in the dataset
    const DATA_START = 2006;

    // ── helpers ────────────────────────────────────────────────────────────────
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function fmt$(v)  { return v == null ? "N/A" : "$" + Math.round(v).toLocaleString("en-US"); }
    function fmtB(v)  { return v == null ? "N/A" : "$" + (Math.round(v * 10) / 10).toLocaleString("en-US") + "B"; }
    function fmtPct(v){ return v == null ? "N/A" : (v > 0 ? "+" : "") + Math.round(v) + "%"; }

    function avgTuition(d) {
        if (d == null || d.tuition_public_4yr == null || d.tuition_private_4yr == null) return null;
        return (d.tuition_public_4yr + d.tuition_private_4yr) / 2;
    }

    // ── dropdown management ────────────────────────────────────────────────────
    function ensureCohortControls(p, manager, gradYears) {
        if (!manager._cohortControls) {
            const sel = p.createSelect();
            sel.parent("vis");
            sel.style("padding", "6px 10px");
            sel.style("border", "1px solid #ddd");
            sel.style("border-radius", "8px");
            sel.style("font-size", "13px");
            sel.style("background", "white");
            sel.style("font-weight", "600");
            sel.style("cursor", "pointer");
            manager._cohortControls = { sel, built: false };
        }

        const ctr = manager._cohortControls;
        if (!ctr.built || ctr._count !== gradYears.length) {
            ctr.sel.elt.innerHTML = "";
            for (let i = 0; i < gradYears.length; i++) {
                ctr.sel.option(String(gradYears[i]), String(gradYears[i]));
            }
            // default to most recent grad year
            const def = manager._cohortGradYear || gradYears[gradYears.length - 1];
            ctr.sel.value(String(def));
            manager._cohortGradYear = Number(ctr.sel.value());

            ctr.sel.changed(function () {
                manager._cohortGradYear = Number(ctr.sel.value());
            });
            ctr.built = true;
            ctr._count = gradYears.length;
        }
        return ctr;
    }

    function setCohortControlsVisible(manager, visible) {
        const ctr = manager._cohortControls;
        if (!ctr) return;
        ctr.sel.style("display", visible ? "block" : "none");
    }

    // ── main draw ──────────────────────────────────────────────────────────────
    window.VizCohort = {
        hideControls: function (manager) {
            setCohortControlsVisible(manager, false);
        },

        draw: function (p, manager, ai, progress) {
            const data = manager.data || [];
            const offsetX = manager.offsetX || 80;
            const w = manager.width  || 600;
            const h = manager.height || 520;

            p.background(COLORS.bg[0], COLORS.bg[1], COLORS.bg[2]);

            if (data.length < 2) {
                p.fill(0); p.noStroke();
                p.text("Loading data...", 20, 30);
                return;
            }

            // Build byYear lookup and valid grad years (need 4 years of data before grad)
            const byYear = {};
            for (let i = 0; i < data.length; i++) byYear[data[i].year] = data[i];
            const allYears = data.map(d => d.year).filter(v => v != null).sort((a, b) => a - b);

            // Grad year needs enrollment year = gradYear - 3 to exist in data
            const gradYears = allYears.filter(y => byYear[y - 3] != null);
            if (gradYears.length === 0) {
                p.fill(0); p.noStroke();
                p.text("Not enough data for cohort view.", 20, 60);
                return;
            }

            // Controls
            const ctr = ensureCohortControls(p, manager, gradYears);
            setCohortControlsVisible(manager, true);

            const margin = { l: offsetX, r: 40, t: 88, b: 70 };
            const x0 = margin.l, y0 = margin.t;
            const cw = w - margin.r;
            const ch = h - (margin.t + margin.b);

            // Position dropdown
            ctr.sel.position(x0 + cw - 90, y0 + ch + 8);

            const gradYear = manager._cohortGradYear || gradYears[gradYears.length - 1];
            const enrollYear = gradYear - 3;

            // The 4 cohort years
            const cohortYears = [enrollYear, enrollYear + 1, enrollYear + 2, gradYear];
            const cohortData  = cohortYears.map(y => byYear[y] || null);

            // ── STATS ──────────────────────────────────────────────────────────
            const enrollRow = cohortData[0];
            const gradRow   = cohortData[3];

            // Tuition at enrollment (avg)
            const tuitionAtEnroll = avgTuition(enrollRow);

            // Total 4-year avg tuition cost
            let total4yr = 0, total4yrValid = true;
            for (let i = 0; i < cohortData.length; i++) {
                const av = avgTuition(cohortData[i]);
                if (av == null) { total4yrValid = false; break; }
                total4yr += av;
            }
            if (!total4yrValid) total4yr = null;

            // National debt at graduation
            const debtAtGrad = gradRow ? gradRow.debt_total_billions : null;

            // % increase in avg tuition vs baseline (first year in dataset)
            const baseline = byYear[allYears[0]];
            const baselineAvg = avgTuition(baseline);
            const pctVsBaseline = (tuitionAtEnroll != null && baselineAvg != null && baselineAvg !== 0)
                ? (tuitionAtEnroll / baselineAvg - 1) * 100
                : null;

            // Debt growth DURING cohort years (enrollment to graduation)
            const debtAtEnroll = enrollRow ? enrollRow.debt_total_billions : null;
            const debtGrowthPct = (debtAtGrad != null && debtAtEnroll != null && debtAtEnroll !== 0)
                ? (debtAtGrad / debtAtEnroll - 1) * 100
                : null;

            // ── TITLE ──────────────────────────────────────────────────────────
            p.push();
            p.noStroke();
            p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
            p.textAlign(p.LEFT, p.TOP);
            p.textStyle(p.BOLD);
            p.textSize(18);
            p.text("If you graduated in " + gradYear + "...", x0, 18);
            p.textStyle(p.NORMAL);
            p.textSize(12);
            p.text(
                "Enrolled " + enrollYear + " · Graduated " + gradYear +
                "  |  Pick a graduation year →",
                x0, 46
            );
            p.pop();

            // ── MINI TIMELINE (top half) ───────────────────────────────────────
            const timelineH = ch * 0.42;
            const timelineY = y0;

            const [xMin, xMax] = [allYears[0], allYears[allYears.length - 1]];
            const xScale = yr => x0 + (yr - xMin) / (xMax - xMin) * cw;

            // Grid
            p.push();
            p.stroke(COLORS.grid[0], COLORS.grid[1], COLORS.grid[2]);
            p.strokeWeight(1);
            for (let i = 0; i <= 3; i++) {
                const yy = timelineY + (i / 3) * timelineH;
                p.line(x0, yy, x0 + cw, yy);
            }
            p.pop();

            // Avg tuition line (all years)
            const avgs = allYears.map(y => avgTuition(byYear[y])).filter(v => v != null);
            const tMin = Math.max(0, Math.min(...avgs) * 0.9);
            const tMax = Math.max(...avgs) * 1.1;
            const yScaleT = v => timelineY + (1 - (v - tMin) / (tMax - tMin)) * timelineH;

            p.push();
            p.noFill();
            p.stroke(COLORS.avg[0], COLORS.avg[1], COLORS.avg[2]);
            p.strokeWeight(2);
            p.beginShape();
            for (let i = 0; i < allYears.length; i++) {
                const av = avgTuition(byYear[allYears[i]]);
                if (av != null) p.vertex(xScale(allYears[i]), yScaleT(av));
            }
            p.endShape();
            p.pop();

            // Cohort highlight band
            const bandX1 = xScale(enrollYear);
            const bandX2 = xScale(gradYear);
            p.push();
            p.noStroke();
            p.fill(COLORS.cohort[0], COLORS.cohort[1], COLORS.cohort[2], 28);
            p.rect(bandX1, timelineY, bandX2 - bandX1, timelineH);
            p.pop();

            // Vertical boundary lines for cohort
            p.push();
            p.stroke(COLORS.cohort[0], COLORS.cohort[1], COLORS.cohort[2], 160);
            p.strokeWeight(1.5);
            p.setLineDash && p.setLineDash([4, 3]);
            p.line(bandX1, timelineY, bandX1, timelineY + timelineH);
            p.line(bandX2, timelineY, bandX2, timelineY + timelineH);
            p.pop();

            // Highlighted dots for each cohort year
            for (let i = 0; i < cohortYears.length; i++) {
                const y = cohortYears[i];
                const av = avgTuition(byYear[y]);
                if (av == null) continue;
                const cx_ = xScale(y);
                const cy_ = yScaleT(av);

                p.push();
                p.noStroke();
                p.fill(COLORS.cohort[0], COLORS.cohort[1], COLORS.cohort[2]);
                p.circle(cx_, cy_, i === 0 || i === 3 ? 10 : 7);
                p.pop();

                // year label above first and last
                if (i === 0 || i === 3) {
                    p.push();
                    p.noStroke();
                    p.fill(COLORS.cohort[0], COLORS.cohort[1], COLORS.cohort[2]);
                    p.textAlign(p.CENTER, p.BOTTOM);
                    p.textSize(11);
                    p.textStyle(p.BOLD);
                    p.text(i === 0 ? "Enrolled " + y : "Graduated " + y, cx_, cy_ - 7);
                    p.pop();
                }
            }

            // Axis
            p.push();
            p.stroke(COLORS.axis[0], COLORS.axis[1], COLORS.axis[2]);
            p.strokeWeight(1.2);
            p.line(x0, timelineY + timelineH, x0 + cw, timelineY + timelineH);
            p.line(x0, timelineY, x0, timelineY + timelineH);
            p.pop();

            // Y ticks (left)
            p.push();
            p.noStroke();
            p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
            p.textAlign(p.RIGHT, p.CENTER);
            p.textSize(11);
            for (let t = 0; t <= 3; t++) {
                const val = tMin + (1 - t / 3) * (tMax - tMin);
                const yy  = timelineY + (t / 3) * timelineH;
                p.stroke(0, 100); p.line(x0 - 4, yy, x0, yy);
                p.noStroke(); p.text(fmt$(val), x0 - 8, yy);
            }
            p.pop();

            // X ticks
            p.push();
            p.noStroke();
            p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(11);
            const tickYrs = [allYears[0], allYears[Math.floor(allYears.length / 2)], allYears[allYears.length - 1]];
            for (let i = 0; i < tickYrs.length; i++) {
                const xx = xScale(tickYrs[i]);
                p.stroke(0, 100); p.line(xx, timelineY + timelineH, xx, timelineY + timelineH + 4);
                p.noStroke(); p.text(String(tickYrs[i]), xx, timelineY + timelineH + 6);
            }
            p.pop();

            // "Avg tuition" label on chart
            p.push();
            p.noStroke();
            p.fill(COLORS.avg[0], COLORS.avg[1], COLORS.avg[2]);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(11);
            p.text("Avg tuition", x0 + 4, timelineY + 4);
            p.pop();

            // ── STAT CARDS (bottom half) ───────────────────────────────────────
            const cardAreaY  = timelineY + timelineH + 36;
            const cardAreaH  = h - cardAreaY - 30;
            const cards = [
                {
                    label: "Tuition when you enrolled",
                    sub:   String(enrollYear),
                    value: fmt$(tuitionAtEnroll),
                    color: COLORS.avg
                },
                {
                    label: "Est. 4-year tuition cost",
                    sub:   enrollYear + "–" + gradYear,
                    value: fmt$(total4yr),
                    color: COLORS.public
                },
                {
                    label: "National debt at graduation",
                    sub:   String(gradYear),
                    value: fmtB(debtAtGrad),
                    color: COLORS.debt
                },
                {
                    label: "Debt grew during your 4 years",
                    sub:   enrollYear + " → " + gradYear,
                    value: fmtPct(debtGrowthPct),
                    color: COLORS.cohort
                },
                {
                    label: "Tuition vs " + allYears[0] + " baseline",
                    sub:   "avg tuition % change",
                    value: fmtPct(pctVsBaseline),
                    color: COLORS.private
                }
            ];

            const nCards  = cards.length;
            const cardW   = (cw - (nCards - 1) * 10) / nCards;
            const cardH   = Math.min(cardAreaH, 88);

            for (let i = 0; i < nCards; i++) {
                const card = cards[i];
                const cx_  = x0 + i * (cardW + 10);
                const cy_  = cardAreaY + (cardAreaH - cardH) / 2;
                const c    = card.color;

                // Card background
                p.push();
                p.noStroke();
                p.fill(c[0], c[1], c[2], 18);
                p.rect(cx_, cy_, cardW, cardH, 8);
                p.pop();

                // Top accent bar
                p.push();
                p.noStroke();
                p.fill(c[0], c[1], c[2]);
                p.rect(cx_, cy_, cardW, 4, 8, 8, 0, 0);
                p.pop();

                // Label
                p.push();
                p.noStroke();
                p.fill(80);
                p.textAlign(p.LEFT, p.TOP);
                p.textSize(10);
                p.textStyle(p.NORMAL);
                // word-wrap label manually (max ~cardW-12 px wide)
                const words = card.label.split(" ");
                let line1 = "", line2 = "";
                for (let w = 0; w < words.length; w++) {
                    const test = (line1 ? line1 + " " : "") + words[w];
                    if (p.textWidth(test) > cardW - 12) {
                        line2 += (line2 ? " " : "") + words[w];
                    } else {
                        line1 = test;
                    }
                }
                p.text(line1, cx_ + 6, cy_ + 10);
                if (line2) p.text(line2, cx_ + 6, cy_ + 22);
                p.pop();

                // Value
                p.push();
                p.noStroke();
                p.fill(c[0], c[1], c[2]);
                p.textAlign(p.LEFT, p.BASELINE);
                p.textStyle(p.BOLD);
                p.textSize(17);
                p.text(card.value, cx_ + 6, cy_ + cardH - 24);
                p.pop();

                // Sub
                p.push();
                p.noStroke();
                p.fill(140);
                p.textAlign(p.LEFT, p.TOP);
                p.textStyle(p.NORMAL);
                p.textSize(10);
                p.text(card.sub, cx_ + 6, cy_ + cardH - 16);
                p.pop();
            }

            // Dropdown label
            p.push();
            p.noStroke();
            p.fill(100);
            p.textAlign(p.RIGHT, p.CENTER);
            p.textSize(11);
            p.text("Graduation year:", x0 + cw - 100, y0 + ch + 20);
            p.pop();
        }
    };
})();