import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Login from './Login';
import { AuthProvider } from '../components/AuthContext';
import * as api from '../lib/api';

describe('Login Page - GovButton State and Accessibility', () => {
  it('renders login button in default solid primary state with expanded full width layout', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: 'Autorizovaný vstup' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).not.toBeDisabled();

    const hostSpan = button.parentElement;
    expect(hostSpan).not.toBeNull();
    expect(hostSpan).toHaveClass('gov-button');
    expect(hostSpan).toHaveAttribute('type', 'solid');
    expect(hostSpan).toHaveAttribute('color', 'primary');
    expect(hostSpan).toHaveAttribute('expanded');
    expect(hostSpan).not.toHaveAttribute('data-disabled');
  });

  it('supports keyboard navigation and focus on login button', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: 'Autorizovaný vstup' });
    button.focus();
    expect(button).toHaveFocus();
  });

  it('transitions to disabled loading state during submission and recovers on error', async () => {
    let rejectLogin: (err: any) => void;
    const loginPromise = new Promise((_, reject) => {
      rejectLogin = reject;
    });
    vi.spyOn(api, 'login').mockReturnValue(loginPromise as any);

    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    const usernameInput = container.querySelector('#username') as HTMLInputElement;
    const passwordInput = container.querySelector('#password') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-pass' } });

    fireEvent.submit(form);

    // During loading: button is disabled, shows loading text, host has data-disabled
    const loadingButton = await screen.findByRole('button', { name: /Ověřování/i });
    expect(loadingButton).toBeInTheDocument();
    expect(loadingButton).toBeDisabled();
    expect(loadingButton.parentElement).toHaveAttribute('data-disabled');

    // Reject login to trigger error recovery
    rejectLogin!(new Error('Chyba přihlášení'));

    // After failure: recovers back to enabled default state
    await waitFor(() => {
      const recoveredButton = screen.getByRole('button', { name: 'Autorizovaný vstup' });
      expect(recoveredButton).toBeInTheDocument();
      expect(recoveredButton).not.toBeDisabled();
      expect(recoveredButton.parentElement).not.toHaveAttribute('data-disabled');
    });

    // Error alert is rendered
    expect(screen.getByRole('alert')).toHaveTextContent('Chyba přihlášení');
  });
});
