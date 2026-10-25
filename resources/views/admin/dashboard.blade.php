<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="robots" content="noindex, nofollow">
    <title>Dashboard — Developer Portfolio</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet">
    @vite(['resources/css/admin.css', 'resources/js/admin/main.js'])
</head>
<body class="admin">
    <noscript><p class="error" style="padding:24px">The dashboard needs JavaScript.</p></noscript>
    <div id="admin-app"></div>
    <form id="logout-form" method="POST" action="{{ route('admin.logout') }}" hidden>@csrf</form>
</body>
</html>
