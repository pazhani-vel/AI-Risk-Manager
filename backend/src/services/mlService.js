import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export const mlService = {
  /**
   * Invoke Model A Chargeback Risk Prediction via FastAPI microservice
   * @param {Object} modelAInputPayload
   * @returns {Promise<Object>} { probability, risk_score, risk_level, expected_loss, model_version }
   */
  predictChargebackRisk: async (modelAInputPayload) => {
    try {
      const response = await axios.post(
        `${ML_SERVICE_URL}/predict/chargeback-risk`,
        modelAInputPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      return response.data;
    } catch (error) {
      const detail = error.response?.data?.detail || error.message;
      throw new Error(`ML Microservice Error: ${detail}`);
    }
  },

  /**
   * Fetch Model A metrics from FastAPI
   */
  getModelAMetrics: async () => {
    try {
      const response = await axios.get(`${ML_SERVICE_URL}/model/model-a/metrics`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      const detail = error.response?.data?.detail || error.message;
      throw new Error(`ML Service Metrics Error: ${detail}`);
    }
  },

  /**
   * Invoke Model B Defense Success Prediction via FastAPI microservice
   * @param {Object} modelBInputPayload
   * @returns {Promise<Object>} { probability, defense_score, recommendation, model_version }
   */
  predictDefenseSuccess: async (modelBInputPayload) => {
    try {
      const response = await axios.post(
        `${ML_SERVICE_URL}/predict/defense-success`,
        modelBInputPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      return response.data;
    } catch (error) {
      const detail = error.response?.data?.detail || error.message;
      throw new Error(`ML Microservice Error (Model B): ${detail}`);
    }
  },

  /**
   * Fetch Model B metrics from FastAPI
   */
  getModelBMetrics: async () => {
    try {
      const response = await axios.get(`${ML_SERVICE_URL}/model/model-b/metrics`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      const detail = error.response?.data?.detail || error.message;
      throw new Error(`ML Service Metrics Error (Model B): ${detail}`);
    }
  }
};
