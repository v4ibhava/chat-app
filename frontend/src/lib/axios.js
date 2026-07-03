import axios from "axios"

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const cleanBackendUrl = backendUrl 
    ? (backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl)
    : "";

export const axiosInstance = axios.create({
    baseURL: cleanBackendUrl ? `${cleanBackendUrl}/api` : "/api",
    withCredentials: true,
})