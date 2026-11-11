<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Treatment;
use App\Models\Vendor;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    public function index(Request $request)
    {
        $query = Vendor::with('treatments');

        if ($request->filled('treatment_id')) {
            $treatmentId = $request->query('treatment_id');
            $query->whereHas('treatments', function ($q) use ($treatmentId) {
                $q->where('treatments.id', $treatmentId);
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('vendor_name', 'like', "%{$search}%")
                  ->orWhere('contact_person', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $vendors = $query->latest()->get();

        return response()->json($vendors);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vendor_name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'is_active' => 'boolean',
            'treatment_ids' => 'nullable|array',
            'treatment_ids.*' => 'integer|exists:treatments,id',
        ]);

        $treatmentIds = $validated['treatment_ids'] ?? [];
        unset($validated['treatment_ids']);

        $vendor = Vendor::create($validated);

        if (! empty($treatmentIds)) {
            $vendor->treatments()->sync($treatmentIds);
        }

        return response()->json([
            'message' => 'Vendor berhasil ditambahkan.',
            'vendor' => $vendor->fresh('treatments'),
        ], 201);
    }

    public function show(Vendor $vendor)
    {
        $vendor->load('treatments');

        return response()->json($vendor);
    }

    public function update(Request $request, Vendor $vendor)
    {
        $validated = $request->validate([
            'vendor_name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'is_active' => 'boolean',
            'treatment_ids' => 'nullable|array',
            'treatment_ids.*' => 'integer|exists:treatments,id',
        ]);

        $treatmentIds = $validated['treatment_ids'] ?? null;
        unset($validated['treatment_ids']);

        $vendor->update($validated);

        if (is_array($treatmentIds)) {
            $vendor->treatments()->sync($treatmentIds);
        }

        return response()->json([
            'message' => 'Data vendor berhasil diperbarui.',
            'vendor' => $vendor->fresh('treatments'),
        ]);
    }

    public function destroy(Vendor $vendor)
    {
        if ($vendor->jobTreatments()->exists()) {
            return response()->json([
                'message' => 'Vendor tidak dapat dihapus karena telah ditugaskan pada Job pengerjaan. Nonaktifkan vendor jika sudah tidak digunakan.',
            ], 422);
        }

        $vendor->delete();

        return response()->json([
            'message' => 'Vendor berhasil dihapus.',
        ]);
    }

    // ================= KOMPETENSI VENDOR =================

    public function treatments(Vendor $vendor)
    {
        return response()->json($vendor->treatments()->orderBy('treatment_name')->get());
    }

    public function syncTreatments(Request $request, Vendor $vendor)
    {
        $validated = $request->validate([
            'treatment_ids' => 'present|array',
            'treatment_ids.*' => 'integer|exists:treatments,id',
        ]);

        $vendor->treatments()->sync($validated['treatment_ids']);

        return response()->json([
            'message' => 'Kompetensi treatment Vendor berhasil diperbarui.',
            'vendor' => $vendor->fresh('treatments'),
        ]);
    }

    public function addTreatment(Request $request, Vendor $vendor)
    {
        $validated = $request->validate([
            'treatment_id' => 'required|integer|exists:treatments,id',
        ]);

        $vendor->treatments()->syncWithoutDetaching([$validated['treatment_id']]);

        return response()->json([
            'message' => 'Kompetensi treatment Vendor berhasil ditambahkan.',
            'vendor' => $vendor->fresh('treatments'),
        ], 201);
    }

    public function removeTreatment(Vendor $vendor, Treatment $treatment)
    {
        $vendor->treatments()->detach($treatment->id);

        return response()->json([
            'message' => 'Kompetensi treatment Vendor berhasil dihapus.',
            'vendor' => $vendor->fresh('treatments'),
        ]);
    }
}
