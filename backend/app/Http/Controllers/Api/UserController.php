<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Treatment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('treatmentSkills');

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('treatment_id')) {
            $treatmentId = $request->query('treatment_id');
            $query->whereHas('treatmentSkills', function ($q) use ($treatmentId) {
                $q->where('treatments.id', $treatmentId);
            });
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->latest()->get();

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string|max:50',
            'role' => ['required', Rule::in(['admin', 'worker', 'qc'])],
            'is_active' => 'boolean',
            'treatment_ids' => 'nullable|array',
            'treatment_ids.*' => 'integer|exists:treatments,id',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['is_active'] = $validated['is_active'] ?? true;

        $user = User::create($validated);

        if ($user->role === 'worker' && ! empty($validated['treatment_ids'])) {
            $user->treatmentSkills()->sync($validated['treatment_ids']);
        }

        $user->load('treatmentSkills');

        return response()->json([
            'message' => 'Pengguna berhasil ditambahkan.',
            'user' => $user,
        ], 201);
    }

    public function show(User $user)
    {
        $user->load('treatmentSkills');

        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:6',
            'phone' => 'nullable|string|max:50',
            'role' => ['required', Rule::in(['admin', 'worker', 'qc'])],
            'is_active' => 'boolean',
            'treatment_ids' => 'nullable|array',
            'treatment_ids.*' => 'integer|exists:treatments,id',
        ]);

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $treatmentIds = $validated['treatment_ids'] ?? null;
        unset($validated['treatment_ids']);

        $user->update($validated);

        if ($user->role === 'worker' && is_array($treatmentIds)) {
            $user->treatmentSkills()->sync($treatmentIds);
        } elseif ($user->role !== 'worker') {
            $user->treatmentSkills()->detach();
        }

        $user->load('treatmentSkills');

        return response()->json([
            'message' => 'Data pengguna berhasil diperbarui.',
            'user' => $user,
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        if ($request->user()->id === $user->id) {
            return response()->json([
                'message' => 'Anda tidak dapat menghapus akun Anda sendiri.',
            ], 422);
        }

        // Prevent hard deleting if user has related jobs/inspections/logs, otherwise delete or toggle is_active
        if ($user->jobsCreated()->exists() || $user->treatmentLogs()->exists() || $user->qcInspections()->exists()) {
            $user->update(['is_active' => false]);
            return response()->json([
                'message' => 'Pengguna memiliki riwayat pekerjaan. Akun dinonaktifkan.',
            ]);
        }

        $user->delete();

        return response()->json([
            'message' => 'Pengguna berhasil dihapus.',
        ]);
    }

    // ================= KOMPETENSI WORKER =================

    public function skills(User $worker)
    {
        $this->ensureWorker($worker);

        return response()->json($worker->treatmentSkills()->orderBy('treatment_name')->get());
    }

    public function syncSkills(Request $request, User $worker)
    {
        $this->ensureWorker($worker);

        $validated = $request->validate([
            'treatment_ids' => 'present|array',
            'treatment_ids.*' => 'integer|exists:treatments,id',
        ]);

        $worker->treatmentSkills()->sync($validated['treatment_ids']);

        return response()->json([
            'message' => 'Kompetensi treatment Worker berhasil diperbarui.',
            'worker' => $worker->fresh('treatmentSkills'),
        ]);
    }

    public function addSkill(Request $request, User $worker)
    {
        $this->ensureWorker($worker);

        $validated = $request->validate([
            'treatment_id' => 'required|integer|exists:treatments,id',
        ]);

        $worker->treatmentSkills()->syncWithoutDetaching([$validated['treatment_id']]);

        return response()->json([
            'message' => 'Kompetensi treatment berhasil ditambahkan.',
            'worker' => $worker->fresh('treatmentSkills'),
        ], 201);
    }

    public function removeSkill(User $worker, Treatment $treatment)
    {
        $this->ensureWorker($worker);

        $worker->treatmentSkills()->detach($treatment->id);

        return response()->json([
            'message' => 'Kompetensi treatment berhasil dihapus.',
            'worker' => $worker->fresh('treatmentSkills'),
        ]);
    }

    private function ensureWorker(User $user): void
    {
        if ($user->role !== 'worker') {
            throw ValidationException::withMessages([
                'worker' => 'Kompetensi treatment hanya dapat diberikan kepada pengguna dengan role worker.',
            ]);
        }
    }
}
