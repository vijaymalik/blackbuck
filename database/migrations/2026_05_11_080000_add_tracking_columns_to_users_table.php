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
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->after('email');
            $table->boolean('is_online')->default(false)->after('password');
            $table->timestampTz('last_seen_at')->nullable()->after('is_online');
            $table->decimal('current_latitude', 10, 7)->nullable()->after('last_seen_at');
            $table->decimal('current_longitude', 11, 8)->nullable()->after('current_latitude');

            $table->index(['is_online', 'last_seen_at'], 'users_online_last_seen_idx');
            $table->unique('phone', 'users_phone_unique');
        });

        DB::statement('ALTER TABLE users ADD CONSTRAINT users_current_latitude_chk CHECK (current_latitude IS NULL OR (current_latitude >= -90 AND current_latitude <= 90))');
        DB::statement('ALTER TABLE users ADD CONSTRAINT users_current_longitude_chk CHECK (current_longitude IS NULL OR (current_longitude >= -180 AND current_longitude <= 180))');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_current_latitude_chk');
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_current_longitude_chk');

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_online_last_seen_idx');
            $table->dropUnique('users_phone_unique');

            $table->dropColumn([
                'phone',
                'is_online',
                'last_seen_at',
                'current_latitude',
                'current_longitude',
            ]);
        });
    }
};

