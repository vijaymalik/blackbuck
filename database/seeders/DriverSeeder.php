<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserProfile;
use App\Models\DriverProfile;
use App\Models\DriverLocation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DriverSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure driver role exists
        $driverRole = Role::firstOrCreate(['name' => 'driver', 'guard_name' => 'web']);

        $drivers = [
            ['name' => 'Rajesh Kumar', 'email' => 'rajesh@driver.com', 'online' => true],
            ['name' => 'Amit Singh', 'email' => 'amit@driver.com', 'online' => true],
            ['name' => 'Suresh Yadav', 'email' => 'suresh@driver.com', 'online' => false],
            ['name' => 'Vikram Rathore', 'email' => 'vikram@driver.com', 'online' => true],
            ['name' => 'Deepak Sharma', 'email' => 'deepak@driver.com', 'online' => false],
            ['name' => 'Arjun Meena', 'email' => 'arjun@driver.com', 'online' => true],
            ['name' => 'Manoj Gupta', 'email' => 'manoj@driver.com', 'online' => false],
        ];

        // Central point: Delhi (28.6139, 77.2090)
        $baseLat = 28.6139;
        $baseLng = 77.2090;

        foreach ($drivers as $index => $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => Hash::make('password'),
                    'phone' => '987654321' . $index,
                    'is_online' => $data['online'],
                    'is_driver' => true,
                    'last_seen_at' => now(),
                    'email_verified_at' => now(),
                ]
            );

            $user->assignRole($driverRole);

            // User Profile
            UserProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'is_active' => true,
                    'created_by' => 1,
                ]
            );

            // Driver Profile
            DriverProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'truck_type' => $index % 2 == 0 ? 'Heavy Truck' : 'Mini Van',
                    'truck_number' => 'DL' . (10 + $index) . ' AB ' . (1000 + $index),
                    'preferred_operating_area' => 'Delhi NCR',
                ]
            );

            // Driver Location (Randomly around Delhi)
            $lat = $baseLat + (mt_rand(-50, 50) / 1000);
            $lng = $baseLng + (mt_rand(-50, 50) / 1000);

            DriverLocation::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'coordinates' => \Illuminate\Support\Facades\DB::raw("ST_SetSRID(ST_MakePoint({$lng}, {$lat}), 4326)"),
                    'speed_kmh' => $data['online'] ? mt_rand(20, 60) : 0,
                    'heading_degrees' => mt_rand(0, 360),
                    'recorded_at' => now(),
                ]
            );
        }

        $this->command?->info('DriverSeeder: 7 Demo drivers seeded successfully.');
    }
}
