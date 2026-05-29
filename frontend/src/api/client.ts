import * as Sentry from "@sentry/react";
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status >= 500) {
      Sentry.captureException(error);
    }
    return Promise.reject(error);
  }
);

export default api;
