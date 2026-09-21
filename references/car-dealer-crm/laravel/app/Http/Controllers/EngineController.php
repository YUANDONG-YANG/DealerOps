<?php

namespace App\Http\Controllers;

use App\Enums\Fuel;
use App\Http\Requests\EngineRequest;
use App\Models\Engine;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EngineController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $engines = Engine::search($request->search, ['' => ['id', 'name']])->orderByDesc('id')->get();
        $fuels = Fuel::array();

        return Inertia::render('CRM/Engines/Index', compact('engines', 'fuels'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $fuels = Fuel::array();

        return Inertia::render('CRM/Engines/Create', compact('fuels'));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(EngineRequest $request)
    {
        $engine = Engine::create($request->validated());

        return redirect()->route('crm.engines.show', ['id' => $engine->id]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $engine = Engine::findOrFail($id);
        $fuels = Fuel::array();

        return Inertia::render('CRM/Engines/Show', compact('engine', 'fuels'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $engine = Engine::findOrFail($id);
        $fuels = Fuel::array();

        return Inertia::render('CRM/Engines/Edit', compact('engine', 'fuels'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(EngineRequest $request, string $id)
    {
        $engine = Engine::findOrFail($id);
        $engine->update($request->validated());

        return redirect()->route('crm.engines.show', ['id' => $engine->id]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $engine = Engine::findOrFail($id);
        $engine->delete();

        return redirect()->route('crm.engines.index');
    }
}
