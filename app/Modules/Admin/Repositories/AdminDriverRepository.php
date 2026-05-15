<?php

namespace App\Modules\Admin\Repositories;

use App\Models\User;
use App\Support\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AdminDriverRepository extends BaseRepository
{
    public function paginateDrivers(int $perPage = 15, ?string $capacity = null): LengthAwarePaginator
    {
        $query = User::query()
            ->where('is_driver', true)
            ->with(['driverProfile', 'driverLocation']);

        if ($capacity) {
            $query->whereHas('driverProfile', function($q) use ($capacity) {
                $q->whereRaw('CAST(truck_capacity AS INTEGER) >= ?', [(int)$capacity]);
            });
        }

        return $query->latest()->paginate($perPage);
    }

    public function searchNearby(float $lat, float $lng, int $radiusMeters = 5000, int $limit = 50, ?string $capacity = null): array
    {
        if (Config::get('database.default') !== 'pgsql') {
            throw new RuntimeException('Nearby driver search requires PostgreSQL with PostGIS.');
        }

        $params = [$lng, $lat];
        $capacityClause = '';

        if ($capacity) {
            $capacityClause = ' AND CAST(dp.truck_capacity AS INTEGER) >= ?';
        }

        $sql = <<<SQL
            WITH ref AS (
                SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography AS point
            )
            SELECT
                u.id,
                u.name,
                u.phone,
                u.email,
                u.is_online,
                u.last_seen_at,
                dp.truck_type,
                dp.truck_number,
                dp.truck_capacity,
                dl.latitude,
                dl.longitude,
                dl.recorded_at as location_recorded_at,
                ST_Distance(dl.coordinates, ref.point)::integer AS distance_meters
            FROM users u
            INNER JOIN driver_locations dl ON u.id = dl.user_id
            LEFT JOIN driver_profiles dp ON u.id = dp.user_id
            CROSS JOIN ref
            WHERE u.is_driver = true 
              AND dl.coordinates IS NOT NULL
              AND ST_DWithin(dl.coordinates, ref.point, ?)
              {$capacityClause}
            ORDER BY distance_meters ASC
            LIMIT ?
SQL;

        $params[] = $radiusMeters;
        if ($capacity) {
            $params[] = $capacity;
        }
        $params[] = $limit;

        return DB::select($sql, $params);
    }
}
