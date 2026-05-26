const state = {
  index: 0,
  slides: Array.from(document.querySelectorAll(".slide")),
  data: []
};

const colors = {
  ink: "#111144",
  paper: "#F4F1EC",
  warm: "#DAD1C8",
  blueSoft: "#9BACD8",
  orange: "#F98513",
  blue: "#223382",
  muted: "rgba(17, 17, 68, 0.62)"
};

const methodColors = new Map([
  ["Transit", "#223382"],
  ["Radial Velocity", "#F98513"],
  ["Microlensing", "#9BACD8"],
  ["Imaging", "#111144"],
  ["Transit Timing Variations", "#B9B2C8"],
  ["Eclipse Timing Variations", "#CDB9A7"],
  ["Orbital Brightness Modulation", "#B8C3DA"],
  ["Pulsar Timing", "#D9A36F"],
  ["Astrometry", "#A7A0B6"],
  ["Pulsation Timing Variations", "#CDC7BE"],
  ["Disk Kinematics", "#E0D8CF"]
]);

const ruMethod = new Map([
  ["Transit", "Транзит"],
  ["Radial Velocity", "Лучевая скорость"],
  ["Microlensing", "Микролинзирование"],
  ["Imaging", "Прямая съёмка"],
  ["Transit Timing Variations", "Вариации транзитов"],
  ["Eclipse Timing Variations", "Вариации затмений"],
  ["Orbital Brightness Modulation", "Орбитальная яркость"],
  ["Pulsar Timing", "Пульсарный тайминг"],
  ["Astrometry", "Астрометрия"],
  ["Pulsation Timing Variations", "Вариации пульсаций"],
  ["Disk Kinematics", "Кинематика диска"]
]);

const ruRadius = new Map([
  ["Earth-size 0.5–1.25", "Планеты земного размера"],
  ["Super-Earth 1.25–2", "Суперземли"],
  ["Neptune-like 2–6", "Нептуноподобные"],
  ["Gas giant 6–15", "Газовые гиганты"],
  ["<0.5 Earth radii", "Очень маленькие"],
  [">15 Earth radii", "Очень крупные"],
  ["Unknown", "Неизвестный размер"]
]);

const periodOrder = ["<3 days", "3–10 days", "10–50 days", "50–365 days", "1–10 years", ">10 years"];
const ruPeriod = new Map([
  ["<3 days", "меньше 3 дней"],
  ["3–10 days", "3–10 дней"],
  ["10–50 days", "10–50 дней"],
  ["50–365 days", "50–365 дней"],
  ["1–10 years", "1–10 лет"],
  [">10 years", "больше 10 лет"]
]);

const numberFormat = d3.format(",");
const ruFormat = value => numberFormat(value).replaceAll(",", " ");

function ruPlanetCount(value) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  let word = "планет";
  if (mod10 === 1 && mod100 !== 11) word = "планета";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "планеты";
  return `${ruFormat(value)} ${word}`;
}

function setupNavigation() {
  const track = document.querySelector("#track");
  const counter = document.querySelector("#counter");
  const prevBtn = document.querySelector("#prevBtn");
  const nextBtn = document.querySelector("#nextBtn");

  function render() {
    track.style.transform = `translateX(${-state.index * 100}vw)`;
    counter.textContent = `${String(state.index + 1).padStart(2, "0")} / ${String(state.slides.length).padStart(2, "0")}`;
    prevBtn.disabled = state.index === 0;
    nextBtn.disabled = state.index === state.slides.length - 1;
  }

  function go(delta) {
    state.index = Math.max(0, Math.min(state.slides.length - 1, state.index + delta));
    render();
  }

  prevBtn.addEventListener("click", () => go(-1));
  nextBtn.addEventListener("click", () => go(1));
  window.addEventListener("keydown", event => {
    if (event.key === "ArrowRight") go(1);
    if (event.key === "ArrowLeft") go(-1);
  });
  render();
}

function countBy(rows, key) {
  return Array.from(
    d3.rollup(rows, values => values.length, row => row[key] || "Unknown"),
    ([name, count]) => ({ name, count })
  );
}

