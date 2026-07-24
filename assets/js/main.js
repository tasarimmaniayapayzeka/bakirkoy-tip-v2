/* Özel Avrupa Tıp Merkezi — DEMO 2 site geneli JS
   0) Faz 0 enjeksiyonları: sayfa altı Sizi Arayalım bandı, WhatsApp balonu, hekim müsaitlik etiketi
   1) Telefon maskesi: tüm tel inputlarında 0XXX XXX XX XX biçimi
   2) Mobil menü: paneli mevcut .nav linklerinden dinamik kurar
   3) Branş filtresi: hekimler sayfasında (#docGrid varsa)
   4) Randevu / iletişim formu: demo onay ekranı (.js-demo-form) */

/* 0a) Sizi Arayalım bandı — kendi formu olmayan sayfalara, footer'ın hemen üstüne */
(function(){
  var footer = document.querySelector('footer.footer');
  if (!footer || document.querySelector('form.js-demo-form')) return;
  var band = document.createElement('section');
  band.className = 'cb-band';
  band.setAttribute('aria-label', 'Sizi arayalım');
  band.innerHTML =
    '<div class="wrap">' +
      '<div class="cb-txt"><strong>Sizi arayalım</strong><span>Numaranızı bırakın, çalışma saatleri içinde 15 dakikada dönelim.</span></div>' +
      '<form novalidate>' +
        '<label class="sr-only" for="cbTel">Telefon numaranız</label>' +
        '<input id="cbTel" type="tel" inputmode="tel" placeholder="05XX XXX XX XX" maxlength="14" required>' +
        '<button class="btn btn--copper" type="submit">Beni Arayın</button>' +
      '</form>' +
      '<p class="cb-ok" role="status">Alındı! Çalışma saatleri içinde en kısa sürede arayacağız.</p>' +
    '</div>';
  footer.parentNode.insertBefore(band, footer);
  band.querySelector('form').addEventListener('submit', function(e){
    e.preventDefault();
    var tel = band.querySelector('input');
    if (tel.value.replace(/\D/g, '').length < 10) { tel.focus(); return; }
    talepGonder({ tur: 'arayalim', tel: tel.value, ozet: 'Geri arama talebi' });
    band.classList.add('done');
  });
})();

/* Talep gönderimi — tüm formlar ve bot buradan sunucuya yazar */
function talepGonder(veri){
  var kokEl = document.querySelector('script[src*="assets/js/main.js"]');
  var kok = kokEl ? (kokEl.getAttribute('src') || '').replace(/assets\/js\/main\.js.*$/, '') : '';
  veri.sayfa = (document.title.split('|')[0] || '').trim().slice(0, 100);
  return fetch(kok + 'api-talep.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(veri)
  }).then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); });
}

/* 0b) WhatsApp balonu kaldırıldı — sağ alt köşe chatbot'un (kullanıcı kararı,
   22 Tem). WhatsApp'a çıkış bot akışlarında ve mobil alt barda sürüyor. */

/* 0c) Hekim kartlarına temsili "en yakın müsaitlik" etiketi */
(function(){
  var saatler = ['Bugün 16.30', 'Yarın 10.30', 'Yarın 14.00', 'Çrş 09.30', 'Bugün 15.00', 'Yarın 11.30'];
  document.querySelectorAll('.doc-body').forEach(function(body, i){
    var sub = body.querySelector('.sub');
    if (!sub || body.querySelector('.doc-avail')) return;
    var chip = document.createElement('span');
    chip.className = 'doc-avail';
    chip.textContent = 'En yakın müsaitlik: ' + saatler[i % saatler.length];
    sub.parentNode.insertBefore(chip, sub.nextSibling);
  });
})();

(function(){
  document.querySelectorAll('input[type="tel"]').forEach(function(inp){
    inp.addEventListener('input', function(){
      var d = inp.value.replace(/\D/g, '');
      if (d && d[0] === '5') d = '0' + d;
      d = d.slice(0, 11);
      var out = d;
      if (d.length > 4) out = d.slice(0,4) + ' ' + d.slice(4);
      if (d.length > 7) out = out.slice(0,8) + ' ' + out.slice(8);
      if (d.length > 9) out = out.slice(0,11) + ' ' + out.slice(11);
      inp.value = out;
    });
  });
})();

