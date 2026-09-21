<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('equipments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['A', 'B', 'C', 'D', 'E']);
            $table->integer('max_speed')->unsigned();
            $table->float('acceleration_time')->unsigned();
            $table->tinyInteger('doors_count')->unsigned();
            $table->tinyInteger('seats_count')->unsigned();
            $table->integer('length')->unsigned();
            $table->integer('width')->unsigned();
            $table->integer('height')->unsigned();
            $table->float('fuel_consumption_90')->unsigned();
            $table->float('fuel_consumption_120')->unsigned();
            $table->float('fuel_consumption_city')->unsigned();
            $table->enum('body', ['SEDAN', 'HATCHBACK', 'SUV', 'CROSSOVER', 'SPORTS_CAR', 'COUPE', 'STATION_WAGON', 'CONVERTIBLE', 'MINI_VAN', 'VAN', 'PICKUP_TRUCK', 'MUSCLE_CAR', 'SUPER_CAR', 'LIMOUSINE', 'MONSTER_TRUCK', 'JEEP', 'ROADSTER', 'OTHER']);
            $table->string('tires_name', 20);
            $table->foreignId('generation_id')->constrained('generations')->restrictOnDelete()->cascadeOnUpdate();
        });
        Schema::table('models', function (Blueprint $table) {
            $table->dropForeign('models_country_id_foreign');
            $table->dropColumn([
                'type',
                'engine_model',
                'engine_number',
                'engine_capacity',
                'cylinders_count',
                'engine_power',
                'max_torque',
                'max_speed',
                'acceleration_time',
                'doors_count',
                'seats_count',
                'length',
                'width',
                'height',
                'fuel',
                'fuel_consumption_90',
                'fuel_consumption_120',
                'fuel_consumption_city',
                'country_id',
                'body',
                'release_date'
            ]);
        });
        Schema::table('brands', function (Blueprint $table) {
            $table->foreignId('country_id')->constrained('countries')->restrictOnDelete()->cascadeOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipments');
        Schema::table('models', function (Blueprint $table) {
            $table->enum('type', ['A', 'B', 'C', 'D', 'E']);
            $table->string('engine_model');
            $table->string('engine_number');
            $table->float('engine_capacity')->unsigned();
            $table->tinyInteger('cylinders_count')->unsigned();
            $table->integer('engine_power')->unsigned();
            $table->integer('max_torque')->unsigned();
            $table->integer('max_speed')->unsigned();
            $table->float('acceleration_time')->unsigned();
            $table->tinyInteger('doors_count')->unsigned();
            $table->tinyInteger('seats_count')->unsigned();
            $table->integer('length')->unsigned();
            $table->integer('width')->unsigned();
            $table->integer('height')->unsigned();
            $table->enum('fuel', ['PETROL', 'DIESEL', 'ELECTRICITY', 'GAS', 'OTHER']);
            $table->float('fuel_consumption_90')->unsigned();
            $table->float('fuel_consumption_120')->unsigned();
            $table->float('fuel_consumption_city')->unsigned();
            $table->foreignId('country_id')->constrained('countries')->restrictOnDelete()->cascadeOnUpdate();
            $table->enum('body', ['SEDAN', 'HATCHBACK', 'SUV', 'CROSSOVER', 'SPORTS_CAR', 'COUPE', 'STATION_WAGON', 'CONVERTIBLE', 'MINI_VAN', 'VAN', 'PICKUP_TRUCK', 'MUSCLE_CAR', 'SUPER_CAR', 'LIMOUSINE', 'MONSTER_TRUCK', 'JEEP', 'ROADSTER', 'OTHER']);
            $table->date('release_date');
        });
        Schema::table('models', function (Blueprint $table) {
            $table->dropForeign('models_country_id_foreign');
            $table->dropColumn('country_id');
        });
    }
};
