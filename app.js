const state={menu:null,itemsById:new Map(),cart:new Map(),filter:{q:"",cat:"Tümü"}};
const el=(id)=>document.getElementById(id);
const fmt=(n,c)=>`${n.toFixed(0)} ${c}`;
const esc=(s)=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

function loadCart(){try{const raw=localStorage.getItem("demo_cart_v1");if(!raw)return;const obj=JSON.parse(raw);state.cart=new Map(Object.entries(obj).map(([k,v])=>[k,Number(v)||0]).filter(([,v])=>v>0));}catch{}}
function saveCart(){const obj={};for(const [k,v] of state.cart.entries())obj[k]=v;localStorage.setItem("demo_cart_v1",JSON.stringify(obj));}
function setQty(id,qty){if(qty<=0)state.cart.delete(id);else state.cart.set(id,qty);saveCart();renderAll();}
function inc(id){setQty(id,(state.cart.get(id)||0)+1);} function dec(id){setQty(id,(state.cart.get(id)||0)-1);}

function buildCats(items){
  const cats=["Tümü",...Array.from(new Set(items.map(x=>x.category))).sort((a,b)=>a.localeCompare(b,'tr'))];
  const sel=el("category"); sel.innerHTML=cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
}
function filtered(){
  const q=state.filter.q.trim().toLowerCase(); const cat=state.filter.cat;
  return state.menu.items.filter(it=>{
    if(cat!=="Tümü" && it.category!==cat) return false;
    if(!q) return true;
    const hay=`${it.name} ${it.desc||""} ${it.category} ${(it.tags||[]).join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}
function renderMenu(){
  const items=filtered(); el("menuCount").textContent=`${items.length} ürün`;
  el("menuCards").innerHTML = items.map(it=>{
    const qty=state.cart.get(it.id)||0;
    const tags=(it.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join("");
    const img=it.image?`<div class="thumb"><img src="${esc(it.image)}" alt="${esc(it.name)}" loading="lazy"></div>`:"";
    return `<article class="card">
      ${img}
      <div class="top">
        <div><h3>${esc(it.name)}</h3><p>${esc(it.desc||"")}</p></div>
        <div class="price">${fmt(it.price,state.menu.currency)}</div>
      </div>
      <div class="tags">${tags}</div>
      <div class="actions">
        <div class="qty">
          <button class="btn" onclick="dec('${esc(it.id)}')">−</button>
          <span>${qty}</span>
          <button class="btn primary" onclick="inc('${esc(it.id)}')">+</button>
        </div>
        <button class="btn ok" onclick="inc('${esc(it.id)}')">Sepete Ekle</button>
      </div>
    </article>`;
  }).join("") || `<div class="card"><p>Filtreye uygun ürün yok.</p></div>`;
}

function cartLines(){
  const lines=[]; let subtotal=0;
  for(const [id,qty] of state.cart.entries()){
    const it=state.itemsById.get(id); if(!it) continue;
    const line=it.price*qty; subtotal+=line;
    lines.push({id,qty,name:it.name,price:it.price,line});
  }
  lines.sort((a,b)=>a.name.localeCompare(b.name,'tr'));
  return {lines,subtotal};
}
function renderCart(){
  const {lines,subtotal}=cartLines(); const cur=state.menu.currency;
  el("subtotal").textContent=fmt(subtotal,cur);
  el("minOrder").textContent=fmt(state.menu.minOrder,cur);
  const ok=subtotal>=state.menu.minOrder;
  el("minStatus").innerHTML = ok
    ? `<span class="note"><b>Minimum sepet tamam.</b></span>`
    : `<span class="note"><b class="warn">Minimum sepet için</b> ${fmt(state.menu.minOrder-subtotal,cur)} daha ekleyin.</span>`;
  el("cartItems").innerHTML = lines.length ? lines.map(x=>`
    <div class="cart-row">
      <div class="meta"><div class="line">${esc(x.name)}</div><small>${x.qty} × ${fmt(x.price,cur)}</small></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
        <div><strong>${fmt(x.line,cur)}</strong></div>
        <div style="display:flex;gap:6px;">
          <button class="btn" onclick="dec('${esc(x.id)}')">−</button>
          <button class="btn primary" onclick="inc('${esc(x.id)}')">+</button>
        </div>
      </div>
    </div>`).join("") : `<div class="note">Sepet boş. Menüden ürün ekleyin.</div>`;
  el("sendBtn").disabled = !lines.length || !ok;
}

function buildMsg(){
  const name=el("custName").value.trim();
  const phone=el("custPhone").value.trim();
  const addr=el("custAddress").value.trim();
  const note=el("custNote").value.trim();
  const {lines,subtotal}=cartLines(); const cur=state.menu.currency;
  const p=[];
  p.push(`*${state.menu.restaurantName}* - Paket Servis Siparişi`,"");
  if(name)p.push(`Müşteri: ${name}`);
  if(phone)p.push(`Tel: ${phone}`);
  if(addr)p.push(`Adres: ${addr}`,"");
  p.push(`*Sipariş:*`);
  for(const x of lines)p.push(`- ${x.qty} × ${x.name} = ${fmt(x.line,cur)}`);
  p.push("",`Ara Toplam: ${fmt(subtotal,cur)}`,`Ödeme: Kapıda ödeme`);
  if(note)p.push("",`Not: ${note}`);
  p.push("",`(Bu mesaj site üzerinden otomatik hazırlanmıştır.)`);
  return p.join("\n");
}
function waLink(){
  const raw=state.menu.whatsappE164.replace(/\D/g,"");
  return `https://wa.me/${raw}?text=${encodeURIComponent(buildMsg())}`;
}

function bind(){
  el("search").addEventListener("input",e=>{state.filter.q=e.target.value||"";renderMenu();});
  el("category").addEventListener("change",e=>{state.filter.cat=e.target.value;renderMenu();});
  el("clearCart").addEventListener("click",()=>{state.cart.clear();saveCart();renderAll();});
  el("sendBtn").addEventListener("click",()=>{const {subtotal}=cartLines(); if(subtotal<state.menu.minOrder) return; window.open(waLink(),"_blank");});
}
function renderHeader(){
  el("restName").textContent=state.menu.restaurantName;
  el("hours").textContent=state.menu.hours;
  el("areas").textContent=state.menu.deliveryAreas.join(", ");
}
function renderAll(){renderHeader();renderMenu();renderCart();}

async function init(){
  const res=await fetch("./menu.json",{cache:"no-store"});
  state.menu=await res.json();
  state.itemsById=new Map(state.menu.items.map(it=>[it.id,it]));
  loadCart(); buildCats(state.menu.items); bind(); renderAll();
}
window.inc=inc; window.dec=dec;
init();
