import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import App from './App';

jest.mock('axios');

describe('App Component - Sum Values Correct', () => {
  it('sumValues returns correct value', async () => {
    axios.get.mockResolvedValue({ data: [{ id: 1, name: 'Test Item', value: 10 }, { id: 2, name: 'Test Item 2', value: 20 }] });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Sum of values: 30')).toBeInTheDocument();
    });
  });
});