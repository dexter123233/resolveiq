import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import App from './App';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const MOCK_RESPONSE = {
  data: {
    resolution: {
      severity: 'medium',
      root_cause_hypothesis: 'VPN gateway auth failure',
      recommended_action: 'Update GlobalProtect to v6.2.1',
      citations: ['KB-001'],
      confidence: 0.85,
      customer_facing_draft: 'Please update your VPN client.',
    },
    escalated: false,
    triage: { severity: 'medium', category: 'network-access', needs_vision: false },
    retrieved_docs: [{ id: 'KB-001', title: 'VPN fix', excerpt: 'Update GP' }],
    image_received: false,
    escalation: null,
    metrics: {
      status: 'fallback',
      provider: 'local-fallback',
      model: 'gemma-4-31b',
      total_latency_ms: 42,
      inference_latency_ms: 0,
      usage: null,
      time_info: null,
    },
  },
};

const ESCALATED_RESPONSE = {
  data: {
    ...MOCK_RESPONSE.data,
    resolution: {
      ...MOCK_RESPONSE.data.resolution,
      severity: 'critical',
    },
    escalated: true,
    escalation: {
      tool: 'escalate_ticket',
      status: 'mocked',
      summary: 'CRITICAL: outage',
    },
  },
};

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the header', () => {
    render(<App />);
    expect(screen.getByText('ResolveIQ Copilot')).toBeInTheDocument();
  });

  test('renders the subtitle', () => {
    render(<App />);
    expect(screen.getByText(/Gemma 4 31B on Cerebras/i)).toBeInTheDocument();
  });

  test('renders the textarea placeholder', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/Describe the incident/i)).toBeInTheDocument();
  });

  test('renders the Resolve button', () => {
    render(<App />);
    expect(screen.getByText('Resolve')).toBeInTheDocument();
  });

  test('renders the Upload Screenshot label', () => {
    render(<App />);
    expect(screen.getByText('Upload Screenshot')).toBeInTheDocument();
  });

  test('Resolve button is disabled when textarea is empty', () => {
    render(<App />);
    const button = screen.getByText('Resolve').closest('button');
    expect(button).toBeDisabled();
  });

  test('Resolve button is enabled after typing text', async () => {
    render(<App />);
    const textarea = screen.getByPlaceholderText(/Describe the incident/i);
    await userEvent.type(textarea, 'VPN issue');
    const button = screen.getByText('Resolve').closest('button');
    expect(button).not.toBeDisabled();
  });

  test('submits ticket and displays resolution', async () => {
    mockedAxios.post.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<App />);

    const textarea = screen.getByPlaceholderText(/Describe the incident/i);
    await userEvent.type(textarea, 'VPN connection failed');

    const button = screen.getByText('Resolve');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Resolution Draft')).toBeInTheDocument();
    });

    expect(screen.getByText(/VPN gateway auth failure/)).toBeInTheDocument();
    expect(screen.getByText(/Update GlobalProtect to v6.2.1/)).toBeInTheDocument();
    expect(screen.getByText(/85%/)).toBeInTheDocument();
    expect(screen.getByText(/KB-001/)).toBeInTheDocument();
  });

  test('shows "Resolved" badge for non-escalated tickets', async () => {
    mockedAxios.post.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText(/Describe the incident/i), 'VPN issue');
    fireEvent.click(screen.getByText('Resolve'));

    await waitFor(() => {
      expect(screen.getByText('Resolved')).toBeInTheDocument();
    });
  });

  test('shows "Escalated" badge for escalated tickets', async () => {
    mockedAxios.post.mockResolvedValueOnce(ESCALATED_RESPONSE);
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText(/Describe the incident/i), 'outage');
    fireEvent.click(screen.getByText('Resolve'));

    await waitFor(() => {
      expect(screen.getByText('Escalated')).toBeInTheDocument();
    });
  });

  test('displays metrics', async () => {
    mockedAxios.post.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText(/Describe the incident/i), 'test');
    fireEvent.click(screen.getByText('Resolve'));

    await waitFor(() => {
      expect(screen.getByText('42 ms')).toBeInTheDocument();
      expect(screen.getByText('local-fallback')).toBeInTheDocument();
    });
  });

  test('shows error message on API failure', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { error: 'Ticket text is required.' } },
    });
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText(/Describe the incident/i), 'x');
    fireEvent.click(screen.getByText('Resolve'));

    await waitFor(() => {
      expect(screen.getByText('Ticket text is required.')).toBeInTheDocument();
    });
  });

  test('shows generic error when response has no error detail', async () => {
    mockedAxios.post.mockRejectedValueOnce({});
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText(/Describe the incident/i), 'x');
    fireEvent.click(screen.getByText('Resolve'));

    await waitFor(() => {
      expect(screen.getByText('Error resolving ticket')).toBeInTheDocument();
    });
  });

  test('shows Analyzing text while loading', async () => {
    let resolvePromise: (v: any) => void;
    const promise = new Promise((resolve) => { resolvePromise = resolve; });
    mockedAxios.post.mockReturnValueOnce(promise as any);

    render(<App />);
    await userEvent.type(screen.getByPlaceholderText(/Describe the incident/i), 'test');
    fireEvent.click(screen.getByText('Resolve'));

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();

    resolvePromise!(MOCK_RESPONSE);
    await waitFor(() => {
      expect(screen.getByText('Resolution Draft')).toBeInTheDocument();
    });
  });

  test('displays pipeline steps', async () => {
    mockedAxios.post.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText(/Describe the incident/i), 'test');
    fireEvent.click(screen.getByText('Resolve'));

    await waitFor(() => {
      expect(screen.getByText('Triage')).toBeInTheDocument();
      expect(screen.getByText('Retrieval')).toBeInTheDocument();
      expect(screen.getByText('Response')).toBeInTheDocument();
    });
  });

  test('calls axios.post with correct URL and form data', async () => {
    mockedAxios.post.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText(/Describe the incident/i), 'VPN down');
    fireEvent.click(screen.getByText('Resolve'));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    const [url, formData] = mockedAxios.post.mock.calls[0];
    expect(url).toBe('http://localhost:5000/api/resolve');
    expect(formData).toBeInstanceOf(FormData);
  });

  test('displays customer facing draft', async () => {
    mockedAxios.post.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText(/Describe the incident/i), 'test');
    fireEvent.click(screen.getByText('Resolve'));

    await waitFor(() => {
      expect(screen.getByText('Please update your VPN client.')).toBeInTheDocument();
    });
  });
});
