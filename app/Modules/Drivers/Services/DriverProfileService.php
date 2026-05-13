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
            'phone' => $user->phone,
            'truck_type' => $user->driverProfile?->truck_type,
            'truck_number' => $user->driverProfile?->truck_number,
            'preferred_operating_area' => $user->driverProfile?->preferred_operating_area,
        ];
    }

    public function updateProfile(User $user, array $payload): array
    {
        $user->update([
            'name' => $payload['name'],
            'phone' => $payload['phone'],
        ]);

        $this->driverProfiles->updateOrCreateByUserId($user->id, [
            'truck_type' => $payload['truck_type'],
            'truck_number' => $payload['truck_number'],
            'preferred_operating_area' => $payload['preferred_operating_area'],
        ]);

        return $this->getProfile($user->refresh());
    }
}

