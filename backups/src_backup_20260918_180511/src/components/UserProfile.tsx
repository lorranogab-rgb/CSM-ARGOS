import React, { useState } from 'react';
import { User, Key, Mail, Camera, Save, AlertCircle, CheckCircle, Unlock } from 'lucide-react';
import { auth } from '../lib/firebase';
import { updateProfile, updatePassword, User as FirebaseUser, EmailAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

interface UserProfileProps {
  isDark: boolean;
  user: FirebaseUser | null;
}

export const UserProfile: React.FC<UserProfileProps> = ({ isDark, user }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  
  const [loading, setLoading] = useState(false);
  const [requiresRecentLogin, setRequiresRecentLogin] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isPasswordProvider = user?.providerData.some((p) => p.providerId === 'password');

  const handleReauthenticate = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setMessage(null);
    try {
      if (isPasswordProvider) {
        if (!currentPassword) {
          setMessage({ type: 'error', text: 'Digite sua senha atual para reautenticar.' });
          setLoading(false);
          return;
        }
        const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      } else {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(auth.currentUser, provider);
      }
      setRequiresRecentLogin(false);
      setMessage({ type: 'success', text: 'Reautenticado com sucesso. Você já pode salvar as alterações.' });
    } catch (error: unknown) {
      console.error(error);
      const errMessage = error instanceof Error ? error.message : String(error);
      setMessage({ type: 'error', text: 'Erro ao reautenticar: ' + (errMessage || 'Verifique sua senha atual.') });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      let isProfileUpdated = false;

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setMessage({ type: 'error', text: 'As senhas não coincidem.' });
          setLoading(false);
          return;
        }
        await updatePassword(auth.currentUser, newPassword);
        isProfileUpdated = true;
      }
      
      if (displayName !== user?.displayName || photoURL !== user?.photoURL) {
        await updateProfile(auth.currentUser, {
          displayName,
          photoURL: photoURL || user?.photoURL
        });
        isProfileUpdated = true;
      }
      
      if (isProfileUpdated) {
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'success', text: 'Nenhuma alteração foi feita.' });
      }
    } catch (error: unknown) {
      console.error(error);
      
      const errMessage = error instanceof Error ? error.message : String(error);
      const errCode = typeof error === 'object' && error !== null ? (error as {code?: string}).code : undefined;
      
      const isRecentLoginError = errMessage.includes('auth/requires-recent-login') || errCode === 'auth/requires-recent-login';

      if (isRecentLoginError) {
         setRequiresRecentLogin(true);
         setMessage({ type: 'error', text: 'Operação sensível requer reautenticação.' });
      } else {
         setMessage({ type: 'error', text: errMessage || 'Erro ao atualizar perfil. Talvez você precise refazer o login.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
         <header className="mb-10 flex flex-col gap-2">
            <h1 className={`text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Meu Perfil
            </h1>
            <p className={`text-lg font-medium opacity-60 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Gerencie suas informações de conta e segurança
            </p>
         </header>

         <div className={`p-8 rounded-3xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-gray-200'} shadow-sm`}>
            {message && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? (isDark ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-800' : 'bg-emerald-50 text-emerald-700 border border-emerald-100') : (isDark ? 'bg-red-900/20 text-red-400 border border-red-800' : 'bg-red-50 text-red-700 border border-red-100')}`}>
                {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                <p className="font-medium text-sm">{message.text}</p>
              </div>
            )}

            {requiresRecentLogin && (
               <div className={`mb-6 p-5 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
                     <Unlock size={18} /> Reautenticação Necessária
                  </h3>
                  <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    Para alterar sua senha ou informações sensíveis, precisamos confirmar sua identidade.
                  </p>
                  
                  {isPasswordProvider ? (
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                       <div className="relative w-full sm:w-64">
                         <Key className="absolute left-3 top-2.5 text-slate-400" size={18} />
                         <input 
                           type="password" 
                           value={currentPassword}
                           onChange={(e) => setCurrentPassword(e.target.value)}
                           className={`w-full pl-10 pr-4 py-2.5 rounded-xl border font-medium outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-500' : 'bg-white border-gray-300 text-gray-900 focus:border-amber-500'}`}
                           placeholder="Sua senha atual"
                         />
                       </div>
                       <div className="flex gap-2 w-full sm:w-auto">
                         <button 
                           type="button"
                           onClick={handleReauthenticate}
                           disabled={loading || !currentPassword}
                           className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${loading || !currentPassword ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'}`}
                         >
                           {loading ? 'Aguarde...' : 'Confirmar Senha'}
                         </button>
                         <button 
                           type="button"
                           onClick={() => signOut(auth)}
                           className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all border ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} active:scale-95`}
                         >
                           Sair
                         </button>
                       </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button 
                           type="button"
                           onClick={handleReauthenticate}
                           disabled={loading}
                           className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${loading ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'}`}
                         >
                           {loading ? 'Aguarde...' : 'Reautenticar com Google'}
                      </button>
                      <button 
                           type="button"
                           onClick={() => signOut(auth)}
                           className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all border ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} active:scale-95`}
                         >
                           Sair
                      </button>
                    </div>
                  )}
               </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6 flex flex-col">
                     <p className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'} border-b ${isDark ? 'border-slate-800' : 'border-gray-100'} pb-2`}>Informações Pessoais</p>
                     
                     <div>
                        <label className={`block text-xs font-bold mb-2 uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Nome de Exibição</label>
                        <div className="relative">
                           <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                           <input 
                             type="text" 
                             value={displayName}
                             onChange={(e) => setDisplayName(e.target.value)}
                             className={`w-full pl-10 pr-4 py-2.5 rounded-xl border font-medium outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                             placeholder="Seu nome"
                           />
                        </div>
                     </div>

                     <div>
                        <label className={`block text-xs font-bold mb-2 uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Email (Não editável)</label>
                        <div className="relative">
                           <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                           <input 
                             type="email" 
                             value={user?.email || ''}
                             disabled
                             className={`w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none font-medium opacity-70 cursor-not-allowed ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
                           />
                        </div>
                     </div>
                     
                     <div>
                        <label className={`block text-xs font-bold mb-2 uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>URL da Foto de Perfil</label>
                        <div className="relative">
                           <Camera className="absolute left-3 top-2.5 text-slate-400" size={18} />
                           <input 
                             type="url" 
                             value={photoURL}
                             onChange={(e) => setPhotoURL(e.target.value)}
                             className={`w-full pl-10 pr-4 py-2.5 rounded-xl border font-medium outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                             placeholder="https://exemplo.com/minhafoto.jpg"
                           />
                        </div>
                     </div>
                  </div>

                  {isPasswordProvider && (
                    <div className="space-y-6">
                       <p className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'} border-b ${isDark ? 'border-slate-800' : 'border-gray-100'} pb-2`}>Segurança</p>

                       <div>
                          <label className={`block text-xs font-bold mb-2 uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Nova Senha</label>
                          <div className="relative">
                             <Key className="absolute left-3 top-2.5 text-slate-400" size={18} />
                             <input 
                               type="password" 
                               value={newPassword}
                               onChange={(e) => setNewPassword(e.target.value)}
                               className={`w-full pl-10 pr-4 py-2.5 rounded-xl border font-medium outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                               placeholder="Deixe em branco para não alterar"
                             />
                          </div>
                       </div>

                       <div>
                          <label className={`block text-xs font-bold mb-2 uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Confirmar Nova Senha</label>
                          <div className="relative">
                             <Key className="absolute left-3 top-2.5 text-slate-400" size={18} />
                             <input 
                               type="password" 
                               value={confirmPassword}
                               onChange={(e) => setConfirmPassword(e.target.value)}
                               className={`w-full pl-10 pr-4 py-2.5 rounded-xl border font-medium outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                               placeholder="Confirme a nova senha"
                             />
                          </div>
                       </div>
                    </div>
                  )}
               </div>

               <div className="flex flex-col sm:flex-row justify-end pt-6 gap-3">
                  <button 
                    type="button" 
                    onClick={() => signOut(auth)}
                    className={`flex items-center justify-center space-x-2 px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all focus:ring-4 focus:ring-red-500/50 ${isDark ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'} active:scale-95`}
                  >
                     <span>Sair do Aplicativo</span>
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className={`flex items-center justify-center space-x-2 px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all focus:ring-4 focus:ring-blue-500/50 ${loading ? 'opacity-70 cursor-not-allowed bg-blue-500 text-white' : 'bg-[#003B95] hover:bg-blue-800 text-white active:scale-95'}`}
                  >
                     <Save size={18} />
                     <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
               </div>
            </form>
         </div>
      </div>
  );
};
