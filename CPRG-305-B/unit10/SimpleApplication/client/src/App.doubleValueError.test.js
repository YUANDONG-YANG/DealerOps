import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component - Double Value Error', () => {
  it('doubleValue returns error for non-number input', () => {
    render(<App />);
    expect(screen.getByText("Double 'test': Error")).toBeInTheDocument();
  });
});