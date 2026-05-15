<?php

namespace App\Modules\Drivers\Services;

use App\Models\User;
use App\Models\UserProfile;
use App\Support\Services\BaseService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class DriverAuthService extends BaseService
{
    public function login(string $identity, string $password, string $deviceName = 'driver-mobile'): array
    {
        // Detect if identity is email or phone
        $fieldType = filter_var($identity, FILTER_VALIDATE_EMAIL) ? 'email' : 'phone';

        $user = User::where($fieldType, $identity)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'identity' => ['Invalid credentials.'],
            ]);
        }

        // Check if user is a driver
        if (!$user->is_driver) {
            throw ValidationException::withMessages([
                'identity' => ['Unauthorized. Only drivers can login here.'],
            ]);
        }

        return [
            'user' => $user->load('driverProfile'),
            'token' => $user->createToken('driver:'.$deviceName, ['driver'])->plainTextToken,
        ];
    }

    public function register(array $data, string $deviceName = 'driver-mobile'): array
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'password' => Hash::make($data['password']),
            'is_driver' => true,
        ]);

        // Create initial profile
        $user->driverProfile()->create([
            'truck_type' => $data['truck_type'] ?? null,
            'truck_number' => $data['truck_number'] ?? null,
            'truck_capacity' => $data['truck_capacity'] ?? null,
        ]);

        return [
            'user' => $user->load('driverProfile'),
            'token' => $user->createToken('driver:'.$deviceName, ['driver'])->plainTextToken,
        ];
    }

    public function logout(User $user): void
    {
        $user->tokens()->delete();
    }
}
