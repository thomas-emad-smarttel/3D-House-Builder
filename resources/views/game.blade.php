<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $portfolio['owner']['name'] }} — Developer Portfolio Experience</title>
    <meta name="description" content="An interactive 3D mansion that doubles as the CV and project portfolio of {{ $portfolio['owner']['name'] }}.">
    <meta name="theme-color" content="#0f1217">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">

    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body data-state="boot">

<noscript>
    <div class="fallback" style="display:grid">
        <div>
            <h1>This portfolio is an interactive 3D game</h1>
            <p>It needs JavaScript. The full CV works without it.</p>
            <a class="btn btn-primary" href="{{ route('cv') }}">Open the traditional CV</a>
        </div>
    </div>
</noscript>

{{-- All content comes from config/portfolio.php --}}
<script id="portfolio-data" type="application/json">@json($portfolio)</script>

<canvas id="game-canvas" tabindex="-1" aria-label="3D mansion. Use the menu or the traditional CV for a non-3D view."></canvas>

{{-- Loading ------------------------------------------------------------ --}}
<div id="loading" class="screen loading" role="status" aria-live="polite">
    <div class="loading-inner">
        <p class="loading-title">Building the mansion</p>
        <div class="loading-bar"><span id="loading-fill"></span></div>
        <p id="loading-text" class="loading-text">Preparing</p>
    </div>
</div>

{{-- Welcome ------------------------------------------------------------ --}}
<section id="welcome" class="screen welcome" hidden aria-labelledby="welcome-title">
    <div class="welcome-card">
        <p class="welcome-name" id="welcome-name">{{ $portfolio['owner']['name'] }}</p>
        <h1 id="welcome-title">Developer Portfolio Experience</h1>
        <p class="welcome-lead">{{ $portfolio['settings']['welcome_lead'] }}</p>

        <div class="welcome-actions">
            <button id="btn-start" class="btn btn-primary" type="button">Start exploring</button>
            <button id="btn-controls" class="btn" type="button">Controls</button>
            <button id="btn-sound" class="btn" type="button" aria-pressed="false">Sound: off</button>
        </div>

        <label class="check">
            <input id="chk-skip" type="checkbox">
            <span>Skip the opening camera shot</span>
        </label>

        <p class="welcome-alt">
            Prefer to skim? <a href="{{ route('cv') }}">Read the traditional CV</a>
        </p>
    </div>
</section>

{{-- Controls modal ----------------------------------------------------- --}}
<section id="controls-modal" class="modal" hidden role="dialog" aria-modal="true" aria-labelledby="controls-title">
    <div class="modal-card">
        <h2 id="controls-title">Controls</h2>
        <dl class="keys">
            <div><dt><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></dt><dd>Walk and strafe</dd></div>
            <div><dt><kbd>↑</kbd><kbd>↓</kbd></dt><dd>Walk forward and back</dd></div>
            <div><dt><kbd>←</kbd><kbd>→</kbd></dt><dd>Turn left and right</dd></div>
            <div><dt>Mouse</dt><dd>Look around (click the view to capture the mouse)</dd></div>
            <div><dt><kbd>Shift</kbd></dt><dd>Run</dd></div>
            <div><dt><kbd>E</kbd></dt><dd>Open doors and inspect displays</dd></div>
            <div><dt><kbd>Esc</kbd></dt><dd>Pause menu, or close an open panel</dd></div>
            <div><dt><kbd>F</kbd></dt><dd>Fullscreen</dd></div>
            <div><dt><kbd>M</kbd></dt><dd>Mute or unmute</dd></div>
        </dl>
        <p class="modal-note">On a phone or tablet: drag the left stick to walk, drag anywhere on the right to look, tap the round button to interact.</p>
        <button id="controls-close" class="btn btn-primary" type="button">Got it</button>
    </div>
</section>

{{-- HUD ---------------------------------------------------------------- --}}
<div id="hud" class="hud" hidden>
    <div class="hud-top-left">
        <p id="hud-room" class="hud-room">The Mansion</p>
        <div class="hud-progress" aria-live="polite">
            <div id="hud-progress-bar" class="progress-bar" aria-hidden="true"></div>
            <span id="hud-progress-text">0 of 0 rooms explored</span>
        </div>
    </div>

    <div class="hud-top-right">
        <button id="hud-menu" class="chip" type="button">Menu</button>
        <a id="hud-cv" class="chip" href="{{ route('cv') }}" target="_blank" rel="noopener">Traditional CV</a>
        <button id="hud-sound" class="chip" type="button" aria-pressed="false">Sound</button>
        <button id="hud-fullscreen" class="chip" type="button">Fullscreen</button>
    </div>

    <div id="hud-return" class="hud-return" hidden>
        <button id="btn-return" class="chip chip-strong" type="button">Return to the mansion</button>
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

{{-- Information drawer (keeps the 3D world visible) -------------------- --}}
<aside id="panel" class="panel" hidden role="dialog" aria-modal="true" aria-labelledby="panel-title">
    <div class="panel-head">
        <div id="panel-tags" class="tags"></div>
        <button id="panel-close" class="chip" type="button" aria-label="Close panel">Close <span class="hint-key">Esc</span></button>
    </div>
    <h2 id="panel-title" tabindex="-1"></h2>
    <div id="panel-body" class="panel-body"></div>
</aside>

{{-- Pause menu --------------------------------------------------------- --}}
<section id="pause" class="modal" hidden role="dialog" aria-modal="true" aria-labelledby="pause-title">
    <div class="modal-card modal-wide">
        <h2 id="pause-title">Paused</h2>
        <div class="pause-actions">
            <button id="pause-resume" class="btn btn-primary" type="button">Resume</button>
            <button id="pause-controls" class="btn" type="button">Controls</button>
            <button id="pause-sound" class="btn" type="button" aria-pressed="false">Sound: off</button>
            <a class="btn" href="{{ route('cv') }}" target="_blank" rel="noopener">Traditional CV</a>
            <a class="btn" href="{{ route('cv.download') }}">Download CV</a>
        </div>
        <h3>Go to a room</h3>
        <ul id="pause-rooms" class="room-list"></ul>
    </div>
</section>

{{-- Cinematic fade ----------------------------------------------------- --}}
<div id="fade" class="fade" aria-hidden="true"><p id="fade-title" class="fade-title"></p></div>

{{-- Touch controls ----------------------------------------------------- --}}
<div id="touch-ui" class="touch-ui" hidden>
    <div id="touch-look" class="touch-look"></div>
    <div id="joystick" class="joystick" aria-label="Movement stick"><div id="joystick-knob" class="joystick-knob"></div></div>
    <button id="touch-interact" class="touch-interact" type="button" aria-label="Interact">E</button>
</div>

{{-- No WebGL --------------------------------------------------------- --}}
<section id="fallback" class="fallback" hidden>
    <div>
        <h1>3D is not available in this browser</h1>
        <p id="fallback-reason">WebGL could not start, so the interactive mansion cannot run here.</p>
        <p>Everything in the game is also available as a normal CV page.</p>
        <a class="btn btn-primary" href="{{ route('cv') }}">Open the traditional CV</a>
    </div>
</section>

</body>
</html>
