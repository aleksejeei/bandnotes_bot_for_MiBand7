/**
 * Build with ZMake tool
 */

(() => {
  // lib/fs.js
  var FsUtils = class {
    static writeText(fn, data) {
      if (!fn.startsWith("/storage"))
        fn = FsUtils.fullPath(fn);
      try {
        hmFS.remove(fn);
      } catch (e) {
      }
      const buffer = FsUtils.strToUtf8(data);
      const f = FsUtils.open(fn, hmFS.O_WRONLY | hmFS.O_CREAT);
      hmFS.write(f, buffer, 0, buffer.byteLength);
      hmFS.close(f);
    }
    static read(fn, limit = false) {
      if (!fn.startsWith("/storage"))
        fn = FsUtils.fullPath(fn);
      const [st, e] = FsUtils.stat(fn);
      const f = FsUtils.open(fn, hmFS.O_RDONLY);
      const size = limit ? limit : st.size;
      const data = new ArrayBuffer(size);
      hmFS.read(f, data, 0, size);
      hmFS.close(f);
      return data;
    }
    static fetchTextFile(fn, limit = false) {
      const data = FsUtils.read(fn, limit);
      const view = new Uint8Array(data);
      let str = "";
      return FsUtils.Utf8ArrayToStr(view);
    }
    static stat(path) {
      path = FsUtils.fixPath(path);
      return hmFS.stat_asset(path);
    }
    static fixPath(path) {
      if (path.startsWith("/storage")) {
        const statPath = "../../../" + path.substring(9);
        return statPath;
      }
      return path;
    }
    static open(path, m) {
      if (path.startsWith("/storage")) {
        const statPath = "../../../" + path.substring(9);
        return hmFS.open_asset(statPath, m);
      }
      return hmFS.open(path, m);
    }
    static fetchJSON(fn) {
      const text = FsUtils.fetchTextFile(fn);
      return JSON.parse(text);
    }
    static copy(source, dest) {
      try {
        hmFS.remove(dest);
      } catch (e) {
      }
      const buffer = FsUtils.read(source);
      const f = FsUtils.open(dest, hmFS.O_WRONLY | hmFS.O_CREAT);
      hmFS.write(f, buffer, 0, buffer.byteLength);
      hmFS.close(f);
    }
    static isFolder(path) {
      const [st, e] = FsUtils.stat(path);
      return (st.mode & 32768) == 0;
    }
    static getSelfPath() {
      if (!FsUtils.selfPath) {
        const pkg = hmApp.packageInfo();
        const idn = pkg.appId.toString(16).padStart(8, "0").toUpperCase();
        return "/storage/js_" + pkg.type + "s/" + idn;
      }
      return FsUtils.selfPath;
    }
    static fullPath(path) {
      return FsUtils.getSelfPath() + "/assets/" + path;
    }
    static rmTree(path) {
      if (!path.startsWith("/storage"))
        path = FsUtils.fullPath(path);
      const [files, e] = hmFS.readdir(path);
      for (let i in files) {
        FsUtils.rmTree(path + "/" + files[i]);
      }
      hmFS.remove(path);
    }
    static copyTree(source, dest, removeSource) {
      if (!source.startsWith("/storage"))
        source = FsUtils.fullPath(source);
      if (!dest.startsWith("/storage"))
        dest = FsUtils.fullPath(dest);
      if (!FsUtils.isFolder(source)) {
        console.log("copy", source, "->", dest);
        FsUtils.copy(source, dest);
      } else {
        const [files, e] = hmFS.readdir(source);
        hmFS.mkdir(dest);
        for (let i in files) {
          FsUtils.copyTree(source + "/" + files[i], dest + "/" + files[i], removeSource);
        }
      }
      if (removeSource) {
        console.log("Delete", source);
        hmFS.remove(source);
      }
    }
    static sizeTree(path) {
      if (!path.startsWith("/storage"))
        path = FsUtils.fullPath(path);
      const [files, e] = hmFS.readdir(path);
      let value = 0;
      for (let fn in files) {
        const file = path + "/" + files[fn];
        const statPath = "../../../" + file.substring(9);
        const [st, e2] = hmFS.stat_asset(statPath);
        value += st.size ? st.size : FsUtils.sizeTree(file);
      }
      return value;
    }
    // https://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
    static strToUtf8(str) {
      var utf8 = [];
      for (var i = 0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 128)
          utf8.push(charcode);
        else if (charcode < 2048) {
          utf8.push(
            192 | charcode >> 6,
            128 | charcode & 63
          );
        } else if (charcode < 55296 || charcode >= 57344) {
          utf8.push(
            224 | charcode >> 12,
            128 | charcode >> 6 & 63,
            128 | charcode & 63
          );
        } else {
          i++;
          charcode = 65536 + ((charcode & 1023) << 10 | str.charCodeAt(i) & 1023);
          utf8.push(
            240 | charcode >> 18,
            128 | charcode >> 12 & 63,
            128 | charcode >> 6 & 63,
            128 | charcode & 63
          );
        }
      }
      return new Uint8Array(utf8).buffer;
    }
    // source: https://stackoverflow.com/questions/13356493/decode-utf-8-with-javascript
    static Utf8ArrayToStr(array) {
      var out, i, len, c;
      var char2, char3;
      out = "";
      len = array.length;
      i = 0;
      while (i < len) {
        c = array[i++];
        switch (c >> 4) {
          case 0:
          case 1:
          case 2:
          case 3:
          case 4:
          case 5:
          case 6:
          case 7:
            out += String.fromCharCode(c);
            break;
          case 12:
          case 13:
            char2 = array[i++];
            out += String.fromCharCode(
              (c & 31) << 6 | char2 & 63
            );
            break;
          case 14:
            char2 = array[i++];
            char3 = array[i++];
            out += String.fromCharCode(
              (c & 15) << 12 | (char2 & 63) << 6 | (char3 & 63) << 0
            );
            break;
        }
      }
      return out;
    }
    static printBytes(val) {
      if (this.fsUnitCfg === void 0)
        this.fsUnitCfg = hmFS.SysProGetBool("mmk_tb_fs_unit");
      const options = this.fsUnitCfg ? ["B", "KiB", "MiB"] : ["B", "KB", "MB"];
      const base = this.fsUnitCfg ? 1024 : 1e3;
      let curr = 0;
      while (val > 800 && curr < options.length) {
        val = val / base;
        curr++;
      }
      return Math.round(val * 100) / 100 + " " + options[curr];
    }
  };

  // lib/touch.js
  var TouchEventManager = class {
    ontouch = null;
    onlongtouch = null;
    onlongtouchrepeatly = null;
    ontouchdown = null;
    ontouchup = null;
    ontouchmove = null;
    constructor(widget) {
      this._init(widget);
    }
    _init(widget) {
      let handleClick = true;
      let timerLongTap = -1;
      widget.addEventListener(hmUI.event.CLICK_UP, (e) => {
        if (this.ontouchup)
          this.ontouchup(e);
        if (handleClick && this.ontouch)
          this.ontouch(e);
        handleClick = false;
        timer.stopTimer(timerLongTap);
      });
      widget.addEventListener(hmUI.event.CLICK_DOWN, (e) => {
        if (this.ontouchdown)
          this.ontouchdown(e);
        handleClick = true;
        timerLongTap = timer.createTimer(750, 150, () => {
          if (handleClick && this.onlongtouch) {
            this.onlongtouch(e);
            handleClick = false;
          }
          if (this.onlongtouchrepeatly)
            this.onlongtouchrepeatly(e);
        });
      });
      widget.addEventListener(hmUI.event.MOVE, (e) => {
        if (this.ontouchmove)
          this.ontouchmove(e);
        handleClick = false;
        timer.stopTimer(timerLongTap);
      });
    }
  };

  // lib/ui.styles.js
  var UI_WIDTH = 192;
  var UI_HEIGHT = 490;
  var UI_ROUND_ZONE_HEIGHT = 96;
  var UI_CORNER_RADIUS = 16;
  var UI_VERTICAL_SPACING = 12;
  var UI_CONTROL_HEIGHT = 64;
  var UI_TITLE_FONT_SIZE = 24;
  var UI_SUBTITLE_FONT_SIZE = 20;
  var UI_PRIMARY_FOREGROUND = 16777215;
  var UI_SECONDARY_FOREGROUND = 12698049;
  var UI_SECONDARY_BACKGROUND = 1842204;
  var UI_TITLE_TEXT_STYLE = {
    text_size: UI_TITLE_FONT_SIZE,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.BOTTOM,
    color: UI_PRIMARY_FOREGROUND
  };
  var UI_SUBTITLE_TEXT_STYLE = {
    text_size: UI_SUBTITLE_FONT_SIZE,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V,
    color: UI_SECONDARY_FOREGROUND
  };
  var UI_HEADER_GROUP_WIDGET_STYLE = {
    h: UI_ROUND_ZONE_HEIGHT,
    w: UI_WIDTH,
    x: 0,
    y: 0
  };
  var UI_HEADER_TITLE_W_SUB_DIMENS_STYLE = {
    w: UI_WIDTH,
    h: UI_ROUND_ZONE_HEIGHT - UI_SUBTITLE_FONT_SIZE,
    x: 0,
    y: 0
  };
  var UI_HEADER_SUBTITLE_DIMENS_STYLE = {
    w: UI_WIDTH,
    h: UI_SUBTITLE_FONT_SIZE,
    x: 0,
    y: UI_HEADER_TITLE_W_SUB_DIMENS_STYLE.h
  };
  var UI_HEADER_TITLE_FULL_WIDGET_STYLE = {
    ...UI_TITLE_TEXT_STYLE,
    ...UI_HEADER_TITLE_W_SUB_DIMENS_STYLE
  };
  var UI_HEADER_SUBTITLE_WIDGET_STYLE = {
    ...UI_SUBTITLE_TEXT_STYLE,
    ...UI_HEADER_SUBTITLE_DIMENS_STYLE
  };
  var UI_HEADER_TITLE_ONLY_WIDGET_STYLE = {
    ...UI_TITLE_TEXT_STYLE,
    ...UI_HEADER_GROUP_WIDGET_STYLE
  };
  var UI_SIMPLELIST_TEXT_VIEW_STYLE = {
    x: 0,
    y: 0,
    w: UI_WIDTH,
    h: UI_CONTROL_HEIGHT,
    key: "name",
    color: UI_PRIMARY_FOREGROUND,
    text_size: UI_TITLE_FONT_SIZE
  };
  var UI_SIMPLELIST_CONTROL_STYLE = {
    type_id: 1,
    item_bg_color: UI_SECONDARY_BACKGROUND,
    item_bg_radius: UI_CORNER_RADIUS,
    text_view: [UI_SIMPLELIST_TEXT_VIEW_STYLE],
    text_view_count: 1,
    item_height: UI_CONTROL_HEIGHT
  };
  var UI_SIMPLELIST_CONTROL_SETTINGS = {
    item_space: UI_VERTICAL_SPACING,
    item_config: [UI_SIMPLELIST_CONTROL_STYLE],
    item_config_count: 1
  };
  var UI_SIMPLELIST_DIMENS_STYLE = ({ paddingTop, paddingBottom }) => ({
    x: paddingTop,
    y: 96 + paddingTop,
    h: UI_HEIGHT - UI_ROUND_ZONE_HEIGHT - paddingTop - paddingBottom,
    w: 192
  });
  var UI_ICON_56_SIZES = {
    w: 56,
    h: 56
  };
  var UI_ICON_56_TOP_DIMENS = {
    x: 68,
    y: 26,
    ...UI_ICON_56_SIZES
  };
  var UI_ICON_56_BOTTOM_DIMENS = {
    x: 0,
    y: UI_HEIGHT - UI_ROUND_ZONE_HEIGHT,
    w: UI_WIDTH,
    h: UI_ROUND_ZONE_HEIGHT,
    color: UI_SECONDARY_BACKGROUND
  };
  var UI_ASSET_CANCEL_56 = "icons/cancel.png";
  var UI_ASSET_ACCEPT_56 = "icons/accept.png";
  var UI_ASSET_SETTINGS_56 = "icons/settings.png";

  // lib/ui.js
  function Header({
    title = "Title",
    subtitle,
    onBack
  }) {
    const group = hmUI.createWidget(hmUI.widget.GROUP, UI_HEADER_GROUP_WIDGET_STYLE);
    if (subtitle) {
      group.createWidget(hmUI.widget.TEXT, {
        ...UI_HEADER_TITLE_FULL_WIDGET_STYLE,
        text: title
      });
      group.createWidget(hmUI.widget.TEXT, {
        ...UI_HEADER_SUBTITLE_WIDGET_STYLE,
        text: subtitle
      });
      return group;
    }
    if (onBack) {
      group.createWidget(hmUI.widget.IMG, {
        x: 6,
        y: 70,
        w: 10,
        h: 18,
        src: "icons/chevron_back.png"
      });
      group.createWidget(hmUI.widget.TEXT, {
        ...UI_HEADER_TITLE_ONLY_WIDGET_STYLE,
        x: 16,
        w: 192 - 16,
        text: title
      });
      const tappable = group.createWidget(hmUI.widget.IMG, {
        x: 0,
        y: 0,
        w: 192,
        h: 96,
        src: ""
      });
      const touchManager = new TouchEventManager(tappable);
      touchManager.ontouch = onBack;
      return group;
    }
    group.createWidget(hmUI.widget.TEXT, {
      ...UI_HEADER_TITLE_ONLY_WIDGET_STYLE,
      text: title
    });
    return group;
  }
  function Bottom({ icon, onClick }) {
    let style = {
      text: "",
      click_func: onClick,
      ...UI_ICON_56_BOTTOM_DIMENS
    };
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      ...UI_ICON_56_BOTTOM_DIMENS
    });
    switch (icon) {
      case "settings":
        style.normal_src = UI_ASSET_SETTINGS_56;
        style.press_src = UI_ASSET_SETTINGS_56;
        break;
      case "cancel":
        style.normal_src = UI_ASSET_CANCEL_56;
        style.press_src = UI_ASSET_CANCEL_56;
        break;
      default:
        style.normal_src = UI_ASSET_ACCEPT_56;
        style.press_src = UI_ASSET_ACCEPT_56;
    }
    return hmUI.createWidget(hmUI.widget.BUTTON, style);
  }
  function SimpleList(list = [], onClick = (list2, index) => {
    console.log(index);
  }, paddingTop = 0, paddingBottom = 0) {
    return hmUI.createWidget(hmUI.widget.SCROLL_LIST, {
      ...UI_SIMPLELIST_DIMENS_STYLE({ paddingTop, paddingBottom }),
      ...UI_SIMPLELIST_CONTROL_SETTINGS,
      data_array: list,
      data_count: list.length,
      item_click_func: onClick,
      data_type_config: [{
        start: 0,
        end: list.length - 1,
        type_id: 1
      }],
      data_type_config_count: 1
    });
  }

  // page/IndexPage.js
  var IndexPage = class {
    openSettings() {
      hmApp.gotoPage({
        url: "page/SettingsPage"
      });
    }
    openNote(index) {
      hmApp.gotoPage({
        url: "page/NotePage",
        param: index
      });
    }
    start() {
      this.data = FsUtils.fetchJSON("notes.json");
      Header({
        title: "BandNotes"
      });
      SimpleList(this.data, (_, index) => {
        this.openNote(index);
      }, 0, 96);
      Bottom({ icon: "settings", onClick: () => {
        this.openSettings();
      } });
    }
  };
  var __$$app$$__ = __$$hmAppManager$$__.currentApp;
  __$$module$$__ = __$$app$$__.current;
  __$$module$$__.module = DeviceRuntimeCore.Page({
    onInit() {
      new IndexPage().start();
    }
  });
})();
