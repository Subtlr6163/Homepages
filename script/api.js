/*
 * api.js —— Meting API 调用层（朴素版）
 *
 * 接口：https://meting.spr-aachen.com/api?server=[server]&type=[type]&id=[id]
 */

(function () {
  "use strict";

  var BASE = "https://meting.spr-aachen.com/api";

  function buildUrl(server, type, id) {
    return BASE + "?server=" + encodeURIComponent(server) +
      "&type=" + encodeURIComponent(type) +
      "&id=" + encodeURIComponent(id);
  }

  function request(server, type, id) {
    var url = buildUrl(server, type, id);
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function search(keyword) {
    if (!keyword) return Promise.resolve([]);
    return request("netease", "search", keyword)
      .then(function (data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.songs)) return data.songs;
        if (data && data.result && Array.isArray(data.result.songs)) return data.result.songs;
        if (data && typeof data === "object") return [data];
        return [];
      })
      .catch(function (e) {
        return [];
      });
  }

  function song(server, id) {
    return request(server || "netease", "song", id).catch(function () { return null; });
  }

  function url(server, id) {
    return request(server || "netease", "url", id)
      .then(function (data) {
        if (Array.isArray(data) && data[0]) return data[0].url || "";
        if (data && data.url) return data.url;
        return "";
      })
      .catch(function () { return ""; });
  }

  window.MetingAPI = {
    search: search,
    song: song,
    url: url
  };
})();
