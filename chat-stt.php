<?php
/* Ses → yazı (Whisper). Mikrofon kaydı multipart 'ses' alanıyla gelir. */
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"hata":"yontem"}'; exit; }
$cfg = __DIR__ . '/chat-config.php';
if (!file_exists($cfg)) { http_response_code(503); echo '{"hata":"yapilandirma"}'; exit; }
require $cfg;

$ip = preg_replace('/[^0-9a-f\.\:]/i', '', $_SERVER['REMOTE_ADDR'] ?? 'x');
$kova = sys_get_temp_dir() . '/atm-stt-' . md5($ip) . '-' . date('YmdH');
$adet = (int) @file_get_contents($kova);
if ($adet >= 20) { http_response_code(429); echo '{"hata":"limit"}'; exit; }
@file_put_contents($kova, $adet + 1);

if (empty($_FILES['ses']['tmp_name']) || $_FILES['ses']['error'] !== UPLOAD_ERR_OK) { http_response_code(400); echo '{"hata":"ses"}'; exit; }
if ($_FILES['ses']['size'] > 4 * 1024 * 1024) { http_response_code(400); echo '{"hata":"boyut"}'; exit; }
$dil = (($_POST['dil'] ?? 'tr') === 'en') ? 'en' : 'tr';

$ch = curl_init('https://api.openai.com/v1/audio/transcriptions');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => [
    'file' => new CURLFile($_FILES['ses']['tmp_name'], 'audio/webm', 'ses.webm'),
    'model' => 'whisper-1',
    'language' => $dil,
  ],
  CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . OPENAI_KEY],
  CURLOPT_TIMEOUT => 30,
]);
$yanit = curl_exec($ch);
$kod = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($yanit === false || $kod >= 400) { http_response_code(502); echo '{"hata":"saglayici"}'; exit; }
$j = json_decode($yanit, true);
$metin = trim($j['text'] ?? '');
echo json_encode(['metin' => mb_substr($metin, 0, 300)], JSON_UNESCAPED_UNICODE);
