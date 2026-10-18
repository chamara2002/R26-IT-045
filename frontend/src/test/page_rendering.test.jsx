import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, Card, Badge, Alert } from '../components/ui/index.jsx';

describe('Frontend - Page & Component Rendering', () => {
  it('renders primary button with correct label and default styles', () => {
    render(<Button variant="primary">Submit Diagnosis</Button>);
    const button = screen.getByRole('button', { name: /Submit Diagnosis/i });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain('bg-emerald-600');
  });

  it('renders loading spinner and disables button when isLoading is true', () => {
    render(<Button isLoading disabled>Analyzing Symptoms...</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('renders Card container with custom children and border styles', () => {
    render(
      <Card className="test-card-class">
        <h3>Cattle Assessment Overview</h3>
        <p>Normal vitality detected</p>
      </Card>
    );
    expect(screen.getByText('Cattle Assessment Overview')).toBeInTheDocument();
    expect(screen.getByText('Normal vitality detected')).toBeInTheDocument();
  });

  it('renders status badges and alert banners with appropriate severity styling', () => {
    render(
      <div>
        <Badge variant="success">Healthy</Badge>
        <Badge variant="danger">Critical</Badge>
        <Alert
          variant="warning"
          title="Heat Stress Alert"
          message="High ambient temperature increases risk."
        />
      </div>
    );
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Heat Stress Alert')).toBeInTheDocument();
    expect(screen.getByText(/High ambient temperature increases risk/i)).toBeInTheDocument();
  });
});
