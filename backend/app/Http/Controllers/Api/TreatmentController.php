<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Treatment;
use Illuminate\Http\Request;

class TreatmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Treatment::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('treatment_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $treatments = $query->latest()->get();

        return response()->json($treatments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'treatment_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'estimated_duration' => 'nullable|string|max:100',
        ]);

        $treatment = Treatment::create($validated);

        return response()->json([
            'message' => 'Treatment berhasil ditambahkan.',
            'treatment' => $treatment,
        ], 201);
    }

    public function show(Treatment $treatment)
    {
        return response()->json($treatment);
    }

    /**
     * Worker aktif yang memiliki kompetensi pada Treatment ini.
     * Dipakai dropdown penugasan Job agar hanya Worker kompeten yang tampil.
     */
    public function workers(Treatment $treatment)
    {
        $workers = $treatment->workers()
            ->where('users.role', 'worker')
            ->where('users.is_active', true)
            ->orderBy('users.name')
            ->get();

        return response()->json($workers);
    }

    /**
     * Vendor aktif yang memiliki kompetensi pada Treatment ini.
     */
    public function vendors(Treatment $treatment)
    {
        $vendors = $treatment->vendors()
            ->where('vendors.is_active', true)
            ->orderBy('vendors.vendor_name')
            ->get();

        return response()->json($vendors);
    }

    public function update(Request $request, Treatment $treatment)
    {
        $validated = $request->validate([
            'treatment_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'estimated_duration' => 'nullable|string|max:100',
        ]);

        $treatment->update($validated);

        return response()->json([
            'message' => 'Treatment berhasil diperbarui.',
            'treatment' => $treatment,
        ]);
    }

    public function destroy(Treatment $treatment)
    {
        if ($treatment->jobTreatments()->exists()) {
            return response()->json([
                'message' => 'Treatment tidak dapat dihapus karena telah digunakan pada Job pengerjaan.',
            ], 422);
        }

        $treatment->delete();

        return response()->json([
            'message' => 'Treatment berhasil dihapus.',
        ]);
    }
}
