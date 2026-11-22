// Small Sinkhorn demo for the home page: balances a 12x12 Gibbs kernel
// toward two fixed marginals and draws the transport plan as a heatmap.
// Animates once on load (skipped under prefers-reduced-motion), then rests.
(function () {
  var canvas = document.getElementById("sinkhorn-canvas");
  var caption = document.getElementById("sinkhorn-caption");
  if (!canvas || !canvas.getContext) return;

  var n = 12, eps = 0.05, steps = 14;

  function bump(c, w) {
    var x = [], s = 0;
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var v = 0.15 + Math.exp(-Math.pow((t - c) / w, 2));
      x.push(v); s += v;
    }
    return x.map(function (v) { return v / s; });
  }
  var a = bump(0.3, 0.22);   // source marginal
  var b = bump(0.68, 0.3);   // target marginal

  var K = [];
  for (var i = 0; i < n; i++) {
    K.push([]);
    for (var j = 0; j < n; j++) {
      var d = (i - j) / (n - 1);
      K[i].push(Math.exp(-(d * d) / eps));
    }
  }

  // Precompute plans for k = 0..steps so drawing is cheap.
  var plans = [], errs = [];
  var u = new Array(n).fill(1), v = new Array(n).fill(1);
  function plan() {
    var P = [], err = 0;
    for (var i = 0; i < n; i++) {
      P.push([]); var row = 0;
      for (var j = 0; j < n; j++) { var p = u[i] * K[i][j] * v[j]; P[i].push(p); row += p; }
      err += Math.abs(row - a[i]);
    }
    return { P: P, err: err };
  }
  for (var k = 0; k <= steps; k++) {
    if (k > 0) {
      for (var i2 = 0; i2 < n; i2++) { var s = 0; for (var j2 = 0; j2 < n; j2++) s += K[i2][j2] * v[j2]; u[i2] = a[i2] / s; }
      for (var j3 = 0; j3 < n; j3++) { var t = 0; for (var i3 = 0; i3 < n; i3++) t += K[i3][j3] * u[i3]; v[j3] = b[j3] / t; }
    }
    var r = plan();
    if (k === 0) { // show the raw kernel, scaled to total mass 1
      var tot = 0; r.P.forEach(function (row) { row.forEach(function (p) { tot += p; }); });
      r.P = r.P.map(function (row) { return row.map(function (p) { return p / tot; }); });
      r.err = 0; r.P.forEach(function (row, i4) { var rs = row.reduce(function (x, y) { return x + y; }, 0); r.err += Math.abs(rs - a[i4]); });
    }
    plans.push(r.P); errs.push(r.err);
  }

  function token(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function draw(k) {
    var dpr = window.devicePixelRatio || 1;
    var size = canvas.clientWidth || 176;
    canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = token("--card-background") || "#fff"; ctx.fillRect(0, 0, size, size);
    var P = plans[k], max = 0;
    P.forEach(function (row) { row.forEach(function (p) { if (p > max) max = p; }); });
    var cell = size / n;
    ctx.fillStyle = token("--accent-color") || "#34495e";
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      ctx.globalAlpha = Math.pow(P[i][j] / max, 0.7);
      ctx.fillRect(j * cell + 0.5, i * cell + 0.5, cell - 1, cell - 1);
    }
    ctx.globalAlpha = 1;
    if (caption) caption.textContent = "Sinkhorn, k = " + k + "\n‖P1 − a‖₁ = " + errs[k].toExponential(1);
  }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var current = steps;
  draw(current);
  if (!reduce) {
    current = 0; draw(0);
    var timer = setInterval(function () {
      current++; draw(current);
      if (current >= steps) clearInterval(timer);
    }, 260);
  }
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var redraw = function () { draw(current); };
    if (mq.addEventListener) mq.addEventListener("change", redraw);
  }
  window.addEventListener("resize", function () { draw(current); });
})();
