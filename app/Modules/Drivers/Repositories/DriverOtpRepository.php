<?php

namespace App\Modules\Drivers\Repositories;

use App\Models\OtpVerification;
use App\Support\Repositories\BaseRepository;

class DriverOtpRepository extends BaseRepository
{
    public function create(array $attributes): OtpVerification
    {
        return OtpVerification::query()->create($attributes);
    }

    public function latestActiveForPhone(string $phone, string $purpose = 'driver_login'): ?OtpVerification
    {
        return OtpVerification::query()
            ->where('channel', 'sms')
            ->where('target', $phone)
            ->where('purpose', $purpose)
            ->whereNull('verified_at')
            ->latest('id')
            ->first();
    }

    public function incrementAttempts(OtpVerification $otpVerification): void
    {
        $otpVerification->increment('attempts');
        $otpVerification->refresh();
    }
}

