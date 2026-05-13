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
        Schema::create('otp_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('channel', 20); // sms | email
            $table->string('target', 255); // phone number or email
            $table->string('purpose', 100); // login, password_reset, signup, etc.
            $table->string('code_hash', 255);
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->unsignedSmallInteger('max_attempts')->default(5);
            $table->timestampTz('expires_at');
            $table->timestampTz('verified_at')->nullable();
            $table->timestampTz('last_sent_at')->nullable();
            $table->timestampsTz();

            $table->index(['target', 'purpose', 'verified_at'], 'otp_target_purpose_verified_idx');
            $table->index('expires_at', 'otp_expires_at_idx');
            $table->index(['user_id', 'created_at'], 'otp_user_created_idx');
        });

        DB::statement("ALTER TABLE otp_verifications ADD CONSTRAINT otp_channel_chk CHECK (channel IN ('sms', 'email'))");
        DB::statement('ALTER TABLE otp_verifications ADD CONSTRAINT otp_attempts_chk CHECK (attempts >= 0 AND max_attempts > 0 AND attempts <= max_attempts)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE otp_verifications DROP CONSTRAINT IF EXISTS otp_channel_chk');
        DB::statement('ALTER TABLE otp_verifications DROP CONSTRAINT IF EXISTS otp_attempts_chk');

        Schema::dropIfExists('otp_verifications');
    }
};

