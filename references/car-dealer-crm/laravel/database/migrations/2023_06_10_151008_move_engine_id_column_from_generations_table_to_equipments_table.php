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
        Schema::table('generations', function (Blueprint $table) {
            $table->dropForeign(['engine_id']);
            $table->dropColumn('engine_id');
        });
        Schema::table('equipments', function (Blueprint $table) {
            $table->foreignId('engine_id')->constrained('engines')->restrictOnDelete()->cascadeOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('generations', function (Blueprint $table) {
            $table->foreignId('engine_id')->constrained('engines')->restrictOnDelete()->cascadeOnUpdate();
        });
        Schema::table('equipments', function (Blueprint $table) {
            $table->dropForeign(['engine_id']);
            $table->dropColumn('engine_id');
        });
    }
};
