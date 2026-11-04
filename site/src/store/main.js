import '../tailwind.css';
import './styles.css';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";

import { firebaseConfig } from '../shared/firebaseConfig.js';
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------- reference data ---------- */
const CATEGORY_LIST = [
  { key:'wedding',    name:'توزيعات أفراح' },
  { key:'engagement', name:'توزيعات خطوبة' },
  { key:'success',    name:'توزيعات نجاح' },
  { key:'baby',       name:'استقبال المواليد' },
  { key:'birthday',   name:'أعياد الميلاد' },
  { key:'corporate',  name:'هدايا الشركات' },
  { key:'vip',        name:'هدايا VIP' },
  { key:'custom',     name:'بوكسات حسب الطلب' },
  { key:'jertig',     name:'توزيعات جرتق' },
  { key:'misc',       name:'توزيعات منوعة' },
];
const PACKAGES = [
  { key:'engagement', name:'بكج فال خطوبة', desc:'توزيعات ناعمة بتفاصيل تليق بفرحتكم', icon:'fa-ring',           img:'photo-1522673607200-164d1b6ce486' },
  { key:'success',    name:'بكج فال تخرج',  desc:'توزيعات مميزة لنجاحك وفرحتك',         icon:'fa-graduation-cap', img:'photo-1513151233558-d860c5398176' },
  { key:'wedding',    name:'بكج فال عرس',   desc:'توزيعات فاخرة تناسب ليلة العمر',      icon:'fa-ring',           img:'photo-1519741497674-611481863552' },
  { key:'baby',       name:'بكج ولادة',     desc:'توزيعات وباقات خاصة بالمولود بكل تفاصيلها الجميلة', icon:'fa-baby', img:'photo-1519167758481-83f550bb49b3' },
];
const GENERAL = [
  { key:'all',        name:'توزيعات لكل المناسبات', img:'photo-1607344645866-009c320b63e0', arrow:'plus' },
  { key:'jertig',     name:'توزيعات جرتق',   img:'photo-1549465220-1a8b9238cd48', arrow:'plus' },
  { key:'engagement', name:'توزيعات خطوبة',  img:'photo-1522673607200-164d1b6ce486', arrow:'plus' },
  { key:'success',    name:'توزيعات تخرج',   img:'photo-1513151233558-d860c5398176', arrow:'plus' },
  { key:'baby',       name:'توزيعات ولادة',  img:'photo-1519167758481-83f550bb49b3', arrow:'left' },
  { key:'wedding',    name:'توزيعات عرس',    img:'photo-1519741497674-611481863552', arrow:'left' },
  { key:'misc',       name:'توزيعات منوعة',  img:'photo-1567696911980-2eed69a46042', arrow:'left' },
];
const REVIEWS = [
  { name:'مريم أحمد', occ:'عروس ٢٠٢٦', text:'التوزيعات كانت أجمل من الخيال، كل ضيوفي سألوني عن المكان! تفاصيل تستحق كل جنيه.' },
  { name:'سارة خالد', occ:'خطوبة', text:'تعامل راقي واهتمام بأدق التفاصيل، فريق وشلي فهم ذوقي من أول مكالمة.' },
  { name:'نور الهدى', occ:'مناسبة شركة', text:'هدايا الشركة كانت راقية جداً وعملائنا سعدوا بها كثيراً، سنكرر التعامل بالتأكيد.' },
  { name:'ياسمين محمود', occ:'استقبال مولود', text:'تنظيم ودقة في المواعيد، والتغليف كان أجمل من المنتج نفسه!' },
];
const FAQS = [
  { q:'كم يستغرق تجهيز الطلب؟', a:'مدة التجهيز تتراوح من 5 إلى 14 يوم عمل حسب حجم الطلب ودرجة التخصيص المطلوبة.' },
  { q:'هل يمكن تخصيص الألوان والتصميم؟', a:'بالطبع، قسم "بوكسات حسب الطلب" مخصص بالكامل لتصميم توزيعتك بألوانك وأفكارك الخاصة.' },
  { q:'ما هي مناطق التوصيل المتاحة؟', a:'نوصل لجميع ولايات السودان، مع إمكانية الشحن الدولي لبعض الدول العربية.' },
  { q:'هل تتوفر عينات قبل الطلب الكامل؟', a:'نعم، يمكنك طلب عينة واحدة لمعاينة الجودة قبل تأكيد الكمية الكاملة.' },
  { q:'ما طرق الدفع المتاحة؟', a:'الدفع عند الاستلام، التحويل البنكي، أو الدفع الإلكتروني عبر بطاقات الائتمان.' },
];
const GALLERY_IMGS = [
  ['photo-1519741497674-611481863552',420],['photo-1519225421980-715cb0215aed',300],['photo-1607344645866-009c320b63e0',380],
  ['photo-1549465220-1a8b9238cd48',280],['photo-1519167758481-83f550bb49b3',360],['photo-1522673607200-164d1b6ce486',320],
  ['photo-1513151233558-d860c5398176',300],['photo-1567696911980-2eed69a46042',400],['photo-1519741497674-611481863552',300],
];

