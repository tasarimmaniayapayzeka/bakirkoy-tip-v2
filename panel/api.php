<?php
require __DIR__ . '/ortak.php';
header('Content-Type: application/json; charset=utf-8');
if (!girisli()) { http_response_code(401); echo '{"hata":"giris"}'; exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"hata":"yontem"}'; exit; }

$g = json_decode(file_get_contents('php://input'), true);
if (!is_array($g) || !csrf_dogru($g['csrf'] ?? '')) { http_response_code(403); echo '{"hata":"csrf"}'; exit; }

$id = (int)($g['id'] ?? 0);
$durum = isset($DURUMLAR[$g['durum'] ?? '']) ? $g['durum'] : 'yeni';
$notlar = mb_substr(trim((string)($g['notlar'] ?? '')), 0, 500);
if ($id < 1) { http_response_code(400); echo '{"hata":"id"}'; exit; }

$db = atm_db();
$s = $db->prepare('UPDATE talepler SET durum = ?, notlar = ?, guncelleme = ? WHERE id = ?');
$s->execute([$durum, $notlar, atm_simdi(), $id]);
echo '{"ok":1}';
