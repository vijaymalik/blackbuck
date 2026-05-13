<?php

namespace App\Modules\Admin\Repositories;

use App\Models\Admin;
use App\Models\User;
use App\Support\Repositories\BaseRepository;

class AdminRepository extends BaseRepository
{
    public function findActiveAdminUserByEmail(string $email): ?User
    {
        return User::query()
            ->where('email', $email)
            ->whereHas('admin', function ($query): void {
                $query->where('is_active', true);
            })
            ->with('admin')
            ->first();
    }

    public function findAdminProfileByUserId(int $userId): ?Admin
    {
        return Admin::query()->where('user_id', $userId)->first();
    }
}

