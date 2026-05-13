<?php

namespace App\Filament\Resources\Categories\Schemas;

use Illuminate\Support\Str;
use Filament\Schemas\Schema;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Components\TextInput;

class CategoryForm
{
    public static function configure(Schema $form): Schema
    {
       return $form->schema([
        TextInput::make('name')
            ->required()
            ->live(onBlur: true)
            ->afterStateUpdated(function ($state, callable $set) {
                $set('slug', Str::slug($state));
            }),

        TextInput::make('slug')
            ->required()
            ->unique(ignoreRecord: true),

        Toggle::make('is_active')->default(true),
    ]);
    }
}
