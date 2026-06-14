import { useEffect, useRef, useState } from 'react';
import { Store, Coins, Upload, Check, Loader2, X } from 'lucide-react';
import { tenantApi } from '../services/tenantApi';
import { extractApiError } from '../lib/apiError';
import { useTenant } from '../contexts/TenantContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

const CURRENCY_OPTIONS = [
  { value: 'XOF', label: 'Franc CFA UEMOA (XOF)' },
  { value: 'XAF', label: 'Franc CFA CEMAC (XAF)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'Dollar US (USD)' },
  { value: 'GNF', label: 'Franc guinéen (GNF)' },
  { value: 'MAD', label: 'Dirham marocain (MAD)' },
  { value: 'MRU', label: 'Ouguiya mauritanien (MRU)' },
];

export default function ParametresCommercePage() {
  const { tenant, updateTenant } = useTenant();

  /* ── Formulaire infos ─────────────────────────────────── */
  const [infoForm,   setInfoForm]   = useState({ name: '', currency: 'XOF' });
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoErr,    setInfoErr]    = useState('');
  const [infoOk,     setInfoOk]     = useState(false);

  useEffect(() => {
    if (tenant) setInfoForm({ name: tenant.name, currency: tenant.currency });
  }, [tenant]);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoErr(''); setInfoOk(false); setInfoSaving(true);
    try {
      const updated = await tenantApi.update({
        name:     infoForm.name.trim(),
        currency: infoForm.currency,
      });
      updateTenant({ name: updated.name, currency: updated.currency });
      setInfoOk(true);
    } catch (err) {
      setInfoErr(extractApiError(err));
    } finally {
      setInfoSaving(false);
    }
  };

  /* ── Upload du logo ───────────────────────────────────── */
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const [preview,   setPreview]   = useState<string | null>(null);
  const [logoFile,  setLogoFile]  = useState<File | null>(null);
  const [logoSaving,setLogoSaving]= useState(false);
  const [logoErr,   setLogoErr]   = useState('');
  const [logoOk,    setLogoOk]    = useState(false);

  /* Révoquer l'URL objet pour éviter les fuites mémoire */
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setLogoErr('Seuls les formats PNG et JPEG sont acceptés.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoErr('Le fichier dépasse la limite de 2 Mo.');
      return;
    }
    setLogoErr(''); setLogoOk(false);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setLogoFile(file);
    e.target.value = '';
  };

  const cancelPreview = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setLogoFile(null);
    setLogoErr('');
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setLogoErr(''); setLogoOk(false); setLogoSaving(true);
    try {
      const updated = await tenantApi.uploadLogo(logoFile);
      updateTenant({ logoUrl: updated.logoUrl });
      setLogoOk(true);
      cancelPreview();
    } catch (err) {
      setLogoErr(extractApiError(err, 'Erreur lors de l\'envoi du logo.'));
    } finally {
      setLogoSaving(false);
    }
  };

  /* ── Rendu ────────────────────────────────────────────── */
  const logoSrc = preview ?? (tenant?.logoUrl
    ? `${import.meta.env.VITE_API_URL}${tenant.logoUrl}`
    : null);

  return (
    <div className="py-6 md:py-8 space-y-6">

      <h1 className="font-display text-2xl font-bold text-ink">Paramètres du commerce</h1>

      {/* ── Logo ── */}
      <section className="bg-surface rounded-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
          <Upload size={16} className="text-muted" />
          <h2 className="font-semibold text-sm text-ink">Logo du commerce</h2>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-start gap-5">
          {/* Aperçu */}
          <div className="shrink-0">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="Logo du commerce"
                className="w-24 h-24 rounded-card object-contain border border-line bg-canvas"
              />
            ) : (
              <div className="w-24 h-24 rounded-card bg-brand-50 border border-line flex items-center justify-center">
                <Store size={36} className="text-brand-300" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-1 space-y-3">
            <p className="text-xs text-muted">
              Format PNG ou JPEG · Taille maximale 2 Mo
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleFileChange}
            />

            {!logoFile ? (
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[40px] px-4 text-sm"
              >
                <Upload size={16} />
                {tenant?.logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleLogoUpload}
                  disabled={logoSaving}
                  className="min-h-[40px] px-4 text-sm"
                >
                  {logoSaving
                    ? <><Loader2 size={16} className="animate-spin" /> Envoi…</>
                    : <><Check size={16} /> Valider le logo</>
                  }
                </Button>
                <Button
                  variant="ghost"
                  onClick={cancelPreview}
                  disabled={logoSaving}
                  className="min-h-[40px] px-3 text-sm"
                >
                  <X size={16} /> Annuler
                </Button>
              </div>
            )}

            {logoErr && (
              <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{logoErr}</p>
            )}
            {logoOk && (
              <p className="text-sm text-green-700 bg-green-50 rounded-control px-3 py-2 flex items-center gap-2">
                <Check size={14} /> Logo mis à jour avec succès.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Informations du commerce ── */}
      <section className="bg-surface rounded-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
          <Store size={16} className="text-muted" />
          <h2 className="font-semibold text-sm text-ink">Informations du commerce</h2>
        </div>

        <form onSubmit={handleInfoSubmit} className="p-5 space-y-4">
          <Input
            label="Nom du commerce"
            required
            value={infoForm.name}
            onChange={e => { setInfoOk(false); setInfoForm(f => ({ ...f, name: e.target.value })); }}
            placeholder="Ma Boutique"
          />
          <Select
            label="Devise"
            options={CURRENCY_OPTIONS}
            value={infoForm.currency}
            onChange={e => { setInfoOk(false); setInfoForm(f => ({ ...f, currency: e.target.value })); }}
          />

          <div className="flex items-center gap-2 text-xs text-muted">
            <Coins size={13} />
            <span>La devise est utilisée pour l'affichage des prix dans toute l'application.</span>
          </div>

          {infoErr && (
            <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{infoErr}</p>
          )}
          {infoOk && (
            <p className="text-sm text-green-700 bg-green-50 rounded-control px-3 py-2 flex items-center gap-2">
              <Check size={14} /> Paramètres mis à jour. Le nom s'affiche maintenant dans la barre latérale.
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

    </div>
  );
}
