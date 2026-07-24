<?php
require __DIR__ . '/ortak.php';
giris_zorunlu();
$db = atm_db();
$csrf = csrf_al();

/* filtreler */
$fTur = isset($_GET['tur']) && isset($TUR_AD[$_GET['tur']]) ? $_GET['tur'] : '';
$fDurum = isset($_GET['durum']) && isset($DURUMLAR[$_GET['durum']]) ? $_GET['durum'] : '';

$kosul = []; $par = [];
if ($fTur !== '')   { $kosul[] = 'tur = ?';   $par[] = $fTur; }
if ($fDurum !== '') { $kosul[] = 'durum = ?'; $par[] = $fDurum; }
$where = $kosul ? ('WHERE ' . implode(' AND ', $kosul)) : '';

$s = $db->prepare("SELECT * FROM talepler $where ORDER BY id DESC LIMIT 300");
$s->execute($par);
$satirlar = $s->fetchAll(PDO::FETCH_ASSOC);

/* sayaçlar */
$bugun = $db->query("SELECT COUNT(*) FROM talepler WHERE olusturma >= '" . date('Y-m-d') . "'")->fetchColumn();
$hafta = $db->query("SELECT COUNT(*) FROM talepler WHERE olusturma >= '" . date('Y-m-d', strtotime('-6 days')) . "'")->fetchColumn();
$toplam = $db->query("SELECT COUNT(*) FROM talepler")->fetchColumn();
$bekleyen = $db->query("SELECT COUNT(*) FROM talepler WHERE durum = 'yeni'")->fetchColumn();
$turSayi = $db->query("SELECT tur, COUNT(*) c FROM talepler GROUP BY tur")->fetchAll(PDO::FETCH_KEY_PAIR);

