<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateAdmin extends Command
{
    protected $signature = 'portfolio:admin {email : Login email} {--password= : Password (leave out to be asked)}';

    protected $description = 'Create or update the dashboard login';

    public function handle(): int
    {
        $email = (string) $this->argument('email');
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('That is not a valid email address.');

            return self::FAILURE;
        }

        $password = $this->option('password') ?: $this->secret('Password (at least 10 characters)');
        if (! is_string($password) || mb_strlen($password) < 10) {
            $this->error('The password must be at least 10 characters.');

            return self::FAILURE;
        }

        $user = User::firstOrNew(['email' => $email]);
        $user->name = $user->name ?: 'Admin';
        $user->password = Hash::make($password);
        $user->save();

        $this->info("Dashboard login ready for {$email}. Sign in at /admin.");

        return self::SUCCESS;
    }
}
