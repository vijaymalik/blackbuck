<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Enquiry extends Model
{
    protected $fillable = [
        'pickup_location',
        'pickup_instruction',
        'dropoff_location',
        'pickup_latitude',
        'pickup_longitude',
        'dropoff_latitude',
        'dropoff_longitude',
        'radius_km',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function responses(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EnquiryResponse::class);
    }
}
