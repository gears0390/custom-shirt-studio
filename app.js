
let designerZoom=1;
let activeCoupon=null;

function updateDesignerZoom(){
  const wrap=document.getElementById("mockupWrap");
  const label=document.getElementById("zoomLabel");
  if(wrap) wrap.style.transform=`scale(${designerZoom})`;
  if(label) label.textContent=`${Math.round(designerZoom*100)}%`;
}

function drawTextWithEffects(o){
  const text=o.text||"";
  const chars=[...text];
  const spacing=Number(o.letterSpacing||0);
  const curve=Number(o.curve||0);
  const fontSize=Number(o.size||110);
  ctx.font=`900 ${fontSize}px ${o.font||"Arial"}`;
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  const widths=chars.map(ch=>ctx.measureText(ch).width);
  const total=widths.reduce((a,b)=>a+b,0)+Math.max(0,chars.length-1)*spacing;
  let cursor=-total/2;

  chars.forEach((ch,i)=>{
    const w=widths[i];
    const cx=cursor+w/2;
    const ratio=total ? cx/(total/2) : 0;
    const yOffset=curve*(ratio*ratio);
    ctx.save();
    ctx.translate(cx,yOffset);
    if(o.shadowColor && Number(o.shadowBlur||0)>0){
      ctx.shadowColor=o.shadowColor;
      ctx.shadowBlur=Number(o.shadowBlur||0);
      ctx.shadowOffsetX=4;
      ctx.shadowOffsetY=4;
    }
    if(o.outlineSize>0){
      ctx.lineWidth=Number(o.outlineSize);
      ctx.strokeStyle=o.outlineColor||"#ffffff";
      ctx.strokeText(ch,0,0);
    }
    ctx.fillStyle=o.color||"#111111";
    ctx.fillText(ch,0,0);
    ctx.restore();
    cursor+=w+spacing;
  });
}

function couponDiscountAmount(subtotal){
  if(!activeCoupon)return 0;
  if(activeCoupon.type==="percent") return subtotal*(activeCoupon.value/100);
  if(activeCoupon.type==="fixed") return Math.min(subtotal,activeCoupon.value);
  return 0;
}

function loadCoupons(){
  const saved=JSON.parse(localStorage.getItem("customShirtCoupons")||"[]");
  return saved.map(c=>({
    code:String(c.code||"").toUpperCase(),
    type:c.type||"percent",
    value:Number(c.value ?? c.percent ?? 0)
  }));
}

let productSearchTerm="";
document.addEventListener("DOMContentLoaded",()=>{
 const s=document.getElementById("productSearch");
 if(s){s.oninput=()=>{productSearchTerm=s.value.trim().toLowerCase();renderProducts();};}
});

function refreshLayers(){
  const list=document.getElementById("layersList");
  const count=document.getElementById("layerCount");
  if(!list||!count)return;
  const items=objects();
  count.textContent=items.length;
  list.innerHTML="";
  [...items].reverse().forEach((o,reverseIndex)=>{
    const actualIndex=items.length-1-reverseIndex;
    const row=document.createElement("button");
    row.className="layer-row"+(o.id===state.selectedId?" active":"");
    row.innerHTML=`<span>${o.type==="text"?"T":"IMG"}</span><strong>${o.type==="text"?o.text:"Artwork"}</strong>`;
    row.onclick=()=>{state.selectedId=o.id;sync(o);render();refreshLayers()};
    list.appendChild(row);
  });
}
function clampObjectToCanvas(o){
  const b=bounds(o);
  o.x=Math.max(b.w/2,Math.min(canvas.width-b.w/2,o.x));
  o.y=Math.max(b.h/2,Math.min(canvas.height-b.h/2,o.y));
}
function snapObject(o){
  const snap=18;
  if(Math.abs(o.x-canvas.width/2)<snap)o.x=canvas.width/2;
  if(Math.abs(o.y-canvas.height/2)<snap)o.y=canvas.height/2;
  clampObjectToCanvas(o);
}
function exportCurrentPrint(){
  const oldSelected=state.selectedId;
  state.selectedId=null;
  render(false);
  const a=document.createElement("a");
  a.href=canvas.toDataURL("image/png");
  a.download=`${state.product.name.replace(/\s+/g,"-").toLowerCase()}-${state.side}-print.png`;
  a.click();
  state.selectedId=oldSelected;
  render();
}

