import axios from 'axios';

const AI_URL = 'https://dev-mbg-be-ai-agent.midigi.id';
const API_KEY = 'food_detection_user_2024_secure';

const apiAiAgent = axios.create({
  baseURL: AI_URL,
  headers: {
    'accept': 'application/json',
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 20000000
});

apiAiAgent.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error('[AI Fetch Error]', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export default apiAiAgent;
