<?php
/* 👍/👎 yanıt puanları — web köküne DIŞARIDAN ERİŞİLEMEYEN log dosyasına yazar. */
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"hata":"yontem"}'; exit; }

$govde = json_decode(file_get_contents('php://input'), true);
$puan = (int)($govde['puan'] ?? -1);
if ($puan !== 0 && $puan !== 1) { http_response_code(400); echo '{"hata":"girdi"}'; exit; }

$kayit = json_encode([
  'zaman' => date('c'),
  'puan' => $puan,
  'soru' => mb_substr(trim((string)($govde['soru'] ?? '')), 0, 300),
  'yanit' => mb_substr(trim((string)($govde['yanit'] ?? '')), 0, 300),
], JSON_UNESCAPED_UNICODE);

@file_put_contents(__DIR__ . '/../chat-geribildirim.log', $kayit . "\n", FILE_APPEND | LOCK_EX);
echo '{"ok":1}';
