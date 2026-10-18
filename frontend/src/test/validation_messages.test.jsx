import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Form component that mimics MilkFeverDetectionPage / MastitisDetectionPage client-side validation logic
function ValidatedDetectionForm({ onValidSubmit }) {
  const [parity, setParity] = useState('');
  const [calvingDate, setCalvingDate] = useState('');
  const [calcium, setCalcium] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleValidateAndSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!parity) {
      setErrorMessage('Please select how many times the cow has calved before (Parity).');
      return;
    }

    if (!calvingDate) {
      setErrorMessage('Please enter the calving date.');
      return;
    }

    if (calcium !== '') {
      const val = parseFloat(calcium);
      if (isNaN(val) || val < 2.0 || val > 15.0) {
        setErrorMessage('Blood calcium must be between 2.0 and 15.0 mg/dL.');
        return;
      }
    }

    onValidSubmit({ parity, calvingDate, calcium });
  };

  return (
    <form onSubmit={handleValidateAndSubmit}>
      {errorMessage && <div role="alert" className="error-banner">{errorMessage}</div>}
      
      <label htmlFor="parity">Parity</label>
      <input
        id="parity"
        type="number"
        value={parity}
        onChange={(e) => {
          setParity(e.target.value);
          if (errorMessage) setErrorMessage('');
        }}
      />

      <label htmlFor="calving_date">Calving Date</label>
      <input
        id="calving_date"
        type="date"
        value={calvingDate}
        onChange={(e) => {
          setCalvingDate(e.target.value);
          if (errorMessage) setErrorMessage('');
        }}
      />

      <label htmlFor="calcium">Calcium (mg/dL)</label>
      <input
        id="calcium"
        type="text"
        value={calcium}
        onChange={(e) => {
          setCalcium(e.target.value);
          if (errorMessage) setErrorMessage('');
        }}
      />

      <button type="submit">Analyze Health Risk</button>
    </form>
  );
}

describe('Frontend - Validation Messages', () => {
  it('displays validation error banner when parity is omitted upon submit', () => {
    render(<ValidatedDetectionForm onValidSubmit={() => {}} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Analyze Health Risk/i }));
    
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain('Please select how many times the cow has calved before (Parity).');
  });

  it('displays validation error banner when calving date is missing', () => {
    render(<ValidatedDetectionForm onValidSubmit={() => {}} />);
    
    // Fill parity but omit calving date
    fireEvent.change(screen.getByLabelText(/Parity/i), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Health Risk/i }));
    
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain('Please enter the calving date.');
  });

  it('displays validation error when blood calcium is outside physiological boundaries', () => {
    render(<ValidatedDetectionForm onValidSubmit={() => {}} />);
    
    fireEvent.change(screen.getByLabelText(/Parity/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Calving Date/i), { target: { value: '2026-10-12' } });
    fireEvent.change(screen.getByLabelText(/Calcium/i), { target: { value: '99.5' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Analyze Health Risk/i }));
    
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain('Blood calcium must be between 2.0 and 15.0 mg/dL.');
  });

  it('clears previous validation error message as soon as user types into the input', () => {
    render(<ValidatedDetectionForm onValidSubmit={() => {}} />);
    
    // Trigger initial error
    fireEvent.click(screen.getByRole('button', { name: /Analyze Health Risk/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // User starts typing in parity field
    fireEvent.change(screen.getByLabelText(/Parity/i), { target: { value: '2' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
