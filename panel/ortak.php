<?php
/* Panel ortak katmanı: oturum + kimlik + CSRF */
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
session_name('atmpanel');
session_start();

require_once __DIR__ . '/../../atm-panel/atm-ortak.php';

function girisli() { return !empty($_SESSION['atm_giris']); }

function giris_zorunlu() {
  if (!girisli()) { header('Location: giris.php'); exit; }
}

function csrf_al() {
  if (empty($_SESSION['atm_csrf'])) $_SESSION['atm_csrf'] = bin2hex(random_bytes(16));
  return $_SESSION['atm_csrf'];
}

function csrf_dogru($t) {
  return !empty($_SESSION['atm_csrf']) && hash_equals($_SESSION['atm_csrf'], (string)$t);
}

function k($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$DURUMLAR = ['yeni' => 'Yeni', 'arandi' => 'Arandı', 'randevu' => 'Randevu verildi', 'geldi' => 'Geldi', 'iptal' => 'İptal/Ulaşılamadı'];
$TUR_AD = ['randevu' => 'Randevu', 'fiyat' => 'Fiyat Sor', 'arayalim' => 'Sizi Arayalım', 'hekime-soru' => 'Hekime Sor', 'gorusme' => 'Görüntülü Görüşme', 'bot-randevu' => 'Bot Randevu', 'iletisim' => 'İletişim'];
