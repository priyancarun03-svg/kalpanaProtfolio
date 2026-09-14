// ---------------------------------------------------------------
// 0. Theme toggle: dark (default) / light, remembered across visits
// ---------------------------------------------------------------
(function themeToggle() {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  const saved = localStorage.getItem("kk-theme");
  if (saved === "light") root.setAttribute("data-theme", "light");

  btn.addEventListener("click", () => {
    const isLight = root.getAttribute("data-theme") === "light";
    if (isLight) {
      root.removeAttribute("data-theme");
      localStorage.setItem("kk-theme", "dark");
    } else {
      root.setAttribute("data-theme", "light");
      localStorage.setItem("kk-theme", "light");
    }
  });
})();

// ---------------------------------------------------------------
// 1. Hero visual: animated beneficial-ownership verification graph
// ---------------------------------------------------------------
(function buildScanGraph() {
  const svgNS = "http://www.w3.org/2000/svg";
  const edgesGroup = document.getElementById("edges");
  const nodesGroup = document.getElementById("nodes");
  if (!edgesGroup || !nodesGroup) return;

  // Node layout: a target entity at centre, feeding from three ownership
  // layers -- mirrors how a real UBO chain is traced back to a person.
  const nodes = [
    { id: "target", x: 240, y: 240, r: 15, layer: 0, label: "Entity" },

    { id: "l1a", x: 150, y: 170, r: 10, layer: 1 },
    { id: "l1b", x: 330, y: 170, r: 10, layer: 1 },
    { id: "l1c", x: 240, y: 340, r: 10, layer: 1 },

    { id: "l2a", x: 80, y: 90, r: 7, layer: 2 },
    { id: "l2b", x: 190, y: 70, r: 7, layer: 2 },
    { id: "l2c", x: 380, y: 100, r: 7, layer: 2 },
    { id: "l2d", x: 320, y: 60, r: 7, layer: 2 },
    { id: "l2e", x: 150, y: 400, r: 7, layer: 2 },
    { id: "l2f", x: 330, y: 410, r: 7, layer: 2 },

    { id: "ubo", x: 400, y: 380, r: 9, layer: 3, label: "UBO" }
  ];

  const edges = [
    ["target", "l1a"], ["target", "l1b"], ["target", "l1c"],
    ["l1a", "l2a"], ["l1a", "l2b"],
    ["l1b", "l2c"], ["l1b", "l2d"],
    ["l1c", "l2e"], ["l1c", "l2f"],
    ["l2f", "ubo"]
  ];

  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  edges.forEach(([a, b], i) => {
    const na = byId[a], nb = byId[b];
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", na.x);
    line.setAttribute("y1", na.y);
    line.setAttribute("x2", nb.x);
    line.setAttribute("y2", nb.y);
    line.setAttribute("stroke", "rgba(237,239,244,0.16)");
    line.setAttribute("stroke-width", "1");
    line.classList.add("graph-edge");
    line.style.setProperty("--edge-delay", `${Math.max(na.layer, nb.layer) * 0.5}s`);
    edgesGroup.appendChild(line);
  });

  nodes.forEach(n => {
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", n.x);
    circle.setAttribute("cy", n.y);
    circle.setAttribute("r", n.r);
    circle.setAttribute("fill", "#111B2E");
    circle.setAttribute("stroke", "#7A8699");
    circle.setAttribute("stroke-width", "1.5");
    circle.classList.add("graph-node");
    circle.style.setProperty("--node-delay", `${n.layer * 0.5}s`);
    nodesGroup.appendChild(circle);

    if (n.label) {
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", n.x);
      text.setAttribute("y", n.y - n.r - 10);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#A9B3C4");
      text.setAttribute("font-family", "JetBrains Mono, monospace");
      text.setAttribute("font-size", "11");
      text.textContent = n.label;
      nodesGroup.appendChild(text);
    }
  });

  // Inject keyframe styles for the sweep/clear animation once, in JS,
  // since these are generated elements rather than static markup.
  const style = document.createElement("style");
  style.textContent = `
    .graph-edge {
      stroke-dasharray: 6;
      animation: edge-clear 4s ease-in-out infinite;
      animation-delay: var(--edge-delay);
    }
    .graph-node {
      animation: node-clear 4s ease-in-out infinite;
      animation-delay: var(--node-delay);
      transform-origin: center;
      transform-box: fill-box;
    }
    @keyframes edge-clear {
      0%   { stroke: rgba(237,239,244,0.16); }
      10%  { stroke: #2DD4BF; }
      45%  { stroke: rgba(237,239,244,0.16); }
      100% { stroke: rgba(237,239,244,0.16); }
    }
    @keyframes node-clear {
      0%   { stroke: #7A8699; fill: #111B2E; }
      10%  { stroke: #2DD4BF; fill: #16213A; }
      20%  { transform: scale(1.25); }
      30%  { transform: scale(1); }
      45%  { stroke: #7A8699; fill: #111B2E; }
      100% { stroke: #7A8699; fill: #111B2E; }
    }
  `;
  document.head.appendChild(style);
})();

// ---------------------------------------------------------------
// 2. Timeline fill: the vertical line draws itself in as the
//    experience section scrolls into view (motion tied to the
//    user's own scrolling, not an autoplay reveal).
// ---------------------------------------------------------------
(function scrollTimeline() {
  const fill = document.getElementById("timeline-fill");
  const items = Array.from(document.querySelectorAll(".tl-item"));
  const timeline = document.querySelector(".timeline");
  if (!fill || !timeline) return;

  function update() {
    const rect = timeline.getBoundingClientRect();
    const viewportH = window.innerHeight;

    // Progress: 0 when timeline top hits bottom of viewport,
    // 1 when timeline bottom passes the middle of viewport.
    const start = viewportH * 0.85;
    const end = viewportH * 0.4;
    const total = rect.height + (start - end);
    const traveled = start - rect.top;
    const progress = Math.min(1, Math.max(0, traveled / total));

    fill.style.height = `${progress * 100}%`;

    items.forEach(item => {
      const r = item.getBoundingClientRect();
      if (r.top < viewportH * 0.75) {
        item.classList.add("is-active");
      }
    });
  }

  document.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();