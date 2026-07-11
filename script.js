/* =========================================================
   AUTOSDRIVER - LÓGICA PRINCIPAL
========================================================= */

const EMPRESA = "AutosDriver";
let DATA = { vehiculos: [], motos: [] };
let CART = [];
let currentRentItem = null;

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  bindTabs();
  bindSearch();
  bindCartEvents();
});

async function loadData() {
  try {
    const res = await fetch("vehiculo.json");
    DATA = await res.json();
    renderGrid("vehiculos", DATA.vehiculos);
    renderGrid("motos", DATA.motos);
  } catch (err) {
    console.error("Error cargando vehiculo.json", err);
    Swal.fire("Error", "No se pudo cargar el catálogo de " + EMPRESA + ".", "error");
  }
}

/* ---------- TABS ---------- */
function bindTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.target;
      document.querySelectorAll(".catalog-panel").forEach(p => p.classList.remove("active"));
      document.getElementById("panel-" + target).classList.add("active");
    });
  });
}

/* ---------- SEARCH ---------- */
function bindSearch() {
  const input = document.getElementById("searchInput");
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    const filteredV = DATA.vehiculos.filter(v =>
      v.marca.toLowerCase().includes(q) || v.modelo.toLowerCase().includes(q));
    const filteredM = DATA.motos.filter(v =>
      v.marca.toLowerCase().includes(q) || v.modelo.toLowerCase().includes(q));
    renderGrid("vehiculos", filteredV);
    renderGrid("motos", filteredM);
  });
}

/* ---------- RENDER CARDS ---------- */
function renderGrid(type, items) {
  const grid = document.getElementById(type === "vehiculos" ? "gridVehiculos" : "gridMotos");
  grid.innerHTML = "";

  if (!items.length) {
    grid.innerHTML = `<p class="text-muted text-center">No se encontraron resultados.</p>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "vcard";
    card.innerHTML = `
      ${item.oferta_alquiler ? `<span class="offer-badge"><i class="fa-solid fa-tag"></i> ${item.oferta_alquiler}</span>` : ""}
      <div class="img-wrap"><img src="${item.imagen}" alt="${item.modelo}"></div>
      <div class="vcard-body">
        <div class="vcard-head">
          <img src="${item.logo}" alt="${item.marca}">
          <div class="titles">
            <h3>${item.marca} ${item.modelo}</h3>
            <small>${item.tipo} · ${item.categoria}</small>
          </div>
          <span class="code-tag">#${item.codigo}</span>
        </div>
        <p class="vcard-feats">${item.caracteristicas}</p>
        <ul class="price-list">
          <li><span>Venta</span><span>$${fmt(item.precio_venta)}</span></li>
          <li><span>Alquiler/Día</span><span>$${fmt(item.precio_alquiler_dia)}</span></li>
          <li><span>Alquiler/Hora</span><span>$${fmt(item.precio_alquiler_hora)}</span></li>
        </ul>
        <div class="vcard-actions">
          <button class="btn-rent" data-codigo="${item.codigo}" data-tipo="${type}">Alquilar</button>
          <button class="btn-buy" data-codigo="${item.codigo}" data-tipo="${type}">Comprar</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll(".btn-rent").forEach(b =>
    b.addEventListener("click", () => openRentModal(b.dataset.codigo, b.dataset.tipo)));
  grid.querySelectorAll(".btn-buy").forEach(b =>
    b.addEventListener("click", () => addToCartDirect(b.dataset.codigo, b.dataset.tipo, "venta")));
}

function fmt(n) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 });
}

function findItem(codigo, tipo) {
  const arr = tipo === "vehiculos" ? DATA.vehiculos : DATA.motos;
  return arr.find(v => String(v.codigo) === String(codigo));
}

