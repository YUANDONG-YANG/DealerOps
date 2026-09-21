<?php

namespace App\Enums;

enum Fuel: string
{
    use EnumToArray;

    case PETROL = 'Бензин';
    case GAS = 'Газ';
    case DIESEL = 'Дизель';
    case ELECTRICITY = 'Электричество';
    case OTHER = 'Другой';
}