const CONFIG = window.APP_CONFIG || {};
const brandNameEl = document.getElementById("brandName");
const taglineEl = document.getElementById("tagline");
if (brandNameEl && CONFIG.businessName) brandNameEl.textContent = CONFIG.businessName;
if (taglineEl && CONFIG.tagline) taglineEl.textContent = CONFIG.tagline;


const $=id=>document.getElementById(id);
const canvas=$("designCanvas"),ctx=canvas.getContext("2d");
const products=(window.PRODUCT_CATALOG||[]);
products.forEach(p=>{p.base=p.basePrice;});
const categories=[...new Set(products.map(p=>p.category))];
const colors=[["White","#fff"],["Black","#17191d"],["Navy","#172a46"],["Royal","#245cb8"],["Red","#d6303d"],["Forest","#1e5a3b"],["Gray","#8d939b"],["Pink","#ee6f9f"],["Orange","#e66d28"],["Purple","#633f83"]];
const sizeSets={Adult:["S","M","L","XL","2XL","3XL","4XL","5XL"],Youth:["YXS","YS","YM","YL","YXL"]};
const state={product:products[0],category:categories[0],colorName:"White",color:"#fff",side:"front",sides:{front:[],back:[],leftChest:[]},selectedId:null,quantities:{},audience:"Adult",history:[],future:[]};
let deferredPrompt=null,drag=null;

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").hidden=false});
$("installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("installBtn").hidden=true};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));

function toast(m){$("toast").textContent=m;$("toast").classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>$("toast").classList.remove("show"),2400)}
function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function objects(){return state.sides[state.side]} function selected(){return objects().find(o=>o.id===state.selectedId)}
function snapshot(){state.history.push(JSON.stringify({sides:state.sides,side:state.side}));if(state.history.length>40)state.history.shift();state.future=[]}
function restore(serial){const d=JSON.parse(serial);state.sides=d.sides;rehydrateImages();render()}
function rehydrateImages(){Object.values(state.sides).flat().forEach(o=>{if(o.type==="image"&&o.src&&!o.img){const img=new Image();img.onload=render;img.src=o.src;o.img=img}})}

function renderCategories(){ $("categoryTabs").innerHTML="";categories.forEach(c=>{const b=document.createElement("button");b.className="category"+(c===state.category?" active":"");b.textContent=c;b.onclick=()=>{state.category=c;renderCategories();renderProducts()};$("categoryTabs").appendChild(b)})}
function renderProducts(){ $("productGrid").innerHTML="";products.filter(p=>p.category===state.category&&(!productSearchTerm||`${p.name} ${p.description||""}`.toLowerCase().includes(productSearchTerm))).forEach(p=>{const c=document.createElement("article");c.className="product-card"+(p.id===state.product.id?" selected":"");c.innerHTML=`<div class="product-visual"><div class="product-shape"></div></div><h3>${p.name}</h3><p>${p.description||""}</p><p><strong>Starting at $${p.base.toFixed(2)}</strong></p>`;c.onclick=()=>{state.product=p;updateProductUI();renderProducts();changeStep(2)};$("productGrid").appendChild(c)})}
function updateProductUI(){ $("selectedProductName").textContent=state.product.name;$("selectedProductPrice").textContent=`Starting at $${state.product.base.toFixed(2)}`;$("designerProductTitle").textContent=state.product.name;$("garmentMockup").className="garment "+state.product.type}
renderCategories();renderProducts();

