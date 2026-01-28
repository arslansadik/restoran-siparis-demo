const state = {
  menu: null,
  itemsById: new Map(),
  cart: new Map(),
  filter: { q: "", cat: "Tümü" },
};

const el = (id) => document.getElementById(id);

function fmtPrice(n, currency){ return `${Number(n).toFixed(0)} ${currency}`; }

function loadCart(){
  try{
    const raw = localStorage.getItem("demo_cart_v2");
    if(!raw) return;
    const obj = JSON.parse(raw);
    state.cart = new Map(Object.entries(obj).map(([k,v])=>[k, Number(v)||0]).filter(([,v])=>v>0));
  }catch(e){}
}

function saveCart(){
  const obj = {};
  for(const [k,v] of state.cart.entries()) obj[k]=v;
  localStorage.setItem("demo_cart_v2", JSON.stringify(obj));
}

function setQty(id, qty){
  if(qty<=0) state.cart.delete(id);
  else state.cart.set(id, qty);
  saveCart();
  renderAll();
}

function inc(id){ setQty(id, (state.cart.get(id)||0)+1); }
function dec(id){ setQty(id, (state.cart.get(id)||0)-1); }

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function buildCategories(items){
  const cats = ["Tümü", ...Array.from(new Set(items.map(x=>x.category))).sort((a,b)=>a.localeCompare(b,'tr'))];
  const sel = el("category");
  sel.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  sel.value = state.filter.cat;
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

function renderHeaderInfo(){
  el("restName").textContent = state.menu.restaurantName;
  el("hours").textContent = state.menu.hours || "";
  el("areas").textContent = (state.menu.deliveryAreas || []).join(", ");
  el("minOrder").textContent = fmtPrice(state.menu.minOrder || 0, state.menu.currency);
}

function renderMenu(){
  const items = filteredItems();
  el("menuCount").textContent = `${items.length} ürün`;
  el("menuCards").innerHTML = items.map(it => {
    const qty = state.cart.get(it.id) || 0;
    const tags = (it.tags||[]).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");
    const img = it.image ? `<div class="thumb"><img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.name)}" loading="lazy" /></div>` : "";
    return `
      <article class="card">
        ${img}
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
  }).join("") || `<div class="card"><p>Filtreye uygun ürün yok.</p></div>`;
}

function cartLines(){
  const lines = [];
  let subtotal = 0;
  for(const [id,qty] of state.cart.entries()){
    const it = state.itemsById.get(id);
    if(!it) continue;
    const line = Number(it.price) * qty;
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

  const min = Number(state.menu.minOrder || 0);
  const minOk = subtotal >= min;
  el("minStatus").innerHTML = minOk
    ? `<span>Minimum sepet: <strong style="color:var(--ok)">tamam</strong></span>`
    : `<span>Minimum için: <strong style="color:var(--warn)">${fmtPrice(min - subtotal, cur)}</strong></span>`;

  el("cartItems").innerHTML = lines.length ? lines.map(x=>`
    <div class="cart-row">
      <div>
        <div><strong>${escapeHtml(x.name)}</strong></div>
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
}

function buildWhatsappMessage(){
  const name = el("custName").value.trim();
  const phone = el("custPhone").value.trim();
  const address = el("custAddress").value.trim();
  const note = el("custNote").value.trim();

  const {lines, subtotal} = cartLines();
  const cur = state.menu.currency;

  const parts = [];
  parts.push(`*${state.menu.restaurantName}* - Paket Servis Siparişi`, ``);
  if(name) parts.push(`Müşteri: ${name}`);
  if(phone) parts.push(`Tel: ${phone}`);
  if(address) parts.push(`Adres: ${address}`);
  parts.push(``, `*Sipariş:*`);
  for(const x of lines){
    parts.push(`- ${x.qty} × ${x.name} = ${fmtPrice(x.line, cur)}`);
  }
  parts.push(``, `Ara Toplam: ${fmtPrice(subtotal, cur)}`, `Ödeme: Kapıda ödeme`);
  if(note) parts.push(``, `Not: ${note}`);
  parts.push(``, `(Bu mesaj site üzerinden otomatik hazırlanmıştır.)`);
  return parts.join("\n");
}

function whatsappLink(){
  const raw = String(state.menu.whatsappE164 || "").replace(/\D/g, "");
  return `https://wa.me/${raw}?text=${encodeURIComponent(buildWhatsappMessage())}`;
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
    state.cart.clear(); saveCart(); renderAll();
  });
  el("sendBtn").addEventListener("click", ()=>{
    const {subtotal} = cartLines();
    if(subtotal < Number(state.menu.minOrder||0)) return;
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
