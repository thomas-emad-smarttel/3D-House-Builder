<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $p['owner']['name'] }} — CV</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet">
    <style>
        :root { --ink:#171a1f; --mute:#5d646e; --line:#d9d4c8; --paper:#f6f2e9; --brass:#9a7326; }
        * { box-sizing: border-box; }
        body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.6 "Hanken Grotesk", system-ui, sans-serif; }
        main { max-width: 860px; margin: 0 auto; padding: 48px 24px 96px; }
        h1, h2, h3 { font-family: Syne, "Hanken Grotesk", sans-serif; line-height: 1.15; margin: 0; }
        h1 { font-size: clamp(2rem, 5vw, 3rem); font-weight: 800; }
        h2 { font-size: 1.35rem; font-weight: 700; margin: 48px 0 16px; padding-bottom: 8px; border-bottom: 2px solid var(--ink); }
        h3 { font-size: 1.05rem; font-weight: 700; }
        p { margin: 0 0 12px; max-width: 70ch; }
        a { color: inherit; text-decoration-thickness: 1px; text-underline-offset: 3px; }
        .topbar { display:flex; gap:12px; flex-wrap:wrap; margin-bottom: 32px; }
        .btn { display:inline-block; padding: 8px 16px; border:1px solid var(--ink); border-radius: 999px; text-decoration:none; font-weight:500; background:transparent; color:inherit; cursor:pointer; font:inherit; }
        .btn:hover { background: var(--ink); color: var(--paper); }
        .btn:focus-visible, a:focus-visible { outline: 3px solid var(--brass); outline-offset: 2px; }
        .title { font-size: 1.15rem; color: var(--mute); margin-top: 8px; }
        .contact { display:flex; flex-wrap:wrap; gap: 4px 20px; margin-top: 16px; color: var(--mute); }
        .tag { display:inline-block; font-size:.72rem; font-weight:600; padding: 1px 8px; border-radius: 999px; background:#efe1bd; color:#5d4410; vertical-align: middle; margin-left: 8px; }
        .status { display:inline-block; font-size:.78rem; font-weight:600; padding: 1px 9px; border-radius: 999px; border:1px solid var(--line); margin-left: 8px; vertical-align: middle; }
        .status-completed { border-color:#2f7a4d; color:#1f5a37; }
        .status-in_development { border-color:#a8791b; color:#7a5510; }
        .status-planned { color: var(--mute); }
        ul { margin: 0 0 12px; padding-left: 1.2rem; }
        li { margin: 2px 0; }
        .item { margin-bottom: 24px; break-inside: avoid; }
        .meta { color: var(--mute); font-size:.92rem; margin-bottom: 6px; }
        .skills { display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px 32px; }
        .muted { color: var(--mute); }
        .module { margin: 0 0 14px; }
        @media print {
            body { background:#fff; }
            .topbar { display:none; }
            main { padding: 0; }
            h2 { margin-top: 28px; }
        }
    </style>
</head>
<body>
@php
    $tag = fn ($flag) => $flag ? '<span class="tag">Placeholder</span>' : '';
    $statusLabel = ['completed' => 'Completed', 'in_development' => 'In development', 'planned' => 'Planned'];
    $feat = fn ($f) => is_array($f)
        ? ($f['name'] ?? '') . (isset($f['status']) ? ' (' . ($statusLabel[$f['status']] ?? $f['status']) . ')' : '')
        : $f;
    $c = $p['contact'];
    $projects = collect($p['rooms'])->where('kind', 'project')->sortByDesc(fn ($r) => (int) $r['flagship']);
@endphp
<main>
    <nav class="topbar" aria-label="CV actions">
        <a class="btn" href="{{ route('game') }}">Back to the 3D experience</a>
        <button class="btn" type="button" onclick="window.print()">Print or save as PDF</button>
        @if ($p['cv']['has_pdf'])
            <a class="btn" href="{{ $p['cv']['download_url'] }}">Download PDF</a>
        @endif
    </nav>

    <header>
        <h1>{{ $p['owner']['name'] }} {!! $tag($p['owner']['placeholder'] ?? false) !!}</h1>
        <p class="title">{{ $p['owner']['title'] }}@if (! empty($p['owner']['location'])) · {{ $p['owner']['location'] }}@endif</p>
        <div class="contact">
            @if ($c['email'])<a href="mailto:{{ $c['email'] }}">{{ $c['email'] }}</a>@endif
            @if ($c['linkedin'])<a href="{{ $c['linkedin'] }}" rel="noopener">LinkedIn</a>@endif
            @if ($c['github'])<a href="{{ $c['github'] }}" rel="noopener">GitHub</a>@endif
            @if (! $c['email'] && ! $c['linkedin'] && ! $c['github'])
                <span>Contact details not configured yet (config/portfolio.php).</span>
            @endif
        </div>
    </header>

    <section aria-labelledby="h-profile">
        <h2 id="h-profile">Profile {!! $tag($p['profile']['placeholder'] ?? false) !!}</h2>
        <p>{{ $p['profile']['intro'] ?? '' }}</p>
        @if (! empty($p['profile']['philosophy']))
            <h3>How I work</h3>
            <p>{{ $p['profile']['philosophy'] }}</p>
        @endif
        @if (! empty($p['profile']['expertise']))
            <h3>Areas of expertise</h3>
            <ul>@foreach ($p['profile']['expertise'] as $e)<li>{{ $e }}</li>@endforeach</ul>
        @endif
        @if (! empty($p['profile']['goals']))
            <h3>Career goals</h3>
            <ul>@foreach ($p['profile']['goals'] as $g)<li>{{ $g }}</li>@endforeach</ul>
        @endif
    </section>

    <section aria-labelledby="h-exp">
        <h2 id="h-exp">Experience</h2>
        @foreach ($p['timeline'] as $t)
            <article class="item">
                <h3>{{ $t['role'] }} — {{ $t['organization'] }} {!! $tag($t['placeholder'] ?? false) !!}</h3>
                <p class="meta">{{ $t['dates'] ?? '' }}</p>
                @if (! empty($t['responsibilities']))
                    <ul>@foreach ($t['responsibilities'] as $r)<li>{{ $r }}</li>@endforeach</ul>
                @endif
                @if (! empty($t['achievements']))
                    <p><strong>Achievements</strong></p>
                    <ul>@foreach ($t['achievements'] as $a)<li>{{ $a }}</li>@endforeach</ul>
                @endif
            </article>
        @endforeach
    </section>

    <section aria-labelledby="h-projects">
        <h2 id="h-projects">Projects</h2>
        @foreach ($projects as $room)
            <article class="item">
                <h3>{{ $room['name'] }} {!! $tag($room['overview']['placeholder'] ?? false) !!}
                    @if (isset($room['overview']))<span class="status status-{{ $room['overview']['status'] }}">{{ $statusLabel[$room['overview']['status']] }}</span>@endif
                </h3>
                <p class="meta">{{ $room['tagline'] }}</p>
                @if (! empty($room['overview']['problem']))<p>{{ $room['overview']['problem'] }}</p>@endif
                @if (! empty($room['overview']['features']))
                    <ul>@foreach ($room['overview']['features'] as $f)<li>{{ $feat($f) }}</li>@endforeach</ul>
                @endif
                @if (! empty($room['overview']['role']))<p><strong>My role:</strong> {{ $room['overview']['role'] }}</p>@endif
                @if (! empty($room['overview']['tech']))<p><strong>Technologies:</strong> {{ implode(', ', $room['overview']['tech']) }}</p>@endif

                @foreach ($room['modules'] as $m)
                    <div class="module">
                        <strong>{{ $m['name'] }}</strong>
                        <span class="status status-{{ $m['status'] }}">{{ $statusLabel[$m['status']] }}</span>
                        @if ($m['problem'])<br><span class="muted">{{ $m['problem'] }}</span>@endif
                        @if (! empty($m['features']))
                            <ul>@foreach ($m['features'] as $f)<li>{{ $feat($f) }}</li>@endforeach</ul>
                        @endif
                    </div>
                @endforeach

                @php($links = array_filter($room['overview']['links'] ?? []))
                @if ($links)
                    <p>@foreach ($links as $k => $url)<a href="{{ $url }}" rel="noopener">{{ ucfirst($k) }}</a>@if (! $loop->last) · @endif @endforeach</p>
                @endif
            </article>
        @endforeach
    </section>

    <section aria-labelledby="h-skills">
        <h2 id="h-skills">Technical skills</h2>
        <div class="skills">
            @foreach ($p['skills'] as $s)
                <div>
                    <h3>{{ $s['name'] }} {!! $tag($s['placeholder'] ?? false) !!}</h3>
                    <ul>@foreach ($s['items'] as $i)<li>{{ $i }}</li>@endforeach</ul>
                </div>
            @endforeach
        </div>
    </section>
</main>

@if ($print)
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });</script>
@endif
</body>
</html>
