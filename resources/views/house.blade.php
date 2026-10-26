<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $house->title }} — 3D House Builder</title>
    <meta name="description" content="{{ $house->description }}">
    <meta name="theme-color" content="#0f1217">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">

    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body data-state="boot">

<noscript>
    <div class="fallback" style="display:grid; place-items:center; min-height:100vh; background:#0b0d11; color:#fff; font-family:sans-serif; text-align:center;">
        <div>
            <h1 style="font-size:2rem; margin-bottom:1rem;">3D House Builder</h1>
            <p style="color:#94a3b8;">This architectural experience requires JavaScript and WebGL to explore the 3D model.</p>
        </div>
    </div>
</noscript>

{{-- House Project JSON data --}}
@php
    $payload = [
        'house' => [
            'id' => $house->id,
            'title' => $house->title,
            'slug' => $house->slug,
            'description' => $house->description,
            'plot_width' => (float) $house->plot_width,
            'plot_depth' => (float) $house->plot_depth,
            'environment' => $house->environment ?? ['sky_color' => '#dfe6f2', 'sun_intensity' => 1.1],
            'floors' => $house->getFloors(),
        ],
        'all_houses' => $allHouses,
        'library' => $library,
    ];
@endphp
<script id="house-data" type="application/json">@json($payload)</script>

<canvas id="game-canvas" tabindex="-1" aria-label="3D House Builder View"></canvas>

{{-- Loading Screen --}}
<div id="loading" class="screen loading" role="status" aria-live="polite">
    <div class="loading-inner">
        <p class="loading-title">Generating 3D House Architecture</p>
        <div class="loading-bar"><span id="loading-fill"></span></div>
        <p id="loading-text" class="loading-text">Building walls, doors, ceilings and floors…</p>
    </div>
</div>

{{-- Welcome Screen --}}
<section id="welcome" class="screen welcome" hidden aria-labelledby="welcome-title">
    <div class="welcome-card">
        <p class="welcome-name" id="welcome-name">Architectural 3D Model</p>
        <h1 id="welcome-title">{{ $house->title }}</h1>
        <p class="welcome-lead">{{ $house->description ?: 'Explore every room, floor finishes, custom ceiling designs, and interactive doors in 3D.' }}</p>

        <div class="welcome-actions">
            <button id="btn-start" class="btn btn-primary" type="button">Explore in 3D</button>
            <button id="btn-controls" class="btn" type="button">Controls</button>
            <button id="btn-sound" class="btn" type="button" aria-pressed="false">Sound: off</button>
        </div>

        <label class="check" style="margin-top: 10px;">
            <input id="chk-skip" type="checkbox">
            <span>Skip opening camera shot</span>
        </label>

        @if(count($allHouses) > 1)
        <div style="margin-top: 1.25rem; text-align: left; background: rgba(255,255,255,0.05); padding: 0.85rem 1.1rem; border-radius: 8px;">
            <label style="display:block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.35rem;">Switch House Project:</label>
            <select onchange="window.location.href = '/house/' + this.value" style="background:#1e293b; color:#fff; border:1px solid #475569; padding: 0.4rem 0.6rem; border-radius: 6px; width: 100%;">
                @foreach($allHouses as $h)
                    <option value="{{ $h->slug }}" {{ $h->id === $house->id ? 'selected' : '' }}>{{ $h->title }}</option>
                @endforeach
            </select>
        </div>
        @endif
    </div>
</section>

{{-- Controls Modal --}}
<section id="controls-modal" class="modal" hidden role="dialog" aria-modal="true" aria-labelledby="controls-title">
    <div class="modal-card">
        <h2 id="controls-title">House Builder Controls</h2>
        <dl class="keys">
            <div><dt><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></dt><dd>Walk and strafe</dd></div>
            <div><dt><kbd>↑</kbd><kbd>↓</kbd></dt><dd>Move forward and backward</dd></div>
            <div><dt><kbd>←</kbd><kbd>→</kbd></dt><dd>Turn left and right</dd></div>
            <div><dt>Mouse</dt><dd>Look around (click canvas to capture pointer)</dd></div>
            <div><dt><kbd>Shift</kbd></dt><dd>Run / Walk faster</dd></div>
            <div><dt><kbd>E</kbd></dt><dd>Open & Close Doors / Interact</dd></div>
            <div><dt><kbd>Esc</kbd></dt><dd>Release mouse / Close menu</dd></div>
            <div><dt><kbd>F</kbd></dt><dd>Toggle Fullscreen</dd></div>
            <div><dt><kbd>M</kbd></dt><dd>Mute / Unmute sound</dd></div>
        </dl>
        <button id="controls-close" class="btn btn-primary" type="button">Got it</button>
    </div>
