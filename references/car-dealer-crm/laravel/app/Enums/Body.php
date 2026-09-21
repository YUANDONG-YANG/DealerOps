<?php

namespace App\Enums;

enum Body: string
{
    use EnumToArray;

    case SUV = 'Внедорожник';
    case JEEP = 'Джип';
    case CONVERTIBLE = 'Кабриолет';
    case CROSSOVER = 'Кроссовер';
    case COUPE = 'Купе';
    case LIMOUSINE = 'Лимузин';
    case MUSCLE_CAR = 'Маслкар';
    case MINI_VAN = 'Мини-фургон';
    case MONSTER_TRUCK = 'Монстртрак';
    case PICKUP_TRUCK = 'Пикап';
    case ROADSTER = 'Родстер';
    case SEDAN = 'Седан';
    case SPORTS_CAR = 'Спорткар';
    case SUPER_CAR = 'Суперкар';
    case STATION_WAGON = 'Универсал';
    case VAN = 'Фургон';
    case HATCHBACK = 'Хэтчбек';
    case OTHER = 'Другой';
}
