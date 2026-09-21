<?php

namespace App\Exports;

use App\Models\Order;

class OrdersExport extends Export
{
    public function query()
    {
        return Order::with('car.supply.equipment.generation.model.brand', 'customer', 'user');
    }

    public function headings(): array
    {
        return [
            'ID',
            'Авто',
            'Цена',
            'Клиент',
            'Сотрудник',
            'Создано',
            'Договор подписан',
            'Авто передано',
            'Оплата принята полностью',
        ];
    }

    public function map($order): array
    {
        return [
            $order->id,
            $order->car->state_number . ' ' . $order->car->supply->equipment->name . ' ' . $order->car->supply->equipment->generation->model->name . ' ' . $order->car->supply->equipment->generation->model->brand->name,
            number_format($order->price, 2, ',', ' ') . '₽',
            $order->customer->name,
            $order->user->name,
            $order->created_at,
            $order->contract_signed_at,
            $order->car_transferred_at,
            $order->payment_received_at,
        ];
    }
}
