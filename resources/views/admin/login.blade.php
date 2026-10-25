<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Sign in — Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet">
    @vite(['resources/css/admin.css'])
</head>
<body class="admin login-page">
    <main class="login-card">
        <h1>Dashboard</h1>
        <p class="lead">Sign in to edit your portfolio.</p>

        <form method="POST" action="{{ route('admin.login') }}">
            @csrf
            <div class="field {{ $errors->has('email') ? 'has-error' : '' }}">
                <label for="email">Email</label>
                <input id="email" name="email" type="email" value="{{ old('email') }}" required autofocus autocomplete="username">
                @error('email')<p class="error" role="alert">{{ $message }}</p>@enderror
            </div>
            <div class="field">
                <label for="password">Password</label>
                <input id="password" name="password" type="password" required autocomplete="current-password">
                @error('password')<p class="error" role="alert">{{ $message }}</p>@enderror
            </div>
            <div class="field field-check">
                <label for="remember"><input id="remember" name="remember" type="checkbox" value="1"><span>Keep me signed in</span></label>
            </div>
            <button class="btn btn-primary" type="submit">Sign in</button>
        </form>

        <p class="hint" style="margin-top:24px"><a href="{{ route('game') }}">← Back to the portfolio</a></p>
    </main>
</body>
</html>
