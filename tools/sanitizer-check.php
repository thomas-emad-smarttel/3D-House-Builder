<?php

/*
 * Framework-free checks for the content sanitiser.
 *   php tools/sanitizer-check.php                   run the checks
 *   php tools/sanitizer-check.php --validate f.json print the errors for a payload (exit 1 if any)
 */
require __DIR__.'/../app/Support/ContentSanitizer.php';

use App\Support\ContentSanitizer as S;

if (! function_exists('env')) {
    function env($k, $d = null)
    {
        return $d;
    }
}

if (($argv[1] ?? '') === '--content') {          // the sanitised starter content as JSON
    echo json_encode(S::run(include __DIR__.'/../config/portfolio.php')['content'], JSON_UNESCAPED_SLASHES);
    exit(0);
}
if (($argv[1] ?? '') === '--sanitize') {          // {content, errors} for a payload file, like the dashboard save endpoint
    echo json_encode(S::run(json_decode(file_get_contents($argv[2]), true)), JSON_UNESCAPED_SLASHES);
    exit(0);
}
if (($argv[1] ?? '') === '--validate') {
    $r = S::run(json_decode(file_get_contents($argv[2]), true));
    echo json_encode($r['errors'], JSON_PRETTY_PRINT), "\n";
    exit($r['errors'] ? 1 : 0);
}

$fail = 0;
$ok = function (bool $c, string $m) use (&$fail) {
    echo ($c ? '  ok   ' : '  FAIL ').$m."\n";
    if (! $c) {
        $fail++;
    }
};
$cfg = include __DIR__.'/../config/portfolio.php';

echo "[config file is valid]\n";
$base = S::run($cfg);
$ok($base['errors'] === [], 'shipped config has no errors'.($base['errors'] ? ' '.json_encode($base['errors']) : ''));
$ok(count($base['content']['rooms']) === 9, '9 rooms');
$ok(S::run($base['content'])['content'] === $base['content'], 'sanitising is idempotent');
$ok(S::run($base['content'])['errors'] === [], 'sanitised content re-validates cleanly');
$ok(isset($base['content']['settings']['welcome_lead']) && $base['content']['settings']['exposure'] === 1.15, 'settings get defaults');
$ok(! isset($base['content']['rooms'][0]['unknown']), 'canonical shape');

echo "\n[bad input is reported by path]\n";
$bad = $base['content'];
$bad['owner']['name'] = '';
$bad['contact']['email'] = 'not-an-email';
$bad['contact']['linkedin'] = 'javascript:alert(1)';
$bad['cv_file'] = '../../.env';
$bad['rooms'][1]['id'] = $bad['rooms'][0]['id'];           // duplicate room id
$bad['rooms'][2]['id'] = 'hub';                            // reserved
$bad['rooms'][3]['accent'] = 'red';
$bad['rooms'][3]['scene'] = 'evil';
$bad['rooms'][4]['flagship'] = true;                       // becomes the first flagship in order...
// ...so the config's real flagship (erp, index 8) is the one reported as the second
$bad['rooms'][5]['modules'][0]['status'] = 'done';
$bad['rooms'][5]['modules'][0]['links']['demo'] = 'ftp://x';
$bad['rooms'][5]['modules'][1]['id'] = $bad['rooms'][5]['modules'][0]['id'];
$bad['rooms'][5]['modules'][2]['media'] = [['type' => 'image', 'src' => '//evil.example/x.png'], ['type' => 'image', 'src' => '/storage/portfolio/ok.png']];
$bad['settings']['exposure'] = 99;
$e = S::run($bad)['errors'];
foreach (['owner.name', 'contact.email', 'contact.linkedin', 'cv_file', 'rooms.1.id', 'rooms.2.id', 'rooms.3.accent', 'rooms.3.scene',
    'rooms.8.flagship', 'rooms.5.modules.0.status', 'rooms.5.modules.0.links.demo', 'rooms.5.modules.1.id',
    'rooms.5.modules.2.media.0.src', 'settings.exposure'] as $path) {
    $ok(isset($e[$path]), "error at $path".(isset($e[$path]) ? " — {$e[$path]}" : ''));
}
$ok(str_contains($e['rooms.2.id'] ?? '', 'reserved'), 'reserved id gets its own message');

$ok(! isset($e['rooms.5.modules.2.media.1.src']), 'a valid /storage/ media path is accepted');
$res = S::run($bad)['content'];
$ok($res['contact']['linkedin'] === null, 'javascript: URL is dropped from the output');
$ok(count($res['rooms'][5]['modules'][2]['media']) === 1, 'protocol-relative media URL is dropped, valid one kept');
$ok(array_sum(array_map(fn ($r) => (int) $r['flagship'], $res['rooms'])) === 1, 'exactly one flagship survives');

