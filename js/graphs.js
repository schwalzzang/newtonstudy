// 실시간 미니 그래프 (속도, 에너지)
export class MiniChart {
  constructor(canvas, series) {
    // series: [{key, color}]
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.series = series;
    this.reset();
  }
  reset() {
    this.data = this.series.map(() => []);
    this.max = 1;
    this.draw();
  }
  push(values) {
    values.forEach((v, i) => {
      this.data[i].push(v);
      if (this.data[i].length > 300) this.data[i].shift();
      if (v > this.max) this.max = v;
    });
  }
  draw() {
    const { ctx, cv } = this;
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#242b3b'; ctx.lineWidth = 1;
    for (let gy = h / 4; gy < h; gy += h / 4) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }
    this.series.forEach((s, i) => {
      const d = this.data[i];
      if (d.length < 2) return;
      ctx.strokeStyle = s.color; ctx.lineWidth = 2;
      ctx.beginPath();
      d.forEach((v, j) => {
        const x = (j / 299) * w;
        const y = h - 4 - (v / this.max) * (h - 10);
        j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }
}
