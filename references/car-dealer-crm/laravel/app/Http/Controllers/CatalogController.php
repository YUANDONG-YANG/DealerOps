<?php

namespace App\Http\Controllers;

use App\Enums\Body;
use App\Enums\Fuel;
use App\Models\Brand;
use App\Models\Car;
use App\Models\Generation;
use App\Models\Model;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CatalogController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $cars = Car::search($request->search, [
            '' => ['release_date'],
            'supply.equipment' => ['name'],
            'supply.equipment.generation.model' => ['name'],
            'supply.equipment.generation.model.brand' => ['name']
        ])
            ->filter($request->all())
            ->with('photos', 'supply.equipment.generation.model.brand', 'supply.equipment.engine')
            ->where('status', '=', 'SELLING')
            ->orderByDesc('id')
            ->get();
        $brands = Brand::orderBy('name')->get();
        $models = Model::where('brand_id', '=', $request->brand)->orderBy('name')->get();
        $generations = Generation::where('model_id', '=', $request->model)->orderBy('number')->get();

        return Inertia::render('Catalog/Index', compact('cars', 'brands', 'models', 'generations'));
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $car = Car::with('photos', 'supply.equipment.generation.model.brand', 'supply.equipment.engine')->where('status', '=', 'SELLING')->findOrFail($id);
        $fuels = Fuel::array();
        $bodies = Body::array();

        return Inertia::render('Catalog/Show', compact('car', 'fuels', 'bodies'));
    }
}
