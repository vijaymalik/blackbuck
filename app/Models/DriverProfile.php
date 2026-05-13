<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DriverProfile extends Model
{
    protected $fillable = [
        'user_id',
        'truck_type',
        'truck_number',
        'preferred_operating_area',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

