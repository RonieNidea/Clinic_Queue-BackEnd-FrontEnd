<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class CreateClinicAdmin extends Command
{
    protected $signature = 'clinic:create-admin';

    protected $description = 'Create a ClinicQueue administrator account';

    public function handle(): int
    {
        $name = trim((string) $this->ask('Admin full name'));

        $email = strtolower(trim(
            (string) $this->ask('Admin email address')
        ));

        $password = (string) $this->secret(
            'Admin password (at least 8 characters)'
        );

        $confirmation = (string) $this->secret(
            'Confirm admin password'
        );

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'password_confirmation' => $confirmation,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $admin = new User();
        $admin->name = $name;
        $admin->email = $email;
        $admin->password = $password;
        $admin->role = 'admin';
        $admin->department = null;
        $admin->approval_status = 'approved';
        $admin->approved_at = now();
        $admin->save();

        $this->info('Administrator account created successfully.');

        return self::SUCCESS;
    }
}