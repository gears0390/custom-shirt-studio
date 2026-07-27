
(function () {
  "use strict";

  const c = document.getElementById("designCanvas");
  if (!c) return;

  const photo = document.getElementById("garmentPhoto");
  const tint = document.getElementById("garmentTint");
  let active = null;
  let start = null;
  let mode = "move";

  function canvasPoint(event) {
    const rect = c.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (c.width / rect.width),
      y: (event.clientY - rect.top) * (c.height / rect.height)
    };
  }

  function objectBounds(obj) {
    if (obj.type === "text") {
      ctx.save();
      ctx.font = `900 ${obj.size}px ${obj.font || "Arial"}`;
      const width = Math.max(40, ctx.measureText(obj.text || "Text").width);
      ctx.restore();
      return { w: width, h: Math.max(40, obj.size * 1.2) };
    }
    return {
      w: Math.max(30, obj.size * (obj.ratio || 1)),
      h: Math.max(30, obj.size)
    };
  }

  function findObject(pt) {
    const list = objects();
    for (let i = list.length - 1; i >= 0; i--) {
      const obj = list[i];
      if (obj.hidden) continue;
      const b = objectBounds(obj);
      const angle = -(obj.rotation || 0) * Math.PI / 180;
      const dx = pt.x - obj.x;
      const dy = pt.y - obj.y;
      const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
      if (Math.abs(rx) <= b.w / 2 + 24 && Math.abs(ry) <= b.h / 2 + 24) {
        return obj;
      }
    }
    return null;
  }

  function nearCorner(pt, obj) {
    const b = objectBounds(obj);
    const angle = (obj.rotation || 0) * Math.PI / 180;
    const corners = [
      [-b.w/2,-b.h/2],[b.w/2,-b.h/2],[-b.w/2,b.h/2],[b.w/2,b.h/2]
    ].map(([x,y]) => ({
      x: obj.x + x*Math.cos(angle) - y*Math.sin(angle),
      y: obj.y + x*Math.sin(angle) + y*Math.cos(angle)
    }));
    return corners.some(p => Math.hypot(pt.x-p.x, pt.y-p.y) <= 35);
  }

  function selectObject(obj) {
    state.selectedId = obj ? obj.id : null;
    if (obj) sync(obj);
    render();
  }

  c.style.touchAction = "none";
  c.style.cursor = "grab";

  c.addEventListener("pointerdown", function (event) {
    const pt = canvasPoint(event);
    const obj = findObject(pt);

    if (!obj) {
      selectObject(null);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    selectObject(obj);
    if (obj.locked) return;

    snapshot();
    active = obj;
    mode = nearCorner(pt, obj) ? "resize" : "move";
    start = {
      pointerX: pt.x,
      pointerY: pt.y,
      x: obj.x,
      y: obj.y,
      size: obj.size,
      distance: Math.max(1, Math.hypot(pt.x-obj.x, pt.y-obj.y))
    };
    c.setPointerCapture(event.pointerId);
    c.style.cursor = mode === "resize" ? "nwse-resize" : "grabbing";
  }, true);

  c.addEventListener("pointermove", function (event) {
    if (!active || !start) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const pt = canvasPoint(event);

    if (mode === "move") {
      active.x = start.x + (pt.x - start.pointerX);
      active.y = start.y + (pt.y - start.pointerY);

      const b = objectBounds(active);
      active.x = Math.max(b.w/2, Math.min(c.width-b.w/2, active.x));
      active.y = Math.max(b.h/2, Math.min(c.height-b.h/2, active.y));

      if (Math.abs(active.x-c.width/2) < 20) active.x = c.width/2;
      if (Math.abs(active.y-c.height/2) < 20) active.y = c.height/2;
    } else {
      const distance = Math.max(1, Math.hypot(pt.x-active.x, pt.y-active.y));
      active.size = Math.max(30, Math.min(650, start.size * distance / start.distance));
      sync(active);
    }

    render();
  }, true);

  function endPointer(event) {
    active = null;
    start = null;
    mode = "move";
    c.style.cursor = "grab";
    try { c.releasePointerCapture(event.pointerId); } catch (_) {}
  }

  c.addEventListener("pointerup", endPointer, true);
  c.addEventListener("pointercancel", endPointer, true);

  // Make sliders unquestionably work.
  [
    ["sizeRange", "size"],
    ["rotateRange", "rotation"],
    ["opacityRange", "opacity"]
  ].forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener("input", function () {
      const obj = selected();
      if (!obj) return;
      obj[key] = Number(input.value);
      render();
    });
  });

  function updateShirtImage() {
    if (!photo) return;
    const type = state.product && state.product.type === "hoodie" ? "hoodie" : "tee";
    photo.src = type === "hoodie"
      ? "assets/hoodie-realistic.svg"
      : "assets/tee-realistic.svg";
  }

  // Keep actual shirt image in sync with chosen product.
  const originalUpdate = window.updateProductUI;
  if (typeof originalUpdate === "function") {
    window.updateProductUI = function () {
      originalUpdate();
      updateShirtImage();
    };
  }
  updateShirtImage();

  // Tint realistic white shirt without hiding fabric details.
  document.querySelectorAll(".swatch").forEach(button => {
    button.addEventListener("click", function () {
      if (tint) tint.style.background = state.color || "#ffffff";
    });
  });
  if (tint) tint.style.background = state.color || "#ffffff";

  // Product cards show actual garment pictures.
  document.querySelectorAll(".product-card").forEach(card => {
    const visual = card.querySelector(".product-visual");
    if (!visual) return;
    const title = card.querySelector("h3")?.textContent.toLowerCase() || "";
    const src = title.includes("hoodie") || title.includes("sweatshirt")
      ? "assets/hoodie-realistic.svg"
      : "assets/tee-realistic.svg";
    visual.innerHTML = `<img class="catalog-garment-photo" src="${src}" alt="">`;
  });

  render();
})();
