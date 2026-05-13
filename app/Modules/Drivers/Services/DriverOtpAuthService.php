<?php

namespace App\Modules\Drivers\Services;

use App\Models\OtpVerification;
use App\Models\User;
use App\Modules\Drivers\Repositories\DriverOtpRepository;
use App\Support\Services\BaseService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DriverOtpAuthService extends BaseService
{
    public function __construct(private readonly DriverOtpRepository $otpRepository) {}

    public function requestOtp(string $phone): array
    {
        $user = User::query()->firstOrCreate(
            ['phone' => $phone],
            [
                'name' => 'Driver '.substr(preg_replace('/\D+/', '', $phone), -4),
                'email' => sprintf('driver_%s@example.local', Str::ulid()->toBase32()),
                'password' => Hash::make(Str::random(32)),
            ]
        );

        $otpCode = (string) random_int(100000, 999999);
        $expiresAt = Carbon::now()->addMinutes(5);

        $otp = $this->otpRepository->create([
            'user_id' => $user->id,
            'channel' => 'sms',
            'target' => $phone,
            'purpose' => 'driver_login',
            'code_hash' => Hash::make($otpCode),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => $expiresAt,
            'last_sent_at' => now(),
        ]);

        return [
            'otp_id' => $otp->id,
            'expires_at' => $expiresAt->toISOString(),
            // For local/dev testing only. Replace with SMS provider in production.
            'otp' => app()->isProduction() ? null : $otpCode,
        ];
    }

    public function verifyOtp(string $phone, string $otp, string $deviceName = 'driver-mobile'): ?array
    {
        $record = $this->otpRepository->latestActiveForPhone($phone);

        if (! $record || $this->isExpired($record)) {
            return null;
        }

        if ($record->attempts >= $record->max_attempts) {
            return null;
        }

        if (! Hash::check($otp, $record->code_hash)) {
            $this->otpRepository->incrementAttempts($record);

            return null;
        }

        $record->forceFill([
            'verified_at' => now(),
        ])->save();

        $user = User::query()->find($record->user_id);
        if (! $user) {
            return null;
        }

        return [
            'user' => $user,
            'token' => $user->createToken('driver:'.$deviceName, ['driver'])->plainTextToken,
        ];
    }

    public function logout(User $user): void
    {
        $user->tokens()->delete();
    }

    private function isExpired(OtpVerification $otpVerification): bool
    {
        return $otpVerification->expires_at->isPast();
    }
}

