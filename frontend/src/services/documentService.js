import api from './api';

export const documentService = {
  uploadDocument: async ({ jobId, jobTreatmentId, treatmentLogId, qcInspectionId, file, description }) => {
    const formData = new FormData();
    formData.append('job_id', jobId);
    if (jobTreatmentId) formData.append('job_treatment_id', jobTreatmentId);
    if (treatmentLogId) formData.append('treatment_log_id', treatmentLogId);
    if (qcInspectionId) formData.append('qc_inspection_id', qcInspectionId);
    formData.append('file', file);
    if (description) formData.append('description', description);

    const response = await api.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getDocument: async (id) => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  deleteDocument: async (id) => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },
};

export default documentService;