/* bot geri bildirim özeti */
$fbYolu = __DIR__ . '/../../chat-geribildirim.log';
$fbIyi = 0; $fbKotu = 0; $fbSon = [];
if (is_readable($fbYolu)) {
  $satirlarFb = array_filter(explode("\n", (string)@file_get_contents($fbYolu)));
  foreach ($satirlarFb as $ln) {
    $j = json_decode($ln, true);
    if (!is_array($j)) continue;
    if (($j['puan'] ?? -1) === 1) $fbIyi++; else $fbKotu++;
    $fbSon[] = $j;
  }
  $fbSon = array_slice(array_reverse($fbSon), 0, 10);
}
?><!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Gelen Kutusu — Avrupa Tıp Paneli</title>
<style>
  :root{--navy:#0A1C33; --navy2:#142C4E; --copper:#A85B2A; --line:#DCE4EE; --bg:#F2F5F9; --ink:#1C2B3A; --ink2:#5A6B84}
  *{margin:0; padding:0; box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif; background:var(--bg); color:var(--ink); font-size:14px}
  .ust{background:linear-gradient(120deg,var(--navy2),var(--navy)); color:#fff; padding:14px 22px; display:flex; align-items:center; gap:12px}
  .ust .mono{width:38px; height:38px; border-radius:50%; display:grid; place-items:center; font-family:Georgia,serif; font-style:italic; font-weight:700; font-size:19px; color:#FBEFE4; background:radial-gradient(circle at 34% 28%,#2E4A72,#14294A 58%,#0A1C33); box-shadow:0 0 10px rgba(198,110,58,.6)}
  .ust b{font-size:15px}
  .ust span{font-size:11.5px; color:rgba(255,255,255,.7); display:block}
  .ust a{margin-left:auto; color:#fff; background:rgba(255,255,255,.14); padding:8px 14px; border-radius:8px; text-decoration:none; font-size:13px}
  .kap{max-width:1180px; margin:0 auto; padding:20px 16px 40px}
  .kartlar{display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:18px}
  .kt{background:#fff; border:1px solid var(--line); border-radius:12px; padding:14px 16px}
  .kt b{font-size:22px; color:var(--navy); display:block}
  .kt span{font-size:12px; color:var(--ink2)}
  .kt.turuncu b{color:var(--copper)}
  .filtre{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; align-items:center}
  .filtre a{text-decoration:none; font-size:12.5px; font-weight:600; color:var(--ink); background:#fff; border:1.5px solid var(--line); border-radius:100px; padding:6px 13px}
  .filtre a.on{background:var(--navy); color:#fff; border-color:var(--navy)}
  .filtre .b2{margin-left:10px}
  table{width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--line); border-radius:12px; overflow:hidden}
  th{background:var(--navy); color:#fff; font-size:11.5px; text-align:left; padding:9px 11px; letter-spacing:.03em}
  td{border-top:1px solid var(--line); padding:9px 11px; vertical-align:top; font-size:13px}
  tr:hover td{background:#F8FAFD}
  .tur{display:inline-block; font-size:10.5px; font-weight:800; border-radius:5px; padding:2px 7px; color:#fff; background:var(--navy2); white-space:nowrap}
  .tur.gorusme{background:#7A4A9E} .tur.fiyat{background:#B07A1E} .tur.arayalim{background:#2F7D4F} .tur.bot-randevu{background:#A85B2A} .tur.hekime-soru{background:#357084}
  .tel a{color:var(--navy); font-weight:700; text-decoration:none; white-space:nowrap}
  .det{font-size:11.5px; color:var(--ink2); max-width:260px}
  select,.notk{border:1.5px solid var(--line); border-radius:7px; padding:5px 7px; font-size:12.5px; font-family:inherit; background:#fff}
  .notk{width:150px}
  .kaydet{background:var(--copper); color:#fff; border:0; border-radius:7px; padding:6px 10px; font-size:12px; font-weight:700; cursor:pointer}
  .kaydet.ok{background:#2F7D4F}
  .bos{padding:26px; text-align:center; color:var(--ink2); background:#fff; border:1px dashed var(--line); border-radius:12px}
  h2{font-size:15px; color:var(--navy); margin:26px 0 10px}
  .fb{display:flex; gap:12px; margin-bottom:12px}
  .fb .kt{flex:none; min-width:130px}
  .fbl{background:#fff; border:1px solid var(--line); border-radius:12px; padding:6px 0}
  .fbl div{padding:8px 14px; border-top:1px solid #EEF2F7; font-size:12.5px}
  .fbl div:first-child{border-top:0}
  .fbl .p1{color:#2F7D4F; font-weight:800} .fbl .p0{color:#A32D2D; font-weight:800}
  .zaman{white-space:nowrap; font-size:11.5px; color:var(--ink2)}
  @media(max-width:760px){ .gizle{display:none} .notk{width:100px} }
</style>
</head>
<body>
<div class="ust">
  <div class="mono">A</div>
  <div><b>Avrupa Tıp Merkezi</b><span>Yönetim Paneli · Gelen Kutusu</span></div>
  <a href="cikis.php">Çıkış</a>
</div>
<div class="kap">

  <div class="kartlar">
    <div class="kt turuncu"><b><?php echo (int)$bekleyen; ?></b><span>Bekleyen (Yeni)</span></div>
    <div class="kt"><b><?php echo (int)$bugun; ?></b><span>Bugün gelen</span></div>
    <div class="kt"><b><?php echo (int)$hafta; ?></b><span>Son 7 gün</span></div>
    <div class="kt"><b><?php echo (int)$toplam; ?></b><span>Toplam talep</span></div>
    <div class="kt"><b><?php echo (int)($turSayi['gorusme'] ?? 0); ?></b><span>Görüntülü görüşme</span></div>
  </div>

  <div class="filtre">
    <a href="index.php" class="<?php echo ($fTur === '' && $fDurum === '') ? 'on' : ''; ?>">Tümü</a>
    <?php foreach ($TUR_AD as $tk => $tv): ?>
      <a class="<?php echo $fTur === $tk ? 'on' : ''; ?>" href="?tur=<?php echo k($tk); ?><?php echo $fDurum ? '&amp;durum=' . k($fDurum) : ''; ?>"><?php echo k($tv); ?></a>
    <?php endforeach; ?>
    <span class="b2"></span>
    <?php foreach ($DURUMLAR as $dk => $dv): ?>
      <a class="<?php echo $fDurum === $dk ? 'on' : ''; ?>" href="?durum=<?php echo k($dk); ?><?php echo $fTur ? '&amp;tur=' . k($fTur) : ''; ?>"><?php echo k($dv); ?></a>
    <?php endforeach; ?>
  </div>

  <?php if (!$satirlar): ?>
    <div class="bos">Bu filtrede talep yok. Formlar ve bot çalıştıkça talepler burada birikecek.</div>
  <?php else: ?>
  <table>
    <tr><th>#</th><th>Zaman</th><th>Tür</th><th>Ad</th><th>Telefon</th><th class="gizle">Özet / Detay</th><th>Durum</th><th>Not</th><th></th></tr>
    <?php foreach ($satirlar as $r): $det = json_decode($r['detay'] ?: '[]', true) ?: []; ?>
    <tr data-id="<?php echo (int)$r['id']; ?>">
      <td><?php echo (int)$r['id']; ?></td>
      <td class="zaman"><?php echo k(substr($r['olusturma'], 5, 11)); ?></td>
      <td><span class="tur <?php echo k($r['tur']); ?>"><?php echo k($TUR_AD[$r['tur']] ?? $r['tur']); ?></span><?php if ($r['dil'] === 'en') echo ' 🌍'; ?></td>
      <td><?php echo k($r['ad'] ?: '—'); ?></td>
      <td class="tel"><?php echo $r['tel'] ? '<a href="tel:+9' . k(ltrim($r['tel'], '0')) . '">' . k($r['tel']) . '</a>' : '—'; ?></td>
      <td class="det gizle"><?php
        echo k($r['ozet']);
        $ek = [];
        foreach ($det as $dk2 => $dv2) { if ($dv2 !== '' && !in_array($dk2, ['ad','tel','brans'], true)) $ek[] = k($dk2) . ': ' . k(mb_substr($dv2, 0, 60)); }
        if ($ek) echo '<br>' . implode(' · ', array_slice($ek, 0, 4));
        if ($r['sayfa']) echo '<br><em>' . k($r['sayfa']) . '</em>';
      ?></td>
      <td>
        <select class="durum">
          <?php foreach ($DURUMLAR as $dk3 => $dv3): ?>
            <option value="<?php echo k($dk3); ?>" <?php echo $r['durum'] === $dk3 ? 'selected' : ''; ?>><?php echo k($dv3); ?></option>
          <?php endforeach; ?>
        </select>
      </td>
      <td><input class="notk" type="text" value="<?php echo k($r['notlar']); ?>" placeholder="not…"></td>
      <td><button class="kaydet" type="button">Kaydet</button></td>
    </tr>
    <?php endforeach; ?>
  </table>
  <?php endif; ?>

  <h2>🤖 Chatbot yanıt puanları</h2>
  <div class="fb">
    <div class="kt"><b style="color:#2F7D4F">👍 <?php echo $fbIyi; ?></b><span>Yararlı bulundu</span></div>
    <div class="kt"><b style="color:#A32D2D">👎 <?php echo $fbKotu; ?></b><span>Yararsız bulundu</span></div>
  </div>
  <?php if ($fbSon): ?>
  <div class="fbl">
    <?php foreach ($fbSon as $f): ?>
      <div><span class="<?php echo ($f['puan'] ?? 0) === 1 ? 'p1' : 'p0'; ?>"><?php echo ($f['puan'] ?? 0) === 1 ? '👍' : '👎'; ?></span>
        <b><?php echo k(mb_substr($f['soru'] ?? '', 0, 70)); ?></b>
        <span style="color:var(--ink2)"> → <?php echo k(mb_substr($f['yanit'] ?? '', 0, 90)); ?></span></div>
    <?php endforeach; ?>
  </div>
  <?php else: ?>
    <div class="bos">Henüz bot puanı yok.</div>
  <?php endif; ?>

</div>
<script>
var CSRF = '<?php echo k($csrf); ?>';
document.querySelectorAll('.kaydet').forEach(function(b){
  b.addEventListener('click', function(){
    var tr = b.closest('tr');
    b.disabled = true; b.textContent = '...';
    fetch('api.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        csrf: CSRF,
        id: +tr.getAttribute('data-id'),
        durum: tr.querySelector('.durum').value,
        notlar: tr.querySelector('.notk').value
      })
    }).then(function(r){ return r.json(); }).then(function(j){
      b.disabled = false;
      if (j && j.ok) { b.textContent = '✓'; b.classList.add('ok'); setTimeout(function(){ b.textContent = 'Kaydet'; b.classList.remove('ok'); }, 1800); }
      else { b.textContent = 'Hata'; }
    }).catch(function(){ b.disabled = false; b.textContent = 'Hata'; });
  });
});
</script>
</body>
</html>