colors.forEach(([n,h],i)=>{const b=document.createElement("button");b.className="swatch"+(i===0?" active":"");b.style.background=h;b.title=n;b.onclick=()=>{document.querySelectorAll(".swatch").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.colorName=n;state.color=h;$("garmentMockup").style.setProperty("--shirt",h);$("selectedProductThumb").style.setProperty("--shirt",h)};$("swatches").appendChild(b)});

function bounds(o){if(o.type==="text"){ctx.save();ctx.font=`900 ${o.size}px ${o.font}`;const w=ctx.measureText(o.text).width;ctx.restore();return{w,h:o.size*1.1}}return{w:o.size*o.ratio,h:o.size}}
function draw(o,sel=true){const b=bounds(o);ctx.save();ctx.globalAlpha=(o.opacity??100)/100;ctx.translate(o.x,o.y);ctx.rotate(o.rotation*Math.PI/180);if(o.type==="text"){drawTextWithEffects(o)}else if(o.img)ctx.drawImage(o.img,-b.w/2,-b.h/2,b.w,b.h);if(sel&&o.id===state.selectedId){ctx.globalAlpha=1;ctx.strokeStyle="#2698f2";ctx.lineWidth=5;ctx.setLineDash([12,8]);ctx.strokeRect(-b.w/2-10,-b.h/2-10,b.w+20,b.h+20)}ctx.restore()}
function render(sel=true){ctx.clearRect(0,0,canvas.width,canvas.height);objects().forEach(o=>draw(o,sel));refreshLayers()}
function sync(o){if(!o)return;$("sizeRange").value=o.size;$("rotateRange").value=o.rotation;$("opacityRange").value=o.opacity??100}

$("addTextBtn").onclick=()=>{const t=$("textInput").value.trim();if(!t)return toast("Type something first.");snapshot();const o={id:uid(),type:"text",text:t,x:canvas.width/2,y:canvas.height/2,size:110,rotation:0,opacity:100,color:$("textColor").value,font:$("fontSelect").value,outlineColor:$("textOutlineColor")?.value||"#ffffff",outlineSize:Number($("textOutlineSize")?.value||0),shadowColor:$("textShadowColor")?.value||"#000000",shadowBlur:8,letterSpacing:Number($("letterSpacing")?.value||0),curve:Number($("curveRange")?.value||0)};objects().push(o);state.selectedId=o.id;sync(o);render()};
$("textInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("addTextBtn").click()});
$("uploadBtn").onclick=()=>$("fileInput").click();
$("fileInput").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{snapshot();const o={id:uid(),type:"image",img,src:r.result,x:canvas.width/2,y:canvas.height/2,size:180,rotation:0,opacity:100,ratio:img.width/img.height};objects().push(o);state.selectedId=o.id;sync(o);render()};img.src=r.result};r.readAsDataURL(f);e.target.value=""};
["sizeRange","rotateRange","opacityRange"].forEach(id=>$(id).oninput=e=>{const o=selected();if(!o)return;const map={sizeRange:"size",rotateRange:"rotation",opacityRange:"opacity"};o[map[id]]=Number(e.target.value);render()});
$("duplicateBtn").onclick=()=>{const o=selected();if(!o)return toast("Select an item first.");snapshot();const c={...o,id:uid(),x:o.x+30,y:o.y+30};objects().push(c);state.selectedId=c.id;render()};
$("deleteBtn").onclick=()=>{if(!selected())return;snapshot();state.sides[state.side]=objects().filter(o=>o.id!==state.selectedId);state.selectedId=null;render()};
$("clearBtn").onclick=()=>{if(confirm(`Clear the ${state.side} design?`)){snapshot();state.sides[state.side]=[];state.selectedId=null;render()}};
$("undoBtn").onclick=()=>{if(!state.history.length)return;state.future.push(JSON.stringify({sides:state.sides,side:state.side}));restore(state.history.pop())};
$("redoBtn").onclick=()=>{if(!state.future.length)return;state.history.push(JSON.stringify({sides:state.sides,side:state.side}));restore(state.future.pop())};

