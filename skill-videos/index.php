<?php
// ============================================================
// Skill-Video-Übersicht
// Liegt im Elternordner und listet alle Unterordner nach dem
// Schema "vorname-nachname-skill" als Kachel-Galerie auf.
// Aufgenommen wird jeder Ordner mit mindestens zwei Binde-
// strichen im Namen, der eine Startdatei (index.html,
// index.htm oder index.php – Groß-/Kleinschreibung egal)
// enthält.
//
// Fehlersuche: Seite mit ?debug=1 aufrufen, dann wird unten
// aufgelistet, welche Ordner übersprungen wurden und warum.
// ============================================================

$ueberschrift = 'Skill-Videos'; // Überschrift der Seite hier anpassen

$dir           = __DIR__;
$eintraege     = [];
$uebersprungen = [];
$debug         = isset($_GET['debug']);

// Sucht die Startdatei eines Ordners, unabhängig von der
// Groß-/Kleinschreibung (auf Linux-Servern ist index.html
// nicht dasselbe wie Index.HTML!).
function finde_startdatei(string $pfad): ?string
{
    foreach (scandir($pfad) as $datei) {
        if (preg_match('/^index\.(html?|php)$/i', $datei)) {
            return $datei;
        }
    }
    return null;
}

foreach (scandir($dir) as $ordner) {
    if ($ordner[0] === '.') continue;
    if (!is_dir($dir . '/' . $ordner)) continue;

    if (substr_count($ordner, '-') < 2) {
        $uebersprungen[$ordner] = 'Name entspricht nicht dem Schema vorname-nachname-skill (weniger als zwei Bindestriche)';
        continue;
    }

    $startdatei = finde_startdatei($dir . '/' . $ordner);
    if ($startdatei === null) {
        $uebersprungen[$ordner] = 'keine Startdatei gefunden (index.html, index.htm oder index.php)';
        continue;
    }

    $teile    = explode('-', $ordner);
    $vorname  = ucfirst($teile[0]);
    $nachname = ucfirst($teile[1]);
    $skill    = implode(' ', array_map('ucfirst', array_slice($teile, 2)));

    // Erstes Bild im Ordner als Poster verwenden
    $poster = null;
    foreach (scandir($dir . '/' . $ordner) as $datei) {
        if (preg_match('/\.(jpe?g|png|webp)$/i', $datei)) {
            $poster = $ordner . '/' . $datei;
            break;
        }
    }

    $eintraege[] = [
        // Direkt auf die gefundene Startdatei verlinken – so
        // funktioniert der Link auch, wenn der Server bei
        // Index.HTML oder index.php kein Verzeichnislisting
        // auflöst.
        'href'     => $ordner . '/' . $startdatei,
        'titel'    => $vorname . ' ' . $nachname . ' erklärt: ' . $skill,
        'nachname' => $nachname,
        'vorname'  => $vorname,
        'poster'   => $poster,
    ];
}

// Sortierung: Nachname A–Z, bei gleichem Nachnamen nach Vorname
usort($eintraege, function ($a, $b) {
    return strcasecmp($a['nachname'], $b['nachname'])
        ?: strcasecmp($a['vorname'], $b['vorname']);
});
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= htmlspecialchars($ueberschrift) ?></title>
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        background: #f4f4f5;
        color: #18181b;
        padding: 2rem 1rem;
    }

    h1 {
        max-width: 72rem;
        margin: 0 auto 1.5rem;
        font-size: 1.75rem;
    }

    .galerie {
        max-width: 72rem;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
        gap: 1.25rem;
    }

    .kachel {
        display: block;
        background: #fff;
        border-radius: 0.75rem;
        overflow: hidden;
        text-decoration: none;
        color: inherit;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .kachel:hover,
    .kachel:focus-visible {
        transform: translateY(-3px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
    }

    .kachel img,
    .kachel .platzhalter {
        width: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
        display: block;
        background: #d4d4d8;
    }

    .kachel .platzhalter {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        color: #71717a;
    }

    .kachel .titel {
        padding: 0.75rem 1rem 1rem;
        font-weight: 600;
        line-height: 1.35;
    }

    .leer {
        max-width: 72rem;
        margin: 0 auto;
        color: #71717a;
    }

    .debug {
        max-width: 72rem;
        margin: 2rem auto 0;
        padding: 1rem;
        background: #fef9c3;
        border: 1px solid #eab308;
        border-radius: 0.5rem;
        font-size: 0.9rem;
    }

    .debug h2 { font-size: 1rem; margin-bottom: 0.5rem; }
    .debug li { margin-left: 1.25rem; }
</style>
</head>
<body>

<h1><?= htmlspecialchars($ueberschrift) ?></h1>

<?php if (empty($eintraege)): ?>
    <p class="leer">Noch keine Beiträge vorhanden.</p>
<?php else: ?>
    <div class="galerie">
        <?php foreach ($eintraege as $e): ?>
            <a class="kachel" href="<?= htmlspecialchars($e['href']) ?>">
                <?php if ($e['poster']): ?>
                    <img src="<?= htmlspecialchars($e['poster']) ?>"
                         alt="Vorschaubild: <?= htmlspecialchars($e['titel']) ?>"
                         loading="lazy">
                <?php else: ?>
                    <div class="platzhalter" aria-hidden="true">▶</div>
                <?php endif; ?>
                <span class="titel"><?= htmlspecialchars($e['titel']) ?></span>
            </a>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<?php if ($debug): ?>
    <div class="debug">
        <h2>Debug: <?= count($eintraege) ?> Ordner aufgenommen,
            <?= count($uebersprungen) ?> übersprungen</h2>
        <?php if ($uebersprungen): ?>
            <ul>
                <?php foreach ($uebersprungen as $ordner => $grund): ?>
                    <li><strong><?= htmlspecialchars($ordner) ?></strong> –
                        <?= htmlspecialchars($grund) ?></li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
    </div>
<?php endif; ?>

</body>
</html>
