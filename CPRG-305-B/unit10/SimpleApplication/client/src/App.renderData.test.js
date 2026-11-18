 // Test: Renders Data from API
 import React from 'react';
 import { render, screen, waitFor } from '@testing-library/react';
 import axios from 'axios';
 import App from './App';
 
 jest.mock('axios');
 
 describe('App Component - Render Data', () => {
   it('renders data from API', async () => {
     axios.get.mockResolvedValue({ data: [{ id: 1, name: 'Test Item', value: 5 }] });
     render(<App />);
     await waitFor(() => {
       expect(screen.getByText('Test Item: 5')).toBeInTheDocument();
     });
   });
 });