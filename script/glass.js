/*
 * glass.js —— 极简版（性能优先）
 *
 * 不绑定任何滚动/鼠标监听，不做动态效果。
 * 只在有封面时提取一次主色，用于背景色变化。
 */

(function () {
  "use strict";

  /* 主色提取：把图片缩小到 32x32 再采样，降低开销 */
  function extractColor(img, callback) {
    if (!img || !img.complete || !img.naturalWidth) {
      // 图片未加载完，等加载完再试
      img && img.addEventListener("load", function once() {
        img.removeEventListener("load", once);
        extractColor(img, callback);
      }, { once: true });
      return;
    }

    try {
      var canvas = document.createElement("canvas");
      var size = 32;
      canvas.width = size;
      canvas.height = size;
      var ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size, size);
      var data = ctx.getImageData(0, 0, size, size).data;

      var r = 0, g = 0, b = 0, n = 0;
      for (var i = 0; i < data.length; i += 4 * 9) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
      if (n === 0) return;

      r = Math.round(r / n);
      g = Math.round(g / n);
      b = Math.round(b / n);

      // 提亮，避免暗封面让背景一片黑
      var boost = 0.55;
      r = Math.round(r + (255 - r) * boost);
      g = Math.round(g + (255 - g) * boost);
      b = Math.round(b + (255 - b) * boost);

      callback && callback("rgb(" + r + ", " + g + ", " + b + ")");
    } catch (e) {
      // 跨域图片取不到像素，静默失败
    }
  }

  function applyMood(color, bgEl, blobs) {
    // 把主色注入 --glass-rgb，玻璃边框/高光/发光跟随内容变色（自适应着色）
    var c = color && color.match(/\d+/g);
    if (c && c.length >= 3) {
      var rgb = c[0] + ", " + c[1] + ", " + c[2];
      document.documentElement.style.setProperty("--glass-rgb", rgb);
    }
    // 背景已改为随机图片，不再用封面色覆盖背景图；仅保留光斑颜色联动
    var glowA = blobs && blobs[0];
    var glowB = blobs && blobs[1];
    if (glowA) glowA.style.background = "radial-gradient(circle, " + color + " 0%, transparent 70%)";
    if (glowB) {
      var cc = color.match(/\d+/g);
      if (cc) {
        var shifted = "radial-gradient(circle, rgb(" + cc[0] + ", " +
          Math.round(cc[1] * 0.6) + ", 255) 0%, transparent 70%)";
        glowB.style.background = shifted;
      }
    }
  }

  // 暴露接口
  window.Glass = {
    extractColor: extractColor,
    applyMood: applyMood
  };
})();
