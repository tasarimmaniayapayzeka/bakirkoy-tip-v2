<?php
/* Avrupa Tıp — talep toplama ucu: tüm site formları ve bot buraya yazar.
   Kayıtlar web kökü DIŞINDAKİ SQLite dosyasında tutulur; /panel/ üzerinden yönetilir. */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"hata":"yontem"}'; exit; }

$ortak = __DIR__ . '/../atm-panel/atm-ortak.php';
if (!file_exists($ortak)) { http_response_code(503); echo '{"hata":"yapilandirma"}'; exit; }
require $ortak;

/* hız sınırı: IP başına saatte 20 talep */
$ip = preg_replace('/[^0-9a-f\.\:]/i', '', $_SERVER['REMOTE_ADDR'] ?? 'x');
$kova = sys_get_temp_dir() . '/atm-talep-' . md5($ip) . '-' . date('YmdH');
$adet = (int) @file_get_contents($kova);
if ($adet >= 20) { http_response_code(429); echo '{"hata":"limit"}'; exit; }

/* JSON veya form gövdesi */
$ham = file_get_contents('php://input');
$g = json_decode($ham, true);
if (!is_array($g)) $g = $_POST;
if (!is_array($g) || !$g) { http_response_code(400); echo '{"hata":"girdi"}'; exit; }

/* bal küpü: gizli "web" alanı doluysa bot — sessizce kabul et, kaydetme */
if (!empty($g['web'])) { echo '{"ok":1}'; exit; }

$TURLER = ['randevu','fiyat','arayalim','hekime-soru','gorusme','bot-randevu','iletisim'];
$tur = in_array($g['tur'] ?? '', $TURLER, true) ? $g['tur'] : '';
if ($tur === '') { http_response_code(400); echo '{"hata":"tur"}'; exit; }

$ad  = mb_substr(trim((string)($g['ad'] ?? '')), 0, 120);
$tel = preg_replace('/\D/', '', (string)($g['tel'] ?? ''));
if ($tel !== '' && (strlen($tel) < 10 || strlen($tel) > 12)) { http_response_code(400); echo '{"hata":"tel"}'; exit; }
if ($tel === '' && $ad === '') { http_response_code(400); echo '{"hata":"bos"}'; exit; }

$ozet = mb_substr(trim((string)($g['ozet'] ?? ($g['brans'] ?? ($g['konu'] ?? '')))), 0, 160);
$dil  = ($g['dil'] ?? 'tr') === 'en' ? 'en' : 'tr';
$sayfa = mb_substr(trim((string)($g['sayfa'] ?? '')), 0, 120);

/* tüm alanları (sistem alanları hariç) detaya koy */
$detay = [];
foreach ($g as $k => $v) {
  if (in_array($k, ['tur','web','sayfa','dil'], true)) continue;
  if (!is_scalar($v)) continue;
  $detay[mb_substr((string)$k, 0, 40)] = mb_substr(trim((string)$v), 0, 400);
}

try {
  $db = atm_db();
  $s = $db->prepare('INSERT INTO talepler (tur, ad, tel, ozet, detay, sayfa, dil, olusturma) VALUES (?,?,?,?,?,?,?,?)');
  $s->execute([$tur, $ad, $tel, $ozet, json_encode($detay, JSON_UNESCAPED_UNICODE), $sayfa, $dil, atm_simdi()]);
} catch (Exception $e) {
  http_response_code(500); echo '{"hata":"kayit"}'; exit;
}

@file_put_contents($kova, $adet + 1);
echo '{"ok":1}';