</section>

{{-- HUD --}}
<div id="hud" class="hud" hidden>
    <div class="hud-top-left">
        <p id="hud-room" class="hud-room">{{ $house->title }}</p>
        <div id="floor-selector-bar" style="display: flex; gap: 6px; margin-top: 6px;"></div>
        <div class="hud-progress" aria-live="polite" style="display:none;">
            <div id="hud-progress-bar" class="progress-bar" aria-hidden="true"></div>
            <span id="hud-progress-text"></span>
        </div>
    </div>

    <div class="hud-top-right">
        <button id="btn-camera-mode" class="chip" type="button">🏠 Dollhouse View</button>
        <button id="hud-menu" class="chip" type="button">Menu</button>
        <button id="hud-controls" class="chip" type="button">Controls</button>
        <button id="hud-sound" class="chip" type="button" aria-pressed="false">Sound</button>
        <button id="hud-fullscreen" class="chip" type="button">Fullscreen</button>
        <a href="{{ route('admin.dashboard') }}" class="chip" style="background:#2563eb; color:#fff; text-decoration:none;">Admin Builder ↗</a>
    </div>

    <div id="hud-return" class="hud-return" hidden>
        <button id="btn-return" class="chip chip-strong" type="button">Back</button>
    </div>

    <div id="crosshair" class="crosshair" aria-hidden="true"></div>

    <aside id="room-card" class="room-card" hidden aria-live="polite">
        <h2 id="room-card-title"></h2>
        <p id="room-card-text"></p>
    </aside>

    <div id="prompt" class="prompt" hidden aria-live="polite">
        <kbd id="prompt-key">E</kbd><span id="prompt-text"></span>
    </div>

    <p class="hud-hint" id="hud-hint">WASD walk · mouse look · Shift run · E interact · Esc menu</p>

    <button id="capture-hint" class="capture-hint" type="button" hidden>Click to look around</button>
</div>

{{-- Information Drawer --}}
<aside id="panel" class="panel" hidden role="dialog" aria-modal="true" aria-labelledby="panel-title">
    <div class="panel-head">
        <div id="panel-tags" class="tags"></div>
        <button id="panel-close" class="chip" type="button" aria-label="Close panel">Close <span class="hint-key">Esc</span></button>
    </div>
    <h2 id="panel-title" tabindex="-1"></h2>
    <div id="panel-body" class="panel-body"></div>
</aside>

{{-- Pause Menu --}}
<section id="pause" class="modal" hidden role="dialog" aria-modal="true" aria-labelledby="pause-title">
    <div class="modal-card modal-wide">
        <h2 id="pause-title">Paused</h2>
        <div class="pause-actions">
            <button id="pause-resume" class="btn btn-primary" type="button">Resume</button>
            <button id="pause-controls" class="btn" type="button">Controls</button>
            <button id="pause-sound" class="btn" type="button" aria-pressed="false">Sound: off</button>
        </div>
        <h3 style="margin-top:14px;">House Rooms</h3>
        <ul id="pause-rooms" class="room-list"></ul>
    </div>
</section>

{{-- Cinematic Fade --}}
<div id="fade" class="fade" aria-hidden="true"><p id="fade-title" class="fade-title"></p></div>

{{-- Touch Controls --}}
<div id="touch-ui" class="touch-ui" hidden>
    <div id="touch-look" class="touch-look"></div>
    <div id="joystick" class="joystick" aria-label="Movement stick"><div id="joystick-knob" class="joystick-knob"></div></div>
    <button id="touch-interact" class="touch-interact" type="button" aria-label="Interact">E</button>
</div>

{{-- Fallback --}}
<section id="fallback" class="fallback" hidden>
    <div>
        <h1>3D is not available in this browser</h1>
        <p id="fallback-reason">WebGL could not start, so the interactive house model cannot run here.</p>
    </div>
</section>

</body>
</html>