/* ---------- COMPRA DIRECTA ---------- */
function addToCartDirect(codigo, tipo, modo) {
  const item = findItem(codigo, tipo);
  if (!item) return;
  CART.push({
    codigo: item.codigo,
    marca: item.marca,
    modelo: item.modelo,
    imagen: item.imagen,
    modo: "venta",
    detalle: "Compra",
    subtotal: item.precio_venta
  });
  updateCartUI();
  Swal.fire({
    icon: "success",
    title: "Agregado al carrito",
    text: `${item.marca} ${item.modelo} — Compra`,
    timer: 1400,
    showConfirmButton: false
  });
}

/* ---------- MODAL ALQUILER ---------- */
function openRentModal(codigo, tipo) {
  const item = findItem(codigo, tipo);
  if (!item) return;
  currentRentItem = item;

  document.getElementById("rentModalBody").innerHTML = `
    <div class="d-flex gap-3 align-items-center mb-3">
      <img src="${item.imagen}" style="width:90px;height:70px;object-fit:cover;border-radius:8px;">
      <div>
        <h5 class="mb-0">${item.marca} ${item.modelo}</h5>
        <small class="text-muted">#${item.codigo}</small>
      </div>
    </div>
    <div class="mb-3">
      <label class="form-label">Modalidad</label>
      <select class="form-select dark-modal" id="rentMode">
        <option value="hora">Por Hora — $${fmt(item.precio_alquiler_hora)}</option>
        <option value="dia">Por Día — $${fmt(item.precio_alquiler_dia)}</option>
      </select>
    </div>
    <div class="mb-3">
      <label class="form-label">Cantidad</label>
      <input type="number" min="1" value="1" id="rentQty" class="form-control dark-modal">
    </div>
    <h5>Subtotal: <span id="rentSubtotal" class="text-accent">$${fmt(item.precio_alquiler_hora)}</span></h5>
  `;

  const modeSel = document.getElementById("rentMode");
  const qtyInput = document.getElementById("rentQty");
  const subtotalEl = document.getElementById("rentSubtotal");

  const recalc = () => {
    const price = modeSel.value === "hora" ? item.precio_alquiler_hora : item.precio_alquiler_dia;
    const qty = Math.max(1, parseInt(qtyInput.value) || 1);
    subtotalEl.textContent = "$" + fmt(price * qty);
  };
  modeSel.addEventListener("change", recalc);
  qtyInput.addEventListener("input", recalc);

  new bootstrap.Modal(document.getElementById("rentModal")).show();
}

document.getElementById("confirmRentBtn")?.addEventListener("click", () => {
  if (!currentRentItem) return;
  const mode = document.getElementById("rentMode").value;
  const qty = Math.max(1, parseInt(document.getElementById("rentQty").value) || 1);
  const price = mode === "hora" ? currentRentItem.precio_alquiler_hora : currentRentItem.precio_alquiler_dia;
  const subtotal = price * qty;

  CART.push({
    codigo: currentRentItem.codigo,
    marca: currentRentItem.marca,
    modelo: currentRentItem.modelo,
    imagen: currentRentItem.imagen,
    modo: "alquiler",
    detalle: `Alquiler ${mode === "hora" ? qty + "h" : qty + "d"}`,
    subtotal
  });

  updateCartUI();
  bootstrap.Modal.getInstance(document.getElementById("rentModal")).hide();
  cleanupBackdrops();

  Swal.fire({
    icon: "success",
    title: "Agregado al carrito",
    text: `${currentRentItem.marca} ${currentRentItem.modelo} — Alquiler`,
    timer: 1400,
    showConfirmButton: false
  });
});

/* ---------- CARRITO ---------- */
function bindCartEvents() {
  document.getElementById("clearCartBtn").addEventListener("click", () => {
    CART = [];
    updateCartUI();
  });
  document.getElementById("generatePdfBtn").addEventListener("click", openCheckoutModal);
}

/* ---------- CHECKOUT / FACTURING ---------- */
function openCheckoutModal() {
  if (!CART.length) {
    Swal.fire("Carrito vacío", "Agrega al menos un vehículo antes de generar la factura.", "warning");
    return;
  }
  populateCheckoutPreview();
  const modal = new bootstrap.Modal(document.getElementById('checkoutModal'));
  modal.show();
  bindCheckoutEvents();
}

