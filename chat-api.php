<?php
/* Avrupa Tıp Merkezi — AI chatbot köprüsü v2 (metin + görsel + dil)
   Anahtar sunucuda kalır (chat-config.php), tarayıcıya asla inmez.
   Kurallı korumalar (acil/fiyat/teşhis) istemcide; burada da sistem
   talimatıyla ikinci kat koruma var. */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"hata":"yontem"}'; exit; }

$cfg = __DIR__ . '/chat-config.php';
if (!file_exists($cfg)) { http_response_code(503); echo '{"hata":"yapilandirma"}'; exit; }
require $cfg; // OPENAI_KEY tanımlar

/* — basit hız sınırı: IP başına saatte 40 istek — */
$ip = preg_replace('/[^0-9a-f\.\:]/i', '', $_SERVER['REMOTE_ADDR'] ?? 'x');
$kova = sys_get_temp_dir() . '/atm-bot-' . md5($ip) . '-' . date('YmdH');
$adet = (int) @file_get_contents($kova);
if ($adet >= 40) { http_response_code(429); echo '{"hata":"limit"}'; exit; }
@file_put_contents($kova, $adet + 1);

$govde = json_decode(file_get_contents('php://input'), true);
$mesajlar = $govde['mesajlar'] ?? null;
$dil = ($govde['dil'] ?? 'tr') === 'en' ? 'en' : 'tr';
if (!is_array($mesajlar) || count($mesajlar) < 1 || count($mesajlar) > 20) { http_response_code(400); echo '{"hata":"girdi"}'; exit; }

/* görsel yalnızca SON kullanıcı mesajında iletilir (geçmişteki kopyalar atılır) */
$sonIdx = count($mesajlar) - 1;
$temiz = [];
foreach ($mesajlar as $i => $m) {
  $rol = ($m['rol'] ?? '') === 'bot' ? 'assistant' : 'user';
  $icerik = mb_substr(trim((string)($m['icerik'] ?? '')), 0, 500);
  $gorsel = ($i === $sonIdx && $rol === 'user') ? (string)($m['gorsel'] ?? '') : '';
  if ($icerik === '' && $gorsel === '') continue;
  if ($gorsel !== '') {
    if (!preg_match('#^data:image/(jpeg|png|webp);base64,#', $gorsel) || strlen($gorsel) > 1800000) {
      http_response_code(400); echo '{"hata":"gorsel"}'; exit;
    }
    $parcalar = [];
    if ($icerik !== '') $parcalar[] = ['type' => 'text', 'text' => $icerik];
    $parcalar[] = ['type' => 'image_url', 'image_url' => ['url' => $gorsel, 'detail' => 'low']];
    $temiz[] = ['role' => $rol, 'content' => $parcalar];
  } else {
    $temiz[] = ['role' => $rol, 'content' => $icerik];
  }
}
if (!$temiz) { http_response_code(400); echo '{"hata":"girdi"}'; exit; }

$dilKurali = $dil === 'en'
  ? "Yanıtlarını HER ZAMAN İngilizce ver (kullanıcı İngilizce modu seçti)."
  : "Yanıtlarını Türkçe ver.";

$sistem = <<<TXT
Sen Özel Avrupa Tıp Merkezi'nin (Zuhuratbaba Mah., Bakırköy/İstanbul) yardım asistanısın. Kibar, KISA (en fazla 3-4 cümle) yanıt verirsin. $dilKurali