let products = [], offers = [], cart = [], wishlist = [];
let currentFilter = 'all', reviewIndex = 0, activeOfferEndTs = null, productsLoaded = false;
window._catFilter = null;

function imgUrl(id, w=700){
  if(!id) return `https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=${w}&q=80&auto=format`;
  if(id.startsWith('data:') || id.startsWith('http')) return id;
  return `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format`;
}
const tracked=(p)=>typeof p.stock==='number';
const avail=(p)=>tracked(p)?Math.max(0,p.stock):Infinity;
function stockBadge(p){ if(!tracked(p)) return ''; if(p.stock<=0) return '<span class="absolute inset-x-0 bottom-0 bg-ink/75 text-white text-center text-sm font-bold py-2">نفدت الكمية</span>'; const low=typeof p.minStock==='number'?p.minStock:3; return p.stock<=low?`<span class="absolute bottom-3 right-3 bg-white/95 text-mauveD text-[11px] font-bold px-2.5 py-1 rounded-full shadow">باقي ${p.stock} فقط</span>`:''; }
function catName(key){ return CATEGORY_LIST.find(c=>c.key===key)?.name || key; }

/* ---------- live Firestore ---------- */
onSnapshot(collection(db,'products'), snap => { products = snap.docs.map(d=>({ id:d.id, ...d.data() })); productsLoaded = true; renderProducts(); });
onSnapshot(collection(db,'offers'), snap => { offers = snap.docs.map(d=>({ id:d.id, ...d.data() })); renderOfferSection(); });
onSnapshot(doc(db,'settings','store'), snap => { if(snap.exists() && snap.data().heroImage) document.getElementById('heroImg').src = snap.data().heroImage; });

/* ---------- reveal / scroll ---------- */
const io = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold:.12 });
function observeReveals(){ document.querySelectorAll('.reveal:not(.in)').forEach(el=>io.observe(el)); }
window.addEventListener('scroll', ()=>{ const y=window.scrollY, t=document.getElementById('toTop'); t.classList.toggle('opacity-0', y<500); t.classList.toggle('pointer-events-none', y<500); });

/* ---------- packages + general ---------- */
function renderPackages(){
  document.getElementById('pkgGrid').innerHTML = PACKAGES.map(p=>`
    <div class="pkg-card reveal text-center pb-4">
      <div class="pkg-img"><img src="${imgUrl(p.img,600)}" alt="${p.name}" loading="lazy"></div>
      <div class="pkg-ico"><i class="fa-solid ${p.icon}"></i></div>
      <h3 class="font-bold mt-2 text-[15px]">${p.name}</h3>
      <p class="text-[11px] text-ink/60 px-4 mt-1 mb-3 min-h-[32px] leading-5">${p.desc}</p>
      <button onclick="filterByCategory('${p.key}')" class="btn !py-1.5 !px-6 text-[12px]">عرض البكج</button>
    </div>`).join('');
  document.getElementById('genGrid').innerHTML = GENERAL.map(g=>`
    <button onclick="${g.key==='all' ? "goCollection('all')" : `filterByCategory('${g.key}')`}" class="gen-card reveal text-center">
      <img src="${imgUrl(g.img,400)}" alt="${g.name}" loading="lazy">
      <p class="text-[11px] font-bold px-1 pt-2 leading-4 min-h-[34px]">${g.name}</p>
      <i class="fa-solid ${g.arrow==='plus'?'fa-plus':'fa-arrow-left'} text-mauve text-[10px] pb-2 block"></i>
    </button>`).join('');
  observeReveals();
}

