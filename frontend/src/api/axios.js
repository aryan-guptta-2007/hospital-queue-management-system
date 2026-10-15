import axios from "axios";

const api = axios.create({
  baseURL: "/api", // VERY IMPORTANT
});

// 🔥 Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 🔒 A dead or disabled session must not leave the admin screens half-working.
// Patient-facing pages get no 401s, so they are left alone.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { pathname, search } = window.location;
    const onAdminScreen = pathname.startsWith("/admin");
    const onLoginScreen = pathname.startsWith("/admin/login");

    if (error.response?.status === 401 && onAdminScreen) {
      localStorage.removeItem("token");

      // A failed sign-in attempt is the login page's own business
      if (!onLoginScreen) {
        window.location.assign(
          `/admin/login?expired=1&from=${encodeURIComponent(pathname + search)}`
        );
      }
    }

    return Promise.reject(error);
  }
);

export default api;
