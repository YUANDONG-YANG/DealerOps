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
        Schema::create('engines', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->float('capacity')->unsigned();
            $table->tinyInteger('cylinders_count')->unsigned();
            $table->integer('max_power')->unsigned();
            $table->integer('max_torque')->unsigned();
            $table->enum('fuel', ['PETROL', 'DIESEL', 'ELECTRICITY', 'GAS', 'OTHER']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('engines');
    }
};