/* ---------- filters + products ---------- */
function renderFilterTabs(){
  const tabs = [{key:'all',name:'الكل'},{key:'bestseller',name:'الأكثر مبيعاً'},{key:'new',name:'وصل حديثاً'},{key:'sale',name:'عروض'}];
  document.getElementById('filterTabs').innerHTML = tabs.map(t=>`<button onclick="setTagFilter('${t.key}')" class="px-5 py-2 rounded-full text-sm border transition ${currentFilter===t.key && !window._catFilter ? 'bg-mauve border-mauve text-white font-bold':'border-[#DDBFC1] bg-white hover:bg-blushL'}">${t.name}</button>`).join('');
}
window.setTagFilter = (key)=>{ window._catFilter=null; currentFilter=key; renderFilterTabs(); renderProducts(); };
window.goCollection = (tag)=>{ window._catFilter=null; currentFilter=tag||'all'; renderFilterTabs(); renderProducts(); document.getElementById('collection').scrollIntoView({behavior:'smooth'}); };
window.filterByCategory = (catKey)=>{ window._catFilter=catKey; currentFilter='all'; renderFilterTabs(); renderProducts(); document.getElementById('collection').scrollIntoView({behavior:'smooth'}); };

function renderProducts(){
  const gridEl = document.getElementById('productGrid');
  if(!productsLoaded){
    gridEl.innerHTML = Array.from({length:8}).map(()=>`<div class="rounded-2xl overflow-hidden border border-blush bg-white"><div class="skel aspect-[4/5]"></div><div class="p-4 space-y-2"><div class="skel h-3 w-1/3 rounded"></div><div class="skel h-4 w-2/3 rounded"></div></div></div>`).join('');
    document.getElementById('resultCount').textContent='…'; return;
  }
  let list = [...products];
  if(window._catFilter) list = list.filter(p=>p.cat===window._catFilter);
  if(currentFilter!=='all') list = list.filter(p=>p.tag===currentFilter);
  const sort = document.getElementById('sortSelect')?.value || 'new';
  if(sort==='priceAsc') list.sort((a,b)=>a.price-b.price);
  if(sort==='priceDesc') list.sort((a,b)=>b.price-a.price);
  if(sort==='bestseller') list = list.filter(p=>p.tag==='bestseller').concat(list.filter(p=>p.tag!=='bestseller'));
  document.getElementById('resultCount').textContent = list.length;
  document.getElementById('activeCatLabel').textContent = window._catFilter ? '— ' + catName(window._catFilter) : '';
  if(!list.length){
    gridEl.innerHTML = products.length===0
      ? `<div class="col-span-full text-center py-16"><i class="fa-solid fa-gift text-4xl text-mauve/40 mb-4"></i><p class="font-bold mb-1">التشكيلة قيد التجهيز</p><p class="text-ink/50 text-sm">قريباً ستجدين هنا أحدث تصاميمنا</p></div>`
      : `<p class="col-span-full text-center text-ink/50 py-10">لا توجد تصاميم مطابقة، جربي فلتر آخر.</p>`;
    return;
  }
  gridEl.innerHTML = list.map(p=>`
    <div class="product-card bg-white rounded-2xl overflow-hidden border border-blush shadow-sm">
      <div class="img-wrap relative aspect-[4/5] cursor-pointer" onclick="openProductView('${p.id}')">
        <img src="${imgUrl(p.img,600)}" class="w-full h-full object-cover" alt="${p.name}" loading="lazy">
        ${p.gallery&&p.gallery.length?`<span class="absolute top-3 left-3 bg-mauveD/75 text-white text-[11px] px-2.5 py-1 rounded-full"><i class="fa-solid fa-images ml-1"></i>${p.gallery.length+1}</span>`:''}
        ${p.badge?`<span class="absolute top-3 right-3 bg-mauve text-white text-xs font-bold px-3 py-1 rounded-full">${p.badge}</span>`:''}
        ${stockBadge(p)}
        <div class="quick-actions absolute bottom-3 inset-x-3 flex gap-2">
          <button ${avail(p)<=0?'disabled':''} onclick="event.stopPropagation(); addToCart('${p.id}')" class="flex-1 bg-mauveD/90 text-white text-sm rounded-full py-2 hover:bg-mauve transition disabled:opacity-50 disabled:cursor-not-allowed"><i class="fa-solid fa-bag-shopping ml-1"></i> ${avail(p)<=0?'غير متوفر':'أضيفي للسلة'}</button>
          <button onclick="event.stopPropagation(); toggleWishlist('${p.id}')" class="w-9 h-9 rounded-full bg-white/95 text-mauve flex items-center justify-center hover:bg-blush"><i class="fa-regular fa-heart"></i></button>
        </div>
      </div>
      <div class="p-4 cursor-pointer" onclick="openProductView('${p.id}')"><p class="text-xs text-mauve mb-1">${catName(p.cat)}</p><p class="font-bold mb-2 text-sm">${p.name}</p>
        <div class="flex items-center gap-2"><span class="font-bold text-mauveD">${p.price} ج.س</span>${p.old?`<span class="text-xs text-ink/40 line-through">${p.old} ج.س</span>`:''}</div></div>
    </div>`).join('');
}

