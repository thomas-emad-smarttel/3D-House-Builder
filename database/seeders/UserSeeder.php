<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Default Admin User
        User::updateOrCreate(
            ['email' => 'admin@admin.com'],
            [
                'name' => 'Admin',
                'password' => 'password',
                'email_verified_at' => now(),
            ]
        );

        // Smarttel Dev Admin User
        User::updateOrCreate(
            ['email' => 'admin@smarttel.com'],
            [
                'name' => 'Smarttel Admin',
                'password' => 'password',
                'email_verified_at' => now(),
            ]
        );
    }
}
