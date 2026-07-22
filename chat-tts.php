<?php
/* Yazı → ses (bot yanıtlarını seslendirir; yalnız kullanıcı açarsa çağrılır). */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
$cfg = __DIR__ . '/chat-config.php';
if (!file_exists($cfg)) { http_response_code(503); exit; }
require $cfg;

$ip = preg_replace('/[^0-9a-f\.\:]/i', '', $_SERVER['REMOTE_ADDR'] ?? 'x');
$kova = sys_get_temp_dir() . '/atm-tts-' . md5($ip) . '-' . date('YmdH');
$adet = (int) @file_get_contents($kova);
if ($adet >= 60) { http_response_code(429); exit; }
@file_put_contents($kova, $adet + 1);

$govde = json_decode(file_get_contents('php://input'), true);
$metin = mb_substr(trim((string)($govde['metin'] ?? '')), 0, 480);
if ($metin === '') { http_response_code(400); exit; }

$ch = curl_init('https://api.openai.com/v1/audio/speech');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode(['model' => 'tts-1', 'voice' => 'nova', 'input' => $metin], JSON_UNESCAPED_UNICODE),
  CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . OPENAI_KEY],
  CURLOPT_TIMEOUT => 30,
]);
$ses = curl_exec($ch);
$kod = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($ses === false || $kod >= 400) { http_response_code(502); exit; }
header('Content-Type: audio/mpeg');
header('Cache-Control: no-store');
echo $ses;
