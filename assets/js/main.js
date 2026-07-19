/* Özel Avrupa Tıp Merkezi — DEMO 2 site geneli JS
   1) Telefon maskesi: tüm tel inputlarında 0XXX XXX XX XX biçimi
   2) Mobil menü: paneli mevcut .nav linklerinden dinamik kurar
   3) Branş filtresi: hekimler sayfasında (#docGrid varsa)
   4) Randevu / iletişim formu: demo onay ekranı (.js-demo-form) */
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
  [['tahlil-sonuclari.html','Tahlil Sonuçları'], ['anlasmali-kurumlar.html','Anlaşmalı Kurumlar']].forEach(function(item){
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
