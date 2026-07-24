<?php
require __DIR__ . '/ortak.php';
if (girisli()) { header('Location: index.php'); exit; }

$hata = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  /* kaba kuvvet önlemi: IP başına saatte 8 deneme + her denemede bekleme */
  $ip = preg_replace('/[^0-9a-f\.\:]/i', '', $_SERVER['REMOTE_ADDR'] ?? 'x');
  $kova = sys_get_temp_dir() . '/atm-giris-' . md5($ip) . '-' . date('YmdH');
  $deneme = (int) @file_get_contents($kova);
  if ($deneme >= 8) {
    $hata = 'Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.';
  } else {
    @file_put_contents($kova, $deneme + 1);
    usleep(700000);
    $ku = trim((string)($_POST['kullanici'] ?? ''));
    $si = (string)($_POST['sifre'] ?? '');
    if ($ku === PANEL_KULLANICI && password_verify($si, PANEL_SIFRE_HASH)) {
      session_regenerate_id(true);
      $_SESSION['atm_giris'] = 1;
      header('Location: index.php'); exit;
    }
    $hata = 'Kullanıcı adı veya şifre hatalı.';
  }
}
?><!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Yönetim Paneli Girişi — Avrupa Tıp Merkezi</title>
<style>
  *{margin:0; padding:0; box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif; background:linear-gradient(150deg,#142C4E,#0A1C33 65%); min-height:100vh; display:grid; place-items:center; padding:20px}
  .kart{background:#fff; border-radius:16px; padding:34px 32px; width:100%; max-width:380px; box-shadow:0 30px 70px rgba(0,0,0,.35)}
  .mono{width:56px; height:56px; border-radius:50%; margin:0 auto 14px; display:grid; place-items:center; font-family:Georgia,serif; font-style:italic; font-weight:700; font-size:28px; color:#FBEFE4; background:radial-gradient(circle at 34% 28%,#2E4A72,#14294A 58%,#0A1C33); box-shadow:0 0 16px rgba(198,110,58,.6); text-shadow:0 0 10px rgba(233,166,120,.9)}
  h1{font-size:17px; color:#0A1C33; text-align:center; margin-bottom:4px}
  .alt{font-size:12px; color:#6b7a90; text-align:center; margin-bottom:20px}
  label{display:block; font-size:12.5px; font-weight:600; color:#42526B; margin:12px 0 5px}
  input{width:100%; border:1.5px solid #DBE2EC; border-radius:10px; padding:11px 14px; font-size:15px; font-family:inherit}
  input:focus{outline:none; border-color:#24406A}
  button{width:100%; margin-top:18px; background:linear-gradient(135deg,#C66E3A,#A85B2A); color:#fff; border:0; border-radius:10px; padding:13px; font-size:15px; font-weight:700; cursor:pointer}
  .hata{background:#FCEBEB; border:1px solid #F09595; color:#791F1F; border-radius:8px; padding:9px 12px; font-size:13px; margin-top:14px}
</style>
</head>
<body>
  <form class="kart" method="post" autocomplete="off">
    <div class="mono">A</div>
    <h1>Avrupa Tıp Merkezi</h1>
    <p class="alt">Yönetim Paneli</p>
    <label for="ku">Kullanıcı adı</label>
    <input id="ku" name="kullanici" type="text" required autofocus>
    <label for="si">Şifre</label>
    <input id="si" name="sifre" type="password" required>
    <?php if ($hata): ?><div class="hata"><?php echo k($hata); ?></div><?php endif; ?>
    <button type="submit">Giriş Yap</button>
  </form>
</body>
</html>
