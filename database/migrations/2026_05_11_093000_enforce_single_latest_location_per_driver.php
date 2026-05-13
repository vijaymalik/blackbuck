<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Keep only the latest row (highest id) per driver before adding unique constraint.
        DB::table('driver_locations')
            ->whereNotIn('id', function ($query): void {
                $query->selectRaw('MAX(id)')
                    ->from('driver_locations')
                    ->groupBy('user_id');
            })
            ->delete();

        Schema::table('driver_locations', function (Blueprint $table) {
            $table->unique('user_id', 'driver_locations_user_id_unique');
            $table->index('updated_at', 'driver_locations_updated_at_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('driver_locations', function (Blueprint $table) {
            $table->dropUnique('driver_locations_user_id_unique');
            $table->dropIndex('driver_locations_updated_at_idx');
        });
    }
};