/* ---------- offer ---------- */
function renderOfferSection(){
  const o = offers.find(x=>x.active && x.endsAt>Date.now());
  const sec = document.getElementById('offers');
  if(!o){ activeOfferEndTs=null; sec.classList.add('hidden'); return; }
  activeOfferEndTs = o.endsAt;
  document.getElementById('offerTitle').textContent = o.title;
  document.getElementById('offerBadgeText').innerHTML = `${o.discount}%<br><span class="text-[10px]">خصم</span>`;
  sec.classList.remove('hidden');
}
setInterval(()=>{
  if(!activeOfferEndTs) return;
  const diff = activeOfferEndTs - Date.now(), p=(n)=>String(Math.max(0,n)).padStart(2,'0');
  document.getElementById('cd-d').textContent = p(Math.floor(diff/86400000));
  document.getElementById('cd-h').textContent = p(Math.floor(diff%86400000/3600000));
  document.getElementById('cd-m').textContent = p(Math.floor(diff%3600000/60000));
  document.getElementById('cd-s').textContent = p(Math.floor(diff%60000/1000));
},1000);

/* ---------- cart / wishlist ---------- */
window.addToCart = (id)=>{ const p=products.find(x=>x.id===id); if(!p) return;
  if(avail(p)<=0){ showToast('عذراً، هذا المنتج غير متوفر حالياً'); return; }
  const e=cart.find(x=>x.id===id);
  if(e){ if(e.qty+1>avail(p)){ showToast(`الكمية المتاحة ${p.stock} فقط`); return; } e.qty++; } else cart.push({...p,qty:1});
  renderCart(); showToast(`تمت إضافة "${p.name}" إلى السلة`); };
