// Shared Axios client and API methods for CattleSense frontend.
import axios from "axios";

const rawBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api";
const cleanBase = String(rawBase).trim().replace(/\/+$/, "");
const API_BASE_URL = cleanBase === "/api" || cleanBase.endsWith("/api") ? cleanBase : `${cleanBase}/api`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

const getErrorMessage = (error) => {
  if (error.response) {
    return (
      error.response.data?.error ||
      error.response.data?.message ||
      error.response.data?.details ||
      "Server error"
    );
  }
  if (error.request) {
    return "Server error";
  }
  return error.message || "Server error";
};

const unwrap = async (requestPromise) => {
  try {
    const response = await requestPromise;
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const setAuthToken = (token) => {
  if (token && token !== "null" && token !== "undefined") {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete apiClient.defaults.headers.common.Authorization;
};

// Global 401 interceptor – clear stale token and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if we were previously authenticated (had a token set)
      if (apiClient.defaults.headers.common.Authorization) {
        delete apiClient.defaults.headers.common.Authorization;
        localStorage.removeItem("cattlesense_token");
        localStorage.removeItem("cattlesense_user");
        // Redirect to login if not already there
        if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/admin")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export const signupUser = (payload) => unwrap(apiClient.post("/auth/signup", payload));
export const loginUser = (payload) => unwrap(apiClient.post("/auth/login", payload));
export const getProfile = () => unwrap(apiClient.get("/auth/profile"));
export const updateProfile = (payload) => unwrap(apiClient.put("/auth/profile", payload));

// Password Recovery & Email OTP
export const requestPasswordReset = (email) =>
  unwrap(apiClient.post("/auth/forgot-password", { email }));

export const verifyResetOtp = (email, otp) =>
  unwrap(apiClient.post("/auth/verify-reset-otp", { email, otp }));

export const resetPassword = (reset_token, new_password) =>
  unwrap(apiClient.post("/auth/reset-password", { reset_token, new_password }));

export const getDashboardData = () => unwrap(apiClient.get("/dashboard"));

export const getCows = () => unwrap(apiClient.get("/cows"));
export const addCow = (payload) => unwrap(apiClient.post("/cows", payload));
export const updateCow = (cowId, payload) => unwrap(apiClient.put(`/cows/${cowId}`, payload));
export const deleteCow = (cowId) => unwrap(apiClient.delete(`/cows/${cowId}`));
export const getCowRecords = (cowId) => unwrap(apiClient.get(`/cows/${cowId}/records`));
export const getLatestCowMilkLog = (cowId) => unwrap(apiClient.get(`/cows/${cowId}/milk-logs/latest`));

export const logMilkYield = (payload) => unwrap(apiClient.post("/milk-yield", payload));
export const getMilkYieldHistory = () => unwrap(apiClient.get("/milk-yield"));

export const predictModule = (moduleName, payload) => unwrap(apiClient.post(`/modules/${moduleName}/predict`, payload));
export const predictMastitisImage = (payload) => unwrap(apiClient.post("/modules/mastitis/predict-image", payload));
export const predictMastitisAssisted = (payload) => unwrap(apiClient.post("/modules/mastitis/predict-assisted", payload));

// FMD – forwards a multipart form with an image + optional symptom fields
export const predictFMDAssisted = (payload) => unwrap(apiClient.post("/modules/fmd/predict-assisted", payload, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 }));

// LSD – forwards a multipart form with an image + optional skin symptom fields
export const predictLSDAssisted = (payload) => unwrap(apiClient.post("/modules/lumpy/predict-assisted", payload, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 }));

// LSD – requests a downloadable PDF report built from an already-computed result (raw blob, not JSON)
export const downloadLSDReportPdf = (result) => apiClient.post("/modules/lumpy/report-pdf", { result }, { responseType: "blob", timeout: 30000 });

// Mastitis – requests a downloadable PDF report
export const downloadMastitisReportPdf = (payload) => apiClient.post("/modules/mastitis/report-pdf", payload, { responseType: "blob", timeout: 45000 });


// Milk Fever – JSON payload (image optional), clinical symptom inputs
export const predictMilkFever = (payload) => unwrap(apiClient.post("/modules/milk-fever/predict", payload, { timeout: 60000 }));
export const predictMilkFeverAssisted = (payload) => unwrap(apiClient.post("/modules/milk-fever/predict-assisted", payload, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 }));

// Mastitis Assessment History & Persistence
export const saveMastitisAssessment = (payload) => unwrap(apiClient.post("/modules/mastitis/assessments", payload));
export const getCowMastitisAssessments = (cowId) => unwrap(apiClient.get(`/modules/mastitis/cows/${cowId}/assessments`));
export const getSingleMastitisAssessment = (assessmentId) => unwrap(apiClient.get(`/modules/mastitis/assessments/${assessmentId}`));

// Longitudinal Health Monitoring & Trend Analysis
export const getCowHealthTrend = (cowId) => unwrap(apiClient.get(`/cows/${cowId}/health-trend`));
export const getCowAssessmentComparison = (cowId, currentId = null) =>
  unwrap(apiClient.get(`/cows/${cowId}/assessment-comparison${currentId ? `?current_id=${currentId}` : ""}`));
export const getCowRiskTrend = (cowId) => unwrap(apiClient.get(`/cows/${cowId}/risk-trend`));

// Veterinary Follow-up Tracking
export const getCowVeterinaryFollowUps = (cowId) => unwrap(apiClient.get(`/cows/${cowId}/veterinary-follow-up`));
export const createCowVeterinaryFollowUp = (cowId, payload) => unwrap(apiClient.post(`/cows/${cowId}/veterinary-follow-up`, payload));
export const createAssessmentVeterinaryFollowUp = (assessmentId, payload) =>
  unwrap(apiClient.post(`/assessments/${assessmentId}/veterinary-follow-up`, payload));
export const updateVeterinaryFollowUp = (followUpId, payload) => unwrap(apiClient.put(`/veterinary-follow-up/${followUpId}`, payload));

// Herd-Level Health Overview
export const getHerdHealthOverview = () => unwrap(apiClient.get("/farmer/herd-health-overview"));

// Public Advertisements & Partner Highlights
export const getActiveAds = () => unwrap(apiClient.get("/admin/ads/active"));