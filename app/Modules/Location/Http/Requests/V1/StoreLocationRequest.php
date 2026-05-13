<?php

namespace App\Modules\Location\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'captured_at' => ['nullable', 'date'],
            'speed_kmh' => ['nullable', 'integer', 'min:0', 'max:300'],
            'heading_degrees' => ['nullable', 'integer', 'min:0', 'max:360'],
            'accuracy_meters' => ['nullable', 'integer', 'min:0', 'max:10000'],
        ];
    }
}

