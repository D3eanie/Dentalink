<?php

namespace App\Providers;

use App\Models\ToothRecord;
use App\Models\ToothChart;
use App\Policies\ToothRecordPolicy;
use App\Policies\ToothChartPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        ToothRecord::class => ToothRecordPolicy::class,
        ToothChart::class => ToothChartPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Define custom gates if needed
    }
}