window.changeQty = (id,d)=>{ const it=cart.find(x=>x.id===id); const live=products.find(x=>x.id===id); if(d>0 && live && it.qty+d>avail(live)){ showToast(`الكمية المتاحة ${live.stock} فقط`); return; } it.qty+=d; if(it.qty<=0) cart=cart.filter(x=>x.id!==id); renderCart(); };
window.removeFromCart = (id)=>{ cart=cart.filter(x=>x.id!==id); renderCart(); };
function renderCart(){
  document.getElementById('cartItems').innerHTML = cart.length ? cart.map(i=>`
    <div class="flex gap-4 items-center"><img src="${imgUrl(i.img,150)}" class="w-20 h-20 rounded-xl object-cover">
      <div class="flex-1"><p class="font-bold text-sm">${i.name}</p><p class="text-mauve text-sm">${i.price} ج.س</p>
        <div class="flex items-center gap-3 mt-2"><button onclick="changeQty('${i.id}',-1)" class="w-7 h-7 rounded-full border border-mauve/40 hover:bg-blushL">-</button><span>${i.qty}</span><button onclick="changeQty('${i.id}',1)" class="w-7 h-7 rounded-full border border-mauve/40 hover:bg-blushL">+</button></div></div>
      <button onclick="removeFromCart('${i.id}')" class="text-ink/40 hover:text-mauveD"><i class="fa-solid fa-trash"></i></button></div>`).join('')
    : `<div class="text-center text-ink/40 mt-20"><i class="fa-solid fa-bag-shopping text-3xl mb-3"></i><p>سلتك فارغة حالياً</p></div>`;
  document.getElementById('cartTotal').textContent = cart.reduce((s,i)=>s+i.price*i.qty,0)+' ج.س';
  const c = cart.reduce((s,i)=>s+i.qty,0), b=document.getElementById('cartCount'); b.textContent=c; b.classList.toggle('hidden',c===0);
}
window.toggleWishlist = (id)=>{ const p=products.find(x=>x.id===id); if(!p) return;
  if(wishlist.find(x=>x.id===id)){ wishlist=wishlist.filter(x=>x.id!==id); showToast('تمت الإزالة من المفضلة'); } else { wishlist.push(p); showToast(`أضيفت "${p.name}" إلى المفضلة`); }
  renderWishlist(); };
function renderWishlist(){
  document.getElementById('wishlistItems').innerHTML = wishlist.length ? wishlist.map(p=>`
    <div class="flex gap-4 items-center"><img src="${imgUrl(p.img,150)}" class="w-20 h-20 rounded-xl object-cover"><div class="flex-1"><p class="font-bold text-sm">${p.name}</p><p class="text-mauve text-sm">${p.price} ج.س</p></div>
      <button onclick="addToCart('${p.id}')" class="btn ghost !px-3 !py-1.5 text-xs">أضيفي للسلة</button></div>`).join('')
    : `<div class="text-center text-ink/40 mt-20"><i class="fa-regular fa-heart text-3xl mb-3"></i><p>لا يوجد عناصر مفضلة بعد</p></div>`;
  const b=document.getElementById('wishCount'); b.textContent=wishlist.length; b.classList.toggle('hidden',wishlist.length===0);
}
window.openDrawer = (t)=>{ document.getElementById(t+'DrawerBg').classList.remove('hidden'); document.getElementById(t+'Drawer').classList.add('open'); };
window.closeDrawer = (t)=>{ document.getElementById(t+'DrawerBg').classList.add('hidden'); document.getElementById(t+'Drawer').classList.remove('open'); };

/* ---------- product quick view ---------- */
let pvImages=[], pvIndex=0;
window.openProductView = (id)=>{
  const p=products.find(x=>x.id===id); if(!p) return;
  pvImages=[p.img,...(p.gallery||[])].filter(Boolean); if(!pvImages.length) pvImages=[p.img]; pvIndex=0;
  document.getElementById('pvCategory').textContent=catName(p.cat);
  document.getElementById('pvName').textContent=p.name;
  document.getElementById('pvPrice').textContent=p.price+' ج.س';
  document.getElementById('pvOldPrice').textContent=p.old?p.old+' ج.س':'';
  const pvBtn=document.getElementById('pvAddToCart'); const out=avail(p)<=0; pvBtn.disabled=out; pvBtn.innerHTML=out?'غير متوفر حالياً':'<i class="fa-solid fa-bag-shopping"></i> أضيفي للسلة'; pvBtn.onclick=()=>addToCart(p.id);
  document.getElementById('pvWishlist').onclick=()=>toggleWishlist(p.id);
  renderProductView();
  const bg=document.getElementById('productViewBg'); bg.classList.remove('hidden'); bg.classList.add('flex');
};
function renderProductView(){
  document.getElementById('pvMainImage').src=imgUrl(pvImages[pvIndex],900);
  const th=document.getElementById('pvThumbs');
  if(pvImages.length>1){
    th.innerHTML=pvImages.map((s,i)=>`<img src="${imgUrl(s,120)}" data-pvthumb="${i}" class="w-12 h-12 object-cover rounded-lg cursor-pointer border-2 ${i===pvIndex?'border-mauve':'border-transparent opacity-70 hover:opacity-100'}">`).join('');
    th.querySelectorAll('[data-pvthumb]').forEach(t=>t.onclick=()=>{ pvIndex=Number(t.dataset.pvthumb); renderProductView(); });
  } else th.innerHTML='';
}
window.shiftProductView = (d)=>{ pvIndex=(pvIndex+d+pvImages.length)%pvImages.length; renderProductView(); };
window.closeProductView = ()=>{ const bg=document.getElementById('productViewBg'); bg.classList.add('hidden'); bg.classList.remove('flex'); };

