import aiClient from '@/utils/api';
import { DetectFoodInput } from '@/validator/food.validator';

export async function detectFood(data: DetectFoodInput) {
  try {
    const res = await aiClient.post('', data);
    return res.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(`AI fetch failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error(`AI fetch no response: ${error.message}`);
    } else {
      throw new Error(`AI fetch setup error: ${error.message}`);
    }
  }
}