function point(e){const r=canvas.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return{x:(p.clientX-r.left)*(canvas.width/r.width),y:(p.clientY-r.top)*(canvas.height/r.height)}}
function hit(pt){for(let i=objects().length-1;i>=0;i--){const o=objects()[i],b=bounds(o),dx=pt.x-o.x,dy=pt.y-o.y,a=-o.rotation*Math.PI/180,rx=dx*Math.cos(a)-dy*Math.sin(a),ry=dx*Math.sin(a)+dy*Math.cos(a);if(Math.abs(rx)<=b.w/2+15&&Math.abs(ry)<=b.h/2+15)return o}return null}
function down(e){e.preventDefault();const pt=point(e),o=hit(pt);if(o){state.selectedId=o.id;drag={o,dx:pt.x-o.x,dy:pt.y-o.y};sync(o);snapshot()}else state.selectedId=null;render()}
function move(e){if(!drag)return;e.preventDefault();const pt=point(e);drag.o.x=Math.max(0,Math.min(canvas.width,pt.x-drag.dx));drag.o.y=Math.max(0,Math.min(canvas.height,pt.y-drag.dy));render()}
function up(){drag=null}
canvas.addEventListener("mousedown",down);canvas.addEventListener("mousemove",move);window.addEventListener("mouseup",up);canvas.addEventListener("touchstart",down,{passive:false});canvas.addEventListener("touchmove",move,{passive:false});window.addEventListener("touchend",up);

document.querySelectorAll(".side").forEach(b=>b.onclick=()=>{document.querySelectorAll(".side").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.side=b.dataset.side;state.selectedId=null;$("sideTitle").textContent=b.textContent+" preview";render()});
function changeStep(n){document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));$("panel"+n).classList.add("active");document.querySelectorAll(".step").forEach(s=>s.classList.toggle("active",Number(s.dataset.step)===n));window.scrollTo({top:0,behavior:"smooth"});if(n===4)populateReview()}
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>changeStep(Number(b.dataset.go)));document.querySelectorAll(".step").forEach(s=>s.onclick=()=>changeStep(Number(s.dataset.step)));$("startDesignBtn").onclick=()=>changeStep(1);

function renderSizes(){ $("sizeGrid").innerHTML="";sizeSets[state.audience].forEach(s=>{if(!(s in state.quantities))state.quantities[s]=0;const l=document.createElement("label");l.className="size-box";l.innerHTML=`<span>${s}</span><input type="number" min="0" max="999" value="${state.quantities[s]}" data-size="${s}">`;l.querySelector("input").oninput=e=>{state.quantities[s]=Math.max(0,Number(e.target.value||0));updatePricing()};$("sizeGrid").appendChild(l)});updatePricing()}
document.querySelectorAll(".audience").forEach(b=>b.onclick=()=>{document.querySelectorAll(".audience").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.audience=b.dataset.audience;renderSizes()});renderSizes();
function qty(){return Object.values(state.quantities).reduce((a,b)=>a+b,0)} function areas(){return Object.values(state.sides).filter(a=>a.length).length}
function unit(q){let p=state.product.base;if(q>=100)p*=.48;else if(q>=50)p*=.55;else if(q>=25)p*=.64;else if(q>=12)p*=.74;else if(q>=6)p*=.84;else if(q>=2)p*=.93;p+=(Math.max(0,areas()-1)*4.5);return q?p:0}
function updatePricing(){const q=qty(),u=unit(q);$("totalQty").textContent=q;$("unitPrice").textContent=`$${u.toFixed(2)}`;$("printAreaCount").textContent=areas();$("totalPrice").textContent=`$${(q*u).toFixed(2)}`}
$("toReviewBtn").onclick=()=>{if(qty()<1)return toast("Add at least one item.");changeStep(4)};

