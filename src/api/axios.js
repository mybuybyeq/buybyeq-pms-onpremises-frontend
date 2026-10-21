import axios from "axios";
import { getConfig } from "../config/runtimeConfig.js";

const apiClient = axios.create();

export function initializeAxios() {
  const { API_URL } = getConfig();

  apiClient.defaults.baseURL = API_URL;
}

export default apiClient;
