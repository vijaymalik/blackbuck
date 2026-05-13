<?php

namespace App\Modules\Drivers\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;

class VerifyOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+?[0-9]{10,15}$/'],
            'otp' => ['required', 'digits:6'],
            'device_name' => ['sometimes', 'string', 'max:255'],
        ];
    }
}

