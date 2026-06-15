import { useEffect, useState, useCallback } from 'react';
import { Plus, Loader2, Check, X, Pencil, UserX, UserCheck } from 'lucide-react';
import { employeesApi } from '../services/employeesApi';
import { useBoutique } from '../contexts/BoutiqueContext';
import { extractApiError } from '../lib/apiError';
import type { Employee, CreateEmployeeDto, UpdateEmployeeDto } from '../types/employee';
import type { Boutique } from '../types/boutique';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

// ── Helpers ─────────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function identifier(emp: Employee) {
  return emp.email ?? emp.phone ?? '—';
}

// ── Boutique checkboxes ──────────────────────────────────────────────────────────

interface BoutiqueCheckboxesProps {
  boutiques: Boutique[];
  selected: Set<string>;
  onChange: (id: string, checked: boolean) => void;
}

function BoutiqueCheckboxes({ boutiques, selected, onChange }: BoutiqueCheckboxesProps) {
  if (boutiques.length === 0) {
    return <p className="text-sm text-muted">Aucune boutique disponible.</p>;
  }
  return (
    <div className="space-y-2">
      {boutiques.map(b => (
        <label key={b.id} className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={selected.has(b.id)}
            onChange={e => onChange(b.id, e.target.checked)}
            className="w-4 h-4 rounded accent-brand-500"
          />
          <span className="text-sm text-ink">{b.name}</span>
        </label>
      ))}
    </div>
  );
}

// ── Create employee modal ────────────────────────────────────────────────────────

interface CreateModalProps {
  boutiques: Boutique[];
  onSuccess: (emp: Employee) => void;
  onClose: () => void;
}

