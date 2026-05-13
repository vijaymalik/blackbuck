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
    public function paginateDrivers(int $perPage = 15): LengthAwarePaginator
    {
        return User::query()
            ->with(['driverProfile', 'driverLocation'])
            ->latest()
            ->paginate($perPage);
    }

    public function searchNearby(float $lat, float $lng, int $radiusMeters = 5000, int $limit = 50): array
    {
        if (Config::get('database.default') !== 'pgsql') {
            throw new RuntimeException('Nearby driver search requires PostgreSQL with PostGIS.');
        }

        $sql = <<<'SQL'
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
                dl.latitude,
                dl.longitude,
                dl.recorded_at as location_recorded_at,
                ST_Distance(dl.coordinates, ref.point)::integer AS distance_meters
            FROM users u
            INNER JOIN driver_locations dl ON u.id = dl.user_id
            CROSS JOIN ref
            WHERE dl.coordinates IS NOT NULL
              AND ST_DWithin(dl.coordinates, ref.point, ?)
            ORDER BY distance_meters ASC
            LIMIT ?
        SQL;

        return DB::select($sql, [$lng, $lat, $radiusMeters, $limit]);
    }
}