(function(){
  var burger = document.querySelector('.burger');
  var header = document.querySelector('.header');
  if (!burger || !header) return;

  var nav = document.querySelector('.nav');
  var panel = document.createElement('div');
  panel.className = 'mnav';
  panel.hidden = true;

  var list = document.createElement('nav');
  list.className = 'mnav-list';
  list.setAttribute('aria-label', 'Mobil menü');
  if (nav) {
    nav.querySelectorAll('a').forEach(function(a){ list.appendChild(a.cloneNode(true)); });
  }
  [['fiyat-sor.html','Fiyat Sor'], ['tahlil-sonuclari.html','Tahlil Sonuçları'], ['anlasmali-kurumlar.html','Anlaşmalı Kurumlar']].forEach(function(item){
    var exists = Array.prototype.some.call(list.children, function(a){ return a.getAttribute('href') === item[0]; });
    if (!exists) {
      var a = document.createElement('a');
      a.href = item[0]; a.textContent = item[1];
      list.appendChild(a);
    }
  });

  var cta = document.createElement('div');
  cta.className = 'mnav-cta';
  cta.innerHTML =
    '<a class="btn btn--copper btn--wide" href="randevu.html">Randevu Al</a>' +
    '<a class="btn btn--ghost btn--wide" href="tel:+905400580888">0540 058 08 88</a>';

  panel.appendChild(list);
  panel.appendChild(cta);
  header.appendChild(panel);

  function setOpen(open){
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    panel.hidden = !open;
  }
  burger.addEventListener('click', function(){
    setOpen(burger.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') { setOpen(false); burger.focus(); }
  });
  panel.addEventListener('click', function(e){
    if (e.target.closest('a')) setOpen(false);
  });
})();

(function(){
  var grid = document.getElementById('docGrid');
  if (!grid) return;
  var buttons = document.querySelectorAll('.docfilter button');
  var cards = grid.querySelectorAll('.doc');
  var empty = document.getElementById('docEmpty');
  var shown = document.getElementById('docShown');

  function apply(filter){
    var visible = 0;
    cards.forEach(function(card){
      var match = (filter === 'all') || (card.getAttribute('data-spec') === filter);
      card.hidden = !match;
      if (match) { visible++; }
    });
    if (shown) { shown.textContent = visible; }
    if (empty) { empty.classList.toggle('show', visible === 0); }
  }

  buttons.forEach(function(btn){
    btn.addEventListener('click', function(){
      buttons.forEach(function(b){
        var on = (b === btn);
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      apply(btn.getAttribute('data-filter'));
    });
  });
})();

(function(){
  /* sayfa → talep türü eşlemesi */
  function turBul(){
    var yol = location.pathname.split('/').pop() || 'index.html';
    if (yol.indexOf('randevu') === 0) return 'randevu';
    if (yol.indexOf('fiyat-sor') === 0) return 'fiyat';
    if (yol.indexOf('hekime-sor') === 0) return 'hekime-soru';
    if (yol.indexOf('gorusme-talebi') === 0) return 'gorusme';
    return 'iletisim';
  }
  document.querySelectorAll('form.js-demo-form').forEach(function(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var basarili = function(){
        var ok = document.getElementById(form.getAttribute('data-ok') || 'formOk');
        if (ok) {
          form.hidden = true;
          ok.classList.add('show');
          var title = ok.querySelector('h3');
          if (title) { title.setAttribute('tabindex', '-1'); title.focus(); }
        }
      };
      var veri = { tur: form.getAttribute('data-tur') || turBul() };
      Array.prototype.forEach.call(form.elements, function(el){
        if (!el.name || el.disabled) return;
        if (el.type === 'checkbox') { veri[el.name] = el.checked ? 'evet' : ''; return; }
        if (el.type === 'file') { veri[el.name] = el.files && el.files.length ? ('dosya: ' + el.files[0].name) : ''; return; }
        veri[el.name] = el.value;
      });
      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; }
      talepGonder(veri).then(basarili).catch(function(){
        if (btn) { btn.disabled = false; }
        var uyar = form.querySelector('.form-hata');
        if (!uyar) {
          uyar = document.createElement('p');
          uyar.className = 'form-hata';
          uyar.setAttribute('role', 'alert');
          uyar.style.cssText = 'background:#FCEBEB;border:1px solid #F09595;color:#791F1F;padding:.7rem 1rem;margin-top:.8rem;font-size:.9rem';
          form.appendChild(uyar);
        }
        uyar.innerHTML = 'Talebiniz şu an iletilemedi. Lütfen tekrar deneyin ya da bizi arayın: <a href="tel:+905400580888" style="font-weight:700">0540 058 08 88</a>';
      });
    });
  });
})();