/* ---------- checkout ---------- */
window.checkout = async ()=>{
  if(!cart.length){ showToast('سلتك فارغة، أضيفي تصميماً أولاً'); return; }
  const name=document.getElementById('checkoutName').value.trim(), phone=document.getElementById('checkoutPhone').value.trim(), address=document.getElementById('checkoutAddress').value.trim();
  if(!name||!phone){ showToast('من فضلك أدخلي الاسم ورقم الجوال لإتمام الطلب'); return; }
  const btn=document.getElementById('checkoutBtn'), original=btn.textContent; btn.disabled=true; btn.textContent='جارِ الإرسال...';
  try{
    await addDoc(collection(db,'orders'), { customer:name, phone, address, items:cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty,cat:i.cat,img:(i.img&&i.img.startsWith('http'))?i.img:''})), source:'web', total:cart.reduce((s,i)=>s+i.price*i.qty,0), status:'قيد الانتظار', createdAt:Date.now(), seen:false });
    showToast('تم إرسال طلبك بنجاح! سيتواصل معك فريقنا قريباً');
    cart=[]; renderCart(); closeDrawer('cart'); document.getElementById('checkoutName').value=''; document.getElementById('checkoutPhone').value=''; document.getElementById('checkoutAddress').value='';
  }catch(err){ showToast('تعذر إرسال الطلب، تحققي من اتصالك بالإنترنت وحاولي مرة أخرى'); console.error(err); }
  btn.disabled=false; btn.textContent=original;
};

/* ---------- search ---------- */
window.openSearch = (q)=>{ document.getElementById('searchOverlay').classList.remove('hidden'); const i=document.getElementById('searchInput'); if(typeof q==='string') i.value=q; i.focus(); doSearch(); };
window.closeSearch = ()=>document.getElementById('searchOverlay').classList.add('hidden');
window.doSearch = ()=>{
  const q=document.getElementById('searchInput').value.trim();
  const r=q?products.filter(p=>(p.name||'').includes(q)||catName(p.cat).includes(q)):products;
  document.getElementById('searchResults').innerHTML=r.map(p=>`
    <button onclick="closeSearch(); openProductView('${p.id}')" class="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 text-white text-right">
      <img src="${imgUrl(p.img,100)}" class="w-14 h-14 rounded-lg object-cover"><div class="flex-1"><p class="font-bold">${p.name}</p><p class="text-blush text-sm">${p.price} ج.س</p></div><i class="fa-solid fa-arrow-left text-white/40"></i></button>`).join('')||`<p class="text-white/50 text-center py-10">لا توجد نتائج مطابقة</p>`;
};

