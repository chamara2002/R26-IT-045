import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  API_BASE_URL,
  apiClient,
  predictMilkFever,
  downloadMilkFeverReportPdf,
} from '../services/api';

describe('Frontend - Gateway & API Client Calls', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('configures API_BASE_URL appropriately with fallback path', () => {
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
    // Ensure base ends with /api or is /api
    expect(API_BASE_URL.endsWith('/api') || API_BASE_URL === '/api').toBe(true);
  });

  it('unwraps successful gateway responses from Axios response objects', async () => {
    const mockData = {
      disease: 'Milk Fever (Bovine Hypocalcemia)',
      stage: 'Subclinical',
      risk_score: 18,
    };

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockData });

    const result = await predictMilkFever({
      data: { parity: 2, calving_date: '2026-10-15' },
    });

    expect(result).toEqual(mockData);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/modules/milk-fever/predict',
      { data: { parity: 2, calving_date: '2026-10-15' } },
      expect.objectContaining({ timeout: 60000 })
    );
  });

  it('rejects with formatted error message when gateway returns HTTP error status', async () => {
    const errorResponse = {
      response: {
        data: {
          error: 'Validation failed',
          details: ['Parity must be an integer'],
        },
        status: 422,
      },
    };

    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(errorResponse);

    await expect(
      predictMilkFever({ data: { parity: 'invalid' } })
    ).rejects.toThrow('Parity must be an integer');
  });

  it('invokes downloadable PDF endpoint with binary blob responseType', async () => {
    const mockBlob = new Blob(['%PDF-1.4 test binary stream'], { type: 'application/pdf' });
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockBlob });

    const payload = {
      result: { stage: 'Critical', risk_score: 95 },
      cow: { tag_id: 'COW-44', name: 'Bella' },
      language: 'en',
    };

    const response = await downloadMilkFeverReportPdf(payload);

    expect(response.data).toEqual(mockBlob);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/modules/milk-fever/report-pdf',
      payload,
      expect.objectContaining({ responseType: 'blob', timeout: 30000 })
    );
  });
});