function clearChart(selector) {
  d3.select(selector).selectAll("*").remove();
}

function chartSize(selector) {
  const node = document.querySelector(selector);
  const rect = node.getBoundingClientRect();
  return {
    width: Math.max(320, rect.width),
    height: Math.max(280, rect.height)
  };
}

function drawTimeline(rows) {
  clearChart("#timelineChart");
  const { width, height } = chartSize("#timelineChart");
  const margin = { top: 18, right: 20, bottom: 44, left: 52 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const methods = countBy(rows, "discoverymethod").sort((a, b) => b.count - a.count).map(d => d.name);
  const years = d3.range(
    d3.min(rows, d => d.disc_year_int),
    d3.max(rows, d => d.disc_year_int) + 1
  );

  const byYearMethod = d3.rollup(
    rows,
    values => values.length,
    row => row.disc_year_int,
    row => row.discoverymethod
  );

  const seriesInput = years.map(year => {
    const item = { year };
    methods.forEach(method => {
      item[method] = byYearMethod.get(year)?.get(method) || 0;
    });
    return item;
  });

  const stack = d3.stack().keys(methods).order(d3.stackOrderNone).offset(d3.stackOffsetNone);
  const series = stack(seriesInput);
  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, d3.max(series, layer => d3.max(layer, d => d[1]))]).nice().range([innerHeight, 0]);
  const area = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveMonotoneX);

  const svg = d3.select("#timelineChart").append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""))
    .call(group => group.select(".domain").remove());

  g.selectAll("path.area")
    .data(series)
    .join("path")
    .attr("class", "area")
    .attr("d", area)
    .attr("fill", d => methodColors.get(d.key) || "#DAD1C8")
    .attr("opacity", d => ["Transit", "Radial Velocity", "Microlensing", "Imaging"].includes(d.key) ? 0.9 : 0.48);

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(width < 700 ? 5 : 8));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(ruFormat));

  drawTimelineLegend(rows);
}

function drawTimelineLegend(rows) {
  const legend = d3.select("#timelineLegend");
  legend.selectAll("*").remove();
  const data = countBy(rows, "discoverymethod").sort((a, b) => b.count - a.count);
  const items = legend.selectAll(".legend-item").data(data).join("div").attr("class", "legend-item");
  items.append("span")
    .attr("class", "legend-swatch")
    .style("background", d => methodColors.get(d.name) || colors.warm);
  items.append("span").text(d => ruMethod.get(d.name) || d.name);
  items.append("span").attr("class", "legend-count").text(d => ruFormat(d.count));
}

function drawMethods(rows) {
  clearChart("#methodsChart");
  const { width, height } = chartSize("#methodsChart");
  const margin = { top: 10, right: 82, bottom: 26, left: width < 760 ? 150 : 230 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const data = countBy(rows, "discoverymethod").sort((a, b) => b.count - a.count);
  const y = d3.scaleBand().domain(data.map(d => d.name)).range([0, innerHeight]).padding(0.28);
  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).nice().range([0, innerWidth]);

  const svg = d3.select("#methodsChart").append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisBottom(x).ticks(5).tickSize(innerHeight).tickFormat(""))
    .call(group => group.select(".domain").remove());

  g.selectAll("line.lollipop")
    .data(data)
    .join("line")
    .attr("x1", 0)
    .attr("x2", d => x(d.count))
    .attr("y1", d => y(d.name) + y.bandwidth() / 2)
    .attr("y2", d => y(d.name) + y.bandwidth() / 2)
    .attr("stroke", d => methodColors.get(d.name) || colors.warm)
    .attr("stroke-width", 8)
    .attr("stroke-linecap", "round")
    .attr("opacity", 0.78);

  g.selectAll("circle.dot")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.count))
    .attr("cy", d => y(d.name) + y.bandwidth() / 2)
    .attr("r", 8)
    .attr("fill", d => methodColors.get(d.name) || colors.warm);

  g.selectAll("text.name")
    .data(data)
    .join("text")
    .attr("class", "tick-label")
    .attr("x", -14)
    .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "end")
    .text(d => ruMethod.get(d.name) || d.name);

  g.selectAll("text.value")
    .data(data)
    .join("text")
    .attr("class", "value-label")
    .attr("x", d => x(d.count) + 16)
    .attr("y", d => y(d.name) + y.bandwidth() / 2 + 5)
    .text(d => ruFormat(d.count));
}

