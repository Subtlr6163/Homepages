/**
 * 全局配置（只改这一个文件）
 *
 * 音乐源：Meting API
 *   https://meting.spr-aachen.com/api?server=[netease|tencent|ytmusic|spotify]
 *                                   &type=[lrc|url|pic|song|playlist|artist|search]
 *                                   &id=[歌曲id/歌单id/搜索词]
 *
 * 改歌：把 DEFAULT_SONG.title / artist 换成你要的歌
 *   - 页面打开后只显示播放器面板，不会自动请求接口、不会自动播放
 *   - 点 ▶ 才开始请求并播放
 *   - 若 AUTO_PLAY = true，则打开页面就自动请求并播放
 */

window.APP_CONFIG = {
  // 主接口地址
  API_BASE: "https://meting.spr-aachen.com",

  // 备用接口（可选）
  API_SOURCES: [],

  // 搜索使用的平台（tencent 不支持搜索，只用 netease）
  SEARCH_SERVERS: ["netease"],

  // 默认歌曲：打开页面后只显示在这里，不自动播放
  // 换歌就改这两行
  DEFAULT_SONG: {
    title: "Boomerang",
    artist: "GRX"
  },

  // true  = 打开页面就自动搜索并播放（需联网且接口可用）
  // false = 默认只显示面板，点 ▶ 才开始播放（推荐）
  AUTO_PLAY: false,

  // 一言接口源（可替换为你自己能用的节点）
  HITOKOTO_SOURCES: [
    "https://v1.hitokoto.cn/?c=d&c=k&c=i&encode=json",
    "https://international.v1.hitokoto.cn/?c=d&c=k&c=i&encode=json",
    "https://v1.apizero.cn/api/hitokoto?format=json"
  ],

  PLAYLIST_ID: null
};