function preview(side){const os=state.side,oi=state.selectedId;state.side=side;state.selectedId=null;render(false);const out=document.createElement("canvas");out.width=700;out.height=840;const ox=out.getContext("2d");ox.fillStyle=state.color;ox.fillRect(0,0,700,840);ox.drawImage(canvas,0,0);state.side=os;state.selectedId=oi;render();return out.toDataURL("image/png")}
function populateReview(){const q=qty(),u=unit(q);$("frontPreview").src=preview("front");$("backPreview").src=preview("back");$("leftChestPreview").src=preview("leftChest");$("summaryProduct").textContent=state.product.name;$("summaryColor").textContent=state.colorName;$("summaryQty").textContent=q;$("summarySizes").textContent=Object.entries(state.quantities).filter(([,v])=>v>0).map(([k,v])=>`${k}: ${v}`).join(", ");$("summaryFulfillment").textContent=$("deliveryMethod").value;$("summaryTotal").textContent=`$${(q*u).toFixed(2)}`}
$("deliveryMethod").onchange=()=>{$("summaryFulfillment").textContent=$("deliveryMethod").value};
$("saveBtn").onclick=()=>{const save={...state,sides:Object.fromEntries(Object.entries(state.sides).map(([k,a])=>[k,a.map(o=>({...o,img:undefined}))]))};localStorage.setItem("customShirtSavedDesign",JSON.stringify(save));toast("Design saved on this device.")};

$("placeOrderBtn").onclick=()=>{if(!$("approvalCheck").checked)return toast("Approve the design first.");if(!$("customerName").value.trim()||!$("customerEmail").value.trim())return toast("Enter your name and email.");const q=qty(),u=unit(q),order={orderNumber:"CS-"+Math.floor(100000+Math.random()*900000),createdAt:new Date().toISOString(),status:"New",customer:{name:$("customerName").value.trim(),email:$("customerEmail").value.trim(),phone:$("customerPhone").value.trim()},product:state.product.name,color:state.colorName,quantities:state.quantities,quantity:q,printAreas:areas(),fulfillment:$("deliveryMethod").value,notes:$("orderNotes").value.trim(),total:Number((q*u).toFixed(2)),previews:{front:preview("front"),back:preview("back"),leftChest:preview("leftChest")}};const orders=JSON.parse(localStorage.getItem("customShirtOrders")||"[]");orders.unshift(order);localStorage.setItem("customShirtOrders",JSON.stringify(orders));alert(`Order ${order.orderNumber} created!\n\nOpen the Admin page to see it.`)};
$("garmentMockup").style.setProperty("--shirt",state.color);$("selectedProductThumb").style.setProperty("--shirt",state.color);updateProductUI();render();


const centerH=document.getElementById("centerHBtn");
if(centerH)centerH.onclick=()=>{const o=selected();if(!o)return toast("Select an item first.");snapshot();o.x=canvas.width/2;render()};
const centerV=document.getElementById("centerVBtn");
if(centerV)centerV.onclick=()=>{const o=selected();if(!o)return toast("Select an item first.");snapshot();o.y=canvas.height/2;render()};
const exportBtn=document.getElementById("exportPrintBtn");
if(exportBtn)exportBtn.onclick=exportCurrentPrint;


document.getElementById("zoomInBtn")?.addEventListener("click",()=>{
  designerZoom=Math.min(1.5,designerZoom+0.1);
  updateDesignerZoom();
});
document.getElementById("zoomOutBtn")?.addEventListener("click",()=>{
  designerZoom=Math.max(0.6,designerZoom-0.1);
  updateDesignerZoom();
});
updateDesignerZoom();

document.getElementById("applyCouponBtn")?.addEventListener("click",()=>{
  const code=(document.getElementById("couponInput")?.value||"").trim().toUpperCase();
  const message=document.getElementById("couponMessage");
  const coupon=loadCoupons().find(c=>c.code===code);
  if(!coupon){
    activeCoupon=null;
    if(message) message.textContent="Coupon not found.";
  }else{
    activeCoupon=coupon;
    if(message) message.textContent=`Coupon ${coupon.code} applied.`;
  }
  if(typeof renderCheckout==="function")renderCheckout();
});