function bindCheckoutEvents(){
  const pm = document.getElementById('paymentMethod');
  pm.addEventListener('change', () => {
    const fn = document.getElementById('financingFields');
    fn.style.display = pm.value === 'financiamiento' ? 'block' : 'none';
  });

  ['finInicial','finMonto','finCuotas'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateFinancing);
  });

  document.getElementById('confirmBillingBtn').removeEventListener('click', confirmGenerateInvoice);
  document.getElementById('confirmBillingBtn').addEventListener('click', confirmGenerateInvoice);
}

function populateCheckoutPreview(){
  const preview = document.getElementById('checkoutPreview');
  preview.innerHTML = '';
  CART.forEach(it => {
    const div = document.createElement('div');
    div.className = 'vehicle-card';
    div.innerHTML = `
      <img src="${it.imagen}" alt="${it.modelo}">
      <div class="meta">
        <div style="font-weight:800">${it.marca} ${it.modelo}</div>
        <div style="color:#666">Código: #${it.codigo} · ${it.modo === 'venta' ? 'Venta' : 'Alquiler'}</div>
        <div style="margin-top:6px;color:#07152C;font-weight:700">Precio: $${fmt(it.subtotal)}</div>
      </div>
    `;
    preview.appendChild(div);
  });

  updateCheckoutTotals();
}

function updateCheckoutTotals(){
  const total = CART.reduce((s,it)=>s+it.subtotal,0);
  const itbis = Math.round(total * 0.18 * 100) / 100;
  const gastosAdmin = 0;
  const traspaso = 0;
  const descuento = 0;
  const totalGeneral = Math.round((total + itbis + gastosAdmin + traspaso - descuento) * 100) / 100;

  const el = document.getElementById('checkoutTotals');
  el.innerHTML = `
    <div class="row"><span>Subtotal</span><strong>$${fmt(total)}</strong></div>
    <div class="row"><span>ITBIS (18%)</span><strong>$${fmt(itbis)}</strong></div>
    <div class="row"><span>Gastos administrativos</span><strong>$${fmt(gastosAdmin)}</strong></div>
    <div class="row"><span>Traspaso</span><strong>$${fmt(traspaso)}</strong></div>
    <div class="row"><span>Descuento</span><strong>-$${fmt(descuento)}</strong></div>
    <div class="row total"><span>Total General</span><strong>$${fmt(totalGeneral)}</strong></div>
  `;
}

function updateFinancing(){
  const inicial = parseFloat(document.getElementById('finInicial').value) || 0;
  const monto = parseFloat(document.getElementById('finMonto').value) || 0;
  const cuotas = parseInt(document.getElementById('finCuotas').value) || 1;
  const montoFinanciado = Math.max(0, monto - inicial);
  const cuota = cuotas > 0 ? Math.round((montoFinanciado / cuotas) * 100) / 100 : 0;
  document.getElementById('finCuotaMensual').textContent = `$${fmt(cuota)}`;
}

function validateBillingForm(){
  const required = ['buyerNombre','buyerApellido','buyerId','buyerEmail','buyerPhone','buyerAddress','buyerCity','buyerProvince'];
  for(const id of required){
    const v = document.getElementById(id).value.trim();
    if(!v) return {ok:false,msg:'Complete todos los campos obligatorios.'};
  }
  const email = document.getElementById('buyerEmail').value.trim();
  if(!/^\S+@\S+\.\S+$/.test(email)) return {ok:false,msg:'Correo inválido.'};
  const idNum = document.getElementById('buyerId').value.trim();
  if(!/^\d+$/.test(idNum)) return {ok:false,msg:'La cédula debe contener solo números.'};
  const phone = document.getElementById('buyerPhone').value.trim();
  if(!/^[0-9()+\s-]{6,20}$/.test(phone)) return {ok:false,msg:'Teléfono inválido.'};
  return {ok:true};
}

