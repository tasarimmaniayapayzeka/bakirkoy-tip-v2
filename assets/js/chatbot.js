/* Avrupa Tıp Merkezi — kurallı yardım botu v1
   İlkeler: teşhis koymaz, fiyat söylemez (forma yönlendirir), acil kelimede 112 kartı,
   her adımda insana (WhatsApp/telefon) çıkış. Serbest metin = anahtar kelime eşleme. */
(function(){
  'use strict';

  var TEL = 'tel:+905400580888';
  var WA = 'https://wa.me/905400580888';

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
  /* AI köprüsü: sunucuda chat-api.php varsa serbest sorular ona gider;
     yoksa (ör. GitHub Pages) sessizce kurallı moda düşer */
  var AI_URL = kok + 'chat-api.php';
  var aiAktif = true;
  var gecmis = []; // {rol:'user'|'bot', icerik}
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = kok + 'assets/css/chatbot.css?v=4';
  document.head.appendChild(link);

  var launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'cbt-launch';
  launch.setAttribute('aria-label', 'Yardım botunu aç');
  launch.innerHTML = '<span class="cbt-amono" aria-hidden="true">A</span><span class="cbt-fab-dot" aria-hidden="true"></span><span class="cbt-launch-txt">Size yardımcı olalım</span>';

  var panel = document.createElement('div');
  panel.className = 'cbt-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Yardım botu');
  panel.innerHTML =
    '<div class="cbt-head">' +
      '<span class="mark" aria-hidden="true">A</span>' +
      '<div><strong>Avrupa Tıp Asistanı</strong><span id="cbtDurum"></span></div>' +
      '<div class="cbt-aksiyon">' +
        '<a class="cbt-wa-btn" href="' + WA + '?text=' + encodeURIComponent('Merhaba, bilgi almak istiyorum.') + '" target="_blank" rel="noopener" aria-label="WhatsApp danışma hattı"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a11 11 0 0 1-5.9-5.2c-.4-.7-.7-1.5-.7-2.3 0-.8.4-1.4.8-1.7.2-.2.4-.2.6-.2h.4c.2 0 .4 0 .6.4l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.1-.2.3-.1.5.4.8 1.5 2 2.7 2.5.2.1.4.1.5-.1l.6-.7c.1-.2.3-.2.5-.1l1.8.9c.2.1.3.2.3.4 0 .1 0 .5-.1.7z"/></svg></a>' +
        '<button type="button" class="cbt-kapat" aria-label="Botu kapat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '</div>' +
    '</div>' +
    '<div class="cbt-govde" id="cbtGovde" aria-live="polite"></div>' +
    '<div class="cbt-ek" id="cbtEk" hidden></div>' +
    '<div class="cbt-arac">' +
      '<button type="button" id="cbtMik" class="cbt-arac-btn" title="Sesle yazdırın" aria-label="Sesle yazdırın">🎤</button>' +
      '<button type="button" id="cbtFoto" class="cbt-arac-btn" title="Fotoğraf ekleyin" aria-label="Fotoğraf ekleyin">📷</button>' +
      '<input type="file" id="cbtDosya" accept="image/*" hidden>' +
      '<select id="cbtDil" class="cbt-arac-dil" aria-label="Dil / Language"><option value="tr">TR</option><option value="en">EN</option></select>' +
      '<label class="cbt-sesli" title="Yanıtları sesli dinleyin"><input type="checkbox" id="cbtTts"> Sesli yanıt</label>' +
    '</div>' +
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
    seslendir(m.textContent);
    return m;
  }
  function userMsj(txt, gorsel){
    var m = document.createElement('div');
    m.className = 'cbt-msj user';
    if (gorsel) {
      var img = document.createElement('img');
      img.className = 'cbt-gorsel'; img.src = gorsel; img.alt = 'Gönderilen fotoğraf';
      m.appendChild(img);
    }
    if (txt) m.appendChild(document.createTextNode(txt));
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

  /* ---------- dil ---------- */
  var dil = 'tr';
  var METIN = {
    tr: { yazin: 'Sorunuzu yazın…', durumAcik: 'Çevrimiçi · ort. yanıt 5 dk', durumKapali: 'Mesai dışı · mesaj bırakın',
          hosgeldin: 'Merhaba! 👋 Ben Avrupa Tıp Merkezi yardım botuyum. Randevu, fiyat talebi, tahlil sonuçları ve daha fazlası için buradayım. Size nasıl yardımcı olabilirim?',
          foto: '(fotoğraf)', incele: 'İncele →' },
    en: { yazin: 'Type your question…', durumAcik: 'Online · avg. reply 5 min', durumKapali: 'Outside working hours',
          hosgeldin: 'Hello! 👋 I am the Avrupa Medical Center assistant. Ask me anything about appointments, services or visiting us — I reply in English.',
          foto: '(photo)', incele: 'View →' }
  };

  /* ---------- AI köprüsü ---------- */
  var SAYFA_AD = {
    'randevu.html': 'Online randevu', 'fiyat-sor.html': 'Fiyat Sor formu',
    'hangi-birime-gitmeliyim.html': 'Hangi birime gitmeliyim?', 'checkup-paketleri.html': 'Check-up paketleri',
    'tahlil-sonuclari.html': 'Tahlil sonuçları', 'saglik-raporlari.html': 'Sağlık raporları',
    'anlasmali-kurumlar.html': 'Anlaşmalı kurumlar', 'hekimler.html': 'Hekim kadromuz', 'iletisim.html': 'İletişim ve ulaşım'
  };
  var BIRIM = {
    'bolum-kardiyoloji.html': ['🫀', 'Kardiyoloji'], 'bolum-ic-hastaliklari.html': ['🩺', 'İç Hastalıkları'],
    'bolum-cocuk-sagligi.html': ['🧸', 'Çocuk Sağlığı'], 'bolum-kadin-hastaliklari.html': ['🤰', 'Kadın Hastalıkları'],
    'bolum-ortopedi.html': ['🦴', 'Ortopedi'], 'bolum-genel-cerrahi.html': ['🏥', 'Genel Cerrahi'],
    'bolum-goz-hastaliklari.html': ['👁', 'Göz Hastalıkları'], 'bolum-kulak-burun-bogaz.html': ['👂', 'KBB'],
    'bolum-dermatoloji.html': ['🧴', 'Dermatoloji'], 'bolum-psikoloji.html': ['🧠', 'Psikoloji'],
    'bolum-beslenme-diyet.html': ['🥗', 'Beslenme ve Diyet'], 'bolum-fizik-tedavi.html': ['💪', 'Fizik Tedavi'],
    'bolum-laboratuvar.html': ['🧪', 'Laboratuvar'], 'bolum-goruntuleme.html': ['🔬', 'Görüntüleme']
  };
  function kacir(s){
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function aiHtml(metin){
    /* [sayfa.html] → buton, [bolum-*.html] → yatay kart; kalan metin kaçırılır */
    var butonlar = '', kartlar = '';
    var govdeMetin = metin.replace(/\[([a-z0-9-]+\.html)\]/g, function(_, sayfa){
      if (BIRIM[sayfa]) {
        kartlar += '<a class="cbt-kart" href="' + sayfa + '"><span class="ikon">' + BIRIM[sayfa][0] + '</span><b>' + BIRIM[sayfa][1] + '</b><span class="git">' + METIN[dil].incele + '</span></a>';
        return '';
      }
      if (SAYFA_AD[sayfa]) { butonlar += linkBtn(sayfa, SAYFA_AD[sayfa], butonlar !== ''); return ''; }
      return sayfa;
    });
    var html = kacir(govdeMetin.replace(/\s+([.,;:!?])/g, '$1').trim()).replace(/\n+/g, '<br>');
    if (kartlar) html += '<div class="cbt-kartlar">' + kartlar + '</div>';
    return html + butonlar;
  }
  function fbEkle(el, soru, yanit){
    var bar = document.createElement('div');
    bar.className = 'cbt-fb';
    bar.innerHTML = '<button type="button" data-p="1" aria-label="Yararlı">👍</button><button type="button" data-p="0" aria-label="Yararsız">👎</button>';
    bar.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (!b) return;
      fetch(kok + 'chat-geribildirim.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puan: +b.getAttribute('data-p'), soru: soru.slice(0, 300), yanit: yanit.slice(0, 300) })
      }).catch(function(){});
      bar.innerHTML = '<span class="cbt-fb-ok">' + (dil === 'en' ? 'Thanks ✓' : 'Teşekkürler ✓') + '</span>';
    });
    el.appendChild(bar);
  }
  function eskiFallback(metin){
    if (dil === 'en') {
      botMsj('I could not process that right now. You can reach our team directly on WhatsApp.' +
        linkBtn(WA + '?text=' + encodeURIComponent('Hello, I have a question: ' + metin.slice(0, 100)), 'Chat on WhatsApp', true));
      return;
    }
    botMsj('Tam anlayamadım. Aşağıdaki başlıklardan seçebilir ya da doğrudan danışmanımıza yazabilirsiniz.' +
      linkBtn(WA + '?text=' + encodeURIComponent('Merhaba, bir sorum var: ' + metin.slice(0, 100)), 'Sorunuzu WhatsApp\'a taşıyın', true));
    anaMenu();
  }
  function aiSor(metin){
    var yaziyor = document.createElement('div');
    yaziyor.className = 'cbt-yaziyor';
    yaziyor.setAttribute('aria-label', 'Asistan yazıyor');
    yaziyor.innerHTML = '<i></i><i></i><i></i>';
    govde.appendChild(yaziyor); kaydir();
    fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mesajlar: gecmis.slice(-10), dil: dil })
    }).then(function(r){
      if (r.status === 404 || r.status === 503) aiAktif = false;
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function(j){
      yaziyor.remove();
      if (!j || !j.yanit) throw new Error('bos');
      gecmis.push({ rol: 'bot', icerik: j.yanit });
      var el = botMsj(aiHtml(j.yanit));
      fbEkle(el, metin, j.yanit);
      if (dil === 'tr') anaMenu(400);
    }).catch(function(){
      yaziyor.remove();
      eskiFallback(metin);
    });
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
      linkBtn(TEL, '0540 058 08 88 — kapsam teyidi', true));
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
      linkBtn(TEL, '0540 058 08 88\'ı ara', true), 'bot');
    anaMenu();
  }

  function akisAcil(){
    botMsj(dil === 'en'
      ? '<strong>⚠ You are describing a medical emergency.</strong> Please do not wait for this bot: call <a href="tel:112">112</a> immediately or go to the nearest emergency department. Our center is not an emergency service.'
      : '<strong>⚠ Acil bir durum tarif ediyorsunuz.</strong> Lütfen bu botla vakit kaybetmeyin: hemen <a href="tel:112">112\'yi arayın</a> veya en yakın acil servise başvurun. Merkezimiz bir acil servis değildir.', 'acil');
    if (dil === 'tr') anaMenu(600);
  }

  /* ---------- sesli yanıt (TTS — kullanıcı açarsa) ---------- */
  function seslendir(duzMetin){
    var kutu = panel.querySelector('#cbtTts');
    if (!kutu || !kutu.checked) return;
    var t = (duzMetin || '').replace(/\s+/g, ' ').trim();
    if (!t) return;
    fetch(kok + 'chat-tts.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metin: t.slice(0, 480), dil: dil })
    }).then(function(r){ if (!r.ok) throw 0; return r.blob(); })
      .then(function(b){ new Audio(URL.createObjectURL(b)).play().catch(function(){}); })
      .catch(function(){});
  }

  /* ---------- serbest metin: niyet eşleme ---------- */
  var ACIL = ['acil','bayıl','baygın','nöbet','anafilak','alerjik şok','boğul','bilinç','morar','kanama','kanıyor','kan kaybı','çok kötü','kalp krizi','kriz','felç','inme','zehirlen','intihar','kendime zarar','şiddetli göğüs','göğüs ağrı','göğsüm ağrı','göğsümde','göğsüme','şiddetli ağrı','soğuk terleme','şiddetli nefes','nefes alam','nefes darlığı'];
  var ACIL_EN = ['emergency','chest pain','cannot breathe','can\'t breathe','short of breath','unconscious','faint','seizure','bleeding','stroke','heart attack','poison','suicide','overdose'];
  var FIYAT_EN = ['price','cost','how much','fee','pricing'];
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

  function isle(metin, gorsel){
    var t = norm(metin);
    var tokens = tokenla(metin);

    /* acil kapısı — her moddan önce; 112 yalnızca bağımsız sayı olarak
       (telefon modunda numara benzeri girdide "0532 112 …" yanlış tetiklenmesin) */
    var telGibi = mod === 'randevu-tel' && metin.replace(/\D/g, '').length >= 9;
    if (!telGibi && /(^|\D)112(\D|$)/.test(metin)) { mod = null; akisAcil(); return; }
    for (var a = 0; a < ACIL.length; a++) {
      if (eslesir(t, tokens, ACIL[a])) { mod = null; akisAcil(); return; }
    }
    for (var ae = 0; ae < ACIL_EN.length; ae++) {
      if (t.indexOf(ACIL_EN[ae]) !== -1) { mod = null; akisAcil(); return; }
    }

    /* fotoğraf: kural motoru atlanır, doğrudan AI (acil kapısından sonra) */
    if (gorsel) {
      mod = null;
      gecmis.push({ rol: 'user', icerik: metin.slice(0, 500), gorsel: gorsel });
      if (gecmis.length > 12) gecmis = gecmis.slice(-12);
      if (aiAktif) { aiSor(metin || METIN[dil].foto); return; }
      eskiFallback(metin); return;
    }

    /* EN modu: TR kural motoru yerine fiyat kapısı + AI */
    if (dil === 'en') {
      for (var fe = 0; fe < FIYAT_EN.length; fe++) {
        if (t.indexOf(FIYAT_EN[fe]) !== -1) {
          botMsj('Due to Turkish health regulations we cannot share prices online. Please fill in the request form and our team will call you the same day with pricing and insurance details.' +
            linkBtn('fiyat-sor.html', 'Price request form'));
          return;
        }
      }
      gecmis.push({ rol: 'user', icerik: metin.slice(0, 500) });
      if (gecmis.length > 12) gecmis = gecmis.slice(-12);
      if (aiAktif) { aiSor(metin); return; }
      eskiFallback(metin); return;
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

    /* hiçbir kural eşleşmedi: varsa AI'ya sor, yoksa eski davranış */
    gecmis.push({ rol: 'user', icerik: metin.slice(0, 500) });
    if (gecmis.length > 12) gecmis = gecmis.slice(-12);
    if (aiAktif) { aiSor(metin); return; }
    eskiFallback(metin);
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
      panel.querySelector('#cbtDurum').textContent = mesaiIcinde() ? METIN[dil].durumAcik : METIN[dil].durumKapali;
      botMsj(METIN[dil].hosgeldin);
      if (dil === 'tr') anaMenu(150);
    }
  });
  panel.querySelector('.cbt-kapat').addEventListener('click', function(){ acKapat(false); launch.focus(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && panel.classList.contains('acik')) { acKapat(false); launch.focus(); } });

  function gonder(){
    var v = giris.value.trim();
    if (!v && !bekleyenGorsel) return;
    var g = bekleyenGorsel;
    bekleyenGorsel = null; ekGuncelle();
    userMsj(v || METIN[dil].foto, g);
    giris.value = '';
    setTimeout(function(){ isle(v, g); }, 200);
  }
  panel.querySelector('#cbtGonder').addEventListener('click', gonder);
  giris.addEventListener('keydown', function(e){ if (e.key === 'Enter') gonder(); });

  /* ---------- fotoğraf ekleme ---------- */
  var bekleyenGorsel = null;
  var ekKutu = panel.querySelector('#cbtEk');
  var dosyaGiris = panel.querySelector('#cbtDosya');
  function ekGuncelle(){
    ekKutu.hidden = !bekleyenGorsel;
    if (!bekleyenGorsel) { ekKutu.innerHTML = ''; return; }
    ekKutu.innerHTML = '<span class="cbt-ek-cip"><img src="' + bekleyenGorsel + '" alt=""><span>' + (dil === 'en' ? 'Photo attached' : 'Fotoğraf eklendi') + '</span><button type="button" aria-label="Kaldır">✕</button></span>';
    ekKutu.querySelector('button').addEventListener('click', function(){ bekleyenGorsel = null; ekGuncelle(); });
  }
  panel.querySelector('#cbtFoto').addEventListener('click', function(){ dosyaGiris.click(); });
  dosyaGiris.addEventListener('change', function(){
    var d = dosyaGiris.files && dosyaGiris.files[0];
    dosyaGiris.value = '';
    if (!d || d.type.indexOf('image/') !== 0) return;
    var oku = new FileReader();
    oku.onload = function(){
      var img = new Image();
      img.onload = function(){
        var max = 1024, k = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k));
        c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        bekleyenGorsel = c.toDataURL('image/jpeg', 0.8);
        ekGuncelle();
      };
      img.src = oku.result;
    };
    oku.readAsDataURL(d);
  });

  /* ---------- mikrofon: sesle yazdırma ---------- */
  var mikBtn = panel.querySelector('#cbtMik');
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder)) {
    mikBtn.style.display = 'none';
  } else {
    var kayitci = null;
    mikBtn.addEventListener('click', function(){
      if (kayitci && kayitci.state === 'recording') { kayitci.stop(); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function(akis){
        var parcalar = [];
        kayitci = new MediaRecorder(akis);
        kayitci.ondataavailable = function(e){ if (e.data && e.data.size) parcalar.push(e.data); };
        kayitci.onstop = function(){
          akis.getTracks().forEach(function(iz){ iz.stop(); });
          mikBtn.classList.remove('cbt-mik-acik');
          mikBtn.classList.add('cbt-mik-mesgul');
          var fd = new FormData();
          fd.append('ses', new Blob(parcalar, { type: 'audio/webm' }), 'ses.webm');
          fd.append('dil', dil);
          fetch(kok + 'chat-stt.php', { method: 'POST', body: fd })
            .then(function(r){ if (!r.ok) throw 0; return r.json(); })
            .then(function(j){ if (j && j.metin) { giris.value = j.metin; giris.focus(); } })
            .catch(function(){})
            .then(function(){ mikBtn.classList.remove('cbt-mik-mesgul'); });
        };
        kayitci.start();
        mikBtn.classList.add('cbt-mik-acik');
        setTimeout(function(){ if (kayitci && kayitci.state === 'recording') kayitci.stop(); }, 15000);
      }).catch(function(){ /* mikrofon izni verilmedi */ });
    });
  }

  /* ---------- dil seçimi ---------- */
  var dilSec = panel.querySelector('#cbtDil');
  dilSec.addEventListener('change', function(){
    dil = dilSec.value === 'en' ? 'en' : 'tr';
    giris.placeholder = METIN[dil].yazin;
    panel.querySelector('#cbtDurum').textContent = mesaiIcinde() ? METIN[dil].durumAcik : METIN[dil].durumKapali;
    var eskiHizli = govde.querySelector('.cbt-hizli'); if (eskiHizli) eskiHizli.remove();
    botMsj(METIN[dil].hosgeldin);
    if (dil === 'tr') anaMenu(200);
  });

  /* ---------- otomatik karşılama baloncuğu (oturumda bir kez) ---------- */
  try {
    if (!sessionStorage.getItem('cbtNudge')) {
      var nudge = document.createElement('div');
      nudge.className = 'cbt-nudge';
      nudge.innerHTML = '<button type="button" class="cbt-nudge-x" aria-label="Kapat">✕</button><strong>Merhaba! 👋</strong> Randevu ve tüm sorularınız için buradayım.';
      document.body.appendChild(nudge);
      setTimeout(function(){ nudge.classList.add('girdi'); }, 1800);
      var nudgeGit = function(){ if (nudge.parentNode) nudge.remove(); try { sessionStorage.setItem('cbtNudge', '1'); } catch(e){} };
      nudge.querySelector('.cbt-nudge-x').addEventListener('click', function(e){ e.stopPropagation(); nudgeGit(); });
      nudge.addEventListener('click', function(){ nudgeGit(); launch.click(); });
      launch.addEventListener('click', nudgeGit);
      setTimeout(nudgeGit, 30000);
    }
  } catch(e){}
})();