function drawSizeGroups(rows) {
  clearChart("#sizeChart");
  const { width, height } = chartSize("#sizeChart");
  const counts = new Map(countBy(rows, "earth_radius_class").map(d => [d.name, d.count]));
  const isMobile = width < 820;
  // All planet diameters below are strict multiples of this Earth reference.
  const earthDiameter = isMobile
    ? Math.max(26, Math.min(34, width * 0.075))
    : Math.max(44, Math.min(56, width * 0.043));

  // Manual poster layout: positions are editorial, sizes are data-locked.
  const groups = [
    {
      key: "<0.5 Earth radii",
      label: "Очень маленькие",
      count: counts.get("<0.5 Earth radii") || 8,
      factor: 0.4,
      range: "0,4 R⊕",
      x: isMobile ? 0.20 : 0.30,
      y: isMobile ? 0.26 : 0.24,
      labelX: isMobile ? 0.24 : 0.33,
      labelY: isMobile ? 0.26 : 0.24,
      anchor: "start",
      fill: "url(#planetTiny)"
    },
    {
      key: "Earth-size 0.5–1.25",
      label: "Планеты земного размера",
      titleLines: ["Планеты земного", "размера"],
      count: counts.get("Earth-size 0.5–1.25") || 584,
      factor: 1,
      range: "1,0 R⊕",
      x: isMobile ? 0.56 : 0.56,
      y: isMobile ? 0.64 : 0.66,
      labelX: isMobile ? 0.64 : 0.56,
      labelY: isMobile ? 0.58 : 0.80,
      anchor: isMobile ? "start" : "end",
      fill: "url(#planetEarthLike)"
    },
    {
      key: "Super-Earth 1.25–2",
      label: "Суперземли",
      count: counts.get("Super-Earth 1.25–2") || 1203,
      factor: 1.6,
      range: "1,6 R⊕",
      x: isMobile ? 0.69 : 0.70,
      y: isMobile ? 0.80 : 0.80,
      labelX: isMobile ? 0.98 : 0.78,
      labelY: isMobile ? 0.80 : 0.80,
      anchor: isMobile ? "end" : "start",
      fill: "url(#planetSuper)"
    },
    {
      key: "Neptune-like 2–6",
      label: "Нептуноподобные",
      count: counts.get("Neptune-like 2–6") || 2359,
      factor: 2.7,
      range: "2,7 R⊕",
      x: isMobile ? 0.23 : 0.83,
      y: isMobile ? 0.56 : 0.58,
      labelX: isMobile ? 0.34 : 0.69,
      labelY: isMobile ? 0.49 : 0.51,
      anchor: isMobile ? "start" : "end",
      fill: "url(#planetNeptune)"
    },
    {
      key: "Gas giant 6–15",
      label: "Газовые гиганты",
      count: counts.get("Gas giant 6–15") || 1850,
      factor: 12.7,
      range: "12,7 R⊕",
      x: isMobile ? -0.18 : -0.04,
      y: isMobile ? 1.10 : 1.10,
      labelX: isMobile ? 0.28 : 0.30,
      labelY: isMobile ? 0.70 : 0.72,
      anchor: "start",
      fill: "url(#planetGiant)"
    },
    {
      key: ">15 Earth radii",
      label: "Очень крупные",
      count: counts.get(">15 Earth radii") || 236,
      factor: 16.8,
      range: "16,8 R⊕",
      x: isMobile ? 1.42 : 1.28,
      y: isMobile ? -0.30 : -0.28,
      labelX: isMobile ? 0.88 : 0.70,
      labelY: isMobile ? 0.11 : 0.18,
      anchor: "end",
      fill: "url(#planetLarge)"
    }
  ].map(d => ({
    ...d,
    titleLines: d.titleLines || [d.label],
    diameter: d.factor * earthDiameter,
    radius: d.factor * earthDiameter / 2
  }));

  const svg = d3.select("#sizeChart")
    .append("svg")
    .attr("class", "size-poster")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const defs = svg.append("defs");
  const noise = defs.append("filter").attr("id", "planetNoise").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
  noise.append("feTurbulence").attr("type", "fractalNoise").attr("baseFrequency", "0.85").attr("numOctaves", "3").attr("seed", "8").attr("result", "noise");
  noise.append("feColorMatrix").attr("type", "saturate").attr("values", "0");
  noise.append("feComponentTransfer")
    .append("feFuncA")
    .attr("type", "table")
    .attr("tableValues", "0 0.18");

  const halo = defs.append("filter").attr("id", "planetHalo").attr("x", "-35%").attr("y", "-35%").attr("width", "170%").attr("height", "170%");
  halo.append("feGaussianBlur").attr("stdDeviation", "12").attr("result", "blur");
  const merge = halo.append("feMerge");
  merge.append("feMergeNode").attr("in", "blur");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  const gradientStops = [
    ["planetTiny", [["0%", "#F98513", 0.88], ["52%", "#9BACD8", 0.78], ["100%", "#223382", 0.86]]],
    ["planetEarthLike", [["0%", "#F98513", 0.94], ["46%", "#DAD1C8", 0.76], ["100%", "#9BACD8", 0.9]]],
    ["planetSuper", [["0%", "#F98513", 0.84], ["42%", "#9BACD8", 0.88], ["100%", "#111144", 0.92]]],
    ["planetNeptune", [["0%", "#F98513", 0.68], ["38%", "#9BACD8", 0.96], ["100%", "#223382", 0.92]]],
    ["planetGiant", [["0%", "#F98513", 0.58], ["35%", "#9BACD8", 0.82], ["78%", "#223382", 0.88], ["100%", "#111144", 0.9]]],
    ["planetLarge", [["0%", "#F98513", 0.52], ["32%", "#9BACD8", 0.76], ["72%", "#223382", 0.86], ["100%", "#111144", 0.92]]]
  ];

  gradientStops.forEach(([id, stops]) => {
    const gradient = defs.append("radialGradient")
      .attr("id", id)
      .attr("cx", "42%")
      .attr("cy", "42%")
      .attr("r", "68%");
    stops.forEach(([offset, color, opacity]) => {
      gradient.append("stop").attr("offset", offset).attr("stop-color", color).attr("stop-opacity", opacity);
    });
  });

  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .attr("filter", "url(#planetNoise)")
    .attr("opacity", 0.34);

  const planet = svg.selectAll("g.size-planet")
    .data(groups)
    .join("g")
    .attr("class", "size-planet")
    .attr("transform", d => `translate(${d.x * width},${d.y * height})`);

  planet.append("circle")
    .attr("r", d => d.radius * 0.56)
    .attr("fill", d => d.key === "Earth-size 0.5–1.25" ? colors.orange : colors.blueSoft)
    .attr("opacity", d => d.factor > 10 ? 0.24 : 0.18)
    .attr("filter", "url(#planetHalo)");

  planet.append("circle")
    .attr("r", d => d.radius)
    .attr("fill", d => d.fill)
    .attr("stroke", d => d.factor > 10 ? "rgba(244, 241, 236, 0.34)" : "rgba(17, 17, 68, 0.24)")
    .attr("stroke-width", d => d.factor > 10 ? 1.4 : 1)
    .attr("opacity", d => d.factor > 10 ? 0.7 : 0.94);

  planet.append("circle")
    .attr("r", d => Math.max(2, d.radius * 0.16))
    .attr("cx", d => -d.radius * 0.18)
    .attr("cy", d => -d.radius * 0.16)
    .attr("fill", colors.orange)
    .attr("opacity", d => d.factor > 10 ? 0.16 : 0.34)
    .attr("filter", "url(#planetHalo)");

  const label = svg.selectAll("g.size-label")
    .data(groups)
    .join("g")
    .attr("class", "size-label")
    .attr("transform", d => `translate(${d.labelX * width},${d.labelY * height})`);

  label.append("path")
    .attr("class", "size-connector")
    .attr("d", d => {
      const labelX = d.labelX * width;
      const labelY = d.labelY * height;
      const planetX = d.x * width;
      const planetY = d.y * height;
      const vx = labelX - planetX;
      const vy = labelY - planetY;
      const length = Math.max(1, Math.hypot(vx, vy));
      const edgeX = planetX + (vx / length) * (d.radius + 8) - labelX;
      const edgeY = planetY + (vy / length) * (d.radius + 8) - labelY;
      const endX = d.anchor === "end" ? 16 : -16;
      const endY = -8;
      const elbowX = d.anchor === "end" ? Math.min(edgeX, endX + 36) : Math.max(edgeX, endX - 36);
      return `M${edgeX},${edgeY} L${elbowX},${endY} L${endX},${endY}`;
    });

  const labelTitle = label.append("text")
    .attr("class", "size-label-title")
    .attr("text-anchor", d => d.anchor);

  labelTitle.each(function(d) {
    const text = d3.select(this);
    d.titleLines.forEach((line, index) => {
      text.append("tspan")
        .attr("x", 0)
        .attr("dy", index === 0 ? 0 : 18)
        .text(line);
    });
  });

  label.append("text")
    .attr("class", "size-label-count")
    .attr("text-anchor", d => d.anchor)
    .attr("y", d => d.titleLines.length > 1 ? 42 : 23)
    .text(d => ruPlanetCount(d.count));

  label.append("text")
    .attr("class", "size-label-range")
    .attr("text-anchor", d => d.anchor)
    .attr("y", d => d.titleLines.length > 1 ? 63 : 44)
    .text(d => d.range);

  const earthRef = svg.append("g")
    .attr("class", "earth-reference")
    .attr("transform", `translate(${isMobile ? width * 0.55 : width * 0.48},${isMobile ? height * 0.35 : height * 0.47})`);

  defs.append("clipPath")
    .attr("id", "earthReferenceClip")
    .append("circle")
    .attr("r", earthDiameter / 2)
    .attr("cx", 0)
    .attr("cy", 0);

  earthRef.append("image")
    .attr("href", "earth.png")
    .attr("x", -earthDiameter / 2)
    .attr("y", -earthDiameter / 2)
    .attr("width", earthDiameter)
    .attr("height", earthDiameter)
    .attr("preserveAspectRatio", "xMidYMid slice")
    .attr("clip-path", "url(#earthReferenceClip)");

  earthRef.append("circle")
    .attr("r", earthDiameter / 2)
    .attr("fill", "none")
    .attr("stroke", colors.ink)
    .attr("stroke-width", 1.1);

  earthRef.append("text")
    .attr("class", "earth-ref-label")
    .attr("x", isMobile ? earthDiameter / 2 + 12 : -(earthDiameter / 2 + 16))
    .attr("y", -2)
    .attr("text-anchor", isMobile ? "start" : "end")
    .text("Земля · 1 R⊕");

  earthRef.append("text")
    .attr("class", "earth-ref-caption")
    .attr("x", isMobile ? earthDiameter / 2 + 12 : -(earthDiameter / 2 + 16))
    .attr("y", 20)
    .attr("text-anchor", isMobile ? "start" : "end")
    .text("точка отсчёта");
}

