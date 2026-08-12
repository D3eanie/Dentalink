<template>
  <AdminLayout>
    <Head title="Tooth Chart" />

    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <Link :href="route('tooth-records.patient-history', patient.id)" class="text-blue-600 hover:underline mb-4 block">
          ← Back to Patient Records
        </Link>
        <h1 class="text-3xl font-bold text-gray-900">{{ patient.name }}'s Tooth Chart</h1>
        <p class="text-gray-600 mt-2">Interactive visualization of oral health status</p>
      </div>

      <!-- Statistics -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p class="text-xs font-medium text-gray-600">Healthy</p>
          <p class="text-2xl font-bold text-green-600">{{ statistics.healthy }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p class="text-xs font-medium text-gray-600">Treatment</p>
          <p class="text-2xl font-bold text-red-600">{{ statistics.treatment_needed }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <p class="text-xs font-medium text-gray-600">Under Tx</p>
          <p class="text-2xl font-bold text-yellow-600">{{ statistics.under_treatment }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p class="text-xs font-medium text-gray-600">Treated</p>
          <p class="text-2xl font-bold text-blue-600">{{ statistics.treated }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
          <p class="text-xs font-medium text-gray-600">Missing</p>
          <p class="text-2xl font-bold text-gray-600">{{ statistics.missing }}</p>
        </div>
      </div>

      <!-- Legend -->
      <div class="bg-white rounded-lg shadow p-4 mb-8">
        <h3 class="font-semibold text-gray-900 mb-4">Status Legend</h3>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-green-500 rounded"></div>
            <span class="text-sm">Healthy</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-red-500 rounded"></div>
            <span class="text-sm">Treatment Needed</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-yellow-500 rounded"></div>
            <span class="text-sm">Under Treatment</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-blue-500 rounded"></div>
            <span class="text-sm">Treated</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-gray-500 rounded"></div>
            <span class="text-sm">Missing</span>
          </div>
        </div>
      </div>

      <!-- Interactive Tooth Chart -->
      <div class="bg-white rounded-lg shadow p-8">
        <div class="mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Tooth Chart (FDI System)</h3>

          <!-- Upper Teeth (Maxilla) -->
          <div class="mb-12">
            <h4 class="text-sm font-medium text-gray-700 mb-4">Upper Teeth (Maxilla)</h4>
            <div class="flex flex-wrap justify-center gap-2">
              <!-- Right Side (Quadrant 1) -->
              <div class="flex gap-2 mr-8">
                <div v-for="tooth in rightUpperTeeth" :key="tooth"
                     @click="selectTooth(tooth)"
                     :class="getToothClass(tooth, 'upper')"
                     class="cursor-pointer transition-all hover:scale-110"
                >
                  <div class="text-xs font-bold text-center">{{ tooth }}</div>
                </div>
              </div>

              <!-- Left Side (Quadrant 2) -->
              <div class="flex gap-2">
                <div v-for="tooth in leftUpperTeeth" :key="tooth"
                     @click="selectTooth(tooth)"
                     :class="getToothClass(tooth, 'upper')"
                     class="cursor-pointer transition-all hover:scale-110"
                >
                  <div class="text-xs font-bold text-center">{{ tooth }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Lower Teeth (Mandible) -->
          <div>
            <h4 class="text-sm font-medium text-gray-700 mb-4">Lower Teeth (Mandible)</h4>
            <div class="flex flex-wrap justify-center gap-2">
              <!-- Left Side (Quadrant 3) -->
              <div class="flex gap-2 mr-8">
                <div v-for="tooth in leftLowerTeeth" :key="tooth"
                     @click="selectTooth(tooth)"
                     :class="getToothClass(tooth, 'lower')"
                     class="cursor-pointer transition-all hover:scale-110"
                >
                  <div class="text-xs font-bold text-center">{{ tooth }}</div>
                </div>
              </div>

              <!-- Right Side (Quadrant 4) -->
              <div class="flex gap-2">
                <div v-for="tooth in rightLowerTeeth" :key="tooth"
                     @click="selectTooth(tooth)"
                     :class="getToothClass(tooth, 'lower')"
                     class="cursor-pointer transition-all hover:scale-110"
                >
                  <div class="text-xs font-bold text-center">{{ tooth }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected Tooth Details -->
        <div v-if="selectedTooth" class="border-t border-gray-200 pt-6 mt-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Tooth #{{ selectedTooth }} Details</h3>

          <div v-if="toothStatuses[selectedTooth]" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Status</label>
                <p class="mt-1 text-gray-900 font-semibold">{{ formatStatus(toothStatuses[selectedTooth].status) }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Last Updated</label>
                <p class="mt-1 text-gray-900">{{ formatDate(toothStatuses[selectedTooth].lastUpdated) }}</p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Description</label>
              <p class="mt-1 text-gray-900">{{ toothStatuses[selectedTooth].description || '-' }}</p>
            </div>

            <div class="flex gap-2">
              <Link :href="route('tooth-records.tooth-history', [patient.id, selectedTooth])" class="btn btn-primary text-sm">
                View History
              </Link>
              <Link :href="route('tooth-records.edit', {tooth_id: selectedTooth})" class="btn btn-secondary text-sm">
                Edit Record
              </Link>
            </div>
          </div>

          <div v-else class="text-gray-500">
            <p>No records for this tooth. <Link :href="route('tooth-records.create', {patient_id: patient.id, tooth_number: selectedTooth})" class="text-blue-600">Create one</Link></p>
          </div>
        </div>

        <!-- Export Options -->
        <div class="border-t border-gray-200 pt-6 mt-8 flex gap-2">
          <button @click="exportChart" class="btn btn-secondary">
            <i class="bi bi-download mr-2"></i>Export Chart
          </button>
          <button @click="printChart" class="btn btn-secondary">
            <i class="bi bi-printer mr-2"></i>Print Chart
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '@/Layouts/AdminLayout.vue'

const props = defineProps({
  patient: Object,
  toothStatuses: Object,
  statistics: Object,
})

const selectedTooth = ref(null)

// Define tooth numbers by quadrant
const rightUpperTeeth = computed(() => [18, 17, 16, 15, 14, 13, 12, 11])
const leftUpperTeeth = computed(() => [21, 22, 23, 24, 25, 26, 27, 28])
const leftLowerTeeth = computed(() => [38, 37, 36, 35, 34, 33, 32, 31])
const rightLowerTeeth = computed(() => [41, 42, 43, 44, 45, 46, 47, 48])

const getToothClass = (tooth, position) => {
  const baseClass = 'w-12 h-12 flex items-center justify-center rounded border-2 font-bold transition-all'
  const toothStatus = props.toothStatuses[tooth]

  if (!toothStatus) {
    return `${baseClass} bg-gray-100 border-gray-300 text-gray-700`
  }

  const statusColors = {
    'healthy': 'bg-green-100 border-green-500 text-green-900',
    'treatment_needed': 'bg-red-100 border-red-500 text-red-900',
    'under_treatment': 'bg-yellow-100 border-yellow-500 text-yellow-900',
    'treated': 'bg-blue-100 border-blue-500 text-blue-900',
    'missing': 'bg-gray-200 border-gray-500 text-gray-700 line-through',
  }

  return `${baseClass} ${statusColors[toothStatus.status] || statusColors.healthy}`
}

const selectTooth = (tooth) => {
  selectedTooth.value = tooth
}

const formatStatus = (status) => {
  const map = {
    'healthy': 'Healthy',
    'treatment_needed': 'Treatment Needed',
    'under_treatment': 'Under Treatment',
    'treated': 'Treated',
    'missing': 'Missing',
  }
  return map[status] || status
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const exportChart = () => {
  // Implement export functionality
  alert('Exporting chart...')
}

const printChart = () => {
  window.print()
}
</script>

<style scoped>
@media print {
  .btn { display: none; }
}
</style>
