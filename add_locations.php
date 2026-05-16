$baseLat = 28.6139; // Delhi Latitude
$baseLng = 77.2090; // Delhi Longitude

// We'll create 5 dummy drivers with locations
for ($i = 1; $i <= 5; $i++) {
    $user = \App\Models\User::create([
        'name' => "Test Driver $i",
        'email' => "testdriver$i@example.com",
        'phone' => "987654321$i",
        'password' => \Illuminate\Support\Facades\Hash::make('password'),
        // Add roles or specific fields if required. Assuming there's some role logic or it's just based on DriverProfile presence.
    ]);

    // Update role if Spatie is used, otherwise maybe a column
    // Let's assume having a DriverProfile makes them a driver.
    // If Spatie roles exist:
    if (class_exists('Spatie\Permission\Models\Role')) {
        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'driver', 'guard_name' => 'api']);
        $user->assignRole($role);
    }

    \App\Models\DriverProfile::create([
        'user_id' => $user->id,
        'truck_type' => 'Heavy Truck',
        'truck_number' => "DL" . rand(10, 99) . " AB " . rand(1000, 9999),
        'truck_capacity' => rand(5, 20),
        'preferred_operating_area' => 'Delhi NCR',
    ]);

    // Randomize location slightly around Delhi
    $latOffset = (rand(-100, 100) / 10000); // +/- 0.01 degrees
    $lngOffset = (rand(-100, 100) / 10000);

    \App\Models\DriverLocation::create([
        'user_id' => $user->id,
        'latitude' => $baseLat + $latOffset,
        'longitude' => $baseLng + $lngOffset,
        'speed_kmh' => rand(0, 60),
        'heading_degrees' => rand(0, 359),
        'recorded_at' => \Carbon\Carbon::now(),
    ]);
}

echo "Created 5 drivers near Delhi with locations!\n";
