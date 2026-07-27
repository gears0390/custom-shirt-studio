
const $=id=>document.getElementById(id);
let orders=JSON.parse(localStorage.getItem("customShirtOrders")||"[]");
function money(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0)}
function save(){localStorage.setItem("customShirtOrders",JSON.stringify(orders))}
function render(){
 const q=$("searchOrders").value.toLowerCase(),status=$("statusFilter").value;
 const filtered=orders.filter(o=>(!status||o.status===status)&&(!q||`${o.orderNumber} ${o.customer.name} ${o.customer.email}`.toLowerCase().includes(q)));
 $("statOrders").textContent=orders.length;$("statRevenue").textContent=money(orders.reduce((a,o)=>a+Number(o.total||0),0));$("statNew").textContent=orders.filter(o=>o.status==="New").length;$("statCompleted").textContent=orders.filter(o=>o.status==="Completed").length;
 $("ordersList").innerHTML=filtered.length?"":"<p>No matching orders yet.</p>";
 filtered.forEach(o=>{const card=document.createElement("article");card.className="order-card";card.innerHTML=`<div class="order-head"><div><strong>${o.orderNumber}</strong><div>${new Date(o.createdAt).toLocaleString()}</div></div><select class="status-select">${["New","Artwork Check","Printing","Ready","Completed"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></div><div class="order-meta"><div><span>Customer</span><strong>${o.customer.name}</strong></div><div><span>Product</span><strong>${o.product}</strong></div><div><span>Quantity</span><strong>${o.quantity}</strong></div><div><span>Total</span><strong>${money(o.total)}</strong></div></div><div><strong>Sizes:</strong> ${Object.entries(o.quantities).filter(([,v])=>v>0).map(([k,v])=>`${k}: ${v}`).join(", ")}</div><div><strong>Fulfillment:</strong> ${o.fulfillment}</div><div><strong>Email:</strong> ${o.customer.email}</div>${o.notes?`<div><strong>Notes:</strong> ${o.notes}</div>`:""}`;card.querySelector("select").onchange=e=>{o.status=e.target.value;save();render()};$("ordersList").appendChild(card)});
}
$("searchOrders").oninput=render;$("statusFilter").onchange=render;
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(orders,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="custom-shirt-orders.json";a.click();URL.revokeObjectURL(a.href)};
$("clearOrdersBtn").onclick=()=>{if(confirm("Clear all demo orders on this device?")){orders=[];save();render()}};
render();

const coupons=JSON.parse(localStorage.getItem("customShirtCoupons")||"[]");
const inventory=JSON.parse(localStorage.getItem("customShirtInventory")||"[]");
function renderBusinessTools(){
  const customers=new Set(orders.map(o=>o.customer&&o.customer.email).filter(Boolean));
  document.getElementById("statCustomers").textContent=customers.size;
  document.getElementById("statCoupons").textContent=coupons.length;
  document.getElementById("statInventory").textContent=inventory.filter(x=>Number(x.qty)<=5).length;
  document.getElementById("couponList").innerHTML=coupons.map(c=>`<div class="mini-row"><strong>${c.code}</strong><span>${c.percent}% off</span></div>`).join("");
  document.getElementById("inventoryList").innerHTML=inventory.map(i=>`<div class="mini-row"><strong>${i.product}</strong><span>${i.qty} left</span></div>`).join("");
}
document.getElementById("addCouponBtn").onclick=()=>{
  const code=document.getElementById("couponCode").value.trim().toUpperCase();
  const percent=Number(document.getElementById("couponPercent").value);
  if(!code||!percent)return;
  coupons.push({code,percent});
  localStorage.setItem("customShirtCoupons",JSON.stringify(coupons));
  renderBusinessTools();
};
document.getElementById("addInventoryBtn").onclick=()=>{
  const product=document.getElementById("inventoryProduct").value.trim();
  const qty=Number(document.getElementById("inventoryQty").value);
  if(!product)return;
  inventory.push({product,qty});
  localStorage.setItem("customShirtInventory",JSON.stringify(inventory));
  renderBusinessTools();
};
renderBusinessTools();
