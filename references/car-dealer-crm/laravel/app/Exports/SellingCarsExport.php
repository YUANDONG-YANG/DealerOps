<?php

namespace App\Exports;

use App\Enums\Body;
use App\Enums\Fuel;
use App\Models\Car;
use Carbon\Carbon;

class SellingCarsExport extends Export
{
    public function query()
    {
        return Car::with('supply.equipment.generation.model.brand', 'supply.equipment.engine')->where('status', '=', 'SELLING');
    }

    public function headings(): array
    {
        return [
            'ID',
            'Гос. номер',
            'Комплектация',
            'Поколение',
            'Модель',
            'Марка',
            'Цена',
            'Цвет',
            'Пробег',
            'Год',
            'Кузов',
            'Двери',
            'Сидения',
            'Макс. скорость',
            'Разгон до 100км/ч',
            'Шины',
            'Расход при 90 км/ч',
            'Расход при 120 км/ч',
            'Расход при городском цикле',
            'Двигатель',
            'Объем',
            'Цилиндры',
            'Макс. мощность',
            'Макс. крутящий момент',
            'Топливо'
        ];
    }

    public function map($car): array
    {
        return [
            $car->id,
            $car->state_number,
            $car->supply->equipment->name,
            $car->supply->equipment->generation->number . ' поколение ' . ($car->supply->equipment->generation->restyling ? 'рестайлинг ' : '') . Carbon::parse($car->supply->equipment->generation->from)->year . '-' . ($car->supply->equipment->generation->from ? Carbon::parse($car->supply->equipment->generation->from)->year : 'н.в.'),
            $car->supply->equipment->generation->model->name,
            $car->supply->equipment->generation->model->brand->name,
            number_format($car->price, 2, ',', ' ') . '₽',
            $car->color,
            $car->mileage ? $car->mileage . ' км' : '',
            $car->release_date ? Carbon::parse($car->release_date)->year : '',
            Body::array()[$car->supply->equipment->body],
            $car->supply->equipment->doors_count,
            $car->supply->equipment->seats_count,
            $car->supply->equipment->max_speed . ' км/ч',
            $car->supply->equipment->acceleration_time . ' c',
            $car->supply->equipment->tires_name,
            $car->supply->equipment->fuel_consumption_90 . ' л/100км',
            $car->supply->equipment->fuel_consumption_120 . ' л/100км',
            $car->supply->equipment->fuel_consumption_city . ' л/100км',
            $car->supply->equipment->engine->name,
            $car->supply->equipment->engine->capacity . ' см3',
            $car->supply->equipment->engine->cylinders_count,
            $car->supply->equipment->engine->max_power . ' л.с.',
            $car->supply->equipment->engine->max_torque . ' Нм',
            Fuel::array()[$car->supply->equipment->engine->fuel],
        ];
    }
}
