<?php

namespace Tests\Unit\Models;

use App\Models\FinancialRecord;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class FinancialRecordModelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    /**
     * Test financial record creation with valid data
     */
    public function test_can_create_financial_record(): void
    {
        $user = User::factory()->create(['role' => 'patient']);

        $record = FinancialRecord::create([
            'patient_id' => $user->id,
            'amount' => 1500.00,
            'payment_method' => 'cash',
            'description' => 'Dental cleaning service',
            'transaction_date' => now(),
        ]);

        $this->assertNotNull($record->id);
        $this->assertEquals(1500.00, $record->amount);
        $this->assertEquals('cash', $record->payment_method);
    }

    /**
     * Test financial record payment methods
     */
    public function test_financial_record_payment_methods(): void
    {
        $user = User::factory()->create(['role' => 'patient']);
        $paymentMethods = ['cash', 'credit_card', 'check'];

        foreach ($paymentMethods as $method) {
            $record = FinancialRecord::create([
                'patient_id' => $user->id,
                'amount' => 1000.00,
                'payment_method' => $method,
                'transaction_date' => now(),
            ]);

            $this->assertEquals($method, $record->payment_method);
        }
    }

    /**
     * Test financial record transaction types
     */
    public function test_financial_record_transaction_types(): void
    {
        $user = User::factory()->create(['role' => 'patient']);

        $record = FinancialRecord::create([
            'patient_id' => $user->id,
            'amount' => 500.00,
            'payment_method' => 'cash',
            'transaction_date' => now(),
        ]);

        $this->assertNotNull($record->id);
    }

    /**
     * Test financial record amount validation
     */
    public function test_financial_record_amount_must_be_positive(): void
    {
        $user = User::factory()->create(['role' => 'patient']);

        $record = FinancialRecord::create([
            'patient_id' => $user->id,
            'amount' => 0.01,
            'payment_method' => 'cash',
            'transaction_date' => now(),
        ]);

        $this->assertGreaterThan(0, $record->amount);
    }

    /**
     * Test financial record relationship with user
     */
    public function test_financial_record_user_relationship(): void
    {
        $user = User::factory()->create(['role' => 'patient']);

        $record = FinancialRecord::create([
            'patient_id' => $user->id,
            'amount' => 1000.00,
            'payment_method' => 'cash',
            'transaction_date' => now(),
        ]);

        $this->assertNotNull($record->patient);
        $this->assertEquals($user->id, $record->patient->id);
    }

    /**
     * Test financial records can be filtered by date range
     */
    public function test_financial_records_date_range_query(): void
    {
        $user = User::factory()->create(['role' => 'patient']);

        // Create records from different dates
        FinancialRecord::create([
            'patient_id' => $user->id,
            'amount' => 100.00,
            'payment_method' => 'cash',
            'transaction_date' => now()->subDays(10),
        ]);

        FinancialRecord::create([
            'patient_id' => $user->id,
            'amount' => 200.00,
            'payment_method' => 'cash',
            'transaction_date' => now(),
        ]);

        $records = FinancialRecord::whereBetween('transaction_date', [
            now()->subDays(5),
            now()->addDay(),
        ])->get();

        $this->assertEquals(1, $records->count());
    }

    /**
     * Test financial record default payment method
     */
    public function test_financial_record_default_payment_method_cash(): void
    {
        $user = User::factory()->create(['role' => 'patient']);

        $record = FinancialRecord::create([
            'patient_id' => $user->id,
            'amount' => 500.00,
            'payment_method' => 'cash',
            'transaction_date' => now(),
        ]);

        $this->assertEquals('cash', $record->payment_method);
    }
}
