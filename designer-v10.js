
(function(){
"use strict";

const HANDLE_SIZE=24;
const ROTATE_OFFSET=70;
let interaction=null;
let textStyle={bold:true,italic:false,underline:false,align:"center"};

["rightChest","leftSleeve","rightSleeve"].forEach(side=>{
  if(!state.sides[side]) state.sides[side]=[];
});

function selectedObject(){ return selected(); }
function objectBounds(o){ return bounds(o); }

function localPoint(pt,o){
  const dx=pt.x-o.x,dy=pt.y-o.y;
  const a=-o.rotation*Math.PI/180;
  return {x:dx*Math.cos(a)-dy*Math.sin(a),y:dx*Math.sin(a)+dy*Math.cos(a)};
}
function rotatedPoint(x,y,o){
  const a=o.rotation*Math.PI/180;
  return {x:o.x+x*Math.cos(a)-y*Math.sin(a),y:o.y+x*Math.sin(a)+y*Math.cos(a)};
}
function handlePositions(o){
  const b=objectBounds(o), hw=b.w/2, hh=b.h/2;
  return {
    nw:rotatedPoint(-hw,-hh,o),ne:rotatedPoint(hw,-hh,o),
    sw:rotatedPoint(-hw,hh,o),se:rotatedPoint(hw,hh,o),
    rotate:rotatedPoint(0,-hh-ROTATE_OFFSET,o)
  };
}
function near(a,b,r=HANDLE_SIZE){return Math.hypot(a.x-b.x,a.y-b.y)<=r;}

const originalDraw=draw;
draw=function(o,sel=true){
  if(o.hidden)return;
  ctx.save();
  if(o.flipX||o.flipY){
    const ox=o.x,oy=o.y;
    ctx.translate(ox,oy);
    ctx.scale(o.flipX?-1:1,o.flipY?-1:1);
    ctx.translate(-ox,-oy);
  }
  originalDraw(o,sel);
  ctx.restore();
};

const originalRender=render;
render=function(sel=true){
  originalRender(sel);
  const o=selectedObject();
  if(!sel||!o||o.hidden)return;
  const hp=handlePositions(o),b=objectBounds(o);
  ctx.save();
  ctx.strokeStyle="#1689e8";ctx.fillStyle="#fff";ctx.lineWidth=5;ctx.setLineDash([]);
  const top=rotatedPoint(0,-b.h/2,o);
  ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(hp.rotate.x,hp.rotate.y);ctx.stroke();
  Object.entries(hp).forEach(([name,p])=>{
    ctx.beginPath();
    if(name==="rotate"){ctx.arc(p.x,p.y,13,0,Math.PI*2);}
    else{ctx.rect(p.x-11,p.y-11,22,22);}
    ctx.fill();ctx.stroke();
  });
  ctx.restore();
  renderLayerPanel();
};

function renderLayerPanel(){
  const list=document.getElementById("layersList"),count=document.getElementById("layerCount");
  if(!list||!count)return;
  const all=objects();
  count.textContent=all.length;
  list.innerHTML="";
  [...all].reverse().forEach(o=>{
    const row=document.createElement("div");
    row.className="layer-row"+(o.id===state.selectedId?" active":"");
    row.innerHTML=`<button class="layer-select" type="button"><span>${o.type==="text"?"T":"IMG"}</span><strong>${o.type==="text"?(o.text||"Text"):"Artwork"}</strong></button>
      <button class="layer-eye" type="button">${o.hidden?"Show":"Hide"}</button>`;
    row.querySelector(".layer-select").onclick=()=>{state.selectedId=o.id;sync(o);loadSelectedText(o);render();};
    row.querySelector(".layer-eye").onclick=()=>{o.hidden=!o.hidden;render();};
    list.appendChild(row);
  });
}
window.refreshLayers=renderLayerPanel;

function pointerPoint(e){
  const r=canvas.getBoundingClientRect();
  return {x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)};
}

canvas.addEventListener("pointerdown",e=>{
  const pt=pointerPoint(e);
  const current=selectedObject();
  if(current&&!current.locked){
    const handles=handlePositions(current);
    if(near(pt,handles.rotate)){
      interaction={mode:"rotate",o:current,startAngle:Math.atan2(pt.y-current.y,pt.x-current.x),startRotation:current.rotation};
      snapshot();canvas.setPointerCapture(e.pointerId);e.preventDefault();e.stopImmediatePropagation();return;
    }
    for(const name of ["nw","ne","sw","se"]){
      if(near(pt,handles[name])){
        interaction={mode:"resize",o:current,startDistance:Math.hypot(pt.x-current.x,pt.y-current.y),startSize:current.size};
        snapshot();canvas.setPointerCapture(e.pointerId);e.preventDefault();e.stopImmediatePropagation();return;
      }
    }
  }
  const o=hit(pt);
  if(o){
    state.selectedId=o.id;sync(o);loadSelectedText(o);
    if(!o.locked){interaction={mode:"move",o,dx:pt.x-o.x,dy:pt.y-o.y};snapshot();canvas.setPointerCapture(e.pointerId);}
  } else {state.selectedId=null;}
  render();e.preventDefault();e.stopImmediatePropagation();
},true);

canvas.addEventListener("pointermove",e=>{
  if(!interaction)return;
  const pt=pointerPoint(e),o=interaction.o;
  if(interaction.mode==="move"){
    o.x=pt.x-interaction.dx;o.y=pt.y-interaction.dy;
    snapObject(o);
  }else if(interaction.mode==="resize"){
    const d=Math.hypot(pt.x-o.x,pt.y-o.y);
    o.size=Math.max(25,Math.min(650,interaction.startSize*(d/Math.max(1,interaction.startDistance))));
    clampObjectToCanvas(o);
    sync(o);
  }else if(interaction.mode==="rotate"){
    const a=Math.atan2(pt.y-o.y,pt.x-o.x);
    o.rotation=interaction.startRotation+(a-interaction.startAngle)*180/Math.PI;
    if(Math.abs(o.rotation%45)<3)o.rotation=Math.round(o.rotation/45)*45;
    sync(o);
  }
  render();e.preventDefault();e.stopImmediatePropagation();
},true);

canvas.addEventListener("pointerup",e=>{interaction=null;try{canvas.releasePointerCapture(e.pointerId)}catch(_){}e.stopImmediatePropagation();},true);
canvas.addEventListener("pointercancel",()=>interaction=null,true);

function loadSelectedText(o){
  if(!o||o.type!=="text")return;
  document.getElementById("textInput").value=o.text||"";
  document.getElementById("fontSelect").value=o.font||"Arial";
  document.getElementById("textColor").value=o.color||"#111111";
  document.getElementById("textOutlineColor").value=o.outlineColor||"#ffffff";
  document.getElementById("textOutlineSize").value=o.outlineSize||0;
  document.getElementById("textShadowColor").value=o.shadowColor||"#000000";
  document.getElementById("shadowBlur").value=o.shadowBlur||0;
  document.getElementById("letterSpacing").value=o.letterSpacing||0;
  document.getElementById("curveRange").value=o.curve||0;
  textStyle={bold:o.bold!==false,italic:!!o.italic,underline:!!o.underline,align:o.align||"center"};
  syncFormatButtons();
}
function syncFormatButtons(){
  document.getElementById("boldBtn")?.classList.toggle("active",textStyle.bold);
  document.getElementById("italicBtn")?.classList.toggle("active",textStyle.italic);
  document.getElementById("underlineBtn")?.classList.toggle("active",textStyle.underline);
}
["bold","italic","underline"].forEach(name=>{
  document.getElementById(name+"Btn")?.addEventListener("click",()=>{
    textStyle[name]=!textStyle[name];syncFormatButtons();
  });
});

const oldAdd=document.getElementById("addTextBtn").onclick;
document.getElementById("addTextBtn").onclick=()=>{
  const before=objects().length;
  oldAdd();
  const o=objects()[objects().length-1];
  if(objects().length>before&&o?.type==="text"){
    Object.assign(o,{bold:textStyle.bold,italic:textStyle.italic,underline:textStyle.underline,align:textStyle.align,shadowBlur:Number(document.getElementById("shadowBlur").value||0)});
    render();
  }
};
document.getElementById("updateTextBtn").onclick=()=>{
  const o=selectedObject();
  if(!o||o.type!=="text")return toast("Select a text layer first.");
  snapshot();
  o.text=document.getElementById("textInput").value||o.text;
  o.font=document.getElementById("fontSelect").value;
  o.color=document.getElementById("textColor").value;
  o.outlineColor=document.getElementById("textOutlineColor").value;
  o.outlineSize=Number(document.getElementById("textOutlineSize").value||0);
  o.shadowColor=document.getElementById("textShadowColor").value;
  o.shadowBlur=Number(document.getElementById("shadowBlur").value||0);
  o.letterSpacing=Number(document.getElementById("letterSpacing").value||0);
  o.curve=Number(document.getElementById("curveRange").value||0);
  Object.assign(o,textStyle);render();
};

document.getElementById("lockBtn").onclick=()=>{
  const o=selectedObject();if(!o)return toast("Select an item first.");
  o.locked=!o.locked;document.getElementById("lockBtn").textContent=o.locked?"Unlock":"Lock";render();
};
document.getElementById("hideBtn").onclick=()=>{
  const o=selectedObject();if(!o)return toast("Select an item first.");
  o.hidden=!o.hidden;render();
};
document.getElementById("flipHBtn").onclick=()=>{const o=selectedObject();if(o){o.flipX=!o.flipX;render();}};
document.getElementById("flipVBtn").onclick=()=>{const o=selectedObject();if(o){o.flipY=!o.flipY;render();}};

document.getElementById("bringFrontBtn").onclick=()=>{
  const o=selectedObject();if(!o)return;
  const a=objects(),i=a.indexOf(o);if(i<a.length-1){snapshot();a.splice(i,1);a.splice(i+1,0,o);render();}
};
document.getElementById("sendBackBtn").onclick=()=>{
  const o=selectedObject();if(!o)return;
  const a=objects(),i=a.indexOf(o);if(i>0){snapshot();a.splice(i,1);a.splice(i-1,0,o);render();}
};

document.getElementById("homeBtn").onclick=()=>{
  changeStep(1);
  document.querySelector("main").scrollIntoView({behavior:"smooth"});
};

const oldDrawText=drawTextWithEffects;
drawTextWithEffects=function(o){
  ctx.save();
  const weight=o.bold===false?"400":"900";
  const style=o.italic?"italic":"normal";
  ctx.font=`${style} ${weight} ${Number(o.size||110)}px ${o.font||"Arial"}`;
  oldDrawText(o);
  if(o.underline){
    const b=bounds(o);ctx.strokeStyle=o.color||"#111";ctx.lineWidth=Math.max(2,o.size/28);
    ctx.beginPath();ctx.moveTo(-b.w/2,o.size*.58);ctx.lineTo(b.w/2,o.size*.58);ctx.stroke();
  }
  ctx.restore();
};

const originalSideButtons=[...document.querySelectorAll(".side")];
originalSideButtons.forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll(".side").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");state.side=b.dataset.side;
    if(!state.sides[state.side])state.sides[state.side]=[];
    state.selectedId=null;document.getElementById("sideTitle").textContent=b.textContent+" preview";render();
  };
});

const originalPopulate=populateReview;
populateReview=function(){
  originalPopulate();
  ["rightChest","leftSleeve","rightSleeve"].forEach(side=>{
    const el=document.getElementById(side+"Preview");
    if(el)el.src=preview(side);
  });
};

render();
})();
