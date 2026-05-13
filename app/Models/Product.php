<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = ['name', 'sku', 'price', 'stock', 'is_active', 'description'];

    protected $casts = [
        'is_active' => 'boolean',
        'price' => 'decimal:2',
    ];
    public function category()
{
    return $this->belongsTo(Category::class);
}

}
