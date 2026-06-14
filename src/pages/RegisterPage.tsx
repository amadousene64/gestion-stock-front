import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { RegisterDto, AuthResponse } from '../types/auth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const INITIAL: RegisterDto = { commerceName: '', fullName: '', email: '', phone: '', password: '' };

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterDto>(INITIAL);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set =
    (field: keyof RegisterDto) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const hasEmail = form.email && form.email.trim() !== '';
    const hasPhone = form.phone && form.phone.trim() !== '';
    if (!hasEmail && !hasPhone) {
      setError('Renseignez au moins un email ou un numéro de téléphone.');
      return;
    }

    setLoading(true);
    try {
      const payload: RegisterDto = {
        commerceName: form.commerceName,
        fullName: form.fullName,
        password: form.password,
        ...(hasEmail ? { email: form.email } : {}),
        ...(hasPhone ? { phone: form.phone } : {}),
      };
      const { data } = await api.post<AuthResponse>('/api/auth/register', payload);
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
      setError(msg ?? 'Erreur lors de la création du compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center px-4 py-12">
      <div className="w-full max-w-sm mx-auto space-y-6">

        <div className="text-center space-y-1">
          <h1 className="font-display text-3xl font-bold text-ink">Créer un compte</h1>
          <p className="text-sm text-muted">Lancez votre espace en quelques secondes</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nom du commerce"
              type="text"
              required
              value={form.commerceName}
              onChange={set('commerceName')}
              placeholder="Ma Boutique"
            />
            <Input
              label="Votre nom complet"
              type="text"
              required
              autoComplete="name"
              value={form.fullName}
              onChange={set('fullName')}
              placeholder="Jean Dupont"
            />

            <div className="space-y-3">
              <p className="text-xs text-muted">
                Renseignez au moins l'un des deux champs ci-dessous.
              </p>
              <Input
                label="Email (optionnel si téléphone renseigné)"
                type="email"
                autoComplete="email"
                value={form.email ?? ''}
                onChange={set('email')}
                placeholder="vous@exemple.com"
              />
              <Input
                label="Téléphone (optionnel si email renseigné)"
                type="tel"
                autoComplete="tel"
                value={form.phone ?? ''}
                onChange={set('phone')}
                placeholder="+223 76 00 00 00"
              />
            </div>

            <Input
              label="Mot de passe"
              type="password"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
              placeholder="8 caractères minimum"
            />

            {error && (
              <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full mt-1">
              {loading ? 'Création…' : 'Créer mon compte'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-brand-500 font-semibold hover:text-brand-600">
            Se connecter
          </Link>
        </p>

      </div>
    </div>
  );
}
