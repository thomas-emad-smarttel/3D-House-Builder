<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('library_objects', function (Blueprint $table) {
            $table->string('id', 80)->primary();
            $table->string('name', 120);
            $table->string('category', 60)->default('Custom');
            $table->string('file_type', 30)->default('builtin'); // builtin, svg, dxf, etc.
            $table->string('file_path')->nullable();
            $table->longText('thumbnail_path')->nullable(); // svg preview or thumbnail data
            $table->longText('metadata')->nullable(); // JSON: dimensions, bbox, etc.
            $table->longText('definition'); // JSON: complete room object definition
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_objects');
    }
};
