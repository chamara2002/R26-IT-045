// Shared Axios client and API methods for CattleSense frontend.
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

const getErrorMessage = (error) => {
  if (error.response) {
    return error.response.data?.error || error.response.data?.details || "Server error";
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

export const signupUser = (payload) => unwrap(apiClient.post("/auth/signup", payload));
export const loginUser = (payload) => unwrap(apiClient.post("/auth/login", payload));
export const getProfile = () => unwrap(apiClient.get("/auth/profile"));
export const updateProfile = (payload) => unwrap(apiClient.put("/auth/profile", payload));

export const getDashboardData = () => unwrap(apiClient.get("/dashboard"));

export const getCows = () => unwrap(apiClient.get("/cows"));
export const addCow = (payload) => unwrap(apiClient.post("/cows", payload));
export const updateCow = (cowId, payload) => unwrap(apiClient.put(`/cows/${cowId}`, payload));
export const deleteCow = (cowId) => unwrap(apiClient.delete(`/cows/${cowId}`));
export const getCowRecords = (cowId) => unwrap(apiClient.get(`/cows/${cowId}/records`));

export const logMilkYield = (payload) => unwrap(apiClient.post("/milk-yield", payload));
export const getMilkYieldHistory = () => unwrap(apiClient.get("/milk-yield"));

export const predictModule = (moduleName, payload) => unwrap(apiClient.post(`/modules/${moduleName}/predict`, payload));
export const predictMastitisImage = (payload) => unwrap(apiClient.post("/modules/mastitis/predict-image", payload));
export const predictMastitisAssisted = (payload) => unwrap(apiClient.post("/modules/mastitis/predict-assisted", payload));