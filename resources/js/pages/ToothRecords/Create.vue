<template>
  <div class="min-h-screen bg-gray-50">
    <Head title="Create Tooth Record" />

    <div class="container mx-auto px-4 py-8">
      <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <Link :href="route('tooth-records.index')" class="text-blue-600 hover:underline mb-4 block">
            ← Back to Records
          </Link>
          <h1 class="text-3xl font-bold text-gray-900">Create Tooth Record</h1>
          <p class="text-gray-600 mt-2">Add a new tooth examination or treatment record</p>
        </div>

        <!-- Form -->
        <div class="bg-white rounded-lg shadow p-8">
          <form @submit.prevent="submit" class="space-y-6">
            <!-- Patient Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Patient <span class="text-red-500">*</span>
              </label>
              <input
                v-if="form.patient_id"
                type="text"
                :value="patientName"
                disabled
                class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
              <select
                v-else
                v-model="form.patient_id"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                @change="onPatientChange"
              >
                <option value="">Select a patient...</option>
                <option v-for="p in patients" :key="p.id" :value="p.id">
                  {{ p.name }} (ID: {{ p.id }})
                </option>
              </select>
              <p v-if="errors.patient_id" class="text-red-500 text-sm mt-1">{{ errors.patient_id }}</p>
            </div>

            <!-- Tooth Selection -->
            <div class="grid grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Tooth Number <span class="text-red-500">*</span>
                </label>
                <select
                  v-model.number="form.tooth_number"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select tooth...</option>
                  <option v-for="tooth in 32" :key="tooth" :value="tooth">
                    Tooth #{{ tooth }}
                  </option>
                </select>
                <p v-if="errors.tooth_number" class="text-red-500 text-sm mt-1">{{ errors.tooth_number }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Status <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="form.status"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select status...</option>
                  <option value="healthy">Healthy</option>
                  <option value="treatment_needed">Treatment Needed</option>
                  <option value="under_treatment">Under Treatment</option>
                  <option value="treated">Treated</option>
                  <option value="missing">Missing</option>
                </select>
                <p v-if="errors.status" class="text-red-500 text-sm mt-1">{{ errors.status }}</p>
              </div>
            </div>

            <!-- Date -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Date Recorded <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.date_recorded"
                type="date"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p v-if="errors.date_recorded" class="text-red-500 text-sm mt-1">{{ errors.date_recorded }}</p>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                v-model="form.description"
                rows="3"
                placeholder="E.g., Small cavity on occlusal surface..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              ></textarea>
              <p v-if="errors.description" class="text-red-500 text-sm mt-1">{{ errors.description }}</p>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Clinical Notes
              </label>
              <textarea
                v-model="form.notes"
                rows="3"
                placeholder="Additional clinical observations..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              ></textarea>
              <p v-if="errors.notes" class="text-red-500 text-sm mt-1">{{ errors.notes }}</p>
            </div>

            <!-- Treatment Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Treatment Notes
              </label>
              <textarea
                v-model="form.treatment_notes"
                rows="3"
                placeholder="Treatment plan or performed procedures..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              ></textarea>
              <p v-if="errors.treatment_notes" class="text-red-500 text-sm mt-1">{{ errors.treatment_notes }}</p>
            </div>

            <!-- Buttons -->
            <div class="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                <i class="bi bi-check-circle mr-2" v-if="!loading"></i>
                <i class="bi bi-hourglass-split mr-2 animate-spin" v-else></i>
                {{ loading ? 'Saving...' : 'Create Record' }}
              </button>
              <Link :href="route('tooth-records.index')" class="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-center">
                Cancel
              </Link>
            </div>
          </form>
        </div>

        <!-- Help Text -->
        <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="font-semibold text-blue-900 mb-2">
            <i class="bi bi-info-circle mr-2"></i>Quick Guide
          </h3>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• Select the patient from the dropdown</li>
            <li>• Choose the tooth number (1-32, FDI system)</li>
            <li>• Select the current status of the tooth</li>
            <li>• Fill in the date of examination/treatment</li>
            <li>• Add detailed notes about the tooth condition</li>
            <li>• Record will be automatically submitted for review</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Head, Link, router } from '@inertiajs/vue3'

const props = defineProps({
  patient: Object,
  patientRecord: Object,
})

const form = ref({
  patient_id: props.patient?.id || '',
  tooth_number: '',
  status: '',
  description: '',
  date_recorded: new Date().toISOString().split('T')[0],
  notes: '',
  treatment_notes: '',
})

const patients = ref([])
const loading = ref(false)
const errors = ref({})

const patientName = ref('')

const onPatientChange = () => {
  const selected = patients.value.find(p => p.id === parseInt(form.value.patient_id))
  if (selected) {
    patientName.value = selected.name
  }
}

const submit = async () => {
  loading.value = true
  errors.value = {}

  try {
    router.post(route('tooth-records.store'), form.value, {
      onSuccess: () => {
        router.visit(route('tooth-records.index'))
      },
      onError: (err) => {
        errors.value = err
        loading.value = false
      },
    })
  } catch (error) {
    errors.value = { general: 'An error occurred' }
    loading.value = false
  }
}
</script>
