<script lang="ts">
  import { User, Mail, Phone, Edit2, Check, X, LogOut, Lock, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { onMount, onDestroy } from 'svelte';

  let { data = $bindable(), user = $bindable() } = $props();
  
  let profile = $state(null);
  let activeTab = $state('info');
  let isEditing = $state(false);
  let isSaving = $state(false);
  let isLoading = $state(true);
  let photoPreview = $state('');
  let selectedFile = $state(null);
  
  let showPasswords = $state({ current: false, new: false, confirm: false });
  
  let form = $state({ display_name: '', phone_number: '' });
  let passwordForm = $state({ currentPassword: '', newPassword: '', confirmPassword: '' });

  $effect.pre(async () => {
    await loadProfile();
  });

  async function loadProfile() {
    try {
      const res = await fetch('/api/profile/user');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar perfil');
      profile = data;
      form = { display_name: profile.display_name || '', phone_number: profile.phone_number || '' };
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar perfil');
    } finally {
      isLoading = false;
    }
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (file?.type.startsWith('image/')) {
      selectedFile = file;
      const reader = new FileReader();
      reader.onload = (ev) => { photoPreview = ev.target.result; };
      reader.readAsDataURL(file);
    }
  }

  async function handleSave() {
    if (form.display_name.length < 2) {
      toast.error('El nombre debe tener mínimo 2 caracteres');
      return;
    }

    const formData = new FormData();
    formData.append('display_name', form.display_name);
    formData.append('phone_number', form.phone_number);
    if (selectedFile) formData.append('photo', selectedFile);

    isSaving = true;

    const promise = fetch('/api/profile/user', { method: 'PUT', body: formData })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al guardar');
        return data;
      });

    toast.promise(promise, {
      loading: 'Guardando cambios...',
      success: (data) => {
        profile = data;
        isEditing = false;
        photoPreview = '';
        selectedFile = null;
        isSaving = false;
        
        invalidateAll(); 
        
        return 'Perfil actualizado correctamente ✓';
      },
      error: (err) => {
        isSaving = false;
        return err.message || 'Error de conexión';
      }
    });
  }

  async function handleChangePassword() {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Todos los campos son requeridos'); return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('La contraseña debe tener mínimo 8 caracteres'); return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Las contraseñas no coinciden'); return;
    }

    isSaving = true;

    const promise = fetch('/api/profile/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordForm),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña');
      return data;
    });

    toast.promise(promise, {
      loading: 'Actualizando seguridad...',
      success: (data) => {
        isSaving = false;
        passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
        return data.message || 'Contraseña cambiada correctamente ✓';
      },
      error: (err) => {
        isSaving = false;
        return err.message || 'Error al cambiar contraseña';
      }
    });
  }

  function cancelEdit() {
    isEditing = false;
    photoPreview = '';
    selectedFile = null;
    form = { display_name: profile?.display_name || '', phone_number: profile?.phone_number || '' };
  }

  async function handleLogout() {
    const promise = fetch('/logout', { method: 'POST' });
    
    toast.promise(promise, {
      loading: 'Cerrando sesión...',
      success: () => {
        invalidateAll();
        goto('/', { invalidateAll: true });
        return 'Sesión cerrada correctamente';
      },
      error: 'Error al cerrar sesión'
    });
  }

  function getInitials(name) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  function getPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  }

  let passwordStrength = $derived(getPasswordStrength(passwordForm.newPassword));
  let strengthText = $derived(passwordStrength === 0 ? '' : ['Débil', 'Regular', 'Buena', 'Fuerte', 'Muy fuerte'][Math.min(passwordStrength - 1, 4)]);
  let strengthColor = $derived(['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500'][Math.min(passwordStrength - 1, 4)]);

  onDestroy(() => {
    profile = null;
    activeTab = 'info';
    isEditing = false;
    photoPreview = '';
    selectedFile = null;
    form = { display_name: '', phone_number: '' };
    passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    showPasswords = { current: false, new: false, confirm: false };
    
    console.log('[profile-user] Recursos liberados');
  });
</script>

