import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { BoutiqueProvider } from './contexts/BoutiqueContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CaissePage from './pages/CaissePage';
import ProduitsPage from './pages/ProduitsPage';
import ProduitsList from './pages/ProduitsList';
import CategoriesPage from './pages/CategoriesPage';
import UnitesPage from './pages/UnitesPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import StockPage from './pages/StockPage';
import BoutiquesPage from './pages/BoutiquesPage';
import EmployesPage from './pages/EmployesPage';
import DepensesPage from './pages/DepensesPage';
import ProfilPage from './pages/ProfilPage';
import ParametresCommercePage from './pages/ParametresCommercePage';
import FacturesPage from './pages/FacturesPage';
import VentesPage from './pages/VentesPage';
import StatistiquesPage from './pages/StatistiquesPage';
import PortailClientPage from './pages/PortailClientPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <UserProfileProvider>
            <BoutiqueProvider>
              <Routes>
                <Route path="/login"    element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/"          element={<DashboardPage />} />
                    <Route path="/caisse"    element={<CaissePage />} />

                    <Route path="/produits" element={<ProduitsPage />}>
                      <Route index             element={<ProduitsList />} />
                      <Route path="categories" element={<CategoriesPage />} />
                      <Route path="unites"     element={<UnitesPage />} />
                    </Route>

                    <Route path="/clients"             element={<ClientsPage />} />
                    <Route path="/clients/:id"        element={<ClientDetailPage />} />
                    <Route path="/stock"               element={<StockPage />} />
                    <Route path="/boutiques"           element={<BoutiquesPage />} />
                    <Route path="/employes"            element={<EmployesPage />} />
                    <Route path="/depenses"            element={<DepensesPage />} />
                    <Route path="/profil"              element={<ProfilPage />} />
                    <Route path="/factures"            element={<FacturesPage />} />
                    <Route path="/ventes"              element={<VentesPage />} />
                    <Route path="/statistiques"        element={<StatistiquesPage />} />
                    <Route path="/parametres-commerce" element={<ParametresCommercePage />} />
                  </Route>
                </Route>

                <Route path="/portail/:token" element={<PortailClientPage />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BoutiqueProvider>
          </UserProfileProvider>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
