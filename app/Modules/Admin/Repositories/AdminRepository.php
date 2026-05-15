<?php

namespace App\Modules\Admin\Repositories;

use App\Models\UserProfile;
use App\Models\User;
use App\Support\Repositories\BaseRepository;

class AdminRepository extends BaseRepository
{
    public function findActiveAdminUserByEmail(string $email): ?User
    {
        return User::query()
            ->where('email', $email)
            ->whereHas('profile', function ($query): void {
                $query->where('is_active', true);
            })
            ->with('profile')
            ->first();
    }

    public function findAdminProfileByUserId(int $userId): ?UserProfile
    {
        return UserProfile::query()->where('user_id', $userId)->first();
    }
}
