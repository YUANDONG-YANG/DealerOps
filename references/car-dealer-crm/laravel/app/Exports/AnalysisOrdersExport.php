<?php

namespace App\Exports;

use App\Models\Car;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class AnalysisOrdersExport implements FromView, ShouldAutoSize
{
    protected Carbon $from;

    protected Carbon $to;

    public function __construct(Carbon $from, Carbon $to)
    {
        $this->from = $from;
        $this->to = $to;
    }

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

    public function view(): View
    {
        $orders = Order::with('car.supply.equipment.generation.model.brand', 'customer', 'user')->where('contract_signed_at', '>=', $this->from)->where('contract_signed_at', '<=', $this->to)->get();
        $cars = Car::with('supply.equipment.generation.model.brand', 'supply.user', 'supply.supplier')->whereHas('supply', function ($q) {
            $q->where('supplied_at', '>=', $this->from)
                ->where('supplied_at', '<=', $this->to);
        })
            ->get();
        $counter = [
            'income' => 0,
            'consumption' => 0,
        ];
        foreach ($orders as $order) {
            $counter['income'] += $order->price;
        }
        foreach ($cars as $car) {
            $counter['consumption'] += $car->supply->price;
        }


        return view('exports.orders', [
            'orders' => $orders,
            'cars' => $cars,
            'counter' => $counter
        ]);
    }
}