async function confirmGenerateInvoice(){
  const v = validateBillingForm();
  if(!v.ok){ Swal.fire('Validación', v.msg, 'warning'); return; }

  // Recolectar datos
  const buyer = {
    nombre: document.getElementById('buyerNombre').value.trim(),
    apellido: document.getElementById('buyerApellido').value.trim(),
    id: document.getElementById('buyerId').value.trim(),
    email: document.getElementById('buyerEmail').value.trim(),
    telefono: document.getElementById('buyerPhone').value.trim(),
    direccion: document.getElementById('buyerAddress').value.trim(),
    ciudad: document.getElementById('buyerCity').value.trim(),
    provincia: document.getElementById('buyerProvince').value.trim(),
    codigo_postal: document.getElementById('buyerZip').value.trim()
  };

  const metodo = document.getElementById('paymentMethod').value;
  const financiamiento = metodo === 'financiamiento' ? {
    banco: document.getElementById('finBanco').value.trim(),
    inicial: parseFloat(document.getElementById('finInicial').value) || 0,
    monto: parseFloat(document.getElementById('finMonto').value) || 0,
    cuotas: parseInt(document.getElementById('finCuotas').value) || 0,
    cuota_mensual: document.getElementById('finCuotaMensual').textContent
  } : null;

  // Preparar datos de factura
  const fecha = new Date();
  const fechaStr = fecha.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = fecha.toLocaleTimeString();
  const facturaNumero = 'FAC-' + Date.now().toString().slice(-8);
  const comprobante = '';
  const estadoPago = metodo === 'efectivo' ? 'Pagado' : 'Pendiente';

  const subtotal = CART.reduce((s,it)=>s+it.subtotal,0);
  const itbis = Math.round(subtotal * 0.18 * 100) / 100;
  const gastosAdmin = 0; const traspaso = 0; const descuento = 0;
  const totalGeneral = Math.round((subtotal + itbis + gastosAdmin + traspaso - descuento) * 100) / 100;

  // Construir objeto de factura para guardar/enviar
  const invoice = {
    numero: facturaNumero,
    orden: 'ORD-' + Date.now().toString().slice(-6),
    fecha: fechaStr,
    hora: horaStr,
    estadoPago,
    comprobante,
    buyer,
    items: CART,
    subtotal, itbis, gastosAdmin, traspaso, descuento, totalGeneral,
    metodoPago: metodo,
    financiamiento
  };

  // Generar HTML y PDF (reusar generatePDF-like plantilla)
  const html = buildInvoiceHTML(invoice);

  // Mostrar loading
  Swal.fire({ title: 'Generando factura...', allowOutsideClick:false, didOpen:()=>Swal.showLoading() });

  // Guardar en DB (stub) — requiere endpoint en backend
  try{
    await fetch('/api/invoices', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(invoice)});
  }catch(e){ console.warn('No se pudo guardar en backend (endpoint /api/invoices faltante).', e); }

  // Generar PDF y descargar
  const opt = { margin:10, filename: `${invoice.numero}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
  try{
    await html2pdf().set(opt).from(html).save();
    // Actualizar inventario (stub)
    try{ await fetch('/api/inventory/update', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:CART})}); }catch(e){console.warn('Inventory endpoint missing');}
    // Enviar por correo (stub)
    try{ await fetch('/api/send-email', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:buyer.email,subject:`Factura ${invoice.numero}`,html})}); }catch(e){console.warn('Email endpoint missing');}
    // Limpiar carrito y UI
    CART = [];
    updateCartUI();
    Swal.fire('Listo','Factura generada y descargada.','success');
    bootstrap.Modal.getInstance(document.getElementById('checkoutModal')).hide();
    cleanupBackdrops();
  }catch(err){
    console.error(err);
    Swal.fire('Error','Ocurrió un problema generando la factura.','error');
  }
}

function buildInvoiceHTML(invoice){
  // Similar estructura que la plantilla anterior, pero con datos reales del formulario
  const itemsRows = invoice.items.map(it=>`
    <tr>
      <td style="padding:8px;border:1px solid #e6e6e6;">${it.marca} ${it.modelo} (#${it.codigo})</td>
      <td style="padding:8px;border:1px solid #e6e6e6;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #e6e6e6;text-align:right;">$${fmt(it.subtotal)}</td>
      <td style="padding:8px;border:1px solid #e6e6e6;text-align:right;">$0.00</td>
      <td style="padding:8px;border:1px solid #e6e6e6;text-align:right;">$0.00</td>
      <td style="padding:8px;border:1px solid #e6e6e6;text-align:right;font-weight:700;">$${fmt(it.subtotal)}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: 'Manrope', Arial, sans-serif;color:#111;padding:18px;max-width:820px;margin:0 auto;">
      <div style="background:#07152C;color:#fff;padding:18px;border-radius:6px;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;gap:12px;align-items:center"><img src="assets/logo_pagina.png" style="width:80px;height:80px;object-fit:contain"><div style="font-weight:800;font-size:20px">AutoDrive Elite</div></div>
        <div style="text-align:right"><div style="font-size:20px;font-weight:800">FACTURA DE COMPRA</div><div style="font-size:12px;color:#d6e3f0">${invoice.numero} · ${invoice.fecha} · ${invoice.hora}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div style="background:#fff;padding:12px;border-radius:6px;border:1px solid #e6e6e6">
          <strong>DATOS DEL COMPRADOR</strong>
          <div style="margin-top:8px;font-size:13px;color:#333">
            ${invoice.buyer.nombre} ${invoice.buyer.apellido}<br>
            ID: ${invoice.buyer.id}<br>
            ${invoice.buyer.direccion}<br>
            ${invoice.buyer.ciudad}, ${invoice.buyer.provincia} ${invoice.buyer.codigo_postal}<br>
            Tel: ${invoice.buyer.telefono} · ${invoice.buyer.email}
          </div>
        </div>
        <div style="background:#fff;padding:12px;border-radius:6px;border:1px solid #e6e6e6">
          <strong>DATOS DEL VEHÍCULO</strong>
          <div style="margin-top:8px;font-size:13px;color:#333">
            ${invoice.items.map(it=>`${it.marca} ${it.modelo} — Precio: $${fmt(it.subtotal)}`).join('<br>')}
          </div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:13px">
        <thead><tr style="background:#07152C;color:#fff"><th style="padding:8px;border:1px solid #e6e6e6">Detalle</th><th style="padding:8px;border:1px solid #e6e6e6">Cantidad</th><th style="padding:8px;border:1px solid #e6e6e6;text-align:right">Precio</th><th style="padding:8px;border:1px solid #e6e6e6;text-align:right">Impuestos</th><th style="padding:8px;border:1px solid #e6e6e6;text-align:right">Descuento</th><th style="padding:8px;border:1px solid #e6e6e6;text-align:right">Total</th></tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:12px;background:transparent">
        <div style="width:320px;background:transparent">
          <div style="display:flex;justify-content:space-between;padding:6px 0">Subtotal <span>$${fmt(invoice.subtotal)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:6px 0">ITBIS <span>$${fmt(invoice.itbis)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-weight:800;font-size:18px">Total General <span>$${fmt(invoice.totalGeneral)}</span></div>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center">
        <div style="width:60%">
          <div style="background:#fff;padding:12px;border-radius:6px;border:1px solid #e6e6e6">Método: ${invoice.metodoPago} · Estado: ${invoice.estadoPago}</div>
        </div>
        <div style="width:200px;text-align:center">
          <img src="assets/qrcode.png" style="width:140px;height:140px;object-fit:contain"><div style="font-size:12px;color:#666;margin-top:6px">Escanee para verificar la autenticidad.</div>
        </div>
      </div>
      <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:12px;color:#666">Sello digital</div>
        <div style="text-align:right;font-size:12px;color:#666">AutoDrive Elite · Dirección · Teléfono · contacto@autodrive.elite</div>
      </div>
    </div>
  `;
  return html;
}

function updateCartUI() {
  document.getElementById("cartCount").textContent = CART.length;
  document.getElementById("fabCartCount").textContent = CART.length;

  const body = document.getElementById("cartModalBody");
  if (!CART.length) {
    body.innerHTML = `<p class="text-muted text-center">Tu carrito está vacío.</p>`;
    document.getElementById("cartTotal").textContent = "$0.00";
    return;
  }

  let total = 0;
  body.innerHTML = CART.map((it, idx) => {
    total += it.subtotal;
    return `
      <div class="cart-item">
        <img src="${it.imagen}" alt="${it.modelo}">
        <div class="info">
          <strong>${it.marca} ${it.modelo}</strong><br>
          <span class="badge-type ${it.modo === 'venta' ? 'badge-venta' : 'badge-alquiler'}">${it.detalle}</span>
        </div>
        <div class="text-end">
          <div class="text-accent fw-bold">$${fmt(it.subtotal)}</div>
          <button class="btn btn-sm btn-outline-danger mt-1" onclick="removeFromCart(${idx})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;
  }).join("");

  document.getElementById("cartTotal").textContent = "$" + fmt(total);
}