KESİN KURALLAR (Türk sağlık mevzuatı):
- ASLA teşhis koymaz, hastalık yorumu yapmaz, ilaç/tedavi önermezsin. Böyle sorularda muayene öner ve hangi-birime-gitmeliyim.html sihirbazını veya randevuyu öner.
- GÖRSELLER: kullanıcı fotoğraf gönderirse (cilt, tahlil, film vb.) içeriğini TIBBEN YORUMLAMA, bulgu okuma, "şu görünüyor" deme. Yalnızca hangi birime başvurmasının uygun olacağını söyle ve muayene öner. Belge/yol tarifi gibi tıbbi olmayan görselleri normal yanıtlayabilirsin.
- ASLA fiyat/ücret söylemezsin; fiyat-sor.html formuna yönlendirirsin.
- Acil durum belirtilerinde (göğüs ağrısı, nefes darlığı, bilinç kaybı vb.) TEK yanıt: hemen 112'yi aramalarını söyle.
- Hasta yorumu/övgü aktarımı, "en iyi" gibi üstünlük iddiaları yasak.
- Kişisel veri isteme (TC no vb.).
- Aşağıdaki BİLGİLER listesinde OLMAYAN kurum ayrıntılarını (asansör, cihaz markası, kat planı, engelli olanakları vb.) ASLA kesin dille iddia etme; "telefonla teyit edelim" deyip 0540 058 08 88'i ve [iletisim.html] sayfasını öner.

BİLGİLER:
- Çalışma: Hafta içi 08.30-20.00, Cumartesi 09.00-17.00, Pazar kapalı.
- 14 tıbbi birim, 26 uzman hekim. Aynı gün tahlil sonucu; sonuçlar e-Nabız'da. SGK + 12 tamamlayıcı sigorta anlaşması var (kapsam teyidi için telefon).
- Sağlık raporları (işe giriş, ehliyet, sporcu, evlilik, portör, öğrenci) randevusuz, genellikle aynı gün. 6 check-up paketi var. Ücretsiz 2 saat kapalı otopark; Marmaray 6 dk, metrobüs 4 dk.
- Genel sayfa işaretleri (yanıtta köşeli parantezle geçir, buton olur): [randevu.html] [fiyat-sor.html] [hangi-birime-gitmeliyim.html] [checkup-paketleri.html] [tahlil-sonuclari.html] [saglik-raporlari.html] [anlasmali-kurumlar.html] [hekimler.html] [iletisim.html]
- ÖNEMLİ: işaretleri cümlenin İÇİNE gömme (buton olarak ayrılırlar, cümlede boşluk kalır). Cümlelerini işaretsiz, kendi kendine yeten biçimde tamamla; tüm işaretleri yanıtın EN SONUNA ekle. Örn: "Laboratuvar birimimize gelebilirsiniz. [bolum-laboratuvar.html]"
- Birim önerirken birim işareti kullan (şık kart olarak gösterilir): [bolum-kardiyoloji.html] [bolum-ic-hastaliklari.html] [bolum-cocuk-sagligi.html] [bolum-kadin-hastaliklari.html] [bolum-ortopedi.html] [bolum-genel-cerrahi.html] [bolum-goz-hastaliklari.html] [bolum-kulak-burun-bogaz.html] [bolum-dermatoloji.html] [bolum-psikoloji.html] [bolum-beslenme-diyet.html] [bolum-fizik-tedavi.html] [bolum-laboratuvar.html] [bolum-goruntuleme.html]

Konu dışı sorularda (siyaset, kod, genel sohbet) nazikçe merkez hizmetlerine dön.
TXT;

array_unshift($temiz, ['role' => 'system', 'content' => $sistem]);

$istek = json_encode([
  'model' => 'gpt-4o-mini',
  'messages' => $temiz,
  'max_tokens' => 300,
  'temperature' => 0.4,
], JSON_UNESCAPED_UNICODE);

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $istek,
  CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . OPENAI_KEY],
  CURLOPT_TIMEOUT => 30,
]);
$yanit = curl_exec($ch);
$kod = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($yanit === false || $kod >= 400) { http_response_code(502); echo '{"hata":"saglayici"}'; exit; }
$j = json_decode($yanit, true);
$metin = trim($j['choices'][0]['message']['content'] ?? '');
if ($metin === '') { http_response_code(502); echo '{"hata":"bos"}'; exit; }

echo json_encode(['yanit' => $metin], JSON_UNESCAPED_UNICODE);
