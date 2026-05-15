<?php

namespace Database\Seeders;

use App\Models\UserProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class AdminSeeder extends Seeder
{
    /**
     * Seed initial roles, permissions and an admin account.
     */
    public function run(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasTable('user_profiles')) {
            $this->command?->warn('Skipping AdminSeeder: tables are missing. Run migrations first.');
            return;
        }

        // 1. Create Roles
        $roles = ['admin', 'hr', 'customer', 'user'];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        // 2. Create Permissions (Sidebar Menus and Actions)
        $permissions = [
            'view dashboard',
            'view drivers',
            'manage drivers',
            'view users',
            'manage users',
            'view roles',
            'manage roles',
            'view settings'
        ];
        foreach ($permissions as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }

        // 3. Assign Permissions to Admin Role
        $adminRole = Role::findByName('admin', 'web');
        $adminRole->givePermissionTo(Permission::all());

        // 4. Create Initial Admin User
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

        // 5. Assign Admin Role
        $user->assignRole($adminRole);

        // 6. Create User Profile
        UserProfile::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'role' => 'admin',
                'is_active' => true,
                'created_by' => null,
            ]
        );

        $this->command?->info('AdminSeeder: Roles created and Admin user seeded successfully.');
    }
}
