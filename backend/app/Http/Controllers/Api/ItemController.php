<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ItemController extends Controller
{
    public function index(Request $request)
    {
        $query = Item::withCount('jobs');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('item_name', 'like', "%{$search}%")
                  ->orWhere('item_code', 'like', "%{$search}%")
                  ->orWhere('brand', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%");
            });
        }

        $items = $query->latest()->get();

        return response()->json($items);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_code' => 'required|string|max:100|unique:items,item_code',
            'item_name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'description' => 'nullable|string',
        ]);

        $item = Item::create($validated);

        return response()->json([
            'message' => 'Barang berhasil didaftarkan.',
            'item' => $item,
        ], 201);
    }

    public function show(Item $item)
    {
        $item->load(['jobs.creator', 'jobs.qrCode']);

        return response()->json($item);
    }

    public function update(Request $request, Item $item)
    {
        $validated = $request->validate([
            'item_code' => ['required', 'string', 'max:100', Rule::unique('items')->ignore($item->id)],
            'item_name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'description' => 'nullable|string',
        ]);

        $item->update($validated);

        return response()->json([
            'message' => 'Data barang berhasil diperbarui.',
            'item' => $item,
        ]);
    }

    public function destroy(Item $item)
    {
        if ($item->jobs()->exists()) {
            return response()->json([
                'message' => 'Barang tidak dapat dihapus karena memiliki riwayat Job.',
            ], 422);
        }

        $item->delete();

        return response()->json([
            'message' => 'Barang berhasil dihapus.',
        ]);
    }
}
