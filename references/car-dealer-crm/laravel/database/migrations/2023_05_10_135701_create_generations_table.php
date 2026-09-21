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
        Schema::create('generations', function (Blueprint $table) {
            $table->id();
            $table->date('from');
            $table->date('to')->nullable();
            $table->integer('number');
            $table->boolean('restyling')->default(0);
            $table->foreignId('model_id')->constrained('models')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('engine_id')->constrained('engines')->restrictOnDelete()->cascadeOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('generations');
    }
};
