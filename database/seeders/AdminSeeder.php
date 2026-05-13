<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class AdminSeeder extends Seeder
{
    /**
     * Seed an initial admin account for local/dev usage.
     */
    public function run(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasTable('admins')) {
            $this->command?->warn('Skipping AdminSeeder: users/admins tables are missing. Run migrations first.');

            return;
        }

        $email = env('ADMIN_EMAIL', 'admin@example.com');
        $password = env('ADMIN_PASSWORD', 'password');
        $name = env('ADMIN_NAME', 'System Admin');

        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'email_verified_at' => now(),
            ]
        );

        Admin::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'role' => 'super_admin',
                'is_active' => true,
                'created_by' => null,
            ]
        );
    }
}

