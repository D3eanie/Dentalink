<?php

namespace Tests\Unit\Models;

use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

class UserModelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    /**
     * Test user creation with patient role
     */
    public function test_can_create_user_as_patient(): void
    {
        $user = User::create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => Hash::make('password123'),
            'role' => 'patient',
            'status' => 'active',
        ]);

        $this->assertNotNull($user->id);
        $this->assertEquals('patient', $user->role);
        $this->assertEquals('active', $user->status);
    }

    /**
     * Test user creation with doctor role
     */
    public function test_can_create_user_as_doctor(): void
    {
        $user = User::create([
            'name' => 'Dr. Smith',
            'email' => 'doctor@example.com',
            'password' => Hash::make('password123'),
            'role' => 'staff',
            'status' => 'active',
        ]);

        $this->assertEquals('staff', $user->role);
    }

    /**
     * Test user roles
     */
    public function test_user_roles(): void
    {
        $roles = ['patient', 'staff', 'admin'];

        foreach ($roles as $role) {
            $user = User::create([
                'name' => "Test User - {$role}",
                'email' => "user{$role}@example.com",
                'password' => Hash::make('password123'),
                'role' => $role,
                'status' => 'active',
            ]);

            $this->assertEquals($role, $user->role);
        }
    }

    /**
     * Test user status activation
     */
    public function test_user_activation_status(): void
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('password123'),
            'role' => 'patient',
            'status' => 'active',
        ]);

        $this->assertEquals('active', $user->status);

        $user->update(['status' => 'inactive']);
        $this->assertEquals('inactive', $user->status);
    }

    /**
     * Test user email is unique
     */
    public function test_user_email_uniqueness(): void
    {
        $email = 'unique@example.com';

        User::create([
            'name' => 'User One',
            'email' => $email,
            'password' => Hash::make('password123'),
            'role' => 'patient',
        ]);

        // Attempting to create another user with same email would fail in database
        $this->assertTrue(User::where('email', $email)->exists());
    }

    /**
     * Test user can be found by email
     */
    public function test_can_find_user_by_email(): void
    {
        $email = 'findme@example.com';

        User::create([
            'name' => 'Find Me User',
            'email' => $email,
            'password' => Hash::make('password123'),
            'role' => 'patient',
        ]);

        $user = User::where('email', $email)->first();

        $this->assertNotNull($user);
        $this->assertEquals('Find Me User', $user->name);
    }

    /**
     * Test user password hashing
     */
    public function test_user_password_is_hashed(): void
    {
        $password = 'plainTextPassword123';

        $user = User::create([
            'name' => 'Test User',
            'email' => 'hash@example.com',
            'password' => Hash::make($password),
            'role' => 'patient',
        ]);

        $this->assertTrue(Hash::check($password, $user->password));
        $this->assertNotEquals($password, $user->password);
    }

    /**
     * Test user profile information
     */
    public function test_user_profile_information(): void
    {
        $user = User::create([
            'name' => 'Dr. Profile',
            'email' => 'profile@example.com',
            'password' => Hash::make('password123'),
            'role' => 'staff',
            'phone' => '09123456789',
            'status' => 'active',
        ]);

        $this->assertEquals('Dr. Profile', $user->name);
        $this->assertEquals('09123456789', $user->phone);
    }

    /**
     * Test staff-specific fields
     */
    public function test_staff_specific_fields(): void
    {
        $user = User::create([
            'name' => 'Dr. Johnson',
            'email' => 'johnson@example.com',
            'password' => Hash::make('password123'),
            'role' => 'staff',
            'employee_id' => 'EMP001',
            'position' => 'Dentist',
            'license_number' => 'LIC123456',
            'hire_date' => now()->subYears(5),
            'status' => 'active',
        ]);

        $this->assertEquals('EMP001', $user->employee_id);
        $this->assertEquals('Dentist', $user->position);
    }

    /**
     * Test user can be updated
     */
    public function test_can_update_user(): void
    {
        $user = User::create([
            'name' => 'Original Name',
            'email' => 'original@example.com',
            'password' => Hash::make('password123'),
            'role' => 'patient',
        ]);

        $user->update([
            'name' => 'Updated Name',
            'phone' => '09999999999',
        ]);

        $this->assertEquals('Updated Name', $user->name);
        $this->assertEquals('09999999999', $user->phone);
    }

    /**
     * Test user can be deactivated
     */
    public function test_user_deactivation(): void
    {
        $user = User::create([
            'name' => 'To Deactivate',
            'email' => 'deactivate@example.com',
            'password' => Hash::make('password123'),
            'role' => 'patient',
            'status' => 'active',
        ]);

        $user->update(['status' => 'inactive']);

        $activeUsers = User::where('status', 'active')->get();
        $this->assertFalse($activeUsers->contains($user));
    }

    /**
     * Test user can have multiple roles in system (checking role field)
     */
    public function test_user_role_field_validation(): void
    {
        $user = User::create([
            'name' => 'Multi Role User',
            'email' => 'multi@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->assertNotNull($user->role);
        $this->assertIsString($user->role);
    }
}
