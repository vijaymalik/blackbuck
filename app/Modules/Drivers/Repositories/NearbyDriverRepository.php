<?php

namespace App\Modules\Drivers\Repositories;

use App\Support\Repositories\BaseRepository;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class NearbyDriverRepository extends BaseRepository
{
    public function search(float $lat, float $lng, int $radiusMeters = 5000, int $limit = 20, bool $onlineOnly = true): array
    {
        if (Config::get('database.default') !== 'pgsql') {
            throw new RuntimeException('Nearby driver search requires PostgreSQL with PostGIS.');
        }

        $postgisInstalled = DB::selectOne("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS installed");
        if (! (bool) ($postgisInstalled->installed ?? false)) {
            throw new RuntimeException('PostGIS extension is not installed on this PostgreSQL server.');
        }

        $sql = <<<'SQL'
            WITH ref AS (
                SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography AS point
            )
            SELECT
                u.id AS driver_id,
                u.name,
                u.phone,
                dp.truck_type,
                dp.truck_number,
                dp.preferred_operating_area,
                dl.latitude,
                dl.longitude,
                dl.recorded_at,
                u.is_online,
                ST_Distance(dl.coordinates, ref.point)::integer AS distance_meters
            FROM driver_locations dl
            INNER JOIN users u ON u.id = dl.user_id
            LEFT JOIN driver_profiles dp ON dp.user_id = u.id
            CROSS JOIN ref
            WHERE dl.coordinates IS NOT NULL
              AND ST_DWithin(dl.coordinates, ref.point, ?)
              AND (? = false OR u.is_online = true)
            ORDER BY distance_meters ASC
            LIMIT ?
        SQL;

        return DB::select($sql, [$lng, $lat, $radiusMeters, $onlineOnly, $limit]);
    }
}

