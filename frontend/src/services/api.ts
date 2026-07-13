function getBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const trimmedUrl = configuredUrl.replace(/\/+$/, '');

  return trimmedUrl.endsWith('/api') ? trimmedUrl : `${trimmedUrl}/api`;
}

const BASE_URL = getBaseUrl();

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}

export function getClientApiKey(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('gemini_api_key');
  }
  return null;
}

export function setClientApiKey(key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gemini_api_key', key);
  }
}

export function removeClientApiKey() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gemini_api_key');
  }
}

function normalizeApiError(message: string): string {
  if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
    return 'Gemini API key is invalid. Open Settings and save a valid Gemini API key, or update GEMINI_API_KEY in backend/.env.';
  }
  return message;
}

function errorMessageFromJson(errorJson: any): string {
  const detail = errorJson.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || JSON.stringify(item)).join(', ');
  }

  if (typeof detail === 'string') {
    return detail;
  }

  return JSON.stringify(errorJson);
}

interface RequestOptions extends RequestInit {
  bodyData?: any;
}

async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const token = getAuthToken();
  const apiKey = getClientApiKey();
  
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (apiKey) {
    headers.set('X-Gemini-API-Key', apiKey);
  }
  
  if (options.bodyData) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.bodyData);
  }
  
  const config = {
    ...options,
    headers,
  };
  
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const response = await fetch(url, config);
  
  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errJson = await response.json();
      errorDetail = errorMessageFromJson(errJson);
    } catch {
      errorDetail = await response.text() || response.statusText;
    }
    throw new Error(normalizeApiError(errorDetail));
  }
  
  return response.json();
}

export const api = {
  // Authentication
  register: (body: any) => apiRequest('/auth/register', { method: 'POST', bodyData: body }),
  login: (body: any) => apiRequest('/auth/login', { method: 'POST', bodyData: body }),
  getMe: () => apiRequest('/auth/me', { method: 'GET' }),
  
  // Video Processing
  processVideo: (youtubeUrl: string) => apiRequest('/video/process', { method: 'POST', bodyData: { youtube_url: youtubeUrl } }),
  getSummary: (videoDbId: number, type: string) => apiRequest('/video/summarize', { method: 'POST', bodyData: { video_id: videoDbId, summary_type: type } }),
  getNotes: (videoDbId: number) => apiRequest('/video/notes', { method: 'POST', bodyData: { video_id: videoDbId } }),
  getQuiz: (videoDbId: number) => apiRequest('/video/quiz', { method: 'POST', bodyData: { video_id: videoDbId } }),
  getSocialContent: (videoDbId: number) => apiRequest('/video/content', { method: 'POST', bodyData: { video_id: videoDbId } }),
  
  // Chat / RAG
  askQuestion: (videoDbId: number, question: string) => apiRequest('/video/ask', { method: 'POST', bodyData: { video_id: videoDbId, question } }),
  getChatHistory: (videoDbId: number) => apiRequest(`/video/${videoDbId}/chat-history`, { method: 'GET' }),
  
  // Dashboard History
  getHistory: () => apiRequest('/history', { method: 'GET' }),
};
