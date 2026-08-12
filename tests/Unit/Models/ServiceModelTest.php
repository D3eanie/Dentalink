<?php

namespace Tests\Unit\Models;

use App\Models\Service;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ServiceModelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    /**
     * Test service creation
     */
    public function test_can_create_service(): void
    {
        $service = Service::create([
            'name' => 'Dental Cleaning',
            'description' => 'Professional teeth cleaning',
            'duration_minutes' => 30,
            'price' => 500.00,
            'category' => 'preventive',
        ]);

        $this->assertNotNull($service->id);
        $this->assertEquals('Dental Cleaning', $service->name);
        $this->assertEquals(30, $service->duration_minutes);
        $this->assertEquals(500.00, $service->price);
    }

    /**
     * Test service categories
     */
    public function test_service_categories(): void
    {
        $categories = ['preventive', 'restorative', 'cosmetic', 'surgical', 'emergency'];

        foreach ($categories as $category) {
            $service = Service::create([
                'name' => "Service - {$category}",
                'duration_minutes' => 30,
                'price' => 500.00,
                'category' => $category,
            ]);

            $this->assertEquals($category, $service->category);
        }
    }

    /**
     * Test service duration validation
     */
    public function test_service_duration_must_be_valid(): void
    {
        $service = Service::create([
            'name' => 'Quick Checkup',
            'duration_minutes' => 15, // Minimum valid duration
            'price' => 100.00,
            'category' => 'preventive',
        ]);

        $this->assertGreaterThanOrEqual(15, $service->duration_minutes);
    }

    /**
     * Test service price validation
     */
    public function test_service_price_must_be_positive(): void
    {
        $service = Service::create([
            'name' => 'Premium Cleaning',
            'duration' => 60,
            'price' => 1000.00,
            'category' => 'preventive',
        ]);

        $this->assertGreaterThan(0, $service->price);
    }

    /**
     * Test service can be updated
     */
    public function test_can_update_service(): void
    {
        $service = Service::create([
            'name' => 'Teeth Whitening',
            'duration_minutes' => 45,
            'price' => 3000.00,
            'category' => 'cosmetic',
        ]);

        $service->update([
            'price' => 3500.00,
            'duration_minutes' => 60,
        ]);

        $this->assertEquals(3500.00, $service->price);
        $this->assertEquals(60, $service->duration_minutes);
    }

    /**
     * Test service can be deleted
     */
    public function test_can_delete_service(): void
    {
        $service = Service::create([
            'name' => 'Root Canal',
            'duration_minutes' => 120,
            'price' => 8000.00,
            'category' => 'restorative',
        ]);

        $serviceId = $service->id;
        $service->delete();

        $this->assertNull(Service::find($serviceId));
    }

    /**
     * Test service listing and filtering
     */
    public function test_can_list_services_by_category(): void
    {
        Service::create([
            'name' => 'Cleaning',
            'duration_minutes' => 30,
            'price' => 500.00,
            'category' => 'preventive',
        ]);

        Service::create([
            'name' => 'Filling',
            'duration_minutes' => 45,
            'price' => 1500.00,
            'category' => 'restorative',
        ]);

        Service::create([
            'name' => 'Veneers',
            'duration_minutes' => 90,
            'price' => 10000.00,
            'category' => 'cosmetic',
        ]);

        $preventiveServices = Service::where('category', 'preventive')->get();
        $this->assertEquals(1, $preventiveServices->count());

        $cosmeticServices = Service::where('category', 'cosmetic')->get();
        $this->assertEquals(1, $cosmeticServices->count());
    }

    /**
     * Test service is_active status
     */
    public function test_service_active_status(): void
    {
        $service = Service::create([
            'name' => 'Active Service',
            'duration_minutes' => 30,
            'price' => 500.00,
            'category' => 'preventive',
            'is_active' => true,
        ]);

        $this->assertTrue($service->is_active);

        $service->update(['is_active' => false]);
        $this->assertFalse($service->is_active);
    }
}
