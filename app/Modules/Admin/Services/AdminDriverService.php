<?php

namespace App\Modules\Admin\Services;

use App\Modules\Admin\Repositories\AdminDriverRepository;
use App\Support\Services\BaseService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AdminDriverService extends BaseService
{
    public function __construct(private readonly AdminDriverRepository $driverRepository) {}

    public function getPaginatedDrivers(int $perPage = 15): LengthAwarePaginator
    {
        return $this->driverRepository->paginateDrivers($perPage);
    }

    public function searchNearbyDrivers(array $filters): array
    {
        return $this->driverRepository->searchNearby(
            lat: (float) $filters['lat'],
            lng: (float) $filters['lng'],
            radiusMeters: (int) ($filters['radius_meters'] ?? 5000),
            limit: (int) ($filters['limit'] ?? 50)
        );
    }
}
