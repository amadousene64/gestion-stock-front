import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { LoginDto, AuthResponse } from '../types/auth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginDto>({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>('/api/auth/login', form);
      login(data.token, {
        userId:   data.userId,
        tenantId: data.tenantId,
        role:     data.role,
        fullName: data.fullName,
        email:    data.email,
        phone:    data.phone,
      });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center px-4 py-12">
      <div className="w-full max-w-sm mx-auto space-y-6">

        <div className="text-center space-y-1">
          <h1 className="font-display text-3xl font-bold text-ink">Bon retour</h1>
          <p className="text-sm text-muted">Connectez-vous à votre espace de gestion</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email ou téléphone"
              type="text"
              required
              autoComplete="username"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              placeholder="vous@exemple.com ou +223 76 00 00 00"
            />
            <Input
              label="Mot de passe"
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />

            {error && (
              <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full mt-1">
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-brand-500 font-semibold hover:text-brand-600">
            Créer un compte
          </Link>
        </p>

      </div>
    </div>
  );
}