<div class="flex flex-col items-center justify-center p-6 md:p-10 w-full min-h-[80vh]">
  
  {#if isLoading}
    <div class="w-full max-w-lg space-y-4 text-center">
      <div class="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800 mx-auto"></div>
      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <div class="mb-6 flex flex-col items-center gap-4">
          <div class="h-20 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"></div>
          <div class="h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div>
        </div>
        <div class="space-y-3">
           <div class="h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800"></div>
           <div class="h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800"></div>
        </div>
      </div>
    </div>

  {:else if !profile}
    <div class="w-full max-w-lg rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-6 text-center">
      <p class="text-sm text-red-700 dark:text-red-400 font-medium">No se pudo cargar la información del perfil</p>
      <button onclick={loadProfile} class="mt-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:underline">
        Intentar de nuevo
      </button>
    </div>

  {:else}
    <div class="w-full max-w-2xl">
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Mi Perfil</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Administra tu información personal y seguridad</p>
      </div>

      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all">
        
        <div class="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <div class="flex justify-center">
            <button
              onclick={() => { activeTab = 'info'; isEditing = false; }}
              class={`flex-1 border-b-2 px-6 py-4 text-sm font-medium transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800/50 ${
                activeTab === 'info'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <div class="flex items-center justify-center gap-2">
                <User class="h-4 w-4" />
                <span>Información</span>
              </div>
            </button>
            <button
              onclick={() => { activeTab = 'security'; isEditing = false; }}
              class={`flex-1 border-b-2 px-6 py-4 text-sm font-medium transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800/50 ${
                activeTab === 'security'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <div class="flex items-center justify-center gap-2">
                <ShieldCheck class="h-4 w-4" />
                <span>Seguridad</span>
              </div>
            </button>
          </div>
        </div>

        <div class="p-6 md:p-8 min-h-[400px]">
          
          {#if activeTab === 'info'}
            <div class="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {#if !isEditing}
                <div class="flex flex-col items-center">
                  <div class="mb-5 relative group">
                    <div class="absolute inset-0 rounded-full bg-blue-500/20 dark:bg-blue-400/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div class="relative">
                      {#if profile.photo_url}
                        <img 
                          src={profile.photo_url} alt="Avatar"
                          class="h-28 w-28 rounded-full object-cover ring-4 ring-white dark:ring-slate-800 shadow-md bg-white dark:bg-slate-800"
                        />
                      {:else}
                        <div class="flex h-28 w-28 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-4xl font-bold text-white shadow-md ring-4 ring-white dark:ring-slate-800">
                          {getInitials(profile.display_name)}
                        </div>
                      {/if}
                      
                      <div class={`absolute bottom-1 right-1 h-6 w-6 rounded-full border-4 border-white dark:border-slate-900 ${
                        profile.account_status === 'ACTIVE' ? 'bg-green-500' : 'bg-amber-500'
                      }`} title={profile.account_status}></div>
                    </div>
                  </div>

                  <h2 class="text-2xl font-bold text-slate-900 dark:text-white">{profile.display_name || 'Sin Nombre'}</h2>
                  
                  <span class="mt-2 inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wide uppercase border border-slate-200 dark:border-slate-700">
                    {profile.role}
                  </span>

                  <div class="mt-8 w-full max-w-md grid grid-cols-1 gap-4">
                    <div class="flex items-center gap-4 rounded-xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Mail class="h-5 w-5" />
                      </div>
                      <div class="flex-1 overflow-hidden">
                        <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Correo Electrónico</p>
                        <p class="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate" title={profile.email}>{profile.email}</p>
                      </div>
                    </div>

                    <div class="flex items-center gap-4 rounded-xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <Phone class="h-5 w-5" />
                      </div>
                      <div>
                        <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Teléfono</p>
                        <p class="text-sm font-semibold text-slate-900 dark:text-slate-200">{profile.phone_number || 'No registrado'}</p>
                      </div>
                    </div>
                  </div>

                  <div class="mt-10 grid grid-cols-2 gap-4 w-full max-w-md">
                    <button
                      onclick={() => isEditing = true}
                      class="flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-all shadow-sm hover:shadow active:scale-95"
                    >
                      <Edit2 class="h-4 w-4" /> 
                      Editar Info
                    </button>
                    
                    <button
                      onclick={handleLogout}
                      class="flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all hover:shadow active:scale-95"
                    >
                      <LogOut class="h-4 w-4" /> 
                      Cerrar Sesión
                    </button>
                  </div>

                </div>

              {:else}
                <div class="max-w-md mx-auto">
                  <div class="text-center mb-6">
                    <h2 class="text-lg font-bold text-slate-900 dark:text-white">Editar Información</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Actualiza tus datos públicos</p>
                  </div>

                  <div class="mb-8 flex justify-center">
                    <div class="relative group cursor-pointer">
                      {#if photoPreview}
                        <img src={photoPreview} alt="Preview" class="h-24 w-24 rounded-full object-cover ring-4 ring-slate-100 dark:ring-slate-700 bg-slate-100 dark:bg-slate-800" />
                      {:else if profile.photo_url}
                        <img src={profile.photo_url} alt="Avatar" class="h-24 w-24 rounded-full object-cover ring-4 ring-slate-100 dark:ring-slate-700 bg-slate-100 dark:bg-slate-800" />
                      {:else}
                        <div class="flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white ring-4 ring-slate-100 dark:ring-slate-700">
                          {getInitials(profile.display_name)}
                        </div>
                      {/if}
                      
                      <label class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-white font-medium text-xs backdrop-blur-sm">
                        <span class="flex flex-col items-center gap-1">
                          <Edit2 class="h-4 w-4" />
                          Cambiar
                        </span>
                        <input type="file" accept="image/*" onchange={handlePhotoSelect} class="hidden" />
                      </label>
                    </div>
                  </div>

                  <div class="space-y-5">
                    <div>
                      <!-- svelte-ignore a11y_label_has_associated_control -->
                      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Nombre Completo</label>
                      <div class="relative">
                        <User class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text" bind:value={form.display_name} maxlength="100" placeholder="Tu nombre"
                          class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 pl-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <!-- svelte-ignore a11y_label_has_associated_control -->
                      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Teléfono</label>
                      <div class="relative">
                        <Phone class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="tel" bind:value={form.phone_number} placeholder="+506 ..."
                          class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 pl-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                        />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 pt-4">
                      <button
                        onclick={cancelEdit} disabled={isSaving}
                        class="flex justify-center items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"
                      >
                        <X class="h-4 w-4" /> Cancelar
                      </button>
                      <button
                        onclick={handleSave} disabled={isSaving}
                        class="flex justify-center items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70 transition active:scale-95 shadow-sm"
                      >
                        {#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check class="h-4 w-4" />{/if}
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          {/if}

          {#if activeTab === 'security'}
            <div class="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div class="max-w-md mx-auto">
                <div class="text-center mb-8">
                  <div class="bg-orange-50 dark:bg-orange-900/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600 dark:text-orange-400">
                    <Lock class="h-7 w-7" />
                  </div>
                  <h2 class="text-xl font-bold text-slate-900 dark:text-white">Cambiar Contraseña</h2>
                  <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Usa una contraseña segura de al menos 8 caracteres</p>
                </div>

                <div class="space-y-5">
                  <div>
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Contraseña Actual</label>
                    <div class="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        bind:value={passwordForm.currentPassword}
                        class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                      />
                      <button type="button" onclick={() => showPasswords.current = !showPasswords.current} class="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {#if showPasswords.current}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}
                      </button>
                    </div>
                  </div>

                  <div>
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Nueva Contraseña</label>
                    <div class="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        bind:value={passwordForm.newPassword}
                        class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                      />
                      <button type="button" onclick={() => showPasswords.new = !showPasswords.new} class="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {#if showPasswords.new}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}
                      </button>
                    </div>
                    
                    {#if passwordForm.newPassword}
                      <div class="mt-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div class="flex justify-between text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                          <span>Seguridad</span>
                          <span class={strengthColor.replace('bg-', 'text-')}>{strengthText}</span>
                        </div>
                        <div class="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div class={`h-full transition-all duration-500 ${strengthColor}`} style={`width: ${(passwordStrength / 5) * 100}%`}></div>
                        </div>
                      </div>
                    {/if}
                  </div>

                  <div>
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Confirmar Contraseña</label>
                    <div class="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        bind:value={passwordForm.confirmPassword}
                        class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                      />
                      <button type="button" onclick={() => showPasswords.confirm = !showPasswords.confirm} class="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {#if showPasswords.confirm}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}
                      </button>
                    </div>
                    {#if passwordForm.newPassword && passwordForm.confirmPassword}
                      {#if passwordForm.newPassword === passwordForm.confirmPassword}
                        <div class="flex items-center gap-1.5 mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
                          <Check class="h-3 w-3" /> Coinciden
                        </div>
                      {:else}
                         <div class="flex items-center gap-1.5 mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                          <X class="h-3 w-3" /> No coinciden
                        </div>
                      {/if}
                    {/if}
                  </div>

                  <button
                    onclick={handleChangePassword}
                    disabled={isSaving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    class="w-full mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition shadow-lg shadow-blue-500/10 active:scale-95"
                  >
                    {#if isSaving}<div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>{/if}
                    Actualizar Contraseña
                  </button>
                </div>
              </div>
            </div>
          {/if}

        </div>
      </div>
    </div>
  {/if}
</div>