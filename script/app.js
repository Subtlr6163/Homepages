/*
 * app.js —— 全局初始化
 *
 * 只做两件事：
 *   1) 一言：自动加载第一条，绑定刷新按钮
 *   2) 随机播放开关初始状态
 */

(function () {
  "use strict";

  /* ===== 随机播放开关 ===== */
  var shuffleBtn = document.getElementById("shuffleBtn");
  if (shuffleBtn) {
    shuffleBtn.classList.add("active");
    shuffleBtn.setAttribute("title", "随机播放");
  }

  /* ===== 一言 ===== */
  var hType = document.getElementById("hType");
  var hText = document.getElementById("hText");
  var hFrom = document.getElementById("hFrom");
  var hRefresh = document.getElementById("hRefresh");

  var fetching = false;

  function render(item) {
    if (!item) {
      if (hType) hType.textContent = "失败";
      if (hText) hText.textContent = "暂时没能找到合适的句子，再试一次吧。";
      if (hFrom) hFrom.textContent = "";
      return;
    }

    var TYPE_MAP = {
      a: "动画", b: "漫画", c: "游戏", d: "文学", e: "原创",
      f: "来自网络", g: "其他", h: "影视", i: "诗词", j: "网易云",
      k: "哲学", l: "抖机灵"
    };

    if (hType) hType.textContent = TYPE_MAP[item.type] || "句子";
    if (hText) hText.textContent = item.text || "";
    var src = [];
    if (item.author) src.push(item.author);
    if (item.source) src.push(item.source);
    if (hFrom) hFrom.textContent = src.join(" · ");
  }

  function refresh() {
    if (fetching) return;
    if (hType) hType.textContent = "加载中";
    fetching = true;
    if (hRefresh) hRefresh.classList.add("spinning");

    var promise = window.Hitokoto
      ? window.Hitokoto.fetchOne()
      : Promise.resolve(null);

    promise
      .then(function (item) { render(item || null); })
      .catch(function () { render(null); })
      .then(function () {
        fetching = false;
        if (hRefresh) hRefresh.classList.remove("spinning");
      });
  }

  // 绑定刷新按钮
  if (hRefresh) {
    hRefresh.addEventListener("click", function (e) {
      e.preventDefault();
      refresh();
    });
  }

  // 页面加载后自动拉取第一条
  if (window.Hitokoto) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", refresh);
    } else {
      refresh();
    }
  }

  // 暴露给控制台调试
  window.App = {
    reload: function () { location.reload(); },
    cfg: function () { return window.APP_CONFIG; }
  };
})();
