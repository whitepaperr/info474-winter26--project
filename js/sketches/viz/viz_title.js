// viz_title.js
// Draw title screen (ai=0) with project name, intro blurb, and a photo
(function () {

    var _img = null;
    var _imgLoaded = false;
    var _imgError = false;

    // Load image using native browser Image — reliable outside p5 preload()
    (function () {
        var src = "js/img/title_photo.webp";
        var nativeImg = new Image();
        nativeImg.onload = function () {
            _imgLoaded = true;
            _img = nativeImg;
        };
        nativeImg.onerror = function () {
            _imgError = true;
            console.warn("viz_title: could not load", src);
        };
        nativeImg.src = src;
    })();

    function ensureImage(p) { /* loading handled above */ }

    window.VizTitle = {
        draw: function (p, manager, ai, progress) {
            var cx = (manager.offsetX || 80) + (manager.width || 600) / 2;
            var w  = manager.width  || 600;
            var h  = manager.height || 520;
            var x0 = manager.offsetX || 80;

            p.background(255);

            if (ai === 0) {
                ensureImage(p);

                // Photo (top portion)
                var photoH = Math.round(h * 0.44);
                var photoW = w - 0; // full content width
                if (_imgLoaded && _img) {
                    // fit image centered within photo area, preserving aspect ratio
                    var imgRatio = _img.naturalWidth / _img.naturalHeight;
                    var areaRatio = photoW / photoH;
                    var drawW, drawH;
                    if (imgRatio > areaRatio) {
                        drawW = photoW;
                        drawH = Math.round(photoW / imgRatio);
                    } else {
                        drawH = photoH;
                        drawW = Math.round(photoH * imgRatio);
                    }
                    var drawX = x0 + Math.round((photoW - drawW) / 2);
                    var drawY = Math.round((photoH - drawH) / 2);
                    p.drawingContext.drawImage(_img, drawX, drawY, drawW, drawH);
                } else if (!_imgError) {
                    // loading placeholder
                    p.noStroke();
                    p.fill(230);
                    p.rect(x0, 0, photoW, photoH);
                    p.fill(160);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(13);
                    p.text("Loading photo...", cx, photoH / 2);
                } else {
                    // error placeholder — light gray box
                    p.noStroke();
                    p.fill(240);
                    p.rect(x0, 0, photoW, photoH);
                    p.fill(160);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(12);
                    p.text("Could not load image — place title_photo.webp in img/ folder", cx, photoH / 2);
                }

                // Title
                var titleY = photoH + 28;
                p.noStroke();
                p.fill(20);
                p.textAlign(p.LEFT, p.TOP);
                p.textStyle(p.BOLD);
                p.textSize(28);
                p.text("The Price of a Degree", x0, titleY);

                // Subtitle / byline
                p.textStyle(p.NORMAL);
                p.textSize(13);
                p.fill(90);
                p.text("How U.S. tuition and student debt have changed since 2006", x0, titleY + 38);

                // Divider
                p.stroke(200);
                p.strokeWeight(1);
                p.line(x0, titleY + 60, x0 + photoW, titleY + 60);

                // Byline
                p.noStroke();
                p.fill(130);
                p.textAlign(p.LEFT, p.TOP);
                p.textSize(11);
                p.text("By Ariel, An & Tony  ·  INFO 474 Final Project  ·  Data: NCES & FRED", x0, titleY + 68);

                // Photo credit
                p.textAlign(p.RIGHT, p.BOTTOM);
                p.textSize(9);
                p.fill(180);

                return;
            }

            // ai === 1+: blank (other vizzes take over)
            p.background(255);
        }
    };
})();
