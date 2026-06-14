import { useEffect, useState } from 'react';
import { User, Shield, KeyRound, Check, Loader2 } from 'lucide-react';
import { userApi } from '../services/userApi';
import { extractApiError } from '../lib/apiError';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const ROLE_LABEL: Record<string, string> = {
  owner:    'Propriétaire',
  employee: 'Employé',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export default function ProfilPage() {
  const { user }                   = useAuth();
  const { profile, loading, updateProfile } = useUserProfile();

  /* ── Formulaire informations ──────────────────────────── */
  const [infoForm,   setInfoForm]   = useState({ fullName: '', email: '', phone: '' });
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoErr,    setInfoErr]    = useState('');
  const [infoOk,     setInfoOk]     = useState(false);

  /* ── Formulaire mot de passe ──────────────────────────── */
  const [pwdForm,   setPwdForm]   = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdErr,    setPwdErr]    = useState('');
  const [pwdOk,     setPwdOk]     = useState(false);

  /* Pré-remplissage du formulaire depuis le contexte */
  useEffect(() => {
    if (profile) {
      setInfoForm({
        fullName: profile.fullName,
        email:    profile.email  ?? '',
        phone:    profile.phone  ?? '',
      });
    }
  }, [profile]);

  /* ── Enregistrer les informations ─────────────────────── */
  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoErr(''); setInfoOk(false);

    const hasEmail = infoForm.email.trim() !== '';
    const hasPhone = infoForm.phone.trim() !== '';
    if (!hasEmail && !hasPhone) {
      setInfoErr('Renseignez au moins un email ou un numéro de téléphone.');
      return;
    }

    setInfoSaving(true);
    try {
      const updated = await userApi.updateMe({
        fullName: infoForm.fullName.trim(),
        ...(hasEmail ? { email: infoForm.email.trim().toLowerCase() } : {}),
        ...(hasPhone ? { phone: infoForm.phone.trim() }               : {}),
      });
      updateProfile({ fullName: updated.fullName, email: updated.email, phone: updated.phone });
      setInfoOk(true);
    } catch (err) {
      setInfoErr(extractApiError(err));
    } finally {
      setInfoSaving(false);
    }
  };

  /* ── Changer le mot de passe ──────────────────────────── */
  const handlePwdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdErr(''); setPwdOk(false);
    if (pwdForm.newPassword !== pwdForm.confirm) {
      setPwdErr('Les mots de passe ne correspondent pas.');
      return;
    }
    if (pwdForm.newPassword.length < 8) {
      setPwdErr('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setPwdSaving(true);
    try {
      await userApi.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword:     pwdForm.newPassword,
      });
      setPwdOk(true);
      setPwdForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwdErr(extractApiError(err));
    } finally {
      setPwdSaving(false);
    }
  };

  const roleLabel = ROLE_LABEL[user?.role ?? ''] ?? user?.role ?? '—';

  /* ── États de chargement / erreur ─────────────────────── */
  if (loading && !profile) {
    return (
      <div className="py-6 md:py-8">
        <h1 className="font-display text-2xl font-bold text-ink mb-6">Mon profil</h1>
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-6 md:py-8">
        <h1 className="font-display text-2xl font-bold text-ink mb-4">Mon profil</h1>
        <p className="text-sm text-danger bg-red-50 rounded-card px-4 py-3">
          Impossible de charger le profil. Vérifiez votre connexion et rechargez la page.
        </p>
      </div>
    );
  }

  return (
    <div className="py-6 md:py-8 space-y-6">

      <h1 className="font-display text-2xl font-bold text-ink">Mon profil</h1>

      {/* ── Avatar card ── */}
      <div className="bg-surface rounded-card shadow-card p-6 flex items-center gap-4">
        <span className="w-16 h-16 rounded-full bg-brand-500 text-white text-xl font-bold flex items-center justify-center shrink-0 select-none">
          {initials(profile.fullName)}
        </span>
        <div className="min-w-0">
          <p className="font-display font-bold text-lg text-ink truncate">{profile.fullName}</p>
          {profile.email && (
            <p className="text-sm text-muted truncate">{profile.email}</p>
          )}
          {profile.phone && (
            <p className="text-sm text-muted truncate">{profile.phone}</p>
          )}
          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-brand-50 text-brand-500 text-xs font-medium">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* ── Informations personnelles ── */}
      <section className="bg-surface rounded-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
          <User size={16} className="text-muted" />
          <h2 className="font-semibold text-sm text-ink">Informations personnelles</h2>
        </div>
        <form onSubmit={handleInfoSubmit} className="p-5 space-y-4">
          <Input
            label="Nom complet"
            required
            value={infoForm.fullName}
            onChange={e => { setInfoOk(false); setInfoForm(f => ({ ...f, fullName: e.target.value })); }}
            placeholder="Jean Dupont"
          />

          <div className="space-y-3">
            <p className="text-xs text-muted">Renseignez au moins l'un des deux champs ci-dessous.</p>
            <Input
              label="Adresse e-mail (optionnelle si téléphone renseigné)"
              type="email"
              autoComplete="email"
              value={infoForm.email}
              onChange={e => { setInfoOk(false); setInfoForm(f => ({ ...f, email: e.target.value })); }}
              placeholder="vous@exemple.com"
            />
            <Input
              label="Numéro de téléphone (optionnel si email renseigné)"
              type="tel"
              autoComplete="tel"
              value={infoForm.phone}
              onChange={e => { setInfoOk(false); setInfoForm(f => ({ ...f, phone: e.target.value })); }}
              placeholder="77 123 45 67"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <Shield size={13} />
            <span>{roleLabel} — non modifiable</span>
          </div>

          {infoErr && (
            <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{infoErr}</p>
          )}
          {infoOk && (
            <p className="text-sm text-green-700 bg-green-50 rounded-control px-3 py-2 flex items-center gap-2">
              <Check size={15} /> Profil mis à jour avec succès.
            </p>
          )}

          <Button type="submit" disabled={infoSaving} className="w-full sm:w-auto">
            {infoSaving
              ? <><Loader2 size={18} className="animate-spin" /> Enregistrement…</>
              : <><Check size={18} /> Enregistrer</>
            }
          </Button>
        </form>
      </section>

      {/* ── Changer le mot de passe ── */}
      <section className="bg-surface rounded-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
          <KeyRound size={16} className="text-muted" />
          <h2 className="font-semibold text-sm text-ink">Changer le mot de passe</h2>
        </div>
        <form onSubmit={handlePwdSubmit} className="p-5 space-y-4">
          <Input
            label="Mot de passe actuel"
            type="password"
            required
            autoComplete="current-password"
            value={pwdForm.currentPassword}
            onChange={e => { setPwdOk(false); setPwdForm(f => ({ ...f, currentPassword: e.target.value })); }}
            placeholder="••••••••"
          />
          <Input
            label="Nouveau mot de passe"
            type="password"
            required
            autoComplete="new-password"
            value={pwdForm.newPassword}
            onChange={e => { setPwdOk(false); setPwdForm(f => ({ ...f, newPassword: e.target.value })); }}
            placeholder="8 caractères minimum"
          />
          <Input
            label="Confirmer le nouveau mot de passe"
            type="password"
            required
            autoComplete="new-password"
            value={pwdForm.confirm}
            onChange={e => { setPwdOk(false); setPwdForm(f => ({ ...f, confirm: e.target.value })); }}
            placeholder="••••••••"
          />

          {pwdErr && (
            <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{pwdErr}</p>
          )}
          {pwdOk && (
            <p className="text-sm text-green-700 bg-green-50 rounded-control px-3 py-2 flex items-center gap-2">
              <Check size={15} /> Mot de passe modifié avec succès.
            </p>
          )}

          <Button type="submit" disabled={pwdSaving} className="w-full sm:w-auto">
            {pwdSaving
              ? <><Loader2 size={18} className="animate-spin" /> Mise à jour…</>
              : <><Check size={18} /> Mettre à jour le mot de passe</>
            }
          </Button>
        </form>
      </section>

    </div>
  );
}
