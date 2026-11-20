/* Student-code gate for Jennifer's SAT vocabulary site.
   Every page is an empty shell; the real page and its data are encrypted and open only after a valid student code
   (the same code, and the same sign-in, as the SAT Vocab phone app). The config below is filled in by tools/protect/build.js. */
(function () {
  "use strict";
  var C = __CONFIG__, me = document.currentScript, page = me.dataset.p, sample = me.dataset.s === "1", pv = me.dataset.v;
  var LS = {
    get: function (k) { try { return JSON.parse(localStorage.getItem("sva." + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem("sva." + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem("sva." + k); } catch (e) {} }
  };
  function device() { var d = LS.get("device"); if (!d) { d = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); LS.set("device", d); } return d; }
  function b64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function api(body) {
    return fetch(C.api, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body), redirect: "follow" }).then(function (r) { return r.json(); });
  }
  function opener(keyB64) {
    var kp = crypto.subtle.importKey("raw", b64(keyB64), "AES-GCM", false, ["decrypt"]);
    return function (path) {
      return Promise.all([kp, fetch(path).then(function (r) { if (!r.ok) throw new Error("missing " + path); return r.arrayBuffer(); })]).then(function (x) {
        var buf = new Uint8Array(x[1]);
        return crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, x[0], buf.slice(12));
      }).then(function (plain) { return new TextDecoder().decode(plain); });
    };
  }
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  function open(keyB64, dir, who) {
    var get = opener(keyB64);
    return get(dir + "p/" + page + ".bin?v=" + pv).then(function (html) {
      var tags = [], re = /<script data-e="([^"]+)" data-h="([^"]+)"><\/script>/g, m;
      while ((m = re.exec(html))) tags.push(m);
      var jobs = tags.map(function (t) { return get(dir + t[1] + ".bin?v=" + t[2]); });
      jobs.push(get(dir + "_img.bin?v=" + C.img[sample ? 1 : 0]));
      return Promise.all(jobs).then(function (codes) {
        var imgs = codes.pop();
        tags.forEach(function (t, i) { html = html.replace(t[0], function () { return "<script>" + codes[i].replace(/<\/script/gi, "<\\/script") + "</" + "script>"; }); });
        // Pictures are stored under unguessable names; images/<zone>/<word>.webp is translated when a page sets it.
        var pre = "<script>(function(){var M=" + imgs + ";var d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');" +
          "Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:true,enumerable:true,get:function(){return d.get.call(this);}," +
          "set:function(v){var m=/^images\\/(.+?)\\.webp/.exec(String(v));d.set.call(this,m&&M[m[1]]?'i/'+M[m[1]]+'.webp':v);}});})();</" + "script>";
        var bar = sample
          ? '<div id="svaBar" style="position:sticky;top:0;z-index:9999;background:#f2a33a;color:#3a2500;font:600 14px/1.4 system-ui,sans-serif;padding:8px 12px;text-align:center">試閱版 Sample · ' + esc(C.sampleLabel) + ' ｜ 完整內容請向 Jennifer 老師索取學生代碼 <a href="index.html" style="color:#1f3a5f;margin-left:6px">輸入代碼登入 ›</a></div>'
          : '<div id="svaBar" style="position:fixed;left:8px;bottom:8px;z-index:9999;background:rgba(31,58,95,.9);color:#fff;font:12px/1.3 system-ui,sans-serif;padding:5px 10px;border-radius:999px">👤 ' + esc(who || "") + ' · <a href="#" id="svaOut" style="color:#ffd28a">登出</a></div>';
        html = html.replace(/<head[^>]*>/i, function (h) { return h + '<meta name="robots" content="noindex,nofollow">' + pre; }).replace(/<body[^>]*>/i, function (b) { return b + bar; });
        document.open(); document.write(html); document.close();
        var out = document.getElementById("svaOut");
        if (out) out.onclick = function (e) { e.preventDefault(); if (confirm("確定登出？")) { LS.del("auth"); location.reload(); } };
      });
    });
  }

  function login(msg) {
    document.title = "SAT Vocab — 學生登入";
    document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f3f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Microsoft JhengHei,sans-serif;padding:24px;box-sizing:border-box">' +
      '<div style="max-width:380px;width:100%;background:#fff;border-radius:20px;padding:32px 26px;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.08)">' +
      '<div style="width:84px;height:84px;border-radius:22px;background:#1f3a5f;color:#fff;font-weight:800;font-size:24px;line-height:1.05;display:flex;flex-direction:column;justify-content:center;margin:0 auto 14px">SAT<span style="font-size:11px;letter-spacing:.2em;color:#f2a33a">VOCAB</span></div>' +
      '<h1 style="font-size:20px;margin:0 0 6px;color:#1c2533">Jennifer 老師 SAT 單字</h1><p style="margin:0 0 16px;color:#6b7686;font-size:14px">請輸入老師給你的學生代碼<br>（和手機 app 是同一組）</p>' +
      '<input id="svaCode" maxlength="12" autocomplete="off" autocapitalize="characters" placeholder="學生代碼" style="width:100%;box-sizing:border-box;font-size:22px;font-weight:700;letter-spacing:.2em;text-align:center;text-transform:uppercase;padding:12px;border:2px solid #e1e6ee;border-radius:12px;outline:none">' +
      '<button id="svaGo" style="width:100%;margin-top:12px;padding:13px;border:0;border-radius:12px;background:#1f3a5f;color:#fff;font-size:16px;font-weight:700;cursor:pointer">登入</button>' +
      '<p id="svaErr" style="color:#d9483b;min-height:1.4em;font-size:14px;margin:10px 0 0">' + esc(msg || "") + '</p>' +
      '<p style="margin:18px 0 6px;color:#6b7686;font-size:13px">還沒有代碼？先看試閱內容：</p><p style="margin:0;font-size:14px;line-height:2">' +
      C.samples.map(function (s) { return '<a href="' + s[0] + '" style="color:#0b6bcb;margin:0 6px;white-space:nowrap">' + esc(s[1]) + '</a>'; }).join("") + '</p>' +
      '<p style="color:#95a1b3;font-size:12px;margin:18px 0 0">本網站內容僅供 Jennifer 老師的學生使用。<br>每組代碼限本人使用，請勿外流。</p></div></div>';
    var input = document.getElementById("svaCode"), err = document.getElementById("svaErr");
    function go() {
      var code = input.value.trim().toUpperCase(); if (!code) return;
      err.textContent = "驗證中…";
      api({ action: "login", code: code, device: device() }).then(function (res) {
        if (!res.ok) { err.textContent = { invalid: "代碼不正確。", inactive: "這組代碼已停用，請聯絡老師。", devices: "這組代碼已在其他裝置使用，達到上限。請聯絡老師。" }[res.error] || "登入失敗，請再試一次。"; return; }
        LS.set("auth", { code: code, device: device(), name: res.name, cls: res.cls, key: res.key, lastOk: Date.now() });
        if (res.state && !localStorage.getItem("sva.words")) LS.set("pending", res.state);   // the phone app picks this up if it is opened in this browser
        LS.set("siteCheck", Date.now()); location.reload();
      }).catch(function () { err.textContent = "無法連線，請檢查網路。"; });
    }
    document.getElementById("svaGo").onclick = go;
    input.onkeydown = function (e) { if (e.key === "Enter") go(); };
    input.focus();
  }

  function recheck(auth) {                           // a code the teacher switched off stops working within a few hours
    if (Date.now() - (LS.get("siteCheck") || 0) < 6 * 3600e3) return;
    api({ action: "sync", code: auth.code, device: auth.device }).then(function (res) {
      if (res.ok) { LS.set("siteCheck", Date.now()); auth.lastOk = Date.now(); LS.set("auth", auth); }
      else if (["invalid", "inactive", "device"].indexOf(res.error) >= 0) { LS.del("auth"); location.reload(); }
    }).catch(function () {});
  }

  function fail(text) { document.body.innerHTML = '<p style="font:16px system-ui;padding:40px;text-align:center">' + text + '<br><br><a href="">重新整理</a></p>'; }
  if (!window.crypto || !crypto.subtle) return fail("這個瀏覽器無法開啟本網站，請改用 Chrome、Safari 或 Edge。");
  document.body.insertAdjacentHTML("beforeend", '<p id="svaWait" style="font:15px system-ui;color:#6b7686;text-align:center;padding-top:30vh">載入中…</p>');
  if (sample) return void open(C.sampleKey, "s/").catch(function () { fail("載入失敗。"); });
  var auth = LS.get("auth");
  if (!auth || !auth.key) return login();
  open(auth.key, "e/", auth.name).then(function () { recheck(auth); }).catch(function (e) {
    if (e && /missing/.test(e.message)) return fail("載入失敗，請檢查網路。");
    LS.del("auth"); login("請重新登入。");          // the content key changed
  });
})();
