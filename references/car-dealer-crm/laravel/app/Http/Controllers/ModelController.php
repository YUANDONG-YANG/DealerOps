<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Model;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ModelController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $models = Model::search($request->search, [
            '' => ['id', 'name'],
            'brand' => ['name'],
        ])
            ->with('brand')->orderByDesc('id')->get();
        $brands = Brand::orderBy('name')->get();

        return Inertia::render('CRM/Models/Index', compact('models', 'brands'));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|max:255',
            'brand_id' => 'required|integer|exists:brands,id',
        ]);
        Model::create($validated);

        return redirect()->back();
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $model = Model::with('brand')->findOrFail($id);
        $brands = Brand::orderBy('name')->get();

        return Inertia::render('CRM/Models/Show', compact('model', 'brands'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $model = Model::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|max:255',
            'brand_id' => 'required|integer|exists:brands,id',
        ]);
        $model->update($validated);

        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $model = Model::findOrFail($id);
        $model->delete();

        return redirect()->route('crm.models.index');
    }
}
