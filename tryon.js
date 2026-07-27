const $=id=>document.getElementById(id);
const canvas=$("tryonCanvas"),ctx=canvas.getContext("2d");
const person=new Image(),shirt=new Image(),design=new Image();
let personReady=false,shirtReady=false,designReady=false;

shirt.onload=()=>{shirtReady=true;draw()};
shirt.src=$("tryonProduct").value;

function loadFile(input,img,readySetter){
  const file=input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{img.onload=()=>{readySetter(true);draw()};img.src=reader.result};
  reader.readAsDataURL(file);
}
$("personUploadBtn").onclick=()=>$("personFile").click();
$("personFile").onchange=()=>loadFile($("personFile"),person,v=>personReady=v);
$("designUploadBtn").onclick=()=>$("designFile").click();
$("designFile").onchange=()=>loadFile($("designFile"),design,v=>designReady=v);
$("tryonProduct").onchange=()=>{shirtReady=false;shirt.src=$("tryonProduct").value};
["shirtTint","shirtScale","shirtY","shirtX","designScale"].forEach(id=>$(id).oninput=draw);

function fitImage(img,maxW,maxH){
  const r=Math.min(maxW/img.width,maxH/img.height);
  return {w:img.width*r,h:img.height*r};
}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#eef2f7";ctx.fillRect(0,0,canvas.width,canvas.height);

  if(personReady){
    const f=fitImage(person,canvas.width,canvas.height);
    ctx.drawImage(person,(canvas.width-f.w)/2,(canvas.height-f.h)/2,f.w,f.h);
  }else{
    ctx.fillStyle="#6b7280";ctx.font="700 32px Arial";ctx.textAlign="center";
    ctx.fillText("Upload a front-facing photo",canvas.width/2,canvas.height/2);
  }

  if(shirtReady){
    const scale=Number($("shirtScale").value)/100;
    const w=canvas.width*scale;
    const h=w*(shirt.height/shirt.width);
    const x=canvas.width*Number($("shirtX").value)/100-w/2;
    const y=canvas.height*Number($("shirtY").value)/100-h/2;

    const temp=document.createElement("canvas");
    temp.width=shirt.width;temp.height=shirt.height;
    const t=temp.getContext("2d");
    t.drawImage(shirt,0,0);
    t.globalCompositeOperation="source-atop";
    t.fillStyle=$("shirtTint").value;
    t.globalAlpha=.72;
    t.fillRect(0,0,temp.width,temp.height);
    t.globalAlpha=1;
    t.globalCompositeOperation="source-over";
    ctx.drawImage(temp,x,y,w,h);

    if(designReady){
      const ds=Number($("designScale").value)/100;
      const dw=w*ds;
      const dh=dw*(design.height/design.width);
      ctx.drawImage(design,x+w/2-dw/2,y+h*.36-dh/2,dw,dh);
    }
  }
}
$("downloadTryonBtn").onclick=()=>{
  const a=document.createElement("a");
  a.href=canvas.toDataURL("image/png");
  a.download="virtual-try-on-preview.png";
  a.click();
};
draw();