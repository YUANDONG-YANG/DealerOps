<?php

namespace App\Http\Controllers;

use App\Http\Requests\GenerationRequest;
use App\Models\Engine;
use App\Models\Generation;
use App\Models\Model;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GenerationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $generations = Generation::search($request->search, [
            '' => ['id', 'number'],
            'model' => ['name'],
            'model.brand' => ['name'],
        ])
            ->with('model.brand')
            ->orderByDesc('id')
            ->get();

        return Inertia::render('CRM/Generations/Index', compact('generations'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $models = Model::with('brand')->orderBy('name')->get();

        return Inertia::render('CRM/Generations/Create', compact('models'));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(GenerationRequest $request)
    {
        $generation = Generation::create($request->validated());

        return redirect()->route('crm.generations.show', ['id' => $generation->id]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $generation = Generation::with('model.brand')->findOrFail($id);

        return Inertia::render('CRM/Generations/Show', compact('generation'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $generation = Generation::with('model')->findOrFail($id);
        $models = Model::with('brand')->orderBy('name')->get();

        return Inertia::render('CRM/Generations/Edit', compact('generation', 'models'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(GenerationRequest $request, string $id)
    {
        $generation = Generation::findOrFail($id);
        $generation->update($request->validated());

        return redirect()->route('crm.generations.show', ['id' => $generation->id]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $generation = Generation::findOrFail($id);
        $generation->delete();

        return redirect()->route('crm.generations.index');
    }
}
