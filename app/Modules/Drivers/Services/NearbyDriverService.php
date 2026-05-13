<?php

namespace App\Modules\Drivers\Services;

use App\Modules\Drivers\Repositories\NearbyDriverRepository;
use App\Support\Services\BaseService;

class NearbyDriverService extends BaseService
{
    public function __construct(private readonly NearbyDriverRepository $nearbyDrivers) {}

    public function search(array $filters): array
    {
        $radius = (int) ($filters['radius_meters'] ?? 5000);
        $limit = (int) ($filters['limit'] ?? 20);
        $onlineOnly = (bool) ($filters['online_only'] ?? true);

        return $this->nearbyDrivers->search(
            lat: (float) $filters['lat'],
            lng: (float) $filters['lng'],
            radiusMeters: $radius,
            limit: $limit,
            onlineOnly: $onlineOnly
        );
    }
}

