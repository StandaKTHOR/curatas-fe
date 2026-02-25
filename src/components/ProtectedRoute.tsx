import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Tady bychom v budoucnu dekódovali JWT a kontrolovali role (Admin/Kurátor/Zaměstnanec)
    // Pro teď stačí, že token existuje.
    return <Outlet />;
}