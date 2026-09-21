<?php

namespace App\Exports;

use App\Models\Customer;

class CustomersExport extends Export
{
    public function query()
    {
        return Customer::query();
    }

    public function headings(): array
    {
        return [
            'ID',
            'ФИО',
            'Телефон',
            'Почта',
        ];
    }

    public function map($customer): array
    {
        return [
            $customer->id,
            $customer->name,
            $customer->phone,
            $customer->email,
        ];
    }
}