echo "\n[limits and coercion]\n";
$big = $base['content'];
$big['rooms'][0]['modules'] = array_fill(0, 11, ['id' => 'a', 'name' => 'A']);
$e = S::run($big)['errors'];
$ok(isset($e['rooms.0.modules']), 'more than 10 modules is rejected');
$big = $base['content'];
$big['skills'] = 'nope';
$ok(isset(S::run($big)['errors']['skills']), 'non-list is rejected');
$t = $base['content'];
$t['owner']['name'] = str_repeat('x', 500);
$ok(isset(S::run($t)['errors']['owner.name']) && mb_strlen(S::run($t)['content']['owner']['name']) === 120, 'over-long text is flagged and truncated');
$t = $base['content'];
$t['owner']['name'] = "Ann\x00\x07 Lee";
$ok(S::run($t)['content']['owner']['name'] === 'Ann Lee', 'control characters are stripped');
$t = $base['content'];
$t['owner']['placeholder'] = 'false';
$ok(S::run($t)['content']['owner']['placeholder'] === false, '"false" string coerces to false');
$t = $base['content'];
$t['rooms'][5]['modules'][0]['features'] = ['a', ['name' => 'B', 'status' => 'completed'], ['name' => 'C'], ''];
$f = S::run($t)['content']['rooms'][5]['modules'][0]['features'];
$ok($f === ['a', ['name' => 'B', 'status' => 'completed'], 'C'], 'features: strings, {name,status}, empties dropped');
$t = $base['content'];
$t['<script>'] = 1;
$t['owner']['<b>'] = 1;
$ok(array_keys(S::run($t)['content']) === array_keys($base['content']), 'unknown keys are dropped');
$ok(S::run(null)['errors'] !== [] && S::run('garbage')['content']['rooms'] === [], 'garbage input yields errors, not exceptions');

echo "\n[custom room layouts]\n";
$cat = S::catalog();
$ok(count($cat['types']) >= 20, count($cat['types']).' object types in the shared catalogue');
$myRoom = array_values(array_filter($base['content']['rooms'], fn ($r) => $r['id'] === 'my-room'))[0];
$ok(($myRoom['layout']['size']['w'] ?? 0) === 20.0 && count($myRoom['layout']['objects']) === 11, 'starter room layout is valid and complete (11 objects)');
$ok($myRoom['layout']['objects'][0]['p']['title'] === 'My room' && $myRoom['layout']['objects'][1]['p']['monitors'] === 2, 'partial params are filled from defaults');
$ok(isset($myRoom['layout']['theme']['brightness']) && $myRoom['layout']['theme']['floor'] === 'wood', 'theme defaults filled in');

// every catalogue type validates at its defaults when placed mid-room (module needs a real module id)
$gym = $base['content']['rooms'][array_search('gym', array_column($base['content']['rooms'], 'id'))];
$objs = [];
$i = 0;
foreach (array_keys($cat['types']) as $t) {
    $p = $t === 'module' ? ['module' => $gym['modules'][0]['id']] : [];
    $objs[] = ['id' => "$t-1", 'type' => $t, 'x' => -6 + ($i % 6) * 2.4, 'z' => -5 + intdiv($i, 6) * 2.2, 'rot' => 0, 'p' => $p];
    $i++;
}
$full = $gym;
$full['scene'] = 'custom';
$full['layout'] = ['size' => ['w' => 20, 'd' => 16, 'h' => 5], 'objects' => $objs];
$r = S::run(['owner' => $base['content']['owner'], 'rooms' => [$full]]);
$ok($r['errors'] === [], 'one of EVERY object type validates at defaults'.($r['errors'] ? ' '.json_encode($r['errors']) : ''));
$re = $r['content']['rooms'][0]['layout'];
$ok(S::run(['owner' => $base['content']['owner'], 'rooms' => [array_merge($full, ['layout' => $re])]])['content']['rooms'][0]['layout'] === $re, 'layout sanitising is idempotent');

