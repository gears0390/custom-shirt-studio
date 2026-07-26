
const canvas = document.getElementById("designCanvas");
const ctx = canvas.getContext("2d");

const state = {
  product: "Classic T-Shirt",
  colorName: "White",
  color: "#ffffff",
  side: "front",
  sides: { front: [], back: [] },
  selectedId: null,
  quantities: { S:0, M:0, L:0, XL:0, "2XL":0, "3XL":0, "4XL":0, "5XL":0 },
};

const colors = [
  ["White", "#ffffff"], ["Black", "#17191d"], ["Navy", "#172a46"], ["Royal", "#245cb8"],
  ["Red", "#d6303d"], ["Forest", "#1e5a3b"], ["Gray", "#8d939b"], ["Pink", "#ee6f9f"],
  ["Orange", "#e66d28"], ["Purple", "#633f83"]
];

const sizes = Object.keys(state.quantities);
const swatches = document.getElementById("swatches");
const shirt = document.getElementById("shirt");
const toast = document.getElementById("toast");

colors.forEach(([name, hex], index) => {
  const b = document.createElement("button");
  b.className = "swatch" + (index === 0 ? " active" : "");
  b.style.background = hex;
  b.title = name;
  b.addEventListener("click", () => {
    document.querySelectorAll(".swatch").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    state.colorName = name;
    state.color = hex;
    shirt.style.setProperty("--shirt-color", hex);
  });
  swatches.appendChild(b);
});

const sizeGrid = document.getElementById("sizeGrid");
sizes.forEach(size => {
  const label = document.createElement("label");
  label.className = "size-box";
  label.innerHTML = `<span>${size}</span><input min="0" max="999" value="0" type="number" inputmode="numeric" data-size="${size}">`;
  label.querySelector("input").addEventListener("input", e => {
    state.quantities[size] = Math.max(0, Number(e.target.value || 0));
    updatePricing();
  });
  sizeGrid.appendChild(label);
});

function currentObjects() { return state.sides[state.side]; }
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function addText() {
  const value = document.getElementById("textInput").value.trim();
  if (!value) return showToast("Type something first.");
  const obj = {
    id: uid(), type: "text", text: value,
    x: canvas.width / 2, y: canvas.height / 2,
    size: 110, rotation: 0,
    color: document.getElementById("textColor").value,
    font: document.getElementById("fontSelect").value
  };
  currentObjects().push(obj);
  state.selectedId = obj.id;
  syncControls(obj);
  render();
}

document.getElementById("addTextBtn").addEventListener("click", addText);
document.getElementById("textInput").addEventListener("keydown", e => {
  if (e.key === "Enter") addText();
});

document.getElementById("uploadBtn").addEventListener("click", () => document.getElementById("fileInput").click());
document.getElementById("fileInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const obj = {
        id: uid(), type: "image", img, src: reader.result,
        x: canvas.width / 2, y: canvas.height / 2,
        size: 180, rotation: 0,
        ratio: img.width / img.height
      };
      currentObjects().push(obj);
      state.selectedId = obj.id;
      syncControls(obj);
      render();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  e.target.value = "";
});

function selected() {
  return currentObjects().find(o => o.id === state.selectedId);
}

function syncControls(obj) {
  if (!obj) return;
  document.getElementById("sizeRange").value = obj.size;
  document.getElementById("rotateRange").value = obj.rotation;
}

document.getElementById("sizeRange").addEventListener("input", e => {
  const obj = selected(); if (!obj) return;
  obj.size = Number(e.target.value); render();
});
document.getElementById("rotateRange").addEventListener("input", e => {
  const obj = selected(); if (!obj) return;
  obj.rotation = Number(e.target.value); render();
});
document.getElementById("deleteBtn").addEventListener("click", () => {
  state.sides[state.side] = currentObjects().filter(o => o.id !== state.selectedId);
  state.selectedId = null; render();
});
document.getElementById("duplicateBtn").addEventListener("click", () => {
  const obj = selected(); if (!obj) return showToast("Select an item first.");
  const copy = {...obj, id: uid(), x: obj.x + 35, y: obj.y + 35};
  currentObjects().push(copy); state.selectedId = copy.id; render();
});
document.getElementById("clearBtn").addEventListener("click", () => {
  if (confirm(`Clear everything from the ${state.side}?`)) {
    state.sides[state.side] = []; state.selectedId = null; render();
  }
});

