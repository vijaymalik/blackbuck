<?php

namespace App\Modules\Location\Services;

use App\Models\User;
use App\Modules\Location\Repositories\DriverLocationRepository;
use App\Support\Services\BaseService;
use Illuminate\Support\Carbon;

class LocationService extends BaseService
{
    public function __construct(private readonly DriverLocationRepository $driverLocations) {}

    public function updateLatest(User $user, array $payload): array
    {
        $recordedAt = isset($payload['captured_at']) ? Carbon::parse($payload['captured_at']) : now();

        $location = $this->driverLocations->upsertLatest($user->id, [
            'latitude' => $payload['lat'],
            'longitude' => $payload['lng'],
            'speed_kmh' => $payload['speed_kmh'] ?? null,
            'heading_degrees' => $payload['heading_degrees'] ?? null,
            'accuracy_meters' => $payload['accuracy_meters'] ?? null,
            'recorded_at' => $recordedAt,
        ]);

        $user->forceFill([
            'current_latitude' => $location->latitude,
            'current_longitude' => $location->longitude,
            'last_seen_at' => $location->recorded_at,
            'is_online' => true,
        ])->save();

        return [
            'driver_id' => $user->id,
            'latitude' => (float) $location->latitude,
            'longitude' => (float) $location->longitude,
            'speed_kmh' => $location->speed_kmh,
            'heading_degrees' => $location->heading_degrees,
            'accuracy_meters' => $location->accuracy_meters,
            'recorded_at' => $location->recorded_at?->toISOString(),
            'updated_at' => $location->updated_at?->toISOString(),
        ];
    }
}