/* ---------- gallery / reviews / faq ---------- */
function renderGallery(){
  document.getElementById('galleryGrid').innerHTML=GALLERY_IMGS.map(([id,h])=>`
    <div class="mb-4 break-inside-avoid rounded-2xl overflow-hidden reveal cursor-zoom-in group" onclick="openLightbox('${id}')"><img src="${imgUrl(id,600)}" style="height:${h}px" class="w-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy"></div>`).join('');
  observeReveals();
}
window.openLightbox=(id)=>{ const b=document.createElement('div'); b.className='fixed inset-0 bg-ink/90 z-[155] flex items-center justify-center p-6 cursor-zoom-out'; b.innerHTML=`<img src="${imgUrl(id,1400)}" class="max-h-[85vh] rounded-2xl shadow-2xl">`; b.onclick=()=>b.remove(); document.body.appendChild(b); };
function renderReview(){
  const r=REVIEWS[reviewIndex];
  document.getElementById('reviewCard').innerHTML=`<div class="flex gap-1 text-mauve mb-5">${'<i class="fa-solid fa-star"></i>'.repeat(5)}</div><p class="text-lg leading-9 mb-6">"${r.text}"</p><p class="font-bold">${r.name}</p><p class="text-sm text-ink/50">${r.occ}</p>`;
  document.getElementById('reviewDots').innerHTML=REVIEWS.map((_,i)=>`<button onclick="jumpReview(${i})" class="w-2.5 h-2.5 rounded-full ${i===reviewIndex?'bg-mauve':'bg-mauve/25'}"></button>`).join('');
}
window.jumpReview=(i)=>{ reviewIndex=i; renderReview(); };
window.shiftReview=(d)=>{ reviewIndex=(reviewIndex+d+REVIEWS.length)%REVIEWS.length; renderReview(); };
setInterval(()=>window.shiftReview(1),6000);
function renderFaq(){
  document.getElementById('faqList').innerHTML=FAQS.map((f,i)=>`
    <div class="bg-white border border-blush rounded-2xl overflow-hidden">
      <button onclick="toggleFaq(${i})" class="w-full flex items-center justify-between p-5 text-right font-bold hover:bg-blushL">${f.q} <i class="fa-solid fa-plus text-mauve transition-transform" id="faqIcon${i}"></i></button>
      <div class="acc-body px-5" id="faqBody${i}"><p class="pb-5 text-ink/60 leading-7">${f.a}</p></div></div>`).join('');
}
window.toggleFaq=(i)=>{
  const body=document.getElementById('faqBody'+i), icon=document.getElementById('faqIcon'+i);
  const open=body.style.maxHeight&&body.style.maxHeight!=='0px';
  document.querySelectorAll('.acc-body').forEach(b=>b.style.maxHeight='0px');
  document.querySelectorAll('[id^=faqIcon]').forEach(ic=>ic.style.transform='rotate(0deg)');
  if(!open){ body.style.maxHeight=body.scrollHeight+'px'; icon.style.transform='rotate(45deg)'; }
};

/* ---------- forms / toast ---------- */
window.submitCustom = async (e)=>{
  e.preventDefault();
  const g=(id)=>document.getElementById(id).value;
  const btn=document.getElementById('cfSubmitBtn'), original=btn.innerHTML; btn.disabled=true; btn.innerHTML='جارِ الإرسال...';
  try{
    await addDoc(collection(db,'customOrders'), { name:g('cfName').trim(), phone:g('cfPhone').trim(), occasion:g('cfOccasion'), eventDate:g('cfDate'), pieces:g('cfPieces'), budget:g('cfBudget').trim(), description:g('cfDesc').trim(), status:'جديد', createdAt:Date.now(), seen:false });
    showToast('استلمنا طلبك الخاص، سيتواصل معك فريق التصميم قريباً'); e.target.reset();
  }catch(err){ showToast('تعذر إرسال الطلب، تحققي من اتصالك بالإنترنت وحاولي مرة أخرى'); console.error(err); }
  btn.disabled=false; btn.innerHTML=original;
};
window.submitContact=(e)=>{ e.preventDefault(); showToast('تم إرسال رسالتك بنجاح، شكراً لتواصلك معنا'); e.target.reset(); };
let toastTimer;
function showToast(msg){ document.getElementById('toastMsg').textContent=msg; const t=document.getElementById('toast'); t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),3200); }
window.showToast=showToast;

document.querySelectorAll('#mobileNav a').forEach(a=>a.addEventListener('click',()=>document.getElementById('mobileNav').classList.add('hidden')));

/* ---------- init ---------- */
renderPackages(); renderFilterTabs(); renderProducts(); renderGallery(); renderReview(); renderFaq(); renderCart(); renderWishlist(); observeReveals();
