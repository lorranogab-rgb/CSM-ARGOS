/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, Search, Edit2, Trash2, CheckCircle2, XCircle, 
  ShieldCheck, ShieldAlert, Mail, MapPin, 
  UserCheck, RefreshCw, X, Save, AlertTriangle, 
  Eye, KeyRound, FileCheck2, Clock, Check, Ban,
  CheckSquare, Square
} from 'lucide-react';
import { 
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, 
  serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { SystemUser } from '../types';
import { toast } from 'sonner';
import {
  DEFAULT_SYSTEM_YARD_ADDRESSES,
  canonicalizeRegisteredYardAddress,
  normalizePatio
} from '../utils/patioPermissions';

interface UserManagementProps {
  isDark: boolean;
  currentUser: any;
  availableYards?: string[];
}

const MASTER_ADMIN_EMAILS = ['cbmpr.leilao@gmail.com', 'lorranogab@gmail.com'];

const DUMMY_USER_IDS = [
  'commim_busatto',
  'adriano_santos',
  'siloto_kutianski',
  'ZGmBqIGwDPcMmCpNyfUlJW27eUz1',
  'UPdepZw8QgZxrhwCWmpihxG9odx1',
  'qVw13GvoutWdvsmCeh8ZmThW1f13',
  'PSLQjM0L83TnsHw24lRuAfWeRA93'
];

const POSTO_GRAD_OPTIONS = [
  'Cel. QOBM',
  'Ten.-Cel. QOBM',
  'Maj. QOBM',
  'Cap. QOBM',
  '1º Ten. QOBM',
  '2º Ten. QOBM',
  'Subten. QOBM',
  '1º Sgt. QOBM',
  '2º Sgt. QOBM',
  '3º Sgt. QOBM',
  'Cb. QOBM',
  'Sd. QOBM',
  'Servidor Civil',
  'Técnico Mecânico',
  'Outro'
];

const LOTACOES_PADRAO = [
  'CSM - Curitiba (Centro de Suprimento e Manutenção)',
  '1º GB - Curitiba',
  '2º GB - Ponta Grossa',
  '3º GB - Londrina',
  '4º GB - Cascavel',
  '5º GB - Maringá',
  '6º GB - São José dos Pinhais',
  '7º GB - Curitiba',
  '8º GB - Paranaguá (Litoral)',
  '9º GB - Foz do Iguaçu',
  '10º SGBI - Francisco Beltrão',
  '11º SGBI - Pato Branco',
  '12º SGBI - Guarapuava',
  'Comando-Geral CBMPR'
];

export const UserManagement: React.FC<UserManagementProps> = ({ isDark, currentUser, availableYards = [] }) => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'vistoriador' | 'visualizador'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'inactive'>('all');
  const [patioFilter, setPatioFilter] = useState<string>('all');
  
  // Pending approval quick selection
  const [pendingRoles, setPendingRoles] = useState<Record<string, 'admin' | 'vistoriador' | 'visualizador'>>({});
  const [pendingPostos, setPendingPostos] = useState<Record<string, string>>({});
  const [pendingPatios, setPendingPatios] = useState<Record<string, string[]>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<SystemUser> | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Considera exclusivamente os endereços de pátio já cadastrados no sistema
  const allKnownPatios = useMemo(() => {
    const byNorm = new Map<string, string>();

    const addPatio = (raw?: string) => {
      const canonical = canonicalizeRegisteredYardAddress(raw);
      if (!canonical) return;
      const norm = normalizePatio(canonical);
      if (!norm) return;
      if (!byNorm.has(norm)) {
        byNorm.set(norm, canonical);
      }
    };

    // Pátios oficiais cadastrados no sistema (ex: CCT - Ponta Grossa e Patio Cachoeira - 6 BBM)
    DEFAULT_SYSTEM_YARD_ADDRESSES.forEach(addPatio);

    // Endereços de pátio reais extraídos da frota cadastrada
    availableYards.forEach(addPatio);

    return Array.from(byNorm.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [availableYards]);

  // Purge known mock users on mount and initialize master admins
  useEffect(() => {
    const purgeMockUsersAndInitAdmins = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        let purgedAny = false;

        for (const docSnap of snap.docs) {
          const docId = docSnap.id;
          const data = docSnap.data();
          const email = (data.email || '').trim().toLowerCase();

          // Purge dummy mock users
          if (DUMMY_USER_IDS.includes(docId) && !MASTER_ADMIN_EMAILS.includes(email)) {
            await deleteDoc(doc(db, 'users', docId)).catch(() => {});
            purgedAny = true;
          }
        }

        // Baselines dos administradores master (sempre acesso global a todos os pátios e usuários)
        const adminBaselines: SystemUser[] = [
          {
            id: 'cbmpr_leilao_admin',
            uid: 'cbmpr_leilao_admin',
            email: 'cbmpr.leilao@gmail.com',
            displayName: 'Administrador Master CBMPR',
            role: 'admin',
            status: 'active',
            cargo: 'Gestão Geral de Frotas e Leilões',
            postoGrad: 'Cap. QOBM',
            matricula: '6606552-9',
            lotacao: 'CSM - Curitiba (Centro de Suprimento e Manutenção)',
            allowedPatios: ['TODOS'],
            telefone: '(41) 3281-9000',
            createdAt: new Date().toISOString()
          },
          {
            id: 'lorranogab_admin',
            uid: 'lorranogab_admin',
            email: 'lorranogab@gmail.com',
            displayName: 'Lorrano Gabriel (Cb. Lorran Gabeiras)',
            role: 'admin',
            status: 'active',
            cargo: 'Engenheiro de Sistemas / Administrador Master',
            postoGrad: 'Cb. QOBM',
            matricula: '14123256-8',
            lotacao: 'CSM - Curitiba (Centro de Suprimento e Manutenção)',
            allowedPatios: ['TODOS'],
            createdAt: new Date().toISOString()
          }
        ];

        for (const adm of adminBaselines) {
          const emailLower = adm.email.toLowerCase();
          const matchingDocs = snap.docs.filter(d => {
            const dEmail = (d.data().email || '').toLowerCase();
            return dEmail === emailLower;
          });

          if (matchingDocs.length === 0) {
            await setDoc(doc(db, 'users', adm.id), adm, { merge: true }).catch(() => {});
          } else {
            for (const existingDoc of matchingDocs) {
              const existingData = existingDoc.data();
              const needsMasterUpgrade =
                existingData.role !== 'admin' ||
                existingData.status !== 'active' ||
                !Array.isArray(existingData.allowedPatios) ||
                !existingData.allowedPatios.includes('TODOS');
              if (needsMasterUpgrade) {
                await updateDoc(doc(db, 'users', existingDoc.id), {
                  role: 'admin',
                  status: 'active',
                  allowedPatios: ['TODOS'],
                  updatedAt: serverTimestamp()
                }).catch(() => {});
              }
            }
          }
        }

        if (purgedAny) {
          console.log('Operadores mock temporários foram purgados da base.');
        }
      } catch (err) {
        console.warn('Erro ao inicializar base de usuários:', err);
      }
    };

    purgeMockUsersAndInitAdmins();
  }, []);

  // Listen to users collection in Firestore in real-time
  useEffect(() => {
    const usersCollection = collection(db, 'users');

    const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
      const byEmail = new Map<string, SystemUser>();
      const noEmailList: SystemUser[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const email = (data.email || '').trim().toLowerCase();

        // Pula usuários mock conhecidos
        if (DUMMY_USER_IDS.includes(docSnap.id) && !MASTER_ADMIN_EMAILS.includes(email)) {
          return;
        }

        const isMaster = MASTER_ADMIN_EMAILS.includes(email);
        const parsedAllowedPatios = isMaster
          ? ['TODOS']
          : Array.isArray(data.allowedPatios)
            ? data.allowedPatios
            : [];

        const userObj: SystemUser = {
          id: docSnap.id,
          uid: data.uid || docSnap.id,
          email: email || data.email || '',
          displayName: data.displayName || data.email?.split('@')[0] || 'Operador',
          photoURL: data.photoURL,
          role: isMaster ? 'admin' : (data.role || 'visualizador'),
          status: isMaster ? 'active' : (data.status || 'pending'),
          cargo: data.cargo,
          postoGrad: data.postoGrad,
          matricula: data.matricula,
          telefone: data.telefone,
          lotacao: data.lotacao,
          allowedPatios: parsedAllowedPatios,
          inspectionsCount: data.inspectionsCount || 0,
          vehiclesCount: data.vehiclesCount || 0,
          samplePlacas: data.samplePlacas || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          lastLogin: data.lastLogin,
          requestedAt: data.requestedAt,
          approvedAt: data.approvedAt,
          approvedBy: data.approvedBy,
          rejectionReason: data.rejectionReason
        };

        if (!email) {
          noEmailList.push(userObj);
          return;
        }

        const existing = byEmail.get(email);
        if (!existing) {
          byEmail.set(email, userObj);
        } else {
          // Prefere documento autenticado por UID real em vez de placeholder pre-cadastrado (`user_...` ou `*_admin`)
          const existingIsPlaceholder = existing.id.startsWith('user_') || existing.id.endsWith('_admin');
          const currentIsPlaceholder = userObj.id.startsWith('user_') || userObj.id.endsWith('_admin');
          if (existingIsPlaceholder && !currentIsPlaceholder) {
            byEmail.set(email, userObj);
          }
        }
      });

      const fetched: SystemUser[] = [...Array.from(byEmail.values()), ...noEmailList];

      // Ordena: Pendentes primeiro, depois Administradores, depois ordem alfabética
      fetched.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });

      setUsers(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao escutar usuários:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Limpa todos os registros de usuários preservando estritamente os Administradores Master
  const handleCleanUserRecords = async () => {
    setCleaning(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      let deletedCount = 0;

      for (const d of snap.docs) {
        const data = d.data();
        const email = (data.email || '').trim().toLowerCase();

        // Preserva master admins com acesso global a todos os pátios e usuários
        if (MASTER_ADMIN_EMAILS.includes(email)) {
          await updateDoc(doc(db, 'users', d.id), {
            role: 'admin',
            status: 'active',
            allowedPatios: ['TODOS'],
            updatedAt: serverTimestamp()
          }).catch(() => {});
          continue;
        }

        // Exclui todos os demais registros
        await deleteDoc(doc(db, 'users', d.id));
        deletedCount++;
      }

      toast.success(`Limpeza concluída! ${deletedCount} usuários foram removidos. Administradores Master foram mantidos intactos.`);
      setIsCleanModalOpen(false);
    } catch (err) {
      console.error('Erro ao limpar base de usuários:', err);
      toast.error('Erro ao executar limpeza de usuários no Firebase.');
    } finally {
      setCleaning(false);
    }
  };

  // Alterna seleção de pátios cadastrados na aprovação rápida de pendentes (sem pré-seleção)
  const handleTogglePendingPatio = (userId: string, patioName: string) => {
    setPendingPatios((prev) => {
      const current = prev[userId] || [];
      if (patioName === 'TODOS') {
        return { ...prev, [userId]: current.includes('TODOS') ? [] : ['TODOS'] };
      }
      if (current.includes('TODOS')) {
        return { ...prev, [userId]: [patioName] };
      }
      const normTarget = normalizePatio(patioName);
      const exists = current.some((p) => normalizePatio(p) === normTarget);
      const next = exists
        ? current.filter((p) => normalizePatio(p) !== normTarget)
        : [...current, patioName];
      return { ...prev, [userId]: next };
    });
  };

  // Aprova solicitação pendente de usuário (Google ou E-mail/Senha)
  const handleApproveUser = async (userToApprove: SystemUser) => {
    const isMaster = MASTER_ADMIN_EMAILS.includes((userToApprove.email || '').trim().toLowerCase());
    const assignedRole = isMaster ? 'admin' : (pendingRoles[userToApprove.id] || userToApprove.role || 'visualizador');
    const assignedPosto = pendingPostos[userToApprove.id] || userToApprove.postoGrad || 'Sd. QOBM';
    const selectedPatios = isMaster ? ['TODOS'] : (pendingPatios[userToApprove.id] || []);

    if (!isMaster && selectedPatios.length === 0) {
      toast.error('Selecione manualmente pelo menos 1 endereço de pátio cadastrado ou "Todos os Pátios" antes de aprovar.');
      return;
    }

    setApprovingId(userToApprove.id);
    try {
      const allowedPatios = selectedPatios.includes('TODOS')
        ? ['TODOS']
        : selectedPatios.map((p) => canonicalizeRegisteredYardAddress(p) || p);
      const userRef = doc(db, 'users', userToApprove.id);

      await updateDoc(userRef, {
        status: 'active',
        role: assignedRole,
        postoGrad: assignedPosto,
        allowedPatios,
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser?.email || 'admin',
        cargo:
          assignedRole === 'admin'
            ? 'Administrador'
            : assignedRole === 'visualizador'
              ? 'Visualizador Autorizado'
              : 'Avaliador Técnico de Viaturas',
        updatedAt: serverTimestamp()
      });

      const patioLabel = allowedPatios.includes('TODOS') ? 'Todos os Pátios' : allowedPatios.join(', ');
      toast.success(`Acesso APROVADO para ${userToApprove.displayName || userToApprove.email}! Pátios: ${patioLabel}.`);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${userToApprove.id}`);
      toast.error('Erro ao aprovar acesso do usuário.');
    } finally {
      setApprovingId(null);
    }
  };

  // Recusa / remove solicitação de acesso
  const handleRejectUser = async (userToReject: SystemUser) => {
    const isMaster = MASTER_ADMIN_EMAILS.includes((userToReject.email || '').toLowerCase());
    if (isMaster) {
      toast.error('Administradores Master não podem ser excluídos ou rejeitados.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userToReject.id));
      toast.success(`Solicitação de ${userToReject.displayName || userToReject.email} foi recusada e removida.`);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `users/${userToReject.id}`);
      toast.error('Erro ao recusar solicitação de acesso.');
    }
  };

  // Filtra lista de usuários
  const filteredUsers = users.filter(u => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.matricula || '').toLowerCase().includes(q) ||
      (u.lotacao || '').toLowerCase().includes(q) ||
      (u.cargo || '').toLowerCase().includes(q) ||
      (u.allowedPatios || []).some(p => p.toLowerCase().includes(q)) ||
      (u.samplePlacas || []).some(p => p.toLowerCase().includes(q));
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    
    let matchesPatio = true;
    if (patioFilter !== 'all') {
      if (patioFilter === 'TODOS') {
        matchesPatio = !u.allowedPatios || u.allowedPatios.length === 0 || u.allowedPatios.includes('TODOS');
      } else {
        const normFilter = normalizePatio(patioFilter);
        matchesPatio = !!u.allowedPatios && u.allowedPatios.some(p => p === 'TODOS' || normalizePatio(p) === normFilter);
      }
    }

    return matchesSearch && matchesRole && matchesStatus && matchesPatio;
  });

  const pendingUsers = users.filter(u => u.status === 'pending');
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const vistoriadorCount = users.filter(u => u.role === 'vistoriador').length;
  const visualizadorCount = users.filter(u => u.role === 'visualizador').length;
  const activeCount = users.filter(u => u.status === 'active').length;
  const pendingCount = pendingUsers.length;
  const restrictedCount = users.filter(u => {
    const isMaster = MASTER_ADMIN_EMAILS.includes((u.email || '').trim().toLowerCase());
    if (isMaster) return false;
    return Array.isArray(u.allowedPatios) && !u.allowedPatios.includes('TODOS');
  }).length;

  const handleOpenCreateModal = () => {
    setIsNewUser(true);
    setEditingUser({
      displayName: '',
      email: '',
      role: 'visualizador',
      status: 'active',
      postoGrad: 'Sd. QOBM',
      cargo: 'Visualizador Autorizado',
      lotacao: 'CSM - Curitiba (Centro de Suprimento e Manutenção)',
      allowedPatios: [],
      matricula: '',
      telefone: ''
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (u: SystemUser) => {
    const isMaster = MASTER_ADMIN_EMAILS.includes((u.email || '').trim().toLowerCase());
    setIsNewUser(false);
    setEditingUser({ 
      ...u,
      role: isMaster ? 'admin' : u.role,
      status: isMaster ? 'active' : u.status,
      allowedPatios: isMaster
        ? ['TODOS']
        : Array.isArray(u.allowedPatios)
          ? [...u.allowedPatios]
          : ['TODOS']
    });
    setIsEditModalOpen(true);
  };

  const handleQuickChangeRole = async (userToUpdate: SystemUser, newRole: 'admin' | 'vistoriador' | 'visualizador') => {
    const isMaster = MASTER_ADMIN_EMAILS.includes((userToUpdate.email || '').trim().toLowerCase());
    if (isMaster) {
      toast.error('A categoria do Administrador Master não pode ser alterada.');
      return;
    }

    if (userToUpdate.role === newRole) return;

    const defaultCargo =
      newRole === 'admin'
        ? 'Administrador'
        : newRole === 'visualizador'
          ? 'Visualizador Autorizado'
          : 'Avaliador Técnico de Viaturas';

    try {
      await updateDoc(doc(db, 'users', userToUpdate.id), {
        role: newRole,
        cargo: defaultCargo,
        updatedAt: serverTimestamp()
      });
      toast.success(`Categoria de ${userToUpdate.displayName || userToUpdate.email} atualizada para ${newRole === 'admin' ? 'Administrador' : newRole === 'visualizador' ? 'Visualizador' : 'Vistoriador'}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userToUpdate.id}`);
      toast.error('Erro ao atualizar categoria do usuário.');
    }
  };

  const handleToggleStatus = async (userToToggle: SystemUser) => {
    const isMaster = MASTER_ADMIN_EMAILS.includes((userToToggle.email || '').toLowerCase());
    if (isMaster && userToToggle.status === 'active') {
      toast.error('Os Administradores Master não podem ser desativados.');
      return;
    }

    const nextStatus = userToToggle.status === 'active' ? 'inactive' : 'active';

    try {
      const userRef = doc(db, 'users', userToToggle.id);
      await updateDoc(userRef, { 
        status: nextStatus,
        updatedAt: serverTimestamp() 
      });
      toast.success(`Usuário ${userToToggle.displayName || userToToggle.email} agora está ${nextStatus === 'active' ? 'Ativo' : 'Inativo'}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userToToggle.id}`);
      toast.error('Erro ao atualizar status do usuário.');
    }
  };

  const handleTogglePatioInEdit = (patioName: string) => {
    if (!editingUser) return;
    const isMaster = MASTER_ADMIN_EMAILS.includes((editingUser.email || '').trim().toLowerCase());
    if (isMaster) {
      setEditingUser({ ...editingUser, allowedPatios: ['TODOS'] });
      return;
    }

    const current = editingUser.allowedPatios || [];
    
    if (patioName === 'TODOS') {
      setEditingUser({ ...editingUser, allowedPatios: ['TODOS'] });
      return;
    }

    // Se estava 'TODOS', desmarca 'TODOS' e inclui apenas o patioName selecionado
    if (current.includes('TODOS')) {
      setEditingUser({ ...editingUser, allowedPatios: [patioName] });
      return;
    }

    // Alterna inclusão do pátio usando comparação normalizada
    const normTarget = normalizePatio(patioName);
    const exists = current.some(p => normalizePatio(p) === normTarget);
    if (exists) {
      const next = current.filter(p => normalizePatio(p) !== normTarget);
      setEditingUser({ ...editingUser, allowedPatios: next });
    } else {
      setEditingUser({ ...editingUser, allowedPatios: [...current, patioName] });
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.email || !editingUser?.email.includes('@')) {
      toast.error('Informe um e-mail válido.');
      return;
    }

    const cleanEmail = editingUser.email.trim().toLowerCase();
    const isMaster = MASTER_ADMIN_EMAILS.includes(cleanEmail);
    const currentPatios = editingUser.allowedPatios || [];

    if (!isMaster && currentPatios.length === 0) {
      toast.error('Selecione pelo menos 1 endereço de pátio cadastrado ou "Todos os Pátios (Acesso Global)".');
      return;
    }

    setSaving(true);
    try {
      const docId = isNewUser 
        ? `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`
        : (editingUser.id || `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`);

      const allowedPatios = isMaster || currentPatios.includes('TODOS')
        ? ['TODOS']
        : Array.from(new Set(currentPatios.map((p) => canonicalizeRegisteredYardAddress(p) || p)));

      const assignedRole = isMaster ? 'admin' : (editingUser.role || 'vistoriador');

      const payload: SystemUser = {
        id: docId,
        uid: editingUser.uid || docId,
        email: cleanEmail,
        displayName: editingUser.displayName?.trim() || cleanEmail.split('@')[0],
        photoURL: editingUser.photoURL || '',
        role: assignedRole,
        status: isMaster ? 'active' : (editingUser.status || 'active'),
        cargo:
          editingUser.cargo?.trim() ||
          (assignedRole === 'admin'
            ? 'Administrador'
            : assignedRole === 'visualizador'
              ? 'Visualizador Autorizado'
              : 'Avaliador Técnico de Viaturas'),
        postoGrad: editingUser.postoGrad || 'Outro',
        matricula: editingUser.matricula?.trim() || '',
        telefone: editingUser.telefone?.trim() || '',
        lotacao: editingUser.lotacao || LOTACOES_PADRAO[0],
        allowedPatios,
        inspectionsCount: editingUser.inspectionsCount || 0,
        vehiclesCount: editingUser.vehiclesCount || 0,
        samplePlacas: editingUser.samplePlacas || [],
        updatedAt: new Date().toISOString(),
        ...(isNewUser ? { createdAt: new Date().toISOString() } : {})
      };

      await setDoc(doc(db, 'users', docId), payload, { merge: true });

      toast.success(isNewUser ? 'Novo usuário cadastrado com sucesso!' : 'Usuário atualizado com sucesso!');
      setIsEditModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, isNewUser ? OperationType.CREATE : OperationType.UPDATE, 'users');
      toast.error('Erro ao salvar usuário no banco de dados.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    const isMaster = MASTER_ADMIN_EMAILS.includes((email || '').toLowerCase());
    if (isMaster) {
      toast.error('Usuários administradores master protegidos não podem ser excluídos.');
      setDeletingId(null);
      return;
    }

    if (currentUser?.email?.toLowerCase() === email.toLowerCase()) {
      toast.error('Você não pode excluir sua própria conta enquanto estiver conectado.');
      setDeletingId(null);
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', id));
      toast.success(`Usuário ${email} excluído do sistema.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
      toast.error('Erro ao excluir usuário.');
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <ShieldCheck size={14} className="text-purple-500" />
            Administrador
          </span>
        );
      case 'vistoriador':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <UserCheck size={14} className="text-blue-500" />
            Vistoriador / Avaliador
          </span>
        );
      case 'visualizador':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Eye size={14} className="text-slate-500" />
            Visualizador
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
          <Clock size={12} className="text-amber-500" />
          Aguardando Aprovação
        </span>
      );
    }
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={12} className="text-emerald-500" />
          Ativo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
        <XCircle size={12} className="text-red-500" />
        Inativo
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2.5 rounded-2xl ${isDark ? 'bg-purple-900/30 text-purple-400 border border-purple-800' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
              <Users size={28} />
            </div>
            <div>
              <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Gestão e Autorização de Usuários
              </h1>
              <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Controle de papéis, permissões de pátios autorizados e aprovação de novos operadores Google no CSM:ARGOS
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
              <ShieldAlert size={14} className="text-amber-500" />
              Administradores Master: <strong className="text-amber-600 dark:text-amber-400 font-mono">cbmpr.leilao@gmail.com</strong> e <strong className="text-amber-600 dark:text-amber-400 font-mono">lorranogab@gmail.com</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* BOTÃO LIMPAR REGISTROS */}
          <button
            onClick={() => setIsCleanModalOpen(true)}
            disabled={cleaning}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-xs border transition-all cursor-pointer ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 shadow-sm'} active:scale-95`}
            title="Limpar todos os registros de usuários e manter apenas os Administradores Master"
          >
            <Trash2 size={16} />
            Limpar Registros de Usuários
          </button>

          {/* BOTÃO NOVO USUÁRIO */}
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs bg-[#003B95] hover:bg-blue-800 text-white shadow-lg shadow-blue-900/20 active:scale-95 transition-all cursor-pointer"
          >
            <UserPlus size={18} />
            Cadastrar Novo Usuário
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total Usuários</span>
            <Users size={16} className="text-blue-500" />
          </div>
          <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalUsers}</p>
          <span className="text-[11px] font-bold text-emerald-500">{activeCount} ativos</span>
        </div>

        {/* PENDENTES DE AUTORIZAÇÃO */}
        <div className={`p-4 rounded-2xl border transition-all ${pendingCount > 0 ? (isDark ? 'bg-amber-950/20 border-amber-500/40 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900') : (isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-gray-200')} shadow-sm`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider">Pendentes</span>
            <Clock size={16} className={pendingCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'} />
          </div>
          <p className={`text-2xl font-black ${pendingCount > 0 ? 'text-amber-500' : (isDark ? 'text-white' : 'text-gray-900')}`}>{pendingCount}</p>
          <span className={`text-[11px] font-bold ${pendingCount > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-slate-400'}`}>
            {pendingCount === 1 ? '1 aguardando' : `${pendingCount} aguardando`}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Admins</span>
            <ShieldCheck size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{adminCount}</p>
          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Gestão</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Vistoriadores</span>
            <UserCheck size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{vistoriadorCount}</p>
          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Campo & Laudos</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Visualizadores</span>
            <Eye size={16} className="text-slate-500" />
          </div>
          <p className={`text-2xl font-black ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{visualizadorCount}</p>
          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Somente Consulta</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Pátio Restrito</span>
            <MapPin size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{restrictedCount}</p>
          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{allKnownPatios.length} pátios ativos</span>
        </div>
      </div>

      {/* SEÇÃO DESTACADA: SOLICITAÇÕES PENDENTES DE AUTORIZAÇÃO */}
      {pendingUsers.length > 0 && (
        <div className={`mb-8 p-6 rounded-3xl border shadow-lg ${isDark ? 'bg-amber-950/15 border-amber-500/30' : 'bg-amber-50/80 border-amber-300'}`}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black animate-pulse">
                <Clock size={22} />
              </div>
              <div>
                <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Solicitações de Acesso Pendentes ({pendingUsers.length})
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  Categorize o operador e selecione os <strong>Endereços de Pátio Cadastrados</strong> autorizados antes de aprovar:
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow">
              Ação Necessária
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingUsers.map((pending) => {
              const currentRole = pendingRoles[pending.id] || pending.role || 'visualizador';
              const currentPosto = pendingPostos[pending.id] || pending.postoGrad || 'Sd. QOBM';
              const currentPatios = pendingPatios[pending.id] || [];
              const isApproving = approvingId === pending.id;
              const hasSelectedPatio = currentPatios.length > 0;

              return (
                <div 
                  key={pending.id} 
                  className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900 border-amber-500/30 text-white' : 'bg-white border-amber-200 text-gray-900'} shadow`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {pending.photoURL ? (
                      <img 
                        src={pending.photoURL} 
                        alt={pending.displayName} 
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover border border-amber-500/30 shadow"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-lg flex items-center justify-center shadow">
                        {(pending.displayName || pending.email || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm truncate">{pending.displayName || pending.email?.split('@')[0] || 'Novo Usuário'}</h4>
                      <p className="text-xs opacity-75 truncate font-mono">{pending.email}</p>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                        Solicitado em: {pending.requestedAt ? new Date(pending.requestedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Recente'}
                      </p>
                    </div>
                  </div>

                  {/* Seletores de Categoria e Posto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider mb-1 opacity-70">
                        Categoria:
                      </label>
                      <select
                        value={currentRole}
                        onChange={(e) => setPendingRoles(prev => ({ ...prev, [pending.id]: e.target.value as any }))}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold outline-none cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                      >
                        <option value="visualizador">Visualizador (Consulta)</option>
                        <option value="vistoriador">Vistoriador / Avaliador</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider mb-1 opacity-70">
                        Posto / Graduação:
                      </label>
                      <select
                        value={currentPosto}
                        onChange={(e) => setPendingPostos(prev => ({ ...prev, [pending.id]: e.target.value }))}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium outline-none cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                      >
                        {POSTO_GRAD_OPTIONS.map(pg => (
                          <option key={pg} value={pg}>{pg}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Seleção Manual Obrigatória de Endereços de Pátio Cadastrados */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-wider opacity-70">
                        Pátios que o usuário poderá visualizar (Obrigatório):
                      </label>
                      {!hasSelectedPatio && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          Seleção manual pendente
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {allKnownPatios.map(p => {
                        const selected = !currentPatios.includes('TODOS') && currentPatios.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleTogglePendingPatio(pending.id, p)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                              selected
                                ? 'bg-amber-500 border-amber-600 text-slate-950 font-black shadow-sm'
                                : isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-gray-50 border-gray-200 text-gray-700'
                            }`}
                          >
                            {selected && <Check size={11} className="stroke-[3]" />}
                            {p}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => handleTogglePendingPatio(pending.id, 'TODOS')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all border cursor-pointer ${
                          currentPatios.includes('TODOS')
                            ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                            : isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        Todos os Pátios
                      </button>
                    </div>
                  </div>

                  {/* Botões de Ação Imediata */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveUser(pending)}
                      disabled={isApproving || !hasSelectedPatio}
                      title={!hasSelectedPatio ? 'Selecione pelo menos 1 pátio acima antes de aprovar' : 'Aprovar acesso com os pátios selecionados'}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold uppercase tracking-wider text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <Check size={16} />
                      {isApproving ? 'Aprovando...' : !hasSelectedPatio ? 'Selecione o(s) Pátio(s)' : 'Aprovar Acesso'}
                    </button>

                    <button
                      onClick={() => handleRejectUser(pending)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold uppercase tracking-wider text-xs border transition-all cursor-pointer ${isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                      title="Recusar e remover solicitação"
                    >
                      <Ban size={15} />
                      Recusar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className={`p-4 rounded-2xl border mb-6 flex flex-col md:flex-row gap-4 justify-between items-center ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, RG, pátio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Patio Filter */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Pátio:</span>
            <select
              value={patioFilter}
              onChange={(e) => setPatioFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
            >
              <option value="all">Todos os Pátios</option>
              <option value="TODOS">Acesso Global (Todos os Pátios)</option>
              {allKnownPatios.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Papel:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
            >
              <option value="all">Todos os Papéis</option>
              <option value="admin">Administrador</option>
              <option value="vistoriador">Vistoriador</option>
              <option value="visualizador">Visualizador</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Aguardando Aprovação ({pendingCount})</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* USER LIST / TABLE */}
      {loading ? (
        <div className={`p-12 text-center rounded-3xl border ${isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-gray-200 text-gray-500'}`}>
          <RefreshCw className="animate-spin mx-auto mb-3 text-blue-500" size={32} />
          <p className="font-bold text-sm">Carregando operadores do sistema...</p>
        </div>
      ) : (
        <div className={`rounded-3xl border overflow-hidden shadow-sm ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-gray-200'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  <th className="py-4 px-6">Usuário / Operador</th>
                  <th className="py-4 px-6">Papel no Sistema</th>
                  <th className="py-4 px-6">Pátios Autorizados</th>
                  <th className="py-4 px-6">Lotação Funcional</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-sm">
                {filteredUsers.map((u) => {
                  const isMasterAdmin = MASTER_ADMIN_EMAILS.includes((u.email || '').toLowerCase());
                  const isCurrent = currentUser?.email?.toLowerCase() === u.email?.toLowerCase();
                  const totalLaudos = u.inspectionsCount || 0;
                  const isPending = u.status === 'pending';
                  const isAllPatios = !u.allowedPatios || u.allowedPatios.length === 0 || u.allowedPatios.includes('TODOS');

                  return (
                    <tr 
                      key={u.id}
                      className={`transition-colors hover:${isDark ? 'bg-slate-800/30' : 'bg-blue-50/30'} ${isPending ? (isDark ? 'bg-amber-950/10' : 'bg-amber-50/40') : ''}`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img 
                              src={u.photoURL} 
                              alt={u.displayName} 
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md ${u.role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : (isPending ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600')}`}>
                              {(u.displayName || u.email || '?')[0].toUpperCase()}
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {u.displayName || 'Sem Nome'}
                              </span>
                              {isMasterAdmin && (
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                  Master
                                </span>
                              )}
                              {isCurrent && (
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-500 border border-blue-500/30">
                                  Você
                                </span>
                              )}
                              {isPending && (
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse">
                                  Novo
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs opacity-75">
                              <span className="flex items-center gap-1 font-mono">
                                <Mail size={12} /> {u.email}
                              </span>
                              {u.postoGrad && (
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  {u.postoGrad}
                                </span>
                              )}
                              {u.matricula && (
                                <span>RG: {u.matricula}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="space-y-1.5">
                          {getRoleBadge(u.role)}
                          {!isMasterAdmin && (
                            <div>
                              <select
                                aria-label={`Categorizar ${u.displayName || u.email}`}
                                value={u.role}
                                onChange={(e) => handleQuickChangeRole(u, e.target.value as 'admin' | 'vistoriador' | 'visualizador')}
                                className={`text-[11px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                              >
                                <option value="admin">Administrador</option>
                                <option value="vistoriador">Vistoriador</option>
                                <option value="visualizador">Visualizador</option>
                              </select>
                            </div>
                          )}
                          {u.cargo && (
                            <p className={`text-[11px] font-medium truncate max-w-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              {u.cargo}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* PÁTIOS AUTORIZADOS */}
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                          {isAllPatios ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              <MapPin size={12} className="text-purple-500" />
                              Todos os Pátios (Acesso Global)
                            </span>
                          ) : (
                            u.allowedPatios!.map((patio) => (
                              <span 
                                key={patio}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-sm"
                              >
                                <MapPin size={12} className="text-amber-500" />
                                {patio}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            {u.lotacao || 'Não definida'}
                          </span>
                          {totalLaudos > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                              <FileCheck2 size={13} />
                              {totalLaudos} {totalLaudos === 1 ? 'laudo emitido' : 'laudos emitidos'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <button
                          onClick={() => !isPending && handleToggleStatus(u)}
                          title={isPending ? 'Aguardando aprovação de administrador' : 'Clique para alternar status'}
                          className={isPending ? 'cursor-default' : 'cursor-pointer hover:opacity-80 transition-opacity'}
                        >
                          {getStatusBadge(u.status)}
                        </button>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <button
                              onClick={() => handleApproveUser(u)}
                              className="px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1 cursor-pointer"
                              title="Aprovar Acesso deste Operador"
                            >
                              <Check size={14} />
                              Aprovar
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700' : 'bg-gray-50 border-gray-200 text-blue-600 hover:bg-blue-50'}`}
                            title="Editar Dados e Pátios Autorizados"
                          >
                            <Edit2 size={16} />
                          </button>

                          {!isMasterAdmin && !isCurrent && (
                            <button
                              onClick={() => setDeletingId(u.id)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100'}`}
                              title="Excluir Usuário"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-12 text-center opacity-60">
              <Users className="mx-auto mb-3 opacity-40" size={40} />
              <p className="font-bold">Nenhum operador encontrado com os filtros selecionados.</p>
            </div>
          )}
        </div>
      )}

      {/* CONFIRM CLEAN MODAL */}
      {isCleanModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border p-6 md:p-8 shadow-2xl text-center ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Trash2 size={32} />
            </div>

            <h3 className="text-xl font-black mb-2">Limpar Registros de Usuários?</h3>
            <p className="text-sm opacity-80 mb-6">
              Esta ação removerá todos os usuários e dados mock da base de dados, mantendo estritamente os Administradores Master:
              <br />
              <strong className="text-amber-600 dark:text-amber-400 font-mono text-xs block mt-2">
                cbmpr.leilao@gmail.com
              </strong>
              <strong className="text-amber-600 dark:text-amber-400 font-mono text-xs block">
                lorranogab@gmail.com
              </strong>
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsCleanModalOpen(false)}
                disabled={cleaning}
                className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-wider text-xs border transition-all cursor-pointer ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-100'}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCleanUserRecords}
                disabled={cleaning}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase tracking-wider text-xs bg-red-600 hover:bg-red-700 text-white active:scale-95 transition-all shadow-lg shadow-red-600/20 cursor-pointer disabled:opacity-50"
              >
                {cleaning ? 'Limpando Base...' : 'Confirmar Limpeza'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / CREATE MODAL */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-3xl border p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[92vh] ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                  {isNewUser ? <UserPlus size={22} /> : <Edit2 size={22} />}
                </div>
                <div>
                  <h3 className="text-xl font-black">
                    {isNewUser ? 'Cadastrar Novo Usuário' : 'Editar Usuário / Avaliador'}
                  </h3>
                  <p className="text-xs opacity-70">
                    Defina permissões de pátios, papel de acesso e dados cadastrais no CSM:ARGOS
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome Completo */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.displayName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                    placeholder="Ex: Sd. QPBM João da Silva / Cb. Lorran Oliveira Gabeiras"
                    className={`w-full px-4 py-2.5 rounded-xl border font-medium text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900'}`}
                  />
                </div>

                {/* E-mail */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    E-mail Institucional / Google *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!isNewUser && MASTER_ADMIN_EMAILS.includes(editingUser.email?.toLowerCase() || '')}
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    placeholder="exemplo@gmail.com ou @cbm.pr.gov.br"
                    className={`w-full px-4 py-2.5 rounded-xl border font-medium text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-white disabled:opacity-50' : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900 disabled:opacity-50'}`}
                  />
                  {!isNewUser && MASTER_ADMIN_EMAILS.includes(editingUser.email?.toLowerCase() || '') && (
                    <p className="text-[11px] text-amber-500 font-semibold mt-1">E-mail do administrador master não pode ser alterado.</p>
                  )}
                </div>

                {/* Papel / Permissão */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Papel de Acesso *
                  </label>
                  <select
                    disabled={MASTER_ADMIN_EMAILS.includes(editingUser.email?.toLowerCase() || '')}
                    value={editingUser.role || 'vistoriador'}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className={`w-full px-4 py-2.5 rounded-xl border font-bold text-sm outline-none cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900'}`}
                  >
                    <option value="admin">Administrador (Gestão de Usuários & Frotas)</option>
                    <option value="vistoriador">Vistoriador / Avaliador (Laudos & Frotas)</option>
                    <option value="visualizador">Visualizador (Somente Consulta)</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Status da Conta *
                  </label>
                  <select
                    disabled={MASTER_ADMIN_EMAILS.includes(editingUser.email?.toLowerCase() || '')}
                    value={editingUser.status || 'active'}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                    className={`w-full px-4 py-2.5 rounded-xl border font-bold text-sm outline-none cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900'}`}
                  >
                    <option value="active">Ativo (Permitir Acesso)</option>
                    <option value="pending">Aguardando Aprovação (Pendente)</option>
                    <option value="inactive">Inativo (Bloquear Acesso)</option>
                  </select>
                </div>

                {/* Posto / Graduação */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Posto / Graduação
                  </label>
                  <select
                    value={editingUser.postoGrad || 'Outro'}
                    onChange={(e) => setEditingUser({ ...editingUser, postoGrad: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border font-medium text-sm outline-none cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900'}`}
                  >
                    {POSTO_GRAD_OPTIONS.map((pg) => (
                      <option key={pg} value={pg}>{pg}</option>
                    ))}
                  </select>
                </div>

                {/* Matrícula / RG Militar */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Matrícula / RG Militar
                  </label>
                  <input
                    type="text"
                    value={editingUser.matricula || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, matricula: e.target.value })}
                    placeholder="Ex: 8.403.297-2 / 14.123.256-8"
                    className={`w-full px-4 py-2.5 rounded-xl border font-medium text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900'}`}
                  />
                </div>

                {/* Cargo / Função */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Cargo / Função
                  </label>
                  <input
                    type="text"
                    value={editingUser.cargo || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, cargo: e.target.value })}
                    placeholder="Ex: Membro Avaliador Técnico / Vistoriador Regional"
                    className={`w-full px-4 py-2.5 rounded-xl border font-medium text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900'}`}
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Telefone / Contato
                  </label>
                  <input
                    type="text"
                    value={editingUser.telefone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, telefone: e.target.value })}
                    placeholder="Ex: (41) 99999-9999"
                    className={`w-full px-4 py-2.5 rounded-xl border font-medium text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900'}`}
                  />
                </div>

                {/* Lotação / Unidade */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Unidade de Lotação Principal
                  </label>
                  <select
                    value={editingUser.lotacao || LOTACOES_PADRAO[0]}
                    onChange={(e) => setEditingUser({ ...editingUser, lotacao: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border font-medium text-sm outline-none cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900'}`}
                  >
                    {LOTACOES_PADRAO.map((lot) => (
                      <option key={lot} value={lot}>{lot}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SEÇÃO: CONTROLE DE PÁTIOS AUTORIZADOS */}
              {(() => {
                const isEditingMaster = MASTER_ADMIN_EMAILS.includes((editingUser.email || '').trim().toLowerCase());
                const selectedPatios = editingUser.allowedPatios || [];
                const legacyPatios = selectedPatios.filter(
                  p => p !== 'TODOS' && !allKnownPatios.some(k => normalizePatio(k) === normalizePatio(p))
                );

                return (
                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-amber-500" />
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-wider">
                            Pátios Autorizados (Acesso Geográfico)
                          </h4>
                          <p className="text-xs opacity-70">
                            {isEditingMaster
                              ? 'Administradores Master possuem acesso irrestrito a todos os pátios e usuários do sistema.'
                              : 'Selecione apenas endereços de pátio já cadastrados no sistema. Veículos e laudos de outros pátios ficam ocultos.'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isEditingMaster}
                        onClick={() => handleTogglePatioInEdit('TODOS')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                          isEditingMaster ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'
                        } ${
                          selectedPatios.includes('TODOS')
                            ? 'bg-purple-600 border-purple-500 text-white shadow'
                            : isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {selectedPatios.includes('TODOS') ? <CheckSquare size={14} /> : <Square size={14} />}
                        Todos os Pátios (Acesso Global)
                      </button>
                    </div>

                    {/* Seleção de Pátios Cadastrados */}
                    {!isEditingMaster && (
                      <div className="mt-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider mb-2 opacity-80">
                          Endereços de pátio cadastrados no sistema ({allKnownPatios.length}):
                        </p>

                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                          {allKnownPatios.map((patio) => {
                            const isSelected = !selectedPatios.includes('TODOS') && selectedPatios.some(p => normalizePatio(p) === normalizePatio(patio));
                            return (
                              <button
                                key={patio}
                                type="button"
                                onClick={() => handleTogglePatioInEdit(patio)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500 border-amber-600 text-slate-950 font-black shadow-md'
                                    : isDark
                                      ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {isSelected && <Check size={13} className="stroke-[3]" />}
                                {patio}
                              </button>
                            );
                          })}
                        </div>

                        {legacyPatios.length > 0 && (
                          <div className="mt-3 pt-3 border-t dark:border-slate-800">
                            <p className="text-[11px] font-bold text-red-500 mb-1.5">
                              Endereços antigos não cadastrados (clique para remover):
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {legacyPatios.map((lp) => (
                                <button
                                  key={lp}
                                  type="button"
                                  onClick={() => handleTogglePatioInEdit(lp)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-500/15 text-red-500 border border-red-500/30 flex items-center gap-1 cursor-pointer hover:bg-red-500/25"
                                >
                                  <X size={12} />
                                  {lp}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Resumo da Permissão */}
                    <div className="mt-3 text-xs flex flex-wrap items-center gap-2">
                      <span className="font-bold opacity-75">Configuração Atual:</span>
                      {selectedPatios.includes('TODOS') ? (
                        <span className="px-2 py-0.5 rounded font-black text-[11px] bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          Acesso Total a Todos os Pátios Cadastrados
                        </span>
                      ) : selectedPatios.length === 0 ? (
                        <span className="px-2 py-0.5 rounded font-black text-[11px] bg-red-500/20 text-red-500 border border-red-500/30">
                          Nenhum pátio selecionado (selecione pelo menos 1 ou Acesso Global)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-black text-[11px] bg-amber-500/20 text-amber-500 border border-amber-500/30">
                          {selectedPatios.length} pátio(s) autorizado(s): {selectedPatios.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Informações explicativas de permissões */}
              <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-blue-50/50 border-blue-100 text-blue-900'}`}>
                <p className="font-bold flex items-center gap-1.5">
                  <KeyRound size={14} className="text-blue-500" />
                  Níveis de Acesso e Regras Territoriais:
                </p>
                <ul className="list-disc list-inside space-y-1 opacity-80 pl-1">
                  <li><strong>Restrição por Pátio:</strong> O usuário só terá visibilidade de veículos, laudos e estatísticas de seus pátios autorizados.</li>
                  <li><strong>Adições e Exclusões:</strong> Não será permitido emitir vistorias ou excluir itens que pertençam a pátios não autorizados.</li>
                  <li><strong>Administrador:</strong> Gestão de operadores, aprovação de cadastros e parametrização do sistema.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs border transition-all cursor-pointer ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs bg-[#003B95] hover:bg-blue-800 text-white shadow-lg shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {deletingId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl text-center ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle size={28} />
            </div>
            <h4 className="text-xl font-black mb-2">Excluir Usuário?</h4>
            <p className="text-sm opacity-70 mb-6">
              Esta ação removerá o cadastro do usuário do banco de dados. O operador não terá mais acesso às funções do sistema.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className={`flex-1 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs border cursor-pointer ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-100'}`}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const targetUser = users.find(u => u.id === deletingId);
                  if (targetUser) {
                    handleDeleteUser(targetUser.id, targetUser.email);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs bg-red-600 hover:bg-red-700 text-white active:scale-95 transition-all shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
