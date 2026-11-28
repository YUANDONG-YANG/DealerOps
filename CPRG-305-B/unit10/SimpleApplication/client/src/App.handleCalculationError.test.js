import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import App from './App';

jest.mock('axios');

describe('App Component - Handle Calculation Error', () => {
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
});