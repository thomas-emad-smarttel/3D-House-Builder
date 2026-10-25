<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolio_contents', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->longText('data');
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
        });

        Schema::create('portfolio_revisions', function (Blueprint $table) {
            $table->id();
            $table->longText('data');
            $table->string('note')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_revisions');
        Schema::dropIfExists('portfolio_contents');
    }
};
