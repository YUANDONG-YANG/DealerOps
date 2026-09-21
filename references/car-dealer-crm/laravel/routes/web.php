<?php

use App\Http\Controllers\BrandController;
use App\Http\Controllers\CarController;
use App\Http\Controllers\CarPhotoController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\CountryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\EngineController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\GenerationController;
use App\Http\Controllers\ModelController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\RequestController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\SupplyController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return redirect('/catalog');
});

Route::prefix('/catalog')->group(function () {
    Route::get('/', [CatalogController::class, 'index'])->name('catalog.index');
    Route::get('/{id}', [CatalogController::class, 'show'])->name('catalog.show');
});

Route::post('/requests', [RequestController::class, 'store'])->name('requests.store');

Route::prefix('/crm')->middleware(['auth:sanctum', config('jetstream.auth_session'), 'verified',])->group(function () {
    Route::get('/', function () {return Inertia::render('CRM/Dashboard');})->name('crm');

    Route::prefix('/countries')->group(function () {
        Route::get('/', [CountryController::class, 'index'])->name('crm.countries.index');
        Route::post('/', [CountryController::class, 'store'])->name('crm.countries.store');
        Route::get('/{id}', [CountryController::class, 'show'])->name('crm.countries.show');
        Route::put('/{id}', [CountryController::class, 'update'])->name('crm.countries.update');
        Route::delete('/{id}', [CountryController::class, 'destroy'])->name('crm.countries.destroy');
    });

    Route::prefix('/brands')->group(function () {
        Route::get('/', [BrandController::class, 'index'])->name('crm.brands.index');
        Route::post('/', [BrandController::class, 'store'])->name('crm.brands.store');
        Route::get('/{id}', [BrandController::class, 'show'])->name('crm.brands.show');
        Route::put('/{id}', [BrandController::class, 'update'])->name('crm.brands.update');
        Route::delete('/{id}', [BrandController::class, 'destroy'])->name('crm.brands.destroy');
    });

    Route::prefix('/models')->group(function () {
        Route::get('/', [ModelController::class, 'index'])->name('crm.models.index');
        Route::post('/', [ModelController::class, 'store'])->name('crm.models.store');
        Route::get('/{id}', [ModelController::class, 'show'])->name('crm.models.show');
        Route::put('/{id}', [ModelController::class, 'update'])->name('crm.models.update');
        Route::delete('/{id}', [ModelController::class, 'destroy'])->name('crm.models.destroy');
    });

    Route::prefix('/engines')->group(function () {
        Route::get('/', [EngineController::class, 'index'])->name('crm.engines.index');
        Route::get('/create', [EngineController::class, 'create'])->name('crm.engines.create');
        Route::post('/', [EngineController::class, 'store'])->name('crm.engines.store');
        Route::get('/{id}', [EngineController::class, 'show'])->name('crm.engines.show');
        Route::get('/{id}/edit', [EngineController::class, 'edit'])->name('crm.engines.edit');
        Route::put('/{id}', [EngineController::class, 'update'])->name('crm.engines.update');
        Route::delete('/{id}', [EngineController::class, 'destroy'])->name('crm.engines.destroy');
    });

    Route::prefix('/generations')->group(function () {
        Route::get('/', [GenerationController::class, 'index'])->name('crm.generations.index');
        Route::get('/create', [GenerationController::class, 'create'])->name('crm.generations.create');
        Route::post('/', [GenerationController::class, 'store'])->name('crm.generations.store');
        Route::get('/{id}', [GenerationController::class, 'show'])->name('crm.generations.show');
        Route::get('/{id}/edit', [GenerationController::class, 'edit'])->name('crm.generations.edit');
        Route::put('/{id}', [GenerationController::class, 'update'])->name('crm.generations.update');
        Route::delete('/{id}', [GenerationController::class, 'destroy'])->name('crm.generations.destroy');
    });

    Route::prefix('/equipments')->group(function () {
        Route::get('/', [EquipmentController::class, 'index'])->name('crm.equipments.index');
        Route::get('/create', [EquipmentController::class, 'create'])->name('crm.equipments.create');
        Route::post('/', [EquipmentController::class, 'store'])->name('crm.equipments.store');
        Route::get('/{id}', [EquipmentController::class, 'show'])->name('crm.equipments.show');
        Route::get('/{id}/edit', [EquipmentController::class, 'edit'])->name('crm.equipments.edit');
        Route::put('/{id}', [EquipmentController::class, 'update'])->name('crm.equipments.update');
        Route::delete('/{id}', [EquipmentController::class, 'destroy'])->name('crm.equipments.destroy');
    });

    Route::prefix('/cars')->group(function () {
        Route::get('/', [CarController::class, 'index'])->name('crm.cars.index');
        Route::get('/{id}', [CarController::class, 'show'])->name('crm.cars.show');
        Route::get('/{id}/edit', [CarController::class, 'edit'])->name('crm.cars.edit');
        Route::put('/{id}', [CarController::class, 'update'])->name('crm.cars.update');
        Route::get('/download/report', [CarController::class, 'downloadSellingCarsReport'])->name('crm.cars.download');
    });

    Route::prefix('/photos')->group(function () {
        Route::post('/', [CarPhotoController::class, 'store'])->name('crm.photos.store');
        Route::delete('/{id}', [CarPhotoController::class, 'delete'])->name('crm.photos.destroy');
    });

    Route::prefix('/suppliers')->group(function () {
        Route::get('/', [SupplierController::class, 'index'])->name('crm.suppliers.index');
        Route::post('/', [SupplierController::class, 'store'])->name('crm.suppliers.store');
        Route::get('/{id}', [SupplierController::class, 'show'])->name('crm.suppliers.show');
        Route::put('/{id}', [SupplierController::class, 'update'])->name('crm.suppliers.update');
        Route::delete('/{id}', [SupplierController::class, 'destroy'])->name('crm.suppliers.destroy');
    });

    Route::prefix('/supplies')->group(function () {
        Route::get('/', [SupplyController::class, 'index'])->name('crm.supplies.index');
        Route::get('/create', [SupplyController::class, 'create'])->name('crm.supplies.create');
        Route::post('/', [SupplyController::class, 'store'])->name('crm.supplies.store');
        Route::get('/{id}', [SupplyController::class, 'show'])->name('crm.supplies.show');
        Route::get('/{id}/edit', [SupplyController::class, 'edit'])->name('crm.supplies.edit');
        Route::put('/{id}', [SupplyController::class, 'update'])->name('crm.supplies.update');
        Route::delete('/{id}', [SupplyController::class, 'destroy'])->name('crm.supplies.destroy');
    });

    Route::prefix('/customers')->group(function () {
        Route::get('/', [CustomerController::class, 'index'])->name('crm.customers.index');
        Route::get('/create', [CustomerController::class, 'create'])->name('crm.customers.create');
        Route::post('/', [CustomerController::class, 'store'])->name('crm.customers.store');
        Route::get('/{id}', [CustomerController::class, 'show'])->name('crm.customers.show');
        Route::get('/{id}/edit', [CustomerController::class, 'edit'])->name('crm.customers.edit');
        Route::put('/{id}', [CustomerController::class, 'update'])->name('crm.customers.update');
        Route::delete('/{id}', [CustomerController::class, 'destroy'])->name('crm.customers.destroy');
        Route::get('/download/report', [CustomerController::class, 'downloadCustomersReport'])->name('crm.customers.download');
    });

    Route::prefix('/orders')->group(function () {
        Route::get('/', [OrderController::class, 'index'])->name('crm.orders.index');
        Route::get('/create', [OrderController::class, 'create'])->name('crm.orders.create');
        Route::post('/', [OrderController::class, 'store'])->name('crm.orders.store');
        Route::get('/{id}', [OrderController::class, 'show'])->name('crm.orders.show');
        Route::get('/{id}/edit', [OrderController::class, 'edit'])->name('crm.orders.edit');
        Route::put('/{id}', [OrderController::class, 'update'])->name('crm.orders.update');
        Route::get('/{id}/download/contract', [OrderController::class, 'downloadContract'])->name('crm.orders.download.contract');
        Route::delete('/{id}', [OrderController::class, 'destroy'])->name('crm.orders.destroy');
        Route::get('/download/report', [OrderController::class, 'downloadOrdersReport'])->name('crm.orders.download');
        Route::get('/download/analysis', [OrderController::class, 'downloadAnalysisOrdersReport'])->name('crm.orders.download.analysis');
    });

    Route::prefix('/requests')->group(function () {
        Route::get('/', [RequestController::class, 'index'])->name('crm.requests.index');
        Route::get('/{id}', [RequestController::class, 'show'])->name('crm.requests.show');
        Route::get('/{id}/edit', [RequestController::class, 'edit'])->name('crm.requests.edit');
        Route::put('/{id}', [RequestController::class, 'update'])->name('crm.requests.update');
        Route::put('/{id}/status', [RequestController::class, 'nextStatus'])->name('crm.requests.status.next');
        Route::delete('/{id}', [RequestController::class, 'destroy'])->name('crm.requests.destroy');
    });
});
