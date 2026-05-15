<?php

namespace App\Modules\Drivers\Services;

use App\Models\User;
use App\Modules\Drivers\Repositories\DriverProfileRepository;
use App\Support\Services\BaseService;

class DriverProfileService extends BaseService
{
    public function __construct(private readonly DriverProfileRepository $driverProfiles) {}

    public function getProfile(User $user): array
    {
        $user->loadMissing('driverProfile');

        return [
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'truck_type' => $user->driverProfile?->truck_type,
            'truck_number' => $user->driverProfile?->truck_number,
            'truck_capacity' => $user->driverProfile?->truck_capacity,
        ];
    }

    public function updateProfile(User $user, array $payload): array
    {
        $userData = [];
        if (isset($payload['name'])) $userData['name'] = $payload['name'];
        if (isset($payload['email'])) $userData['email'] = $payload['email'];
        if (isset($payload['phone'])) $userData['phone'] = $payload['phone'];

        if (!empty($userData)) {
            $user->update($userData);
        }

        $profileData = [];
        if (isset($payload['truck_type'])) $profileData['truck_type'] = $payload['truck_type'];
        if (isset($payload['truck_number'])) $profileData['truck_number'] = $payload['truck_number'];
        if (isset($payload['truck_capacity'])) $profileData['truck_capacity'] = $payload['truck_capacity'];

        if (!empty($profileData)) {
            $this->driverProfiles->updateOrCreateByUserId($user->id, $profileData);
        }

        return $this->getProfile($user->refresh());
    }
}