function bounds(obj) {
  if (obj.type === "text") {
    ctx.save();
    ctx.font = `900 ${obj.size}px ${obj.font}`;
    const width = ctx.measureText(obj.text).width;
    ctx.restore();
    return {w: width, h: obj.size * 1.1};
  }
  return {w: obj.size * obj.ratio, h: obj.size};
}

function drawObject(obj, selectedFlag=true) {
  ctx.save();
  ctx.translate(obj.x, obj.y);
  ctx.rotate(obj.rotation * Math.PI / 180);
  const b = bounds(obj);
  if (obj.type === "text") {
    ctx.fillStyle = obj.color;
    ctx.font = `900 ${obj.size}px ${obj.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(obj.text, 0, 0);
  } else {
    ctx.drawImage(obj.img, -b.w/2, -b.h/2, b.w, b.h);
  }
  if (selectedFlag && obj.id === state.selectedId) {
    ctx.strokeStyle = "#2f9df4";
    ctx.lineWidth = 5;
    ctx.setLineDash([12,8]);
    ctx.strokeRect(-b.w/2 - 10, -b.h/2 - 10, b.w + 20, b.h + 20);
  }
  ctx.restore();
}

function render(showSelection=true) {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  currentObjects().forEach(o => drawObject(o, showSelection));
}

function pointFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const p = e.touches ? e.touches[0] : e;
  return {
    x: (p.clientX - rect.left) * (canvas.width / rect.width),
    y: (p.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function hitTest(pt) {
  for (let i = currentObjects().length - 1; i >= 0; i--) {
    const obj = currentObjects()[i];
    const b = bounds(obj);
    const dx = pt.x - obj.x, dy = pt.y - obj.y;
    const a = -obj.rotation * Math.PI/180;
    const rx = dx * Math.cos(a) - dy * Math.sin(a);
    const ry = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(rx) <= b.w/2 + 15 && Math.abs(ry) <= b.h/2 + 15) return obj;
  }
  return null;
}

let drag = null;
function pointerDown(e) {
  e.preventDefault();
  const pt = pointFromEvent(e);
  const obj = hitTest(pt);
  if (obj) {
    state.selectedId = obj.id;
    drag = { obj, dx: pt.x - obj.x, dy: pt.y - obj.y };
    syncControls(obj);
  } else {
    state.selectedId = null;
  }
  render();
}
function pointerMove(e) {
  if (!drag) return;
  e.preventDefault();
  const pt = pointFromEvent(e);
  drag.obj.x = Math.max(0, Math.min(canvas.width, pt.x - drag.dx));
  drag.obj.y = Math.max(0, Math.min(canvas.height, pt.y - drag.dy));
  render();
}
function pointerUp() { drag = null; }

canvas.addEventListener("mousedown", pointerDown);
canvas.addEventListener("mousemove", pointerMove);
window.addEventListener("mouseup", pointerUp);
canvas.addEventListener("touchstart", pointerDown, {passive:false});
canvas.addEventListener("touchmove", pointerMove, {passive:false});
window.addEventListener("touchend", pointerUp);

document.getElementById("productSelect").addEventListener("change", e => {
  state.product = e.target.value;
  document.getElementById("productTitle").textContent = state.product;
});

document.querySelectorAll(".side-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".side-btn").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    state.side = btn.dataset.side;
    state.selectedId = null;
    document.getElementById("sideTitle").textContent = `${state.side[0].toUpperCase()+state.side.slice(1)} preview`;
    render();
  });
});

function changeStep(n) {
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active-panel"));
  document.getElementById(`step${n}`).classList.add("active-panel");
  document.querySelectorAll(".step").forEach(s => s.classList.toggle("active", s.dataset.step == n));
  window.scrollTo({top:0, behavior:"smooth"});
  if (n === 3) populateReview();
}
document.querySelectorAll(".step").forEach(s => s.addEventListener("click", () => changeStep(Number(s.dataset.step))));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => changeStep(Number(b.dataset.go))));
document.getElementById("toQuantityBtn").addEventListener("click", () => changeStep(2));
document.getElementById("toReviewBtn").addEventListener("click", () => {
  if (getTotalQty() < 1) return showToast("Add at least one shirt.");
  changeStep(3);
});

function getTotalQty() {
  return Object.values(state.quantities).reduce((a,b) => a+b, 0);
}
function unitPrice(qty) {
  if (qty >= 100) return 13.99;
  if (qty >= 50) return 15.49;
  if (qty >= 25) return 17.99;
  if (qty >= 12) return 20.99;
  if (qty >= 6) return 23.99;
  if (qty >= 2) return 27.99;
  return qty === 1 ? 31.99 : 0;
}
function updatePricing() {
  const qty = getTotalQty();
  const unit = unitPrice(qty);
  document.getElementById("totalQty").textContent = qty;
  document.getElementById("unitPrice").textContent = `$${unit.toFixed(2)}`;
  document.getElementById("totalPrice").textContent = `$${(qty*unit).toFixed(2)}`;
}
updatePricing();

function designDataUrl(side) {
  const oldSide = state.side;
  const oldSelected = state.selectedId;
  state.side = side;
  state.selectedId = null;
  render(false);

  const out = document.createElement("canvas");
  out.width = 700; out.height = 840;
  const octx = out.getContext("2d");
  octx.fillStyle = state.color;
  octx.fillRect(0,0,out.width,out.height);
  octx.drawImage(canvas,0,0);

  state.side = oldSide;
  state.selectedId = oldSelected;
  render();
  return out.toDataURL("image/png");
}

function populateReview() {
  const qty = getTotalQty();
  const unit = unitPrice(qty);
  document.getElementById("frontPreview").src = designDataUrl("front");
  document.getElementById("backPreview").src = designDataUrl("back");
  document.getElementById("summaryProduct").textContent = state.product;
  document.getElementById("summaryColor").textContent = state.colorName;
  document.getElementById("summaryQty").textContent = qty;
  document.getElementById("summarySizes").textContent =
    sizes.filter(s => state.quantities[s] > 0).map(s => `${s}: ${state.quantities[s]}`).join(", ");
  document.getElementById("summaryTotal").textContent = `$${(qty*unit).toFixed(2)}`;
}

document.getElementById("saveBtn").addEventListener("click", () => {
  const safe = JSON.parse(JSON.stringify(state, (key, value) => key === "img" ? undefined : value));
  safe.sides.front.forEach((o, i) => { if (o.type === "image") o.src = state.sides.front[i]?.src; });
  safe.sides.back.forEach((o, i) => { if (o.type === "image") o.src = state.sides.back[i]?.src; });
  localStorage.setItem("customShirtDesign", JSON.stringify(safe));
  showToast("Design saved on this device.");
});

document.getElementById("payBtn").addEventListener("click", () => {
  if (!document.getElementById("approvalCheck").checked) return showToast("Please approve the design first.");
  const name = document.getElementById("customerName").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  if (!name || !email) return showToast("Enter your name and email.");
  const order = {
    orderNumber: "CS-" + Math.floor(100000 + Math.random()*900000),
    customer: name,
    email,
    delivery: document.getElementById("deliveryMethod").value,
    product: state.product,
    color: state.colorName,
    quantities: state.quantities,
    total: document.getElementById("summaryTotal").textContent,
    createdAt: new Date().toISOString()
  };
  localStorage.setItem("lastCustomShirtOrder", JSON.stringify(order));
  alert(`Demo order ${order.orderNumber} created!\n\nIn the production version, Stripe checkout will open here and the order will enter your admin dashboard.`);
});

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
}

shirt.style.setProperty("--shirt-color", state.color);
render();
