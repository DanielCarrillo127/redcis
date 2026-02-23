import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const STORAGE_KEY = 'redcis_session';

// Crear instancia de axios
export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a todas las peticiones
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Si el body es FormData, eliminar Content-Type para que el browser
    // lo establezca automáticamente con el boundary correcto.
    // Sin esto, axios serializa el FormData como JSON y los Files quedan como {}.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.token) {
          config.headers.Authorization = `Bearer ${session.token}`;
        }
      }
    } catch (error) {
      console.error('Error al obtener token desde localStorage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta (incluyendo token expirado)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Si es error 401 (no autorizado) y no hemos reintentado aún
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Intentar refrescar el token
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const session = JSON.parse(raw);

          // Llamar al endpoint de refresh
          const refreshResponse = await axios.post(
            `${API_BASE}/api/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${session.token}`,
              },
            }
          );

          if (refreshResponse.data?.data?.token) {
            // Actualizar el token en localStorage
            const newSession = {
              ...session,
              token: refreshResponse.data.data.token,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));

            // Reintentar la petición original con el nuevo token
            originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.data.token}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        // Si el refresh falla, limpiar la sesión y redirigir a login
        localStorage.removeItem(STORAGE_KEY);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
