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
        Schema::create('cars', function (Blueprint $table) {
            $table->id();
            $table->decimal('price', 12, 2)->nullable();
            $table->enum('status', ['WAITING', 'PRESENT', 'SELLING', 'SOLD'])->default('WAITING');
            $table->string('vin', 17)->nullable();
            $table->string('chassis_number')->nullable();
            $table->string('body_number', 12)->nullable();
            $table->integer('mileage')->unsigned()->nullable();
            $table->string('color')->nullable();
            $table->string('state_number', 10)->nullable();
            $table->string('pts_series', 4)->nullable();
            $table->mediumInteger('pts_number')->unsigned()->nullable();
            $table->string('pts_issued_by')->nullable();
            $table->date('pts_issued_at')->nullable();
            $table->string('sts_series', 4)->nullable();
            $table->mediumInteger('sts_number')->unsigned()->nullable();
            $table->string('sts_issued_by')->nullable();
            $table->date('sts_issued_at')->nullable();
            $table->foreignId('supply_id')->constrained('supplies')->restrictOnDelete()->cascadeOnUpdate();
            $table->date('release_date')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cars');
    }
};
