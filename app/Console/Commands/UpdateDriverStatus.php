<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class UpdateDriverStatus extends Command
{
    protected $signature = "drivers:cleanup";
    protected $description = "Set drivers to offline if they havent sent a location update in 5 minutes";

    public function handle()
    {
        $count = User::where("is_driver", true)
            ->where("is_online", true)
            ->where("last_seen_at", "<", now()->subMinutes(5))
            ->update(["is_online" => false]);

        $this->info("Successfully marked {$count} drivers as offline.");
    }
}
