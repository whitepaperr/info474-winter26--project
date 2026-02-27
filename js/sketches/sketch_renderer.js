// sketch_renderer.js

// Responsible for rendering the main visualization based on the current active index
(function () {
    window.Renderer = {

        setData: function (manager) {
            var self = this;

            manager.offsetX = (manager.margin && manager.margin.left) || 80;
            manager.offsetY = (manager.margin && manager.margin.top) || 0;

            function parseCSV(text) {
                const lines = (text || "").trim().split(/\r?\n/);
                const header = lines[0].split(",").map(s => s.trim());
                return lines.slice(1).map(line => {
                const cols = line.split(",");
                const row = {};
                header.forEach((h, i) => row[h] = (cols[i] ?? "").trim());
                return row;
                });
            }

            function toNum(v) {
                const n = Number(v);
                return Number.isFinite(n) ? n : null;
            }

            function preprocess(rows) {
                let data = rows.map(r => ({
                year: toNum(r.year),
                tuition_public_4yr: toNum(r.tuition_public_4yr),
                tuition_private_4yr: toNum(r.tuition_private_4yr),
                debt_total_billions: toNum(r.debt_total_billions),
                }))
                .filter(d => d.year != null)
                .sort((a, b) => a.year - b.year);

                for (let i = 0; i < data.length; i++) {
                const prev = data[i - 1];
                const cur = data[i];
                if (!prev) {
                    cur.debt_yoy = null;
                    continue;
                }
                if (cur.debt_total_billions == null || prev.debt_total_billions == null || prev.debt_total_billions === 0) {
                    cur.debt_yoy = null;
                } else {
                    cur.debt_yoy = (cur.debt_total_billions - prev.debt_total_billions) / prev.debt_total_billions * 100;
                }
                }

                return data;
            }

            return fetch("data/merged_yearly.csv")
            .then(r => r.text())
            .then(text => {
                const rows = parseCSV(text);
                manager.data = preprocess(rows);
                return manager.data;
            })
            .catch(err => {
                console.error("Failed to load data/merged_yearly.csv", err);
                manager.data = [];
                return manager.data;
            });
        },

        draw: function (p, manager, ai, progress) {
            try { console.log('Renderer: delegating draw, ai=', ai); } catch (e) { }

            // Hide year-comparison controls whenever we are NOT on step 3
            if (ai !== 3 && window.VizLine && window.VizLine.hideControls) {
                window.VizLine.hideControls(manager);
            }

            if (ai === 0) { window.VizTitle.draw(p, manager, ai, progress); return; }
            if (ai === 1) { window.VizLine.draw(p, manager, ai, progress); return; }
            if (ai === 2) { window.VizLine.draw(p, manager, ai, progress); return; }
            if (ai === 3) { window.VizLine.draw(p, manager, ai, progress); return; }
            if (ai === 4) { window.VizBar.draw(p, manager, ai, progress); return; }
            if (ai === 5) { window.VizScatter.draw(p, manager, ai, progress); return; }
            if (ai === 6) { window.VizLine.draw(p, manager, ai, progress); return; }
        }
    };
})();
