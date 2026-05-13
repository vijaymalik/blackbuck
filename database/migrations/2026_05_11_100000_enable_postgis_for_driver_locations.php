<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Config::get('database.default') !== 'pgsql') {
            return;
        }

        $available = DB::selectOne("SELECT EXISTS(SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') AS available");
        if (! (bool) ($available->available ?? false)) {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS postgis');
        DB::statement('ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS coordinates geography(Point, 4326)');
        DB::statement('UPDATE driver_locations SET coordinates = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE coordinates IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS driver_locations_coordinates_gix ON driver_locations USING GIST (coordinates)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Config::get('database.default') !== 'pgsql') {
            return;
        }

        $installed = DB::selectOne("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS installed");
        if (! (bool) ($installed->installed ?? false)) {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS driver_locations_coordinates_gix');
        DB::statement('ALTER TABLE driver_locations DROP COLUMN IF EXISTS coordinates');
    }
};

