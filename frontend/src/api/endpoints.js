import { apiClient } from "./client";

export const authApi = {
  register: (payload) => apiClient.post("/api/auth/register", payload),
  login: (payload) => apiClient.post("/api/auth/login", payload),
  me: () => apiClient.get("/api/auth/me"),
  logout: () => apiClient.post("/api/auth/logout"),
};

export const incidentsApi = {
  list: (params) => apiClient.get("/api/incidents", { params }),
  get: (id) => apiClient.get(`/api/incidents/${id}`),
  create: (payload) => apiClient.post("/api/incidents", payload),
  update: (id, payload) => apiClient.put(`/api/incidents/${id}`, payload),
  remove: (id) => apiClient.delete(`/api/incidents/${id}`),
  addNote: (id, payload) => apiClient.post(`/api/incidents/${id}/notes`, payload),
  addTimelineEvent: (id, payload) => apiClient.post(`/api/incidents/${id}/timeline`, payload),
  addAction: (id, payload) => apiClient.post(`/api/incidents/${id}/actions`, payload),
  assignableAnalysts: () => apiClient.get("/api/incidents/assignable-analysts"),
};

export const dashboardApi = {
  stats: () => apiClient.get("/api/dashboard/stats"),
};

export const analyticsApi = {
  overview: () => apiClient.get("/api/analytics/overview"),
};

export const aiApi = {
  analyzeIncident: (payload) => apiClient.post("/api/ai/analyze-incident", payload),
};

export const scansApi = {
  upload: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/api/scans", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
  },
  list: () => apiClient.get("/api/scans"),
  get: (id) => apiClient.get(`/api/scans/${id}`),
  findings: (id) => apiClient.get(`/api/scans/${id}/findings`),
  createIncidentFromFinding: (scanId, findingId, payload = {}) =>
    apiClient.post(`/api/scans/${scanId}/findings/${findingId}/create-incident`, payload),
};

export const alertsApi = {
  list: (params) => apiClient.get("/api/alerts", { params }),
  markRead: (id) => apiClient.put(`/api/alerts/${id}/read`),
};

export const adminApi = {
  listUsers: () => apiClient.get("/api/admin/users"),
  createUser: (payload) => apiClient.post("/api/admin/users", payload),
  updateUser: (id, payload) => apiClient.put(`/api/admin/users/${id}`, payload),
  auditLogs: (limit = 200) => apiClient.get("/api/admin/audit-logs", { params: { limit } }),
  overview: () => apiClient.get("/api/admin/overview"),
};
