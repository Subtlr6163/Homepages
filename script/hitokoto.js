/*
 * 一言（Hitokoto）模块
 *
 * 策略：可配置源 + 串行尝试 + 限流
 *   - 源列表来自 config.js 的 HITOKOTO_SOURCES
 *   - 接口之间串行尝试，成功即停
 *   - 每次调用间隔 1.2s，防止连点刷爆接口
 *   - 自动识别多种返回结构
 *
 * 暴露：window.Hitokoto = { fetchOne, typeLabel }
 */

(function (global) {
  "use strict";

  var TYPE_MAP = {
    a: "动画", b: "漫画", c: "游戏", d: "文学", e: "原创",
    f: "来自网络", g: "其他", h: "影视", i: "诗词", j: "网易云",
    k: "哲学", l: "抖机灵"
  };

  var cfg = global.APP_CONFIG || {};
  var SOURCE_URLS = (cfg.HITOKOTO_SOURCES && cfg.HITOKOTO_SOURCES.length)
    ? cfg.HITOKOTO_SOURCES
    : ["https://v1.hitokoto.cn/?c=d&c=k&c=i&encode=json"];

  var TIMEOUT = 6000;

  function req(url) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error("timeout"));
      }, TIMEOUT);

      fetch(url, { headers: { "Accept": "application/json" } })
        .then(function (res) {
          if (done) return;
          if (!res.ok) {
            clearTimeout(timer);
            done = true;
            reject(new Error("http " + res.status));
            return;
          }
          res.json().then(function (data) {
            if (done) return;
            clearTimeout(timer);
            done = true;
            resolve(data);
          }).catch(function () {
            if (!done) { done = true; clearTimeout(timer); reject(new Error("parse")); }
          });
        })
        .catch(function (err) {
          if (!done) { done = true; clearTimeout(timer); reject(err); }
        });
    });
  }

  /* 归一化：兼容多种返回结构
   *  官方：        { hitokoto, from, from_who, type }
   *  apizero：     { data: { content, type } }
   *  今日诗词：    { data: { content, origin: { dynasty, author, title } } }
   */
  function normalize(raw) {
    if (!raw) return null;

    // 官方 / 自建结构
    if (typeof raw.hitokoto === "string" && raw.hitokoto.trim()) {
      return {
        text: raw.hitokoto.trim(),
        source: raw.from || "",
        author: raw.from_who || "",
        type: raw.type || "d"
      };
    }

    // apizero / 嵌套结构
    if (raw.data && typeof raw.data === "object") {
      var d = raw.data;

      if (typeof d.content === "string" && d.content.trim()) {
        return {
          text: d.content.trim(),
          source: d.title || "",
          author: d.author || "",
          type: typeof d.type === "string" ? d.type : "d"
        };
      }

      // 今日诗词
      if (d.origin && typeof d.origin === "object") {
        var o = d.origin;
        var content = d.content;
        var text = Array.isArray(content)
          ? content.join("")
          : (typeof content === "string" ? content : "");
        if (text) {
          var dynasty = o.dynasty ? o.dynasty + "·" : "";
          return {
            text: text,
            source: o.title || "",
            author: o.author ? dynasty + o.author : "",
            type: "i"
          };
        }
      }
    }

    // 极简结构：直接是个字符串
    if (typeof raw === "string" && raw.trim()) {
      return { text: raw.trim(), source: "", author: "", type: "d" };
    }

    return null;
  }

  var GAP = 1200;
  var lastCall = 0;
  var inflight = null;

  function fetchOne() {
    var now = Date.now();

    // 节流：间隔内复用同一请求
    if (inflight && now - lastCall < GAP) return inflight;

    inflight = (function () {
      var wait = Math.max(0, GAP - (now - lastCall));
      lastCall = now + wait;

      return new Promise(function (resolve) {
        setTimeout(function () {
          lastCall = Date.now();
          var idx = 0;

          function next() {
            if (idx >= SOURCE_URLS.length) return resolve(null);
            var url = SOURCE_URLS[idx++];
            req(url)
              .then(function (raw) {
                var item = normalize(raw);
                if (item && item.text) resolve(item);
                else next();
              })
              .catch(function () { next(); });
          }
          next();
        }, wait);
      });
    })();

    return inflight;
  }

  function typeLabel(t) { return TYPE_MAP[t] || "句子"; }

  // 暴露到全局
  global.Hitokoto = { fetchOne: fetchOne, typeLabel: typeLabel };
})(window);
