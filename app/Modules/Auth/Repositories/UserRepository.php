<?php

namespace App\Modules\Auth\Repositories;

use App\Models\User;
use App\Support\Repositories\BaseRepository;

class UserRepository extends BaseRepository
{
    public function findByEmail(string $email): ?User
    {
        return User::query()->where('email', $email)->first();
    }

    public function create(array $attributes): User
    {
        return User::query()->create($attributes);
    }
}

