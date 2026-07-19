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
      '<p class="cb-ok" role="status">Alındı! 15 dakika içinde arayacağız. (DEMO — gerçek talep oluşturulmadı.)</p>' +
    '</div>';
  footer.parentNode.insertBefore(band, footer);
  band.querySelector('form').addEventListener('submit', function(e){
    e.preventDefault();
    var tel = band.querySelector('input');
    if (tel.value.replace(/\D/g, '').length < 10) { tel.focus(); return; }
    band.classList.add('done');
  });
})();

/* 0b) WhatsApp balonu — sayfa bağlamlı hazır mesajla */
(function(){
  var konu = (document.title.split('|')[0] || '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'hizmetleriniz';
  var msg = encodeURIComponent('Merhaba, ' + konu + ' hakkında bilgi almak istiyorum.');
  var a = document.createElement('a');
  a.className = 'wa-fab';
  a.href = 'https://wa.me/905000000000?text=' + msg;
  a.setAttribute('aria-label', 'WhatsApp üzerinden yazın');
  a.innerHTML =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a11 11 0 0 1-5.9-5.2c-.4-.7-.7-1.5-.7-2.3 0-.8.4-1.4.8-1.7.2-.2.4-.2.6-.2h.4c.2 0 .4 0 .6.4l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.1-.2.3-.1.5.4.8 1.5 2 2.7 2.5.2.1.4.1.5-.1l.6-.7c.1-.2.3-.2.5-.1l1.8.9c.2.1.3.2.3.4 0 .1 0 .5-.1.7z"/></svg>' +
    '<span class="wa-fab-txt">WhatsApp\'tan yazın</span>';
  document.body.appendChild(a);
})();

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
    '<a class="btn btn--ghost btn--wide" href="tel:+904440000">444 0 000</a>';

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
  document.querySelectorAll('form.js-demo-form').forEach(function(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var ok = document.getElementById(form.getAttribute('data-ok') || 'formOk');
      if (ok) {
        form.hidden = true;
        ok.classList.add('show');
        var title = ok.querySelector('h3');
        if (title) { title.setAttribute('tabindex', '-1'); title.focus(); }
      }
    });
  });
})();