function drawPeriod(rows) {
  clearChart("#periodChart");
  const { width, height } = chartSize("#periodChart");
  const counts = new Map(countBy(rows, "orbital_period_class").map(d => [d.name, d.count]));
  const periodColors = ["#111144", "#223382", "#536FBF", "#F98513", "#9BACD8", "#DAD1C8"];
  const data = periodOrder.map((name, index) => ({
    name,
    count: counts.get(name) || 0,
    label: ruPeriod.get(name),
    color: periodColors[index]
  }));
  const total = d3.sum(data, d => d.count);
  const isMobile = width < 760;
  const svg = d3.select("#periodChart")
    .append("svg")
    .attr("class", "period-donut")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const defs = svg.append("defs");
  const glow = defs.append("filter")
    .attr("id", "donutGlow")
    .attr("x", "-25%")
    .attr("y", "-25%")
    .attr("width", "150%")
    .attr("height", "150%");
  glow.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "blur");
  const glowMerge = glow.append("feMerge");
  glowMerge.append("feMergeNode").attr("in", "blur");
  glowMerge.append("feMergeNode").attr("in", "SourceGraphic");

  const centerX = isMobile ? width * 0.5 : width * 0.36;
  const centerY = isMobile ? height * 0.34 : height * 0.50;
  const radius = Math.min(
    isMobile ? width * 0.31 : width * 0.23,
    isMobile ? height * 0.25 : height * 0.40
  );
  const innerRadius = radius * 0.58;

  const pie = d3.pie()
    .sort(null)
    .value(d => d.count)
    .padAngle(0.012);
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius).cornerRadius(3);
  const outerArc = d3.arc().innerRadius(radius * 1.08).outerRadius(radius * 1.08);
  const arcs = pie(data);

  const chart = svg.append("g")
    .attr("transform", `translate(${centerX},${centerY})`);

  chart.append("circle")
    .attr("r", radius * 1.04)
    .attr("fill", "rgba(155, 172, 216, 0.12)")
    .attr("filter", "url(#donutGlow)");

  chart.selectAll("path.period-arc")
    .data(arcs)
    .join("path")
    .attr("class", "period-arc")
    .attr("d", arc)
    .attr("fill", d => d.data.color)
    .attr("stroke", colors.paper)
    .attr("stroke-width", 2)
    .attr("opacity", 0.94);

  chart.append("circle")
    .attr("r", innerRadius * 0.92)
    .attr("fill", "rgba(244, 241, 236, 0.86)")
    .attr("stroke", "rgba(17, 17, 68, 0.10)");

  const centerText = chart.append("text")
    .attr("class", "donut-center")
    .attr("text-anchor", "middle");

  ["Больше всего", "планет с годом", "до 50 дней"].forEach((line, index) => {
    centerText.append("tspan")
      .attr("x", 0)
      .attr("dy", index === 0 ? -18 : 22)
      .text(line);
  });

  chart.append("text")
    .attr("class", "donut-total")
    .attr("text-anchor", "middle")
    .attr("y", 60)
    .text(`${ruFormat(total)} планет`);

  if (radius > 130) {
    chart.selectAll("path.period-callout")
      .data(arcs.filter(d => d.data.count / total > 0.10))
      .join("path")
      .attr("class", "period-callout")
      .attr("d", d => {
        const start = arc.centroid(d);
        const end = outerArc.centroid(d);
        return `M${start[0]},${start[1]} L${end[0]},${end[1]}`;
      });
  }

  const largestArc = arcs.reduce((max, item) => item.data.count > max.data.count ? item : max, arcs[0]);
  const smallestArc = arcs.reduce((min, item) => item.data.count < min.data.count ? item : min, arcs[0]);
  const highlightedArcs = [
    { arc: largestArc, label: "самый большой сектор", side: 1 },
    { arc: smallestArc, label: "самый маленький сектор", side: -1 }
  ];

  const sliceLabel = chart.selectAll("g.period-slice-note")
    .data(highlightedArcs)
    .join("g")
    .attr("class", "period-slice-note");

  sliceLabel.append("path")
    .attr("class", "period-callout")
    .attr("d", d => {
      const start = outerArc.centroid(d.arc);
      const endX = start[0] + d.side * (isMobile ? 24 : 42);
      const endY = start[1] + (d.side > 0 ? 10 : -12);
      return `M${start[0]},${start[1]} L${endX},${endY}`;
    });

  sliceLabel.append("text")
    .attr("class", "period-slice-label")
    .attr("x", d => {
      if (isMobile && d.arc.data.name === largestArc.data.name) return radius * 1.45;
      return outerArc.centroid(d.arc)[0] + d.side * (isMobile ? 30 : 50);
    })
    .attr("y", d => outerArc.centroid(d.arc)[1] + (d.side > 0 ? 14 : -16))
    .attr("text-anchor", d => {
      if (isMobile && d.arc.data.name === largestArc.data.name) return "end";
      return d.side > 0 ? "start" : "end";
    })
    .text(d => `${d.arc.data.label} · ${Math.round(d.arc.data.count / total * 100)}%`);

  const legendX = isMobile ? width * 0.07 : width * 0.67;
  const legendY = isMobile ? height * 0.68 : height * 0.22;
  const legendGap = isMobile ? 34 : 38;
  const legendColumnWidth = isMobile ? width * 0.48 : 0;
  const legend = svg.append("g")
    .attr("class", "period-legend")
    .attr("transform", `translate(${legendX},${legendY})`);

  const item = legend.selectAll("g.period-legend-item")
    .data(data)
    .join("g")
    .attr("class", "period-legend-item")
    .attr("transform", (d, i) => {
      if (!isMobile) return `translate(0,${i * legendGap})`;
      return `translate(${(i % 2) * legendColumnWidth},${Math.floor(i / 2) * legendGap})`;
    });

  item.append("circle")
    .attr("r", 7)
    .attr("cx", 0)
    .attr("cy", 1)
    .attr("fill", d => d.color);

  item.append("text")
    .attr("class", "period-legend-label")
    .attr("x", 18)
    .attr("y", -3)
    .text(d => d.label);

  item.append("text")
    .attr("class", "period-legend-value")
    .attr("x", 18)
    .attr("y", 17)
    .text(d => `${ruFormat(d.count)} планет · ${Math.round(d.count / total * 100)}%`);
}

