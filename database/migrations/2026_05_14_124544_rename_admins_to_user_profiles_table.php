<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('admins', 'user_profiles');
    }

    public function down(): void
    {
        Schema::rename('user_profiles', 'admins');
    }
};
