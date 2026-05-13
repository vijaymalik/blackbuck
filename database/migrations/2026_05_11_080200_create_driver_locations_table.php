<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('driver_locations', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 11, 8);
            $table->unsignedSmallInteger('speed_kmh')->nullable();
            $table->unsignedSmallInteger('heading_degrees')->nullable();
            $table->unsignedSmallInteger('accuracy_meters')->nullable();
            $table->timestampTz('recorded_at');
            $table->timestampsTz();

            // Core read patterns: latest location per driver + time-range queries.
            $table->index(['user_id', 'recorded_at'], 'driver_locations_user_recorded_idx');
            $table->index('recorded_at', 'driver_locations_recorded_at_idx');
        });

        DB::statement('ALTER TABLE driver_locations ADD CONSTRAINT driver_locations_latitude_chk CHECK (latitude >= -90 AND latitude <= 90)');
        DB::statement('ALTER TABLE driver_locations ADD CONSTRAINT driver_locations_longitude_chk CHECK (longitude >= -180 AND longitude <= 180)');
        DB::statement('ALTER TABLE driver_locations ADD CONSTRAINT driver_locations_heading_chk CHECK (heading_degrees IS NULL OR (heading_degrees >= 0 AND heading_degrees <= 360))');
        DB::statement('ALTER TABLE driver_locations ADD CONSTRAINT driver_locations_accuracy_chk CHECK (accuracy_meters IS NULL OR accuracy_meters >= 0)');

        // BRIN keeps large append-only time-series table indexing lightweight on PostgreSQL.
        if (Config::get('database.default') === 'pgsql') {
            DB::statement('CREATE INDEX driver_locations_recorded_at_brin_idx ON driver_locations USING BRIN (recorded_at)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Config::get('database.default') === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS driver_locations_recorded_at_brin_idx');
        }

        DB::statement('ALTER TABLE driver_locations DROP CONSTRAINT IF EXISTS driver_locations_latitude_chk');
        DB::statement('ALTER TABLE driver_locations DROP CONSTRAINT IF EXISTS driver_locations_longitude_chk');
        DB::statement('ALTER TABLE driver_locations DROP CONSTRAINT IF EXISTS driver_locations_heading_chk');
        DB::statement('ALTER TABLE driver_locations DROP CONSTRAINT IF EXISTS driver_locations_accuracy_chk');

        Schema::dropIfExists('driver_locations');
    }
};

