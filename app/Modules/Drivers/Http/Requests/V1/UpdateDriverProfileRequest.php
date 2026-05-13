<?php

namespace App\Modules\Drivers\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDriverProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()?->id;
        $profileId = $this->user()?->driverProfile?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => [
                'required',
                'string',
                'max:20',
                'regex:/^\+?[0-9]{10,15}$/',
                Rule::unique('users', 'phone')->ignore($userId),
            ],
            'truck_type' => ['required', 'string', 'max:100'],
            'truck_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('driver_profiles', 'truck_number')->ignore($profileId),
            ],
            'preferred_operating_area' => ['required', 'string', 'max:255'],
        ];
    }
}

