<?php

namespace App\Modules\Drivers\Repositories;

use App\Models\DriverProfile;
use App\Support\Repositories\BaseRepository;

class DriverProfileRepository extends BaseRepository
{
    public function updateOrCreateByUserId(int $userId, array $attributes): DriverProfile
    {
        return DriverProfile::query()->updateOrCreate(
            ['user_id' => $userId],
            $attributes
        );
    }
}