function drawDistance(rows) {
  clearChart("#distanceChart");
  const { width, height } = chartSize("#distanceChart");
  const margin = { top: 20, right: 34, bottom: 92, left: 58 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const order = ["<10 pc", "10–50 pc", "50–100 pc", "100–500 pc", "500–1,000 pc", "1,000–5,000 pc", ">5,000 pc"];
  const ru = new Map([
    ["<10 pc", "до 10 пк"],
    ["10–50 pc", "10–50 пк"],
    ["50–100 pc", "50–100 пк"],
    ["100–500 pc", "100–500 пк"],
    ["500–1,000 pc", "500–1 000 пк"],
    ["1,000–5,000 pc", "1 000–5 000 пк"],
    [">5,000 pc", "больше 5 000 пк"]
  ]);
  const counts = new Map(countBy(rows, "distance_class_pc").map(d => [d.name, d.count]));
  const data = order.map(name => ({ name, count: counts.get(name) || 0, label: ru.get(name) }));
  const x = d3.scaleBand().domain(data.map(d => d.name)).range([0, innerWidth]).padding(0.22);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).nice().range([innerHeight, 0]);

  const svg = d3.select("#distanceChart").append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""))
    .call(group => group.select(".domain").remove());

  g.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.name))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => innerHeight - y(d.count))
    .attr("rx", 2)
    .attr("fill", (d, i) => i < 3 ? colors.orange : i < 5 ? colors.blue : colors.blueSoft)
    .attr("opacity", 0.86);

  g.selectAll("text.value")
    .data(data)
    .join("text")
    .attr("class", "value-label")
    .attr("x", d => x(d.name) + x.bandwidth() / 2)
    .attr("y", d => y(d.count) - 10)
    .attr("text-anchor", "middle")
    .text(d => ruFormat(d.count));

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d => ru.get(d)))
    .selectAll("text")
    .attr("transform", "rotate(-28)")
    .attr("text-anchor", "end");

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(ruFormat));
}

function drawAll() {
  drawTimeline(state.data);
  drawMethods(state.data);
  drawSizeGroups(state.data);
  drawPeriod(state.data);
  drawDistance(state.data);
}

function preprocess(row) {
  return {
    ...row,
    disc_year_int: +row.disc_year_int || +row.disc_year,
    pl_rade: +row.pl_rade,
    sy_dist: +row.sy_dist
  };
}

setupNavigation();

d3.csv("data/exoplanets_for_tableau.csv", preprocess).then(rows => {
  state.data = rows.filter(row => row.disc_year_int && row.discoverymethod);
  drawAll();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawAll, 160);
  });
});