function CreateModal({ boutiques, onSuccess, onClose }: CreateModalProps) {
  const [fullName,  setFullName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState('');

  const toggleStore = (id: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setErr('Veuillez saisir un email ou un numéro de téléphone.');
      return;
    }
    if (password.length < 8) {
      setErr('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    setSaving(true); setErr('');

    const dto: CreateEmployeeDto = {
      fullName: fullName.trim(),
      email:    email.trim()    || null,
      phone:    phone.trim()    || null,
      password,
    };

    try {
      const emp = await employeesApi.create(dto);

      // Affecter aux boutiques sélectionnées en parallèle
      if (selected.size > 0) {
        await Promise.all([...selected].map(sid => employeesApi.addToStore(sid, emp.id)));
        onSuccess({ ...emp, storeIds: [...selected] });
      } else {
        onSuccess(emp);
      }
    } catch (e) {
      setErr(translateError(extractApiError(e)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nouvel employé" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nom complet"
          required
          autoFocus
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Prénom Nom"
        />

        <div className="space-y-3">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="employe@exemple.com"
          />
          <Input
            label="Téléphone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+223 XX XX XX XX"
          />
          <p className="text-xs text-muted -mt-1">Au moins un identifiant requis (email ou téléphone).</p>
        </div>

        <div className="relative">
          <Input
            label="Mot de passe initial"
            type={showPwd ? 'text' : 'password'}
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="8 caractères minimum"
          />
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            className="absolute right-3 top-9 text-xs text-muted hover:text-ink"
          >
            {showPwd ? 'Masquer' : 'Afficher'}
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-ink mb-2">
            Boutiques affectées <span className="text-muted text-xs font-normal">(optionnel)</span>
          </p>
          <BoutiqueCheckboxes boutiques={boutiques} selected={selected} onChange={toggleStore} />
        </div>

        {err && (
          <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            <X size={16} /> Annuler
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving
              ? <><Loader2 size={16} className="animate-spin" /> Création…</>
              : <><Check size={16} /> Créer</>
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit employee modal ──────────────────────────────────────────────────────────

interface EditModalProps {
  employee: Employee;
  boutiques: Boutique[];
  onSuccess: (emp: Employee) => void;
  onClose: () => void;
}

function EditModal({ employee, boutiques, onSuccess, onClose }: EditModalProps) {
  const [fullName, setFullName] = useState(employee.fullName);
  const [email,    setEmail]    = useState(employee.email ?? '');
  const [phone,    setPhone]    = useState(employee.phone ?? '');
  const [active,   setActive]   = useState(employee.active);
  const [selected, setSelected] = useState<Set<string>>(new Set(employee.storeIds));
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  const toggleStore = (id: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setErr('Veuillez saisir un email ou un numéro de téléphone.');
      return;
    }
    setSaving(true); setErr('');

    const dto: UpdateEmployeeDto = {
      fullName: fullName.trim(),
      email:    email.trim()    || null,
      phone:    phone.trim()    || null,
      active,
    };

    try {
      const updated = await employeesApi.update(employee.id, dto);

      // Sync boutique assignments (diff)
      const currentSet = new Set(employee.storeIds);
      const newSet = selected;
      const toAdd    = [...newSet].filter(id => !currentSet.has(id));
      const toRemove = [...currentSet].filter(id => !newSet.has(id));

      await Promise.all([
        ...toAdd.map(sid    => employeesApi.addToStore(sid, employee.id)),
        ...toRemove.map(sid => employeesApi.removeFromStore(sid, employee.id)),
      ]);

      onSuccess({ ...updated, storeIds: [...newSet] });
    } catch (e) {
      setErr(translateError(extractApiError(e)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Modifier l'employé" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nom complet"
          required
          autoFocus
          value={fullName}
          onChange={e => setFullName(e.target.value)}
        />

        <div className="space-y-3">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="employe@exemple.com"
          />
          <Input
            label="Téléphone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+223 XX XX XX XX"
          />
          <p className="text-xs text-muted -mt-1">Au moins un identifiant requis.</p>
        </div>

        {/* Statut actif / inactif */}
        <div className="flex items-center justify-between bg-canvas rounded-control px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink">Compte actif</p>
            <p className="text-xs text-muted mt-0.5">Un compte inactif ne peut plus se connecter.</p>
          </div>
          <button
            type="button"
            onClick={() => setActive(v => !v)}
            className={[
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
              'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1',
              active ? 'bg-brand-500' : 'bg-gray-300',
            ].join(' ')}
          >
            <span
              className={[
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0',
                'transition duration-200',
                active ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-ink mb-2">Boutiques affectées</p>
          <BoutiqueCheckboxes boutiques={boutiques} selected={selected} onChange={toggleStore} />
        </div>

        {err && (
          <p className="text-sm text-danger bg-red-50 rounded-control px-3 py-2">{err}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            <X size={16} /> Annuler
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving
              ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</>
              : <><Check size={16} /> Enregistrer</>
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Error translation ────────────────────────────────────────────────────────────

function translateError(msg: string): string {
  if (msg.toLowerCase().includes('email already in use'))
    return 'Cette adresse e-mail est déjà utilisée par un autre compte.';
  if (msg.toLowerCase().includes('phone already in use'))
    return 'Ce numéro de téléphone est déjà utilisé par un autre compte.';
  if (msg.toLowerCase().includes('already assigned'))
    return 'Cet employé est déjà affecté à cette boutique.';
  return msg;
}

// ── Employee card ────────────────────────────────────────────────────────────────

interface EmployeeCardProps {
  employee: Employee;
  boutiques: Boutique[];
  onEdit: () => void;
  onToggleActive: () => void;
  toggling: boolean;
}

function EmployeeCard({ employee, boutiques, onEdit, onToggleActive, toggling }: EmployeeCardProps) {
  const storeNames = employee.storeIds
    .map(id => boutiques.find(b => b.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <div className={[
      'bg-surface rounded-card shadow-card px-4 py-3 flex items-start gap-3',
      !employee.active ? 'opacity-60' : '',
    ].join(' ')}>
      {/* Avatar */}
      <div className={[
        'w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
        employee.active ? 'bg-brand-50 text-brand-500' : 'bg-gray-100 text-gray-400',
      ].join(' ')}>
        {initials(employee.fullName)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-ink text-sm">{employee.fullName}</p>
          {!employee.active && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">
              Inactif
            </span>
          )}
        </div>
        <p className="text-xs text-muted mt-0.5 truncate">{identifier(employee)}</p>
        {storeNames.length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {storeNames.map(name => (
              <span key={name} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-50 text-brand-500">
                {name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted mt-1 italic">Aucune boutique affectée</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-ink hover:bg-canvas transition-colors"
          title="Modifier"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onToggleActive}
          disabled={toggling}
          className={[
            'w-8 h-8 flex items-center justify-center rounded transition-colors',
            employee.active
              ? 'text-muted hover:text-danger hover:bg-red-50'
              : 'text-muted hover:text-green-600 hover:bg-green-50',
          ].join(' ')}
          title={employee.active ? 'Désactiver' : 'Réactiver'}
        >
          {toggling
            ? <Loader2 size={14} className="animate-spin" />
            : employee.active
              ? <UserX size={14} />
              : <UserCheck size={14} />
          }
        </button>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────────

export default function EmployesPage() {
  const { boutiques } = useBoutique();

  const [employees,    setEmployees]    = useState<Employee[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [apiErr,       setApiErr]       = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<Employee | null>(null);
  const [togglingId,   setTogglingId]   = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setApiErr('');
    employeesApi.list()
      .then(setEmployees)
      .catch(() => setApiErr('Impossible de charger les employés.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (emp: Employee) => {
    setShowCreate(false);
    setEmployees(prev => [emp, ...prev]);
  };

  const handleUpdated = (emp: Employee) => {
    setEditTarget(null);
    setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  };

  const handleToggleActive = async (emp: Employee) => {
    setTogglingId(emp.id);
    try {
      if (emp.active) {
        // Désactiver via DELETE (soft delete)
        await employeesApi.deactivate(emp.id);
        setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, active: false } : e));
      } else {
        // Réactiver via PUT avec active: true
        const updated = await employeesApi.update(emp.id, {
          fullName: emp.fullName,
          email:    emp.email,
          phone:    emp.phone,
          active:   true,
        });
        setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, ...updated } : e));
      }
    } catch {
      // silencieux — l'état ne change pas
    } finally {
      setTogglingId(null);
    }
  };

  const active   = employees.filter(e => e.active);
  const inactive = employees.filter(e => !e.active);

  return (
    <div className="py-6 md:py-8 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Employés</h1>
          {!loading && employees.length > 0 && (
            <p className="text-xs text-muted mt-0.5">
              {active.length} actif{active.length !== 1 ? 's' : ''}
              {inactive.length > 0 && ` · ${inactive.length} inactif${inactive.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus size={18} /> Nouvel employé
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      ) : apiErr ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <p className="text-sm text-danger">{apiErr}</p>
          <Button variant="secondary" onClick={load} className="min-h-[40px] px-4 text-sm">
            Réessayer
          </Button>
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center text-2xl select-none">
            👥
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Aucun employé pour l'instant</p>
            <p className="text-xs text-muted mt-1 max-w-xs leading-relaxed">
              Ajoutez des employés pour leur permettre d'accéder à l'application
              avec leur propre compte.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="mt-1">
            <Plus size={16} /> Ajouter un employé
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Actifs */}
          {active.length > 0 && (
            <div className="space-y-2">
              {inactive.length > 0 && (
                <p className="text-xs font-semibold text-muted uppercase tracking-wide px-1">Actifs</p>
              )}
              {active.map(emp => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  boutiques={boutiques}
                  onEdit={() => setEditTarget(emp)}
                  onToggleActive={() => handleToggleActive(emp)}
                  toggling={togglingId === emp.id}
                />
              ))}
            </div>
          )}

          {/* Inactifs */}
          {inactive.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide px-1">Inactifs</p>
              {inactive.map(emp => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  boutiques={boutiques}
                  onEdit={() => setEditTarget(emp)}
                  onToggleActive={() => handleToggleActive(emp)}
                  toggling={togglingId === emp.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateModal
          boutiques={boutiques}
          onSuccess={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editTarget && (
        <EditModal
          employee={editTarget}
          boutiques={boutiques}
          onSuccess={handleUpdated}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
