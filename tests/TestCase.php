<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // For MySQL, ensure we're using the test database
        if (config('database.default') === 'mysql') {
            config(['database.connections.mysql.database' => 'dentalink_test']);
        }
    }
}
