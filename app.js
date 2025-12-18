const state = {
  menu: null,
  itemsById: new Map(),
  cart: new Map(), // id -> qty
  filter: { q: "", cat: "Tümü" },
};

const el = (id) => document.getElementById(id);

function fmtPrice(n, currency){
  return `${n.toFixed(0)} ${currency}`;
}

function loadCart(){
  try{
    const raw = localStorage.getItem("demo_cart_v1");
    if(!raw) return;
    const obj = JSON.parse(raw);
    state.cart = new Map(Object.entries(obj).map(([k,v])=>[k, Number(v)||0]).filter(([,v])=>v>0));
  }catch(e){}
}

function saveCart(){
  const obj = {};
  for(const [k,v] of state.cart.entries()) obj[k]=v;
  localStorage.setItem("demo_cart_v1", JSON.stringify(obj));
}

function setQty(id, qty){
  if(qty<=0) state.cart.delete(id);
  else state.cart.set(id, qty);
  saveCart();
  renderAll();
}

function inc(id){ setQty(id, (state.cart.get(id)||0)+1); }
function dec(id){ setQty(id, (state.cart.get(id)||0)-1); }

function buildCategories(items){
  const cats = ["Tümü", ...Array.from(new Set(items.map(x=>x.category))).sort((a,b)=>a.localeCompare(b,'tr'))];
  const sel = el("category");
  sel.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  sel.value = state.filter.cat;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function filteredItems(){
  const q = state.filter.q.trim().toLowerCase();
  const cat = state.filter.cat;
  return state.menu.items.filter(it=>{
    if(cat !== "Tümü" && it.category !== cat) return false;
    if(!q) return true;
    const hay = `${it.name} ${it.desc||""} ${it.category} ${(it.tags||[]).join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}

function renderMenu(){
  const items = filteredItems();
  el("menuCount").textContent = `${items.length} ürün`;
  const cards = items.map(it => {
    const qty = state.cart.get(it.id) || 0;
    const tags = (it.tags||[]).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");
    return `
      <article class="card">
        <div class="top">
          <div>
            <h3>${escapeHtml(it.name)}</h3>
            <p>${escapeHtml(it.desc || "")}</p>
          </div>
          <div class="price">${fmtPrice(it.price, state.menu.currency)}</div>
        </div>
        <div class="tags">${tags}</div>
        <div class="actions">
          <div class="qty">
            <button class="btn" aria-label="azalt" onclick="dec('${escapeHtml(it.id)}')">−</button>
            <span>${qty}</span>
            <button class="btn primary" aria-label="artır" onclick="inc('${escapeHtml(it.id)}')">+</button>
          </div>
          <button class="btn ok" onclick="inc('${escapeHtml(it.id)}')">Sepete Ekle</button>
        </div>
      </article>
    `;
  }).join("");
  el("menuCards").innerHTML = cards || `<div class="card"><p>Filtreye uygun ürün yok.</p></div>`;
}

function cartLines(){
  const lines = [];
  let subtotal = 0;
  for(const [id,qty] of state.cart.entries()){
    const it = state.itemsById.get(id);
    if(!it) continue;
    const line = it.price * qty;
    subtotal += line;
    lines.push({id, qty, name: it.name, line, price: it.price});
  }
  lines.sort((a,b)=>a.name.localeCompare(b.name,'tr'));
  return {lines, subtotal};
}

function renderCart(){
  const {lines, subtotal} = cartLines();
  const cur = state.menu.currency;
  el("subtotal").textContent = fmtPrice(subtotal, cur);
  el("minOrder").textContent = fmtPrice(state.menu.minOrder, cur);

  const minOk = subtotal >= state.menu.minOrder;
  el("minStatus").innerHTML = minOk
    ? `<span class="note"><b class="ok">Minimum sepet tamam.</b></span>`
    : `<span class="note"><b class="warn">Minimum sepet için</b> ${fmtPrice(state.menu.minOrder - subtotal, cur)} daha ekleyin.</span>`;

  el("cartItems").innerHTML = lines.length ? lines.map(x=>`
    <div class="cart-row">
      <div class="meta">
        <div class="line">${escapeHtml(x.name)}</div>
        <small>${x.qty} × ${fmtPrice(x.price, cur)}</small>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
        <div><strong>${fmtPrice(x.line, cur)}</strong></div>
        <div style="display:flex;gap:6px;">
          <button class="btn" onclick="dec('${escapeHtml(x.id)}')">−</button>
          <button class="btn primary" onclick="inc('${escapeHtml(x.id)}')">+</button>
        </div>
      </div>
    </div>
  `).join("") : `<div class="note">Sepet boş. Menüden ürün ekleyin.</div>`;

  el("sendBtn").disabled = lines.length === 0 || !minOk;
  el("sendBtn").classList.toggle("primary", lines.length && minOk);
}

function buildWhatsappMessage(){
  const name = el("custName").value.trim();
  const phone = el("custPhone").value.trim();
  const address = el("custAddress").value.trim();
  const note = el("custNote").value.trim();

  const {lines, subtotal} = cartLines();
  const cur = state.menu.currency;

  const parts = [];
  parts.push(`*${state.menu.restaurantName}* - Paket Servis Siparişi`);
  parts.push(``);
  if(name) parts.push(`Müşteri: ${name}`);
  if(phone) parts.push(`Tel: ${phone}`);
  if(address) parts.push(`Adres: ${address}`);
  parts.push(``);
  parts.push(`*Sipariş:*`);
  for(const x of lines){
    parts.push(`- ${x.qty} × ${x.name} = ${fmtPrice(x.line, cur)}`);
  }
  parts.push(``);
  parts.push(`Ara Toplam: ${fmtPrice(subtotal, cur)}`);
  parts.push(`Ödeme: Kapıda ödeme`);
  if(note) { parts.push(``); parts.push(`Not: ${note}`); }
  parts.push(``); parts.push(`(Bu mesaj site üzerinden otomatik hazırlanmıştır.)`);

  return parts.join("\n");
}

function whatsappLink(){
  const raw = state.menu.whatsappE164.replace(/\D/g, "");
  const msg = buildWhatsappMessage();
  const encoded = encodeURIComponent(msg);
  return `https://wa.me/${raw}?text=${encoded}`;
}

function renderHeaderInfo(){
  el("restName").textContent = state.menu.restaurantName;
  el("hours").textContent = state.menu.hours;
  el("areas").textContent = state.menu.deliveryAreas.join(", ");
}

function bindUI(){
  el("search").addEventListener("input", (e)=>{
    state.filter.q = e.target.value || "";
    renderMenu();
  });
  el("category").addEventListener("change", (e)=>{
    state.filter.cat = e.target.value;
    renderMenu();
  });
  el("clearCart").addEventListener("click", ()=>{
    state.cart.clear();
    saveCart();
    renderAll();
  });
  el("sendBtn").addEventListener("click", ()=>{
    const {subtotal} = cartLines();
    if(subtotal < state.menu.minOrder) return;
    window.open(whatsappLink(), "_blank");
  });
}

function renderAll(){
  renderHeaderInfo();
  renderMenu();
  renderCart();
}

async function init(){
  const res = await fetch("./menu.json", {cache:"no-store"});
  state.menu = await res.json();
  state.itemsById = new Map(state.menu.items.map(it=>[it.id, it]));
  loadCart();
  buildCategories(state.menu.items);
  bindUI();
  renderAll();
}

window.inc = inc;
window.dec = dec;

init();