$mk = function (callable $mutate) use ($full, $base) {
    $room = $full;
    $room['layout']['objects'] = array_slice($full['layout']['objects'], 0, 3);
    $room = $mutate($room);

    return S::run(['owner' => $base['content']['owner'], 'rooms' => [$room]])['errors'];
};
$e = $mk(function ($r) {
    $r['layout']['objects'][0]['type'] = 'teleporter';

    return $r;
});
$ok(isset($e['rooms.0.layout.objects.0.type']), 'unknown object type rejected');
$e = $mk(function ($r) {
    $r['layout']['objects'][1]['x'] = 99;

    return $r;
});
$ok(isset($e['rooms.0.layout.objects.1.x']), 'object outside the room rejected');
$e = $mk(function ($r) {
    $r['layout']['objects'][1]['rot'] = 45;

    return $r;
});
$ok(isset($e['rooms.0.layout.objects.1.rot']), 'rotation other than 0/90/180/270 rejected');
$e = $mk(function ($r) {
    $r['layout']['objects'][2]['id'] = $r['layout']['objects'][0]['id'];

    return $r;
});
$ok(isset($e['rooms.0.layout.objects.2.id']), 'duplicate object id rejected');
$e = $mk(function ($r) {
    $r['layout']['theme']['floor'] = 'lava';

    return $r;
});
$ok(isset($e['rooms.0.layout.theme.floor']), 'unknown floor material rejected');
$e = $mk(function ($r) {
    $r['layout']['size']['w'] = 500;

    return $r;
});
$ok(isset($e['rooms.0.layout.size.w']), 'absurd room size rejected');
$e = $mk(function ($r) {
    $r['layout']['objects'][] = ['id' => 'm', 'type' => 'module', 'x' => 0, 'z' => -7.7, 'rot' => 0, 'p' => ['module' => 'nope']];

    return $r;
});
$ok(isset($e['rooms.0.layout.objects.3.p.module']), 'module display pointing at a missing module rejected');
$e = $mk(function ($r) {
    $r['layout']['objects'][] = ['id' => 'b', 'type' => 'block', 'x' => 0, 'z' => 7, 'rot' => 0, 'p' => ['w' => 3, 'd' => 1]];

    return $r;
});
$ok(isset($e['rooms.0.layout.objects.3']) && str_contains($e['rooms.0.layout.objects.3'], 'entrance'), 'solid object blocking the entrance rejected');
$e = $mk(function ($r) {
    $r['layout']['objects'][] = ['id' => 'b', 'type' => 'block', 'x' => 0, 'z' => 7, 'rot' => 0, 'p' => ['w' => 3, 'd' => 1, 'y' => 2.5]];

    return $r;
});
$ok(! isset($e['rooms.0.layout.objects.3']), 'a raised (walk-under) block over the entrance is allowed');
$e = $mk(function ($r) {
    for ($k = 0; $k < 7; $k++) {
        $r['layout']['objects'][] = ['id' => "l$k", 'type' => 'light', 'x' => $k - 3, 'z' => 0, 'rot' => 0, 'p' => []];
    }

    return $r;
});
$ok(count(array_filter(array_keys($e), fn ($k) => str_ends_with($k, 'objects.9') || str_contains($k, 'objects.9'))) >= 1, 'more than 6 lights rejected');
$e = $mk(function ($r) {
    $r['layout']['objects'][] = ['id' => 'p', 'type' => 'picture', 'x' => 0, 'z' => -7.7, 'rot' => 0, 'p' => ['src' => 'javascript:alert(1)']];

    return $r;
});
$ok(isset($e['rooms.0.layout.objects.3.p.src']), 'javascript: picture source rejected');
$e = $mk(function ($r) {
    $r['layout']['objects'][] = ['id' => 'i', 'type' => 'info', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => ['link' => 'javascript:alert(1)']];

    return $r;
});
$ok(isset($e['rooms.0.layout.objects.3.p.link']), 'javascript: info link rejected');
$e = $mk(function ($r) {
    $r['layout']['objects'][0]['p']['<script>'] = 1;

    return $r;
});
$ok(! array_key_exists('<script>', S::run(['owner' => $base['content']['owner'], 'rooms' => [$full]])['content']['rooms'][0]['layout']['objects'][0]['p']), 'unknown params are dropped');
$nonCustom = $gym;
$nonCustom['scene'] = 'gym';
unset($nonCustom['layout']);
$ok(S::run(['owner' => $base['content']['owner'], 'rooms' => [$nonCustom]])['content']['rooms'][0]['layout'] === null, 'non-custom rooms carry no layout');
$empty = $gym;
$empty['scene'] = 'custom';
unset($empty['layout']);
$ok(S::run(['owner' => $base['content']['owner'], 'rooms' => [$empty]])['content']['rooms'][0]['layout']['objects'] === [], 'a new custom room gets an empty default layout');

echo $fail ? "\n$fail FAILURE(S)\n" : "\nALL SANITISER CHECKS PASSED\n";
exit($fail ? 1 : 0);
