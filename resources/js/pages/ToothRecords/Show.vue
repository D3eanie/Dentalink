<template>
  <AdminLayout>
    <Head title="Tooth Record Details" />

    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <Link :href="route('tooth-records.patient-history', record.patient_id)" class="text-blue-600 hover:underline mb-4 block">
          ← Back to Patient Records
        </Link>
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Tooth #{{ record.tooth_number }}</h1>
            <p class="text-gray-600 mt-2">{{ record.patient.name }}</p>
          </div>
          <div class="flex gap-2">
            <Link :href="route('tooth-records.edit', record.id)" class="btn btn-secondary">
              <i class="bi bi-pencil mr-2"></i>Edit
            </Link>
            <button @click="deleteRecord" class="btn btn-danger">
              <i class="bi bi-trash mr-2"></i>Delete
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="col-span-2">
          <!-- Status Card -->
          <div class="bg-white rounded-lg shadow p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Status</h2>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Current Status</p>
                <p :class="getStatusClass(record.status)" class="inline-block mt-2">
                  {{ formatStatus(record.status) }}
                </p>
              </div>
              <div class="text-4xl" :class="getStatusIcon(record.status)">
                <i :class="getStatusIconClass(record.status)"></i>
              </div>
            </div>
          </div>

          <!-- Record Details -->
          <div class="bg-white rounded-lg shadow p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Record Details</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600">Date Recorded</p>
                <p class="text-gray-900 font-medium mt-1">{{ formatDate(record.date_recorded) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Created By</p>
                <p class="text-gray-900 font-medium mt-1">{{ record.created_by.name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Created At</p>
                <p class="text-gray-900 font-medium mt-1">{{ formatDateTime(record.created_at) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Last Updated</p>
                <p class="text-gray-900 font-medium mt-1">{{ formatDateTime(record.updated_at) }}</p>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div v-if="record.description" class="bg-white rounded-lg shadow p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            <p class="text-gray-700 whitespace-pre-wrap">{{ record.description }}</p>
          </div>

          <!-- Clinical Notes -->
          <div v-if="record.notes" class="bg-white rounded-lg shadow p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Clinical Notes</h2>
            <p class="text-gray-700 whitespace-pre-wrap">{{ record.notes }}</p>
          </div>

          <!-- Treatment Notes -->
          <div v-if="record.treatment_notes" class="bg-white rounded-lg shadow p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Treatment Notes</h2>
            <p class="text-gray-700 whitespace-pre-wrap">{{ record.treatment_notes }}</p>
          </div>

          <!-- Review Section -->
          <div v-if="!record.reviewed_at" class="bg-yellow-50 border border-yellow-200 rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <i class="bi bi-exclamation-triangle text-yellow-600 mr-2"></i>
              Pending Review
            </h2>
            <p class="text-gray-700 mb-4">This record is waiting for review and approval.</p>
            <form @submit.prevent="submitReview" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Review Notes</label>
                <textarea
                  v-model="reviewNotes"
                  rows="4"
                  placeholder="Add your review comments..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                ></textarea>
              </div>
              <button type="submit" class="btn btn-primary" :disabled="submittingReview">
                <i class="bi bi-check-circle mr-2"></i>
                {{ submittingReview ? 'Submitting...' : 'Mark as Reviewed' }}
              </button>
            </form>
          </div>

          <div v-else class="bg-green-50 border border-green-200 rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <i class="bi bi-check-circle text-green-600 mr-2"></i>
              Reviewed
            </h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600">Reviewed By</p>
                <p class="text-gray-900 font-medium mt-1">{{ record.reviewed_by?.name || 'N/A' }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Reviewed At</p>
                <p class="text-gray-900 font-medium mt-1">{{ formatDateTime(record.reviewed_at) }}</p>
              </div>
            </div>
            <div v-if="record.review_notes" class="mt-4">
              <p class="text-sm text-gray-600">Review Notes</p>
              <p class="text-gray-700 whitespace-pre-wrap mt-2">{{ record.review_notes }}</p>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div>
          <!-- Patient Info -->
          <div class="bg-white rounded-lg shadow p-6 mb-6">
            <h3 class="font-semibold text-gray-900 mb-4">Patient Information</h3>
            <div class="space-y-3">
              <div>
                <p class="text-xs text-gray-600 uppercase">Name</p>
                <Link :href="route('patients.show', record.patient_id)" class="text-blue-600 hover:underline">
                  {{ record.patient.name }}
                </Link>
              </div>
              <div>
                <p class="text-xs text-gray-600 uppercase">Patient ID</p>
                <p class="text-gray-900">{{ record.patient_id }}</p>
              </div>
              <Link :href="route('tooth-records.patient-history', record.patient_id)" class="btn btn-secondary btn-sm w-full">
                <i class="bi bi-list mr-2"></i>All Records
              </Link>
            </div>
          </div>

          <!-- Quick Stats -->
          <div class="bg-white rounded-lg shadow p-6 mb-6">
            <h3 class="font-semibold text-gray-900 mb-4">This Tooth</h3>
            <div class="space-y-3">
              <div>
                <p class="text-xs text-gray-600 uppercase">Records Count</p>
                <p class="text-2xl font-bold text-blue-600">{{ toothHistory.length }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 uppercase">Last Status</p>
                <p class="text-gray-900">{{ formatStatus(record.status) }}</p>
              </div>
              <Link :href="route('tooth-records.tooth-history', [record.patient_id, record.tooth_number])" class="btn btn-secondary btn-sm w-full">
                <i class="bi bi-clock-history mr-2"></i>View History
              </Link>
            </div>
          </div>

          <!-- Tooth Chart Link -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="font-semibold text-gray-900 mb-4">Visualization</h3>
            <Link :href="route('tooth-records.tooth-chart', record.patient_id)" class="btn btn-primary btn-sm w-full">
              <i class="bi bi-diagram-2 mr-2"></i>Tooth Chart
            </Link>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref } from 'vue'
import { Head, Link, router } from '@inertiajs/vue3'
import AdminLayout from '@/Layouts/AdminLayout.vue'

const props = defineProps({
  record: Object,
  history: Array,
})

const reviewNotes = ref('')
const submittingReview = ref(false)
const toothHistory = ref(props.history || [])

const getStatusClass = (status) => {
  const classes = 'px-3 py-1 rounded-full text-sm font-medium inline-block'
  const map = {
    'healthy': `${classes} bg-green-100 text-green-800`,
    'treatment_needed': `${classes} bg-red-100 text-red-800`,
    'under_treatment': `${classes} bg-yellow-100 text-yellow-800`,
    'treated': `${classes} bg-blue-100 text-blue-800`,
    'missing': `${classes} bg-gray-100 text-gray-800`,
  }
  return map[status] || classes
}

const getStatusIcon = (status) => {
  const map = {
    'healthy': 'text-green-600',
    'treatment_needed': 'text-red-600',
    'under_treatment': 'text-yellow-600',
    'treated': 'text-blue-600',
    'missing': 'text-gray-600',
  }
  return map[status] || 'text-gray-600'
}

const getStatusIconClass = (status) => {
  const map = {
    'healthy': 'bi bi-check-circle-fill',
    'treatment_needed': 'bi bi-exclamation-circle-fill',
    'under_treatment': 'bi bi-hourglass-split',
    'treated': 'bi bi-patch-check-fill',
    'missing': 'bi bi-dash-circle-fill',
  }
  return map[status] || 'bi bi-question-circle-fill'
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
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatDateTime = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const submitReview = async () => {
  submittingReview.value = true

  router.post(route('tooth-records.mark-reviewed', props.record.id), {
    review_notes: reviewNotes.value
  }, {
    onSuccess: () => {
      submittingReview.value = false
      router.reload()
    },
    onError: () => {
      submittingReview.value = false
    }
  })
}

const deleteRecord = () => {
  if (confirm('Are you sure you want to delete this record?')) {
    router.delete(route('tooth-records.destroy', props.record.id))
  }
}
</script>
