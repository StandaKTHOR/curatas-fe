import { Navigate, Outlet } from 'react-router-dom';

export function getPayload(token: string | null) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function getUserRoles(token: string | null): string[] {
    const payload = getPayload(token);
    if (!payload) return [];
    const rolesSource = payload.roles || payload.role || payload.authorities || payload.auth || [];
    if (Array.isArray(rolesSource)) {
        return rolesSource.map((r: any) => String(r).toUpperCase());
    } else if (typeof rolesSource === 'string') {
        return [rolesSource.toUpperCase()];
    }
    return [];
}

export default function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        const roles = getUserRoles(token);
        const hasAccess = roles.some(r =>
            allowedRoles.includes(r) ||
            allowedRoles.includes(r.replace('ROLE_', '')) ||
            r === 'ROLE_ADMIN' || r === 'ADMIN'
        );
        if (!hasAccess) {
            return <Navigate to="/" replace />;
        }
    }

    return <Outlet />;
}