function removeFromCart(idx) {
  CART.splice(idx, 1);
  updateCartUI();
}

function cleanupBackdrops() {
  document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());
  document.body.classList.remove("modal-open");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");
}

/* ---------- GENERACIÓN DE PDF (STRING LITERAL - MÉTODO INFALIBLE) ---------- */
function generatePDF() {
  if (!CART.length) {
    Swal.fire("Carrito vacío", "Agrega al menos un vehículo antes de generar el documento.", "warning");
    return;
  }

  const tieneVenta = CART.some(it => it.modo === "venta");
  const tieneAlquiler = CART.some(it => it.modo === "alquiler");

  let titulo = "FACTURA DE VENTA";
  if (tieneVenta && tieneAlquiler) titulo = "FACTURA DE VENTA Y CONTRATO DE ALQUILER";
  else if (tieneAlquiler) titulo = "CONTRATO DE ALQUILER Y ACUERDO DE RESPONSABILIDAD";

  const incluyeClausula = tieneAlquiler; // alquiler puro o mixto

  const fecha = new Date().toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" });
  const docId = "AD-" + Date.now().toString().slice(-8);

  let tableRows = "";
  let total = 0;
  CART.forEach((it, idx) => {
    const qty = it.cantidad || 1;
    const price = it.subtotal; // representamos el subtotal como precio por línea
    const impuestos = 0; // presentación (el cálculo fiscal real no se modifica aquí)
    const descuento = 0;
    const lineaTotal = it.subtotal;
    total += lineaTotal;
    tableRows += `
      <tr>
        <td style="padding:8px;border:1px solid #e6e6e6;text-align:left;">
          <div style="display:flex;gap:8px;align-items:center;">
            <img src="${it.imagen}" style="width:70px;height:50px;object-fit:cover;border-radius:6px;border:1px solid #eee;">
            <div style="font-size:13px;color:#222;">${it.marca} ${it.modelo}<br><small style=\"color:#666;\">Código: #${it.codigo}</small></div>
          </div>
        </td>
        <td style="padding:8px;border:1px solid #e6e6e6;text-align:center;">${qty}</td>
        <td style="padding:8px;border:1px solid #e6e6e6;text-align:right;">$${fmt(price)}</td>
        <td style="padding:8px;border:1px solid #e6e6e6;text-align:right;">$${fmt(impuestos)}</td>
        <td style="padding:8px;border:1px solid #e6e6e6;text-align:right;">$${fmt(descuento)}</td>
        <td style="padding:8px;border:1px solid #e6e6e6;text-align:right;font-weight:700;">$${fmt(lineaTotal)}</td>
      </tr>
    `;
  });

  const hora = new Date().toLocaleTimeString();
  const ordenId = 'ORD-' + Date.now().toString().slice(-6);

  const itbis = Math.round(total * 0.18 * 100) / 100; // 18% para presentación
  const descuentoTotal = 0;
  const totalGeneral = Math.round((total + itbis - descuentoTotal) * 100) / 100;

  const htmlStringDefinitivo = `
    <div class="invoice-root" style="font-family: 'Manrope', Arial, sans-serif; color:#111; padding:18px; max-width:820px; margin:0 auto;">
      <style>
        .inv-header{background:#07152C;color:#fff;padding:18px;border-radius:6px 6px 0 0;display:flex;align-items:center;justify-content:space-between;gap:12px}
        .inv-brand{display:flex;align-items:center;gap:12px}
        .inv-brand img{width:84px;height:84px;object-fit:contain;border-radius:6px}
        .inv-company{font-weight:800;font-size:20px;color:#fff}
        .inv-title{font-size:20px;font-weight:800;color:#fff;text-align:right}
        .inv-meta{color:#d6e3f0;font-size:12px;text-align:right;margin-top:6px}

        .inv-body{background:#f7f9fb;padding:18px;border:1px solid #e9eef5;border-top:none}
        .cards-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}
        .card-white{background:#fff;border:1px solid #e6e6e6;padding:14px;border-radius:6px}
        .card-title{font-size:13px;font-weight:700;color:#333;margin-bottom:8px}

        .table-prof{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
        .table-prof thead th{background:#07152C;color:#fff;padding:10px;border:1px solid #e6e6e6;font-weight:700}
        .table-prof td{padding:10px;border:1px solid #e6e6e6;background:#fff}

        .summary{display:flex;justify-content:flex-end;margin-top:12px}
        .summary .box{width:320px;background:transparent}
        .summary .row{display:flex;justify-content:space-between;padding:6px 0;color:#333}
        .summary .total{font-size:18px;font-weight:800;color:#07152C}

        .payment-card{margin-top:16px}
        .bottom-row{display:grid;grid-template-columns:1fr 260px;gap:16px;margin-top:18px}
        .qr-box{border:1px solid #e6e6e6;border-radius:6px;padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff}
        .qr-box img{width:140px;height:140px;object-fit:contain}
        .observations{background:#fff;padding:12px;border-radius:6px;border:1px solid #e6e6e6}

        .signs{display:flex;justify-content:space-between;margin-top:18px;gap:20px}
        .sign-line{width:45%;text-align:center}
        .sign-line .line{border-top:1px solid #333;margin-top:44px;padding-top:6px}

        .seal-barcode{display:flex;align-items:center;gap:12px;margin-top:10px}
        .seal-barcode img{height:54px}

        .inv-footer{margin-top:18px;padding-top:10px;border-top:1px solid #e6e6e6;font-size:12px;color:#555;display:flex;justify-content:space-between;align-items:center}

        @media print{body{margin:0} .invoice-root{padding:8px}}
      </style>

      <div class="inv-header">
        <div class="inv-brand">
          <img src="assets/logo_pagina.png" alt="logo">
          <div>
            <div class="inv-company">AutoDrive Elite</div>
            <div style="font-size:12px;color:#cfe0f3">Vehículos · Concesionario · Servicio</div>
          </div>
        </div>
        <div style="min-width:320px;text-align:right">
          <div class="inv-title">${titulo}</div>
          <div class="inv-meta">Factura: ${docId} · Orden: ${ordenId}<br>Fecha: ${fecha} · Hora: ${hora}<br>Estado: Emitido</div>
        </div>
      </div>

      <div class="inv-body">
        <div class="cards-grid">
          <div class="card-white">
            <div class="card-title">DATOS DEL COMPRADOR</div>
            <div style="font-size:13px;color:#444;line-height:1.4">
              <strong>Nombre:</strong> ________________________________<br>
              <strong>RNC/ID:</strong> ________________________________<br>
              <strong>Dirección:</strong> ________________________________<br>
              <strong>Teléfono:</strong> ________________________________<br>
              <strong>Correo:</strong> ________________________________
            </div>
          </div>
          <div class="card-white">
            <div class="card-title">DATOS DEL VEHÍCULO</div>
            <div style="font-size:13px;color:#444;line-height:1.4">
              ${CART.map(it => `<div style="margin-bottom:8px;"><strong>${it.marca} ${it.modelo}</strong><br><small style=\"color:#666;\">Código: #${it.codigo} · Tipo: ${it.modo === 'venta' ? 'Venta' : 'Alquiler'}</small></div>`).join('')}
            </div>
          </div>
        </div>

        <table class="table-prof">
          <thead>
            <tr>
              <th>Detalle</th>
              <th>Cantidad</th>
              <th style="text-align:right">Precio</th>
              <th style="text-align:right">Impuestos</th>
              <th style="text-align:right">Descuento</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="summary">
          <div class="box">
            <div class="row"><span>Subtotal</span><span>$${fmt(total)}</span></div>
            <div class="row"><span>ITBIS (18%)</span><span>$${fmt(itbis)}</span></div>
            <div class="row"><span>Descuento</span><span>-$${fmt(descuentoTotal)}</span></div>
            <div class="row total"><span>Total General</span><span>$${fmt(totalGeneral)}</span></div>
          </div>
        </div>

        <div class="payment-card card-white">
          <div class="card-title">DETALLES DE PAGO</div>
          <div style="display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:#333">
            <div><strong>Método:</strong> Transferencia / Tarjeta</div>
            <div><strong>Banco:</strong> ____________________</div>
            <div><strong>Número de referencia:</strong> ____________________</div>
            <div><strong>Fecha de pago:</strong> ____________________</div>
            <div><strong>Estado del pago:</strong> Pendiente / Completado</div>
          </div>
        </div>

        <div class="bottom-row">
          <div>
            <div class="observations">
              <div style="font-weight:700;margin-bottom:8px;color:#333">Observaciones</div>
              <div style="font-size:13px;color:#444;line-height:1.4">— ____________________________________________________________</div>
            </div>
            <div class="signs">
              <div class="sign-line">
                <div class="line">Firma del Comprador</div>
              </div>
              <div class="sign-line">
                <div class="line">Firma del Vendedor</div>
              </div>
            </div>
          </div>

          <div>
            <div class="qr-box">
              <img src="assets/qrcode.png" alt="qr">
              <div style="font-size:12px;color:#666;margin-top:8px;text-align:center">Escanee para verificar la autenticidad.</div>
            </div>
            <div class="seal-barcode">
              <img src="assets/sello_digital.png" alt="sello">
              <img src="assets/codigo_barras.png" alt="barcode">
            </div>
          </div>
        </div>

        <div class="inv-footer">
          <div>
            <strong>AutoDrive Elite</strong><br>
            Dirección: __________________ • Tel: __________________ • Correo: contacto@autodrive.elite
          </div>
          <div style="text-align:right;font-size:12px;color:#666">www.autodrive-elite.example</div>
        </div>

      </div>
    </div>
  `;

  // Cerrar el modal del carrito antes de generar (evita cuelgues de backdrop)
  const cartModalEl = document.getElementById("cartModal");
  const instance = bootstrap.Modal.getInstance(cartModalEl);
  if (instance) instance.hide();
  cleanupBackdrops();

  const opt = {
    margin: 10,
    filename: `${titulo.replace(/ /g, "_")}_${docId}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  Swal.fire({
    title: "Generando documento...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  html2pdf().set(opt).from(htmlStringDefinitivo).save().then(() => {
    CART = [];
    updateCartUI();
    Swal.fire({
      icon: "success",
      title: "¡Documento generado!",
      text: `Tu ${titulo.toLowerCase()} se descargó correctamente.`,
    });
  }).catch(err => {
    console.error(err);
    Swal.fire("Error", "Ocurrió un problema generando el PDF. Intenta nuevamente.", "error");
  });
}
