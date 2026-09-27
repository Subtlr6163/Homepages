/*
 * player.js —— 极简播放器
 *
 * 设计原则：
 *   - 不绑定 scroll / mousemove / touchmove 持续监听
 *   - 不做 backdrop-filter / filter:blur
 *   - 进度条用 pointer 事件，松手即解绑
 *   - 不做歌词
 */

(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var audio = $("audio") || new Audio();
  var playBtn = $("playBtn");
  var prevBtn = $("prevBtn");
  var nextBtn = $("nextBtn");
  var refreshBtn = $("refreshBtn");
  var cover = $("cover");
  var coverImg = (cover && cover.tagName === "IMG") ? cover
    : (cover && cover.querySelector ? cover.querySelector("img") : null);
  var titleEl = $("trackName");
  var artistEl = $("artistName");
  var progressFill = $("progressFill");
  var progressBuffer = $("progressBuffer");
  var progressThumb = $("progressThumb");
  var progressBar = $("progress");
  var timeNow = $("currentTime");
  var timeTotal = $("duration");
  var errTip = $("playerError");
  var stateEl = $("state");
  var searchInput = $("searchInput");
  var searchBtn = $("searchBtn");
  var searchResult = $("searchResult");

  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }

  /* ===== 配置 ===== */
  var cfg = window.APP_CONFIG || {};
  var DEFAULT_SONG = cfg.DEFAULT_SONG || { title: "Boomerang", artist: "GRX" };

  var queue = [];
  var index = -1;
  var isSeeking = false;
  var started = false;

  function showError(msg) {
    if (!errTip) { alert(msg); return; }
    errTip.textContent = msg;
    errTip.style.display = "block";
    clearTimeout(showError._t);
    showError._t = setTimeout(function () { errTip.style.display = "none"; }, 6000);
  }

  function setState(txt) { if (stateEl) stateEl.textContent = txt || ""; }

  function fmt(t) {
    if (!isFinite(t) || t < 0) return "0:00";
    var m = Math.floor(t / 60);
    var s = String(Math.floor(t % 60)).padStart(2, "0");
    return m + ":" + s;
  }

  /* ===== 把接口返回的一条数据统一成内部格式 ===== */
  function pickSong(item) {
    if (!item) return null;
    var id = item.id || item.songid || "";
    var name = item.name || item.title || item.songname || "";
    var artist = item.artist || item.author || item.singer || "";
    var cover = item.pic || item.cover || item.picture || "";
    var url = item.url || item.src || "";
    return { id: id, name: name, artist: artist, cover: cover, url: url };
  }

  /* ===== 渲染歌曲信息 ===== */
  function renderSong(song) {
    if (!song) return;
    if (titleEl) titleEl.textContent = song.name || "未知歌曲";
    if (artistEl) artistEl.textContent = song.artist || "";
    if (coverImg) {
      coverImg.src = song.cover || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23667eea'/%3E%3Cstop offset='50%25' stop-color='%23764ba2'/%3E%3Cstop offset='100%25' stop-color='%23f093fb'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='100' cy='100' r='100' fill='url(%23g)'/%3E%3Ccircle cx='100' cy='100' r='25' fill='%231a1a2e'/%3E%3Ccircle cx='100' cy='100' r='8' fill='%237cc6ff'/%3E%3C/svg%3E";
      coverImg.alt = (song.name || "") + " - " + (song.artist || "");
    }
    if (progressFill) progressFill.style.width = "0%";
    if (progressBuffer) progressBuffer.style.width = "0%";
    if (progressThumb) progressThumb.style.left = "0%";
    if (timeNow) timeNow.textContent = "0:00";
    if (timeTotal) timeTotal.textContent = "0:00";
  }

  /* ===== 加载并播放 ===== */
  function loadAndPlay(song) {
    if (!song) return;

    // 没有直链就先补一次
    function begin() {
      if (!song.url) {
        showError("这首歌拿不到音频地址");
        return;
      }

      renderSong(song);
      setState("加载中…");
      audio.src = song.url;

      // 换封面主色（只做一次）
      if (window.Glass && coverImg && coverImg.complete) {
        window.Glass.extractColor(coverImg, function (color) {
          window.Glass.applyMood(color, document.getElementById("bg"), [
            document.querySelector(".bg-blob--a"),
            document.querySelector(".bg-blob--b")
          ]);
        });
      }

      var p = audio.play();
      if (p && p.catch) {
        p.then(function () { setState(""); })
         .catch(function (err) {
           showError("音频无法播放，可能是防盗链或跨域限制");
         });
      }
    }

    if (song.url) {
      begin();
    } else if (window.MetingAPI && song.id) {
      window.MetingAPI.url("netease", song.id)
        .then(function (u) {
          song.url = u || "";
          begin();
        })
        .catch(function () { begin(); });
    } else {
      begin();
    }
  }

  function nextTrack() {
    if (!queue.length) return;
    index = (index + 1) % queue.length;
    loadAndPlay(queue[index]);
  }

  function prevTrack() {
    if (!queue.length) return;
    index = (index - 1 + queue.length) % queue.length;
    loadAndPlay(queue[index]);
  }

  /* ===== 初始化：搜索 Boomerang — GRX ===== */
  function initQueue() {
    if (!window.MetingAPI) {
      setState("接口未加载");
      showError("播放接口未加载，请确认 script/api.js 已引入");
      return;
    }

    var keyword = ((DEFAULT_SONG.title || "") + " " + (DEFAULT_SONG.artist || "")).trim();
    setState("正在加载 " + DEFAULT_SONG.title + " — " + DEFAULT_SONG.artist + "…");

    window.MetingAPI.search(keyword)
      .then(function (list) {
        if (!list || !list.length) {
          showError("找不到《" + DEFAULT_SONG.title + "》，可尝试用搜索框换一首");
          setState("加载失败");
          return;
        }

        // 优先精确匹配
        var hit = null;
        for (var i = 0; i < list.length; i++) {
          var s = list[i];
          var nameMatch = s.name && s.name.toLowerCase().indexOf(DEFAULT_SONG.title.toLowerCase()) !== -1;
          var artistMatch = s.artist && s.artist.toLowerCase().indexOf(DEFAULT_SONG.artist.toLowerCase()) !== -1;
          if (nameMatch || artistMatch) { hit = s; break; }
        }

        var item = hit || list[0];
        var song = pickSong(item);
        if (!song) { showError("歌曲数据解析失败"); setState("加载失败"); return; }

        queue = [song];
        index = 0;
        setState("");
        loadAndPlay(song);
      })
      .catch(function (e) {
        showError("搜索失败：" + (e && e.message ? e.message : "未知错误"));
        setState("加载失败");
      });
  }

  /* ===== 事件绑定 ===== */

  on(playBtn, "click", function () {
    if (!audio) return;

    // 还没启动过：点 ▶ 才去搜索并播放
    if (!started) {
      started = true;
      initQueue();
      return;
    }

    // 已经在播放中：切暂停/继续
    if (queue.length && audio.src) {
      if (audio.paused) {
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        audio.pause();
      }
      return;
    }

    // 有队列但没 src：重新加载当前首
    if (queue.length) {
      loadAndPlay(queue[index === -1 ? 0 : index]);
    }
  });

  on(audio, "play", function () {
    if (playBtn) playBtn.classList.add("playing");
    var disc = document.getElementById("disc");
    if (disc) disc.classList.add("playing");
  });

  on(audio, "pause", function () {
    if (playBtn) playBtn.classList.remove("playing");
    var disc = document.getElementById("disc");
    if (disc) disc.classList.remove("playing");
  });

  on(audio, "timeupdate", function () {
    if (!audio.duration || isSeeking) return;
    var pct = (audio.currentTime / audio.duration) * 100;
    if (progressFill) progressFill.style.width = pct + "%";
    if (progressThumb) progressThumb.style.left = pct + "%";
    if (timeNow) timeNow.textContent = fmt(audio.currentTime);
  });

  on(audio, "progress", function () {
    if (!audio.duration || !audio.buffered.length) return;
    var b = audio.buffered.end(audio.buffered.length - 1) / audio.duration * 100;
    if (progressBuffer) progressBuffer.style.width = b + "%";
  });

  on(audio, "loadedmetadata", function () {
    if (timeTotal) timeTotal.textContent = fmt(audio.duration);
  });

  on(audio, "ended", function () { nextTrack(); });

  on(audio, "error", function () {
    showError("音频加载出错，自动换歌");
    nextTrack();
  });

  /* ===== 进度条拖动 =====
   * 只在按下时绑定，松手立即解绑，不累积监听器
   */
  var seekRect = null;

  function seekFromEvent(clientX) {
    if (!audio.duration || !seekRect) return;
    var ratio = (clientX - seekRect.left) / seekRect.width;
    ratio = Math.min(1, Math.max(0, ratio));
    audio.currentTime = ratio * audio.duration;
    if (progressFill) progressFill.style.width = (ratio * 100) + "%";
    if (progressThumb) progressThumb.style.left = (ratio * 100) + "%";
  }

  function onPointerMove(e) {
    var cx = e.clientX;
    if (cx === undefined && e.touches && e.touches[0]) cx = e.touches[0].clientX;
    seekFromEvent(cx);
  }

  function onPointerUp() {
    isSeeking = false;
    if (progressBar) progressBar.classList.remove("dragging");
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("mousemove", onPointerMove);
    window.removeEventListener("mouseup", onPointerUp);
    window.removeEventListener("touchmove", onPointerMove);
    window.removeEventListener("touchend", onPointerUp);
  }

  function onPointerDown(e) {
    if (!progressBar || !audio.duration) return;
    isSeeking = true;
    seekRect = progressBar.getBoundingClientRect();
    if (progressBar) progressBar.classList.add("dragging");

    var cx = e.clientX;
    if (cx === undefined && e.touches && e.touches[0]) cx = e.touches[0].clientX;
    seekFromEvent(cx);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);
  }

  if (progressBar) {
    progressBar.addEventListener("pointerdown", onPointerDown);
    progressBar.addEventListener("mousedown", onPointerDown);
    progressBar.addEventListener("touchstart", onPointerDown, { passive: true });
  }

  on(prevBtn, "click", function () { prevTrack(); });
  on(nextBtn, "click", function () { nextTrack(); });

  on(refreshBtn, "click", function () {
    index = -1;
    queue = [];
    started = false;
    initQueue();
  });

  /* ===== 搜索 ===== */
  function doSearch() {
    if (!searchInput || !window.MetingAPI) return;
    var kw = searchInput.value.trim();
    if (!kw) return;

    setState("搜索中…");
    if (searchResult) searchResult.innerHTML = "";

    window.MetingAPI.search(kw)
      .then(function (items) {
        setState("");
        if (!items || !items.length) {
          if (searchResult) searchResult.innerHTML = '<div class="search-empty">没有结果</div>';
          return;
        }

        var songs = items.map(pickSong).filter(function (s) { return s && s.name; });

        if (!songs.length) {
          if (searchResult) searchResult.innerHTML = '<div class="search-empty">没有结果</div>';
          return;
        }

        var html = "";
        for (var i = 0; i < songs.length; i++) {
          var s = songs[i];
          html += '<div class="search-item" data-idx="' + i + '">' +
                  '<img src="' + (s.cover || "") + '" alt="" onerror="this.style.display=\'none\'">' +
                  '<div class="search-meta">' +
                    '<b>' + s.name + '</b>' +
                    '<span>' + s.artist + '</span>' +
                  '</div>' +
                  '<span class="search-add">播放</span>' +
                  '</div>';
        }
        if (searchResult) {
          searchResult.innerHTML = html;
          searchResult.style.display = "block";
        }

        var listItems = searchResult ? searchResult.querySelectorAll(".search-item") : [];
        for (var j = 0; j < listItems.length; j++) {
          (function (song) {
            listItems[j].addEventListener("click", function () {
              started = true;
              queue = [song].concat(queue.filter(function (s) { return s.id !== song.id; }));
              index = -1;
              loadAndPlay(song);
              if (searchResult) searchResult.style.display = "none";
              searchInput.value = "";
            });
          })(songs[j]);
        }
      })
      .catch(function (e) {
        setState("");
        if (searchResult) searchResult.innerHTML = '<div class="search-empty">搜索失败</div>';
      });
  }

  on(searchBtn, "click", doSearch);
  if (searchInput) {
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") doSearch();
    });
  }

  document.addEventListener("click", function (e) {
    if (!searchResult) return;
    if (e.target.closest && e.target.closest("#searchInput")) return;
    if (e.target.closest && e.target.closest("#searchBtn")) return;
    if (e.target.closest && e.target.closest("#searchResult")) return;
    searchResult.style.display = "none";
  });

  document.addEventListener("keydown", function (e) {
    if (e.target && e.target.tagName === "INPUT") return;
    if (e.code === "Space") {
      e.preventDefault();
      if (playBtn) playBtn.click();
    } else if (e.code === "ArrowRight") {
      nextTrack();
    } else if (e.code === "ArrowLeft") {
      prevTrack();
    }
  });

  if (!$("audio")) {
    audio.id = "audio";
    audio.style.display = "none";
    document.body.appendChild(audio);
  }

  // 初始待机界面：不请求接口、不自动播放
  renderSong({
    name: "还没有在播放",
    artist: DEFAULT_SONG.title + " — " + DEFAULT_SONG.artist,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23667eea'/%3E%3Cstop offset='50%25' stop-color='%23764ba2'/%3E%3Cstop offset='100%25' stop-color='%23f093fb'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='100' cy='100' r='100' fill='url(%23g)'/%3E%3Ccircle cx='100' cy='100' r='25' fill='%231a1a2e'/%3E%3Ccircle cx='100' cy='100' r='8' fill='%237cc6ff'/%3E%3C/svg%3E"
  });
  if (stateEl) stateEl.textContent = "默认：" + DEFAULT_SONG.title + " — " + DEFAULT_SONG.artist;
})();
