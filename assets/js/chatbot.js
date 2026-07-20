/* Avrupa Tıp Merkezi — kurallı yardım botu v1
   İlkeler: teşhis koymaz, fiyat söylemez (forma yönlendirir), acil kelimede 112 kartı,
   her adımda insana (WhatsApp/telefon) çıkış. Serbest metin = anahtar kelime eşleme. */
(function(){
  'use strict';

  var TEL = 'tel:+904440000';
  var WA = 'https://wa.me/905000000000';

  /* ---------- yardımcılar ---------- */
  /* tr-TR küçültme + ı→i katlama: "ACIL" (ASCII I) → "acıl" → "acil" eşleşir */
  function norm(s){ return s.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i'); }
  function tokenla(s){ return norm(s).split(/[^a-zçğöşüi0-9]+/).filter(Boolean); }
  /* tek kelimelik kısa anahtarlar token başlangıcıyla ("binme" ≠ "inme"),
     çok kelimeli kalıplar alt dizgiyle eşleşir */
  function eslesir(t, tokens, anahtar){
    var k = norm(anahtar);
    if (k.indexOf(' ') === -1 && k.length <= 6) {
      for (var i = 0; i < tokens.length; i++) { if (tokens[i].indexOf(k) === 0) return true; }
      return false;
    }
    return t.indexOf(k) !== -1;
  }
  function mesaiIcinde(){
    var d = new Date(), g = d.getDay(), sa = d.getHours() + d.getMinutes() / 60;
    if (g === 0) return false;                 // Pazar kapalı
    if (g === 6) return sa >= 9 && sa < 17;    // Cumartesi 09-17
    return sa >= 8.5 && sa < 20;               // Hafta içi 08.30-20
  }

  /* ---------- durum ---------- */
  var mod = null; // null | 'randevu-tel'
  var seciliBrans = '';

  /* ---------- kök arayüz ---------- */
  var kok = (document.currentScript && document.currentScript.src || '').replace(/assets\/js\/chatbot\.js.*$/, '');
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = kok + 'assets/css/chatbot.css';
  document.head.appendChild(link);

  var launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'cbt-launch';
  launch.setAttribute('aria-label', 'Yardım botunu aç');
  launch.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.9-.9L3 20l1-4.9A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg><span class="cbt-launch-txt">Size yardımcı olalım</span>';

  var panel = document.createElement('div');
  panel.className = 'cbt-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Yardım botu');
  panel.innerHTML =
    '<div class="cbt-head">' +
      '<span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v18M3 12h18"/></svg></span>' +
      '<div><strong>Avrupa Tıp Merkezi</strong><span id="cbtDurum"></span></div>' +
      '<button type="button" class="cbt-kapat" aria-label="Botu kapat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    '</div>' +
    '<div class="cbt-govde" id="cbtGovde" aria-live="polite"></div>' +
    '<div class="cbt-alt">' +
      '<input id="cbtGiris" type="text" placeholder="Sorunuzu yazın…" aria-label="Mesajınız" maxlength="200">' +
      '<button type="button" id="cbtGonder" aria-label="Gönder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>' +
    '</div>' +
    '<p class="cbt-not">Bilgilendirme amaçlıdır, teşhis koymaz. Acil durumda 112.</p>';

  document.body.appendChild(launch);
  document.body.appendChild(panel);

  var govde = panel.querySelector('#cbtGovde');
  var giris = panel.querySelector('#cbtGiris');

  function kaydir(){ govde.scrollTop = govde.scrollHeight; }

  function botMsj(html, tur){
    var m = document.createElement('div');
    m.className = 'cbt-msj ' + (tur || 'bot');
    m.innerHTML = html;
    govde.appendChild(m); kaydir();
  }
  function userMsj(txt){
    var m = document.createElement('div');
    m.className = 'cbt-msj user';
    m.textContent = txt;
    govde.appendChild(m); kaydir();
  }
  function hizli(secenekler){
    var eski = govde.querySelector('.cbt-hizli'); if (eski) eski.remove();
    var kutu = document.createElement('div');
    kutu.className = 'cbt-hizli';
    secenekler.forEach(function(s){
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = s[0];
      b.addEventListener('click', function(){ userMsj(s[0]); s[1](); });
      kutu.appendChild(b);
    });
    govde.appendChild(kutu); kaydir();
  }
  function linkBtn(href, metin, dis){
    return '<a class="cbt-linkbtn' + (dis ? ' dis' : '') + '" href="' + href + '">' + metin + '</a>';
  }

  /* ---------- ana menü ---------- */
  function anaMenu(gecikme){
    setTimeout(function(){
      hizli([
        ['📅 Randevu almak istiyorum', akisRandevu],
        ['🧭 Hangi birime gitmeliyim?', akisTriyaj],
        ['💰 Fiyat öğrenmek istiyorum', akisFiyat],
        ['🧪 Tahlil sonuçlarım', akisTahlil],
        ['📄 Sağlık raporları', akisRapor],
        ['❤️ Check-up paketleri', akisCheckup],
        ['🛡 Sigortam geçer mi?', akisSigorta],
        ['🕐 Saatler ve ulaşım', akisUlasim],
        ['👤 Danışmana bağlan', akisInsan],
      ]);
    }, gecikme || 250);
  }

  /* ---------- akışlar ---------- */
  function akisRandevu(){
    mod = null;
    botMsj('Hangi branş için randevu istiyorsunuz?');
    var branslar = ['Kardiyoloji','İç Hastalıkları','Çocuk Sağlığı','Kadın Hastalıkları','Ortopedi','Genel Cerrahi','Göz','KBB','Dermatoloji','Psikoloji','Beslenme ve Diyet','Fizik Tedavi'];
    hizli(branslar.map(function(b){
      return [b, function(){
        seciliBrans = b;
        mod = 'randevu-tel';
        botMsj('<strong>' + b + '</strong> için not aldım. Telefon numaranızı yazın; çalışma saatleri içinde <strong>15 dakika içinde</strong> aramayı hedefliyoruz.' +
          linkBtn('randevu.html', 'Ya da online randevu formunu açın', true));
        hizli([['✕ Vazgeç — ana menü', function(){ mod = null; anaMenu(0); }]]);
      }];
    }).concat([['← Ana menü', function(){ anaMenu(0); }]]));
  }

  function akisTriyaj(){
    botMsj('Şikâyetinize göre doğru birimi öneren interaktif sihirbazımız var — 2 adımda sonuç verir, teşhis koymaz.' +
      linkBtn('hangi-birime-gitmeliyim.html', 'Sihirbazı başlat'));
    anaMenu();
  }

  function akisFiyat(){
    botMsj('Sağlık mevzuatı gereği ücretleri sitede ve bot üzerinden paylaşamıyoruz. Ancak <strong>Fiyat Sor</strong> formunu doldurursanız danışmanlarımız aynı gün arayıp güncel fiyatı ve sigorta kapsamınızı iletir.' +
      linkBtn('fiyat-sor.html', 'Fiyat Sor formunu aç') +
      linkBtn(WA + '?text=' + encodeURIComponent('Merhaba, fiyat bilgisi almak istiyorum.'), 'WhatsApp\'tan sorun', true));
    anaMenu();
  }

  function akisTahlil(){
    botMsj('Tahlil sonuçlarınız <strong>e-Nabız</strong> sistemine aktarılır; e-Devlet şifrenizle görüntüleyebilirsiniz. Sonuç yorumu telefonla yapılmaz — değerlendirme için kontrol randevusu öneririz.' +
      linkBtn('tahlil-sonuclari.html', 'Adım adım nasıl bakılır?'));
    anaMenu();
  }

  function akisRapor(){
    botMsj('İşe giriş, ehliyet, sporcu, evlilik, portör ve öğrenci raporları için <strong>randevu gerekmez</strong>; belgelerinizle mesai saatleri içinde gelebilirsiniz. Raporlar genellikle aynı gün teslim edilir.' +
      linkBtn('saglik-raporlari.html', 'Rapor türleri ve gerekli belgeler'));
    anaMenu();
  }

  function akisCheckup(){
    botMsj('Yaşınıza ve ihtiyacınıza göre 6 check-up programımız var; muayene + tetkikler çoğunlukla tek ziyarette tamamlanır.' +
      linkBtn('checkup-paketleri.html', 'Paketleri inceleyin'));
    anaMenu();
  }

  function akisSigorta(){
    botMsj('SGK ve 12 tamamlayıcı sağlık sigortasıyla anlaşmalıyız. Poliçe kapsamları ürüne göre değiştiği için randevu öncesi telefonla teyit öneririz.' +
      linkBtn('anlasmali-kurumlar.html', 'Anlaşmalı kurum listesi') +
      linkBtn(TEL, '444 0 000 — kapsam teyidi', true));
    anaMenu();
  }

  function akisUlasim(){
    botMsj('<strong>Çalışma saatleri:</strong> Hafta içi 08.30–20.00 · Cumartesi 09.00–17.00 · Pazar kapalı.<br><strong>Adres:</strong> Zuhuratbaba Mah., Bakırköy. Marmaray\'a 6 dk, metrobüse 4 dk; hastalarımıza 2 saat ücretsiz kapalı otopark.' +
      linkBtn('iletisim.html', 'Yol tarifi ve iletişim'));
    anaMenu();
  }

  function akisHekim(){
    botMsj('12 uzman hekimimizi branşa göre filtreleyebilir, profillerini inceleyebilirsiniz. Dilerseniz tetkiklerinizi yükleyip doğrudan hekime soru da iletebilirsiniz.' +
      linkBtn('hekimler.html', 'Hekim kadromuz') +
      linkBtn('hekime-sor.html', 'Hekime Sor — dosya yükleyin', true));
    anaMenu();
  }

  function akisInsan(){
    var acikMi = mesaiIcinde();
    botMsj(acikMi
      ? 'Şu an çalışma saatleri içindeyiz — danışmanlarımız hazır. WhatsApp\'tan yazın ya da arayın; ilk yanıt hedefimiz 5 dakika.'
      : 'Şu an mesai dışındayız. Mesajınızı WhatsApp\'tan bırakın; <strong>ilk iş saatinde (09.00\'a kadar) ilk biz arayalım.</strong>');
    botMsj(linkBtn(WA + '?text=' + encodeURIComponent('Merhaba, bilgi almak istiyorum.'), 'WhatsApp\'ta danışmana yazın') +
      linkBtn(TEL, '444 0 000\'ı ara', true), 'bot');
    anaMenu();
  }

  function akisAcil(){
    botMsj('<strong>⚠ Acil bir durum tarif ediyorsunuz.</strong> Lütfen bu botla vakit kaybetmeyin: hemen <a href="tel:112">112\'yi arayın</a> veya en yakın acil servise başvurun. Merkezimiz bir acil servis değildir.', 'acil');
    anaMenu(600);
  }

  /* ---------- serbest metin: niyet eşleme ---------- */
  var ACIL = ['acil','bayıl','baygın','nöbet','anafilak','alerjik şok','boğul','bilinç','morar','kanama','kanıyor','kan kaybı','çok kötü','kalp krizi','kriz','felç','inme','zehirlen','intihar','kendime zarar','şiddetli göğüs','göğüs ağrı','göğsüm ağrı','göğsümde baskı','soğuk terleme','şiddetli nefes','nefes alam','nefes darlığı'];
  var NIYETLER = [
    { k: ['randevu','muayene ol','saat al'], f: akisRandevu },
    { k: ['fiyat','ücret','kaç para','ne kadar','kaça','tarife'], f: akisFiyat },
    { k: ['tahlil','sonuç','e-nabız','enabız','kan değer'], f: akisTahlil },
    { k: ['rapor','işe giriş','ehliyet','sporcu','portör','evlilik raporu'], f: akisRapor },
    { k: ['check','çekap','tarama paketi'], f: akisCheckup },
    { k: ['sigorta','sgk','anlaşmalı','poliçe'], f: akisSigorta },
    { k: ['saat','açık mı','kaçta','kaça kadar','pazar'], f: akisUlasim },
    { k: ['adres','nerede','ulaşım','otopark','metro','marmaray','yol tarifi'], f: akisUlasim },
    { k: ['doktor','hekim','prof','uzman kim'], f: akisHekim },
    { k: ['hangi birim','hangi bölüm','şikayet','şikâyet','nereye git'], f: akisTriyaj },
    { k: ['dosya','mr','tetkik yükle','ikinci görüş','film'], f: akisHekim },
    { k: ['whatsapp','danışman','temsilci','insan','canlı','biriyle'], f: akisInsan },
  ];
  var TESHIS = ['teşhis','tanı koy','reçete','antibiyotik','ağrı kesici','hangi hap','hangi ilaç','ilaç öner','ne kullanmalı','nasıl geçer','tedavisi ne','iyi gelir','neden olur','belirtisi mi'];

  function niyetDene(t, tokens){
    for (var n = 0; n < NIYETLER.length; n++) {
      for (var j = 0; j < NIYETLER[n].k.length; j++) {
        if (eslesir(t, tokens, NIYETLER[n].k[j])) { NIYETLER[n].f(); return true; }
      }
    }
    return false;
  }

  function isle(metin){
    var t = norm(metin);
    var tokens = tokenla(metin);

    /* acil kapısı — her moddan önce; 112 yalnızca bağımsız sayı olarak
       (telefon modunda numara benzeri girdide "0532 112 …" yanlış tetiklenmesin) */
    var telGibi = mod === 'randevu-tel' && metin.replace(/\D/g, '').length >= 9;
    if (!telGibi && /(^|\D)112(\D|$)/.test(metin)) { mod = null; akisAcil(); return; }
    for (var a = 0; a < ACIL.length; a++) {
      if (eslesir(t, tokens, ACIL[a])) { mod = null; akisAcil(); return; }
    }

    if (mod === 'randevu-tel') {
      var digits = metin.replace(/\D/g, '');
      var cep = digits.match(/0?5\d{9}/);
      if (cep || (digits.length >= 10 && digits.length <= 12)) {
        mod = null;
        botMsj('Teşekkürler! <strong>' + seciliBrans + '</strong> için talebiniz alındı; çalışma saatleri içinde 15 dakika içinde aramayı hedefliyoruz.');
        anaMenu(600);
        return;
      }
      if (!/\d/.test(metin)) {
        /* rakam yok: kullanıcı konu değiştirdi olabilir — niyeti dene */
        var eskiMod = mod; mod = null;
        if (niyetDene(t, tokens)) return;
        mod = eskiMod;
      }
      botMsj('Numarayı okuyamadım — <strong>05XX XXX XX XX</strong> biçiminde yazar mısınız? Dilerseniz formu kullanın ya da vazgeçin.' + linkBtn('randevu.html', 'Randevu formunu aç', true));
      hizli([['✕ Vazgeç — ana menü', function(){ mod = null; anaMenu(0); }]]);
      return;
    }

    var teshisMi = false;
    for (var i = 0; i < TESHIS.length; i++) { if (eslesir(t, tokens, TESHIS[i])) { teshisMi = true; break; } }
    if (!teshisMi && t.indexOf('var mi') !== -1 && t.indexOf('bende') !== -1) teshisMi = true;
    if (teshisMi) {
      botMsj('Bu sorunun güvenli cevabı ancak muayeneyle verilebilir — bot olarak teşhis, ilaç veya tedavi önerisinde bulunmuyorum. Şikâyetinize uygun birimi önerebilirim ya da hekime dosyanızla soru iletebilirsiniz.' +
        linkBtn('hangi-birime-gitmeliyim.html', 'Hangi birime gitmeliyim?') +
        linkBtn('hekime-sor.html', 'Hekime Sor', true));
      anaMenu();
      return;
    }

    if (niyetDene(t, tokens)) return;

    botMsj('Tam anlayamadım. Aşağıdaki başlıklardan seçebilir ya da doğrudan danışmanımıza yazabilirsiniz.' +
      linkBtn(WA + '?text=' + encodeURIComponent('Merhaba, bir sorum var: ' + metin.slice(0, 100)), 'Sorunuzu WhatsApp\'a taşıyın', true));
    anaMenu();
  }

  /* ---------- olaylar ---------- */
  function acKapat(ac){
    panel.classList.toggle('acik', ac);
    launch.style.display = ac ? 'none' : 'flex';
    if (ac) giris.focus();
  }
  launch.addEventListener('click', function(){
    acKapat(true);
    if (!govde.children.length) {
      panel.querySelector('#cbtDurum').textContent = mesaiIcinde() ? 'Çevrimiçi · ort. yanıt 5 dk' : 'Mesai dışı · mesaj bırakın';
      botMsj('Merhaba! 👋 Ben Avrupa Tıp Merkezi yardım botuyum. Randevu, fiyat talebi, tahlil sonuçları ve daha fazlası için buradayım. Size nasıl yardımcı olabilirim?');
      anaMenu(150);
    }
  });
  panel.querySelector('.cbt-kapat').addEventListener('click', function(){ acKapat(false); launch.focus(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && panel.classList.contains('acik')) { acKapat(false); launch.focus(); } });

  function gonder(){
    var v = giris.value.trim();
    if (!v) return;
    userMsj(v);
    giris.value = '';
    setTimeout(function(){ isle(v); }, 200);
  }
  panel.querySelector('#cbtGonder').addEventListener('click', gonder);
  giris.addEventListener('keydown', function(e){ if (e.key === 'Enter') gonder(); });
})();
