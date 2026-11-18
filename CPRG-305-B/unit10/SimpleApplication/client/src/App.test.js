import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import App from './App';

jest.mock('axios');

describe('App Component', () => {
  it('renders data from API', async () => {
    axios.get.mockResolvedValue({ data: [{ id: 1, name: 'Test Item', value: 5 }] });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Test Item: 5')).toBeInTheDocument();
    });
  });

  it('calculates the sum correctly', async () => {
    axios.get.mockResolvedValue({ data: [{ id: 1, name: 'Test Item', value: 10 }, { id: 2, name: 'Test Item 2', value: 20 }] });
    render(<App />);
    await waitFor(() => {
        expect(screen.getByText('Sum of values: 30')).toBeInTheDocument();
    });
  });

  it('handles calculation correctly', async () => {
    axios.get.mockResolvedValue({ data: { result: 15 } });
    render(<App />);
    fireEvent.change(screen.getByRole('spinbutton', { name: /input/i }), { target: { value: '5' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '10' } });
    fireEvent.click(screen.getByText('Calculate'));
    await waitFor(() => {
      expect(screen.getByText('Result: 15')).toBeInTheDocument();
    });
  });

    it('handles calculation error', async () => {
        axios.get.mockRejectedValue(new Error('Calculation failed'));
        render(<App />);
        fireEvent.change(screen.getByRole('spinbutton', { name: /input/i }), { target: { value: '5' } });
        fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '10' } });
        fireEvent.click(screen.getByText('Calculate'));
        await waitFor(() => {
            expect(screen.getByText('Result: Error')).toBeInTheDocument();
        });
    });

  it('doubleValue returns correct value', () => {
    render(<App />);
    expect(screen.getByText('Double 10: 20')).toBeInTheDocument();
  });

  it('doubleValue returns error for non-number input', () => {
    render(<App />);
    expect(screen.getByText("Double 'test': Error")).toBeInTheDocument();
  });

  it('sumValues returns correct value', async () => {
    axios.get.mockResolvedValue({ data: [{ id: 1, name: 'Test Item', value: 10 }, { id: 2, name: 'Test Item 2', value: 20 }] });
    render(<App />);
    await waitFor(() => {
        expect(screen.getByText('Sum of values: 30')).toBeInTheDocument();
    });
  });

  it('sumValues returns incorrect value', async () => {
    axios.get.mockResolvedValue({ data: [{ id: 1, name: 'Test Item', value: 10 }, { id: 2, name: 'Test Item 2', value: 20 }] });
    render(<App />);
    await waitFor(() => {
        expect(screen.queryByText('Sum of values: 35')).not.toBeInTheDocument();
    });
  });
});