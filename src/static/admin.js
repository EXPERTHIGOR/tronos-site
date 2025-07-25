// Variáveis globais para o painel admin
let currentTab = 'pending-users';
let pendingUsers = [];
let removalRequests = [];
let allUsers = [];
let systemLogs = [];
let contactMessages = [];

// Função apiRequest para garantir compatibilidade
async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`/api${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erro na requisição');
        }
        
        return result;
    } catch (error) {
        console.error('Erro na API:', error);
        throw error;
    }
}

// Inicialização do painel admin
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    initializeAdminPanel();
    loadAllData();
    
    // Auto-refresh a cada 30 segundos
    setInterval(loadAllData, 30000);
});

function checkAdminAuth() {
    // Verificar se o usuário é admin
    // Esta função seria implementada com verificação de sessão real
    updateLastUpdate();
}

function initializeAdminPanel() {
    updateLastUpdate();
    document.getElementById('adminName').textContent = 'Admin';
}

function updateLastUpdate() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleString('pt-BR');
}

// Funções de navegação entre abas
function showTab(tabName) {
    // Remover classe active de todas as abas
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Ativar aba selecionada
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    currentTab = tabName;
    
    // Carregar dados específicos da aba se necessário
    switch(tabName) {
        case 'pending-users':
            loadPendingUsers();
            break;
        case 'removal-requests':
            loadRemovalRequests();
            break;
        case 'contact-messages':
            loadContactMessages();
            break;
        case 'all-users':
            loadAllUsers();
            break;
        case 'logs':
            loadSystemLogs();
            break;
    }
}

// Função para carregar todos os dados
async function loadAllData() {
    try {
        await Promise.all([
            loadPendingUsers(),
            loadRemovalRequests(),
            loadContactMessages(),
            loadAllUsers(),
            loadSystemLogs()
        ]);
        
        updateStatistics();
        updateLastUpdate();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('Erro ao carregar dados do painel', 'error');
    }
}

// Carregar usuários pendentes
async function loadPendingUsers() {
    try {
        const result = await apiRequest('/admin/pending-users');
        pendingUsers = result;
        renderPendingUsers();
    } catch (error) {
        console.error('Erro ao carregar usuários pendentes:', error);
        document.getElementById('pendingUsersTable').innerHTML = `
            <tr><td colspan="6" class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Erro ao carregar usuários pendentes</p>
            </td></tr>
        `;
    }
}

function renderPendingUsers() {
    const tbody = document.getElementById('pendingUsersTable');
    
    if (pendingUsers.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p>Nenhum usuário pendente de aprovação</p>
            </td></tr>
        `;
        return;
    }
    
    tbody.innerHTML = pendingUsers.map(user => `
        <tr>
            <td>
                <strong>${user.full_name}</strong><br>
                <small style="color: var(--text-secondary);">@${user.login}</small>
            </td>
            <td>
                ${user.email}
                <button class="btn btn-copy btn-small" onclick="copyToClipboard('${user.email}')">📋</button>
            </td>
            <td>
                <span class="status-badge status-${user.user_type === 'agent' ? 'pending' : 'approved'}">
                    ${user.user_type === 'agent' ? 'Agente' : 'Criador'}
                </span>
            </td>
            <td>
                ${user.channel_name || 'N/A'}<br>
                <small style="color: var(--text-secondary);">${user.function || ''}</small>
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-approve btn-small" onclick="approveUser(${user.id})">
                        ✅ Aprovar
                    </button>
                    <button class="btn btn-reject btn-small" onclick="rejectUser(${user.id})">
                        ❌ Rejeitar
                    </button>
                    <button class="btn btn-copy btn-small" onclick="showUserDetails(${user.id})">
                        👁️ Detalhes
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Carregar solicitações de remoção
async function loadRemovalRequests() {
    try {
        const result = await apiRequest('/admin/removal-requests');
        removalRequests = result;
        renderRemovalRequests();
    } catch (error) {
        console.error('Erro ao carregar solicitações:', error);
        document.getElementById('removalRequestsTable').innerHTML = `
            <tr><td colspan="6" class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Erro ao carregar solicitações</p>
            </td></tr>
        `;
    }
}

function renderRemovalRequests() {
    const tbody = document.getElementById('removalRequestsTable');
    
    if (removalRequests.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p>Nenhuma solicitação de remoção</p>
            </td></tr>
        `;
        return;
    }
    
    // Criar cards ao invés de tabela
    const container = tbody.parentElement.parentElement;
    container.innerHTML = `
        <h3>📋 Solicitações de Remoção</h3>
        <div class="requests-container">
            ${removalRequests.map(request => `
                <div class="request-card" data-request-id="${request.id}">
                    <div class="request-header">
                        <h4>Solicitação #${request.id}</h4>
                        <div class="request-actions">
                            <span class="status-badge status-${request.status}">${getStatusText(request.status)}</span>
                            <div class="action-buttons">
                                ${request.status === 'pending' ? `
                                    <button class="btn btn-approve btn-small" onclick="updateRequestStatus(${request.id}, 'approved')">
                                        ✅ Aprovar
                                    </button>
                                    <button class="btn btn-reject btn-small" onclick="updateRequestStatus(${request.id}, 'rejected')">
                                        ❌ Rejeitar
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="request-details">
                        <div class="detail-section">
                            <h5>👤 Solicitante</h5>
                            <div class="detail-item">
                                <span class="detail-label">Nome:</span>
                                <span class="detail-value">${request.requester_name || 'Usuário não identificado'}</span>
                                <button class="btn-copy" onclick="copyToClipboard('${request.requester_name || 'N/A'}')">📋</button>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Email:</span>
                                <span class="detail-value">${request.requester_email || 'Email não disponível'}</span>
                                <button class="btn-copy" onclick="copyToClipboard('${request.requester_email || 'N/A'}')">📋</button>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Tipo:</span>
                                <span class="detail-value">${request.requester_type || 'N/A'}</span>
                                <button class="btn-copy" onclick="copyToClipboard('${request.requester_type || 'N/A'}')">📋</button>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h5>📹 Conteúdo Original</h5>
                            <div class="detail-item">
                                <span class="detail-label">URL Original:</span>
                                <span class="detail-value">${request.original_url}</span>
                                <button class="btn-copy" onclick="copyToClipboard('${request.original_url}')">📋</button>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Título:</span>
                                <span class="detail-value">${request.original_title}</span>
                                <button class="btn-copy" onclick="copyToClipboard('${request.original_title}')">📋</button>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Data do Envio:</span>
                                <span class="detail-value">${formatDate(request.original_date)}</span>
                                <button class="btn-copy" onclick="copyToClipboard('${formatDate(request.original_date)}')">📋</button>
                            </div>
                        </div>
                        
                        <div class="detail-section removal-section">
                            <h5>🎯 Para Remoção</h5>
                            <div class="detail-item">
                                <span class="detail-label">URL para Remoção:</span>
                                <span class="detail-value">${request.removal_url}</span>
                                <button class="btn-copy" onclick="copyToClipboard('${request.removal_url}')">📋</button>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Nome do Usuário:</span>
                                <span class="detail-value">${request.username}</span>
                                <button class="btn-copy" onclick="copyToClipboard('${request.username}')">📋</button>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h5>📊 Informações da Solicitação</h5>
                            <div class="detail-item">
                                <span class="detail-label">Data da Solicitação:</span>
                                <span class="detail-value">${formatDate(request.created_at)}</span>
                                <button class="btn-copy" onclick="copyToClipboard('${formatDate(request.created_at)}')">📋</button>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Status:</span>
                                <span class="detail-value">${getStatusText(request.status)}</span>
                                <button class="btn-copy" onclick="copyToClipboard('${getStatusText(request.status)}')">📋</button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Função para copiar texto para a área de transferência
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Feedback visual
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = '📋 Copiado!';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #00ffff, #ff00ff);
            color: #000;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        alert('Erro ao copiar texto');
    });
}

// Carregar todos os usuários
async function loadAllUsers() {
    try {
        const result = await apiRequest('/admin/all-users');
        allUsers = result;
        renderAllUsers();
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        // Em caso de erro, mostrar mensagem
        const tbody = document.getElementById('allUsersTable');
        tbody.innerHTML = `
            <tr><td colspan="6" class="empty-state">
                <div class="empty-state-icon">❌</div>
                Erro ao carregar usuários
            </td></tr>
        `;
    }
}

function renderAllUsers() {
    const tbody = document.getElementById('allUsersTable');
    
    if (allUsers.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p>Nenhum usuário cadastrado</p>
            </td></tr>
        `;
        return;
    }
    
    tbody.innerHTML = allUsers.map(user => `
        <tr>
            <td>
                <div class="user-info">
                    <strong>${user.full_name}</strong>
                    <small>${user.login}</small>
                </div>
            </td>
            <td>
                <button class="btn-copy" onclick="copyToClipboard('${user.email}')" title="Copiar e-mail">
                    ${user.email}
                </button>
            </td>
            <td>
                <span class="badge badge-${user.user_type}">
                    ${user.type_text}
                </span>
            </td>
            <td>
                <span class="status-badge ${user.is_approved ? 'approved' : 'pending'}">
                    ${user.status_text}
                </span>
            </td>
            <td>
                <small>${new Date(user.created_at).toLocaleDateString('pt-BR')}</small>
            </td>
            <td>
                <div class="action-buttons">
                    ${!user.is_approved ? `
                        <button class="btn btn-success btn-sm" onclick="approveUser(${user.id})" title="Aprovar">
                            ✓
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="rejectUser(${user.id})" title="Rejeitar">
                            ✗
                        </button>
                    ` : `
                        <button class="btn btn-warning btn-sm" onclick="revokeUser(${user.id})" title="Revogar acesso">
                            🔒
                        </button>
                    `}
                    <button class="btn btn-info btn-sm" onclick="viewUserDetails(${user.id})" title="Ver detalhes">
                        👁️
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Carregar logs do sistema
async function loadSystemLogs() {
    try {
        const result = await apiRequest('/admin/logs');
        systemLogs = result;
        renderSystemLogs();
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
        document.getElementById('logsTable').innerHTML = `
            <tr><td colspan="5" class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Erro ao carregar logs</p>
            </td></tr>
        `;
    }
}

function renderSystemLogs() {
    const tbody = document.getElementById('logsTable');
    
    if (systemLogs.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5" class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p>Nenhum log encontrado</p>
            </td></tr>
        `;
        return;
    }
    
    tbody.innerHTML = systemLogs.map(log => `
        <tr>
            <td>${formatDateTime(log.created_at)}</td>
            <td>${log.user_id || 'Sistema'}</td>
            <td>
                <strong>${log.action}</strong>
            </td>
            <td>${log.details || '-'}</td>
            <td>
                <code style="color: var(--neon-green);">${log.ip_address || '-'}</code>
            </td>
        </tr>
    `).join('');
}

// Atualizar estatísticas
function updateStatistics() {
    document.getElementById('pendingUsersCount').textContent = pendingUsers.length;
    document.getElementById('pendingRequestsCount').textContent = 
        removalRequests.filter(r => r.status === 'pending').length;
    document.getElementById('totalUsersCount').textContent = 
        pendingUsers.length + allUsers.length;
    document.getElementById('totalRequestsCount').textContent = removalRequests.length;
}

// Ações administrativas
async function approveUser(userId) {
    if (!confirm('Tem certeza que deseja aprovar este usuário?')) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest(`/admin/approve-user/${userId}`, 'POST');
        showToast('Usuário aprovado com sucesso!', 'success');
        loadPendingUsers();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function rejectUser(userId) {
    if (!confirm('Tem certeza que deseja rejeitar este usuário? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest(`/admin/reject-user/${userId}`, 'POST');
        showToast('Usuário rejeitado!', 'success');
        loadPendingUsers();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function updateRequestStatus(requestId, status) {
    const statusText = status === 'approved' ? 'aprovar' : 'rejeitar';
    
    if (!confirm(`Tem certeza que deseja ${statusText} esta solicitação?`)) {
        return;
    }
    
    const notes = prompt('Adicione observações (opcional):');
    
    showLoading();
    
    try {
        await apiRequest(`/admin/update-request/${requestId}`, 'POST', {
            status: status,
            admin_notes: notes || ''
        });
        
        showToast(`Solicitação ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso!`, 'success');
        
        // Remover solicitação da tela imediatamente
        const requestElement = document.querySelector(`[data-request-id="${requestId}"]`);
        if (requestElement) {
            requestElement.style.transition = 'opacity 0.3s ease-out';
            requestElement.style.opacity = '0';
            setTimeout(() => {
                requestElement.remove();
                
                // Verificar se não há mais solicitações e mostrar estado vazio
                const remainingRequests = document.querySelectorAll('.request-card');
                if (remainingRequests.length === 0) {
                    const tbody = document.getElementById('removalRequestsTable');
                    tbody.innerHTML = `
                        <tr><td colspan="6" class="empty-state">
                            <div class="empty-state-icon">📋</div>
                            <p>Nenhuma solicitação de remoção</p>
                        </td></tr>
                    `;
                }
            }, 300);
        }
        
        // Recarregar lista completa para garantir sincronização
        setTimeout(() => {
            loadRemovalRequests();
        }, 500);
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Carregar mensagens de contato
async function loadContactMessages() {
    try {
        const result = await apiRequest('/admin/contact-messages');
        contactMessages = result;
        renderContactMessages();
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        document.getElementById('contactMessagesTable').innerHTML = `
            <tr><td colspan="8" class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Erro ao carregar mensagens de contato</p>
            </td></tr>
        `;
    }
}

function renderContactMessages() {
    const tbody = document.getElementById('contactMessagesTable');
    
    if (contactMessages.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="8" class="empty-state">
                <div class="empty-state-icon">📧</div>
                <p>Nenhuma mensagem de contato</p>
            </td></tr>
        `;
        return;
    }
    
    tbody.innerHTML = contactMessages.map(message => `
        <tr style="${!message.is_read ? 'background: rgba(0, 245, 255, 0.05); border-left: 3px solid var(--neon-cyan);' : ''}">
            <td>
                <strong>${message.name}</strong>
                ${!message.is_read ? '<span style="color: var(--neon-cyan); font-size: 0.8rem;">● NOVA</span>' : ''}
            </td>
            <td>
                ${message.email}
                <button class="btn btn-copy btn-small" onclick="copyToClipboard('${message.email}')">📋</button>
            </td>
            <td>
                ${message.whatsapp}
                <button class="btn btn-copy btn-small" onclick="copyToClipboard('${message.whatsapp}')">📋</button>
            </td>
            <td>
                <a href="${message.video_url}" target="_blank" style="color: var(--neon-cyan);">
                    ${truncateUrl(message.video_url, 30)}
                </a>
            </td>
            <td>
                <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                    ${message.message.length > 100 ? message.message.substring(0, 100) + '...' : message.message}
                </div>
            </td>
            <td>${formatDate(message.created_at)}</td>
            <td>
                <span class="status-badge ${message.is_read ? 'status-approved' : 'status-pending'}">
                    ${message.is_read ? 'Lida' : 'Nova'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    ${!message.is_read ? `
                        <button class="btn btn-approve btn-small" onclick="markMessageRead(${message.id})">
                            ✅ Marcar Lida
                        </button>
                    ` : ''}
                    <button class="btn btn-copy btn-small" onclick="showMessageDetails(${message.id})">
                        👁️ Detalhes
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function markMessageRead(messageId) {
    showLoading();
    
    try {
        await apiRequest(`/admin/contact-messages/${messageId}/read`, 'POST');
        showToast('Mensagem marcada como lida!', 'success');
        loadContactMessages();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

function showMessageDetails(messageId) {
    const message = contactMessages.find(m => m.id === messageId);
    if (!message) return;
    
    const details = `
        Nome: ${message.name}
        E-mail: ${message.email}
        WhatsApp: ${message.whatsapp}
        URL do Vídeo: ${message.video_url}
        Data: ${formatDateTime(message.created_at)}
        Status: ${message.is_read ? 'Lida' : 'Nova'}
        
        Mensagem:
        ${message.message}
    `;
    
    alert(details);
}

// Funções utilitárias
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('pt-BR');
}

function truncateUrl(url, maxLength = 50) {
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Pendente',
        'approved': 'Aprovado',
        'rejected': 'Rejeitado'
    };
    return statusMap[status] || status;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copiado para a área de transferência!', 'success');
    }).catch(() => {
        showToast('Erro ao copiar', 'error');
    });
}

function showUserDetails(userId) {
    const user = pendingUsers.find(u => u.id === userId);
    if (!user) return;
    
    const details = `
        Nome: ${user.full_name}
        Login: ${user.login}
        Email: ${user.email}
        Tipo: ${user.user_type}
        Canal: ${user.channel_name || 'N/A'}
        Função: ${user.function || 'N/A'}
        WhatsApp: ${user.whatsapp}
        Data de Nascimento: ${user.birth_date}
        Código de Cadastro: ${user.registration_code || 'N/A'}
        Data de Cadastro: ${formatDateTime(user.created_at)}
    `;
    
    alert(details);
}

function showRequestDetails(requestId) {
    const request = removalRequests.find(r => r.id === requestId);
    if (!request) return;
    
    const details = `
        Solicitante: ${request.requester_name}
        URL Original: ${request.original_url}
        Título Original: ${request.original_title}
        Data Original: ${request.original_date}
        URL para Remoção: ${request.removal_url}
        Nome do Usuário: ${request.username}
        Status: ${getStatusText(request.status)}
        Data da Solicitação: ${formatDateTime(request.created_at)}
        Última Atualização: ${formatDateTime(request.updated_at)}
        Observações do Admin: ${request.admin_notes || 'Nenhuma'}
    `;
    
    alert(details);
}

// Função de logout específica para admin
async function logout() {
    if (confirm('Tem certeza que deseja sair do painel administrativo?')) {
        try {
            await apiRequest('/logout', 'POST');
            window.location.href = '/';
        } catch (error) {
            showToast('Erro ao fazer logout', 'error');
        }
    }
}


// Funções para gerenciar usuários na aba "Todos os usuários"
async function revokeUser(userId) {
    if (!confirm('Tem certeza que deseja revogar o acesso deste usuário?')) {
        return;
    }
    
    try {
        await apiRequest(`/admin/users/${userId}/revoke`, 'POST');
        showToast('Acesso revogado com sucesso!', 'success');
        loadAllUsers(); // Recarregar lista
    } catch (error) {
        showToast('Erro ao revogar acesso: ' + error.message, 'error');
    }
}

function viewUserDetails(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    let details = `
=== DETALHES DO USUÁRIO ===

Nome: ${user.full_name}
Login: ${user.login}
Email: ${user.email}
Tipo: ${user.type_text}
Status: ${user.status_text}
Data de Cadastro: ${new Date(user.created_at).toLocaleString('pt-BR')}
WhatsApp: ${user.whatsapp}
Data de Nascimento: ${user.birth_date || 'N/A'}
`;

    if (user.user_type === 'agent') {
        details += `
=== INFORMAÇÕES DO AGENTE ===
Canal: ${user.channel_name || 'N/A'}
Função: ${user.function || 'N/A'}
Função (Outro): ${user.function_other || 'N/A'}
Criador Representado: ${user.represented_creator || 'N/A'}
Código de Cadastro: ${user.registration_code || 'N/A'}
`;
    }

    if (user.user_type === 'creator') {
        details += `
=== INFORMAÇÕES DO CRIADOR ===
Canal: ${user.channel_name || 'N/A'}
Descrição do Canal: ${user.channel_description || 'N/A'}
Principais Plataformas: ${user.main_platforms || 'N/A'}
Número de Seguidores: ${user.subscribers_count || 'N/A'}
Endereço: ${user.full_address || 'N/A'}
Telefone: ${user.phone || 'N/A'}
URL da Rede Social: ${user.social_url || 'N/A'}
País: ${user.country || 'N/A'}
CPF/CNPJ: ${user.document_number || 'N/A'}
Assinatura: ${user.signature || 'N/A'}
`;
    }
    
    alert(details);
}

// Função para copiar dados do usuário para área de transferência
function copyUserData(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const userData = `${user.full_name} - ${user.email} - ${user.type_text}`;
    copyToClipboard(userData);
}



// ==================== FUNCIONALIDADES DE GERENCIAMENTO DE USUÁRIOS ====================

// Função para editar usuário
async function editUser(userId) {
    try {
        // Carregar dados completos do usuário
        const userData = await apiRequest(`/admin/users/${userId}`);
        
        // Criar modal de edição
        showUserEditModal(userData);
        
    } catch (error) {
        showToast('Erro ao carregar dados do usuário: ' + error.message, 'error');
    }
}

// Função para mostrar modal de edição de usuário
function showUserEditModal(user) {
    const modalHtml = `
        <div id="editUserModal" class="modal show">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>✏️ Editar Usuário: ${user.full_name}</h2>
                    <span class="close" onclick="closeEditUserModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="editUserForm">
                        <div class="form-section">
                            <h3>👤 Dados Básicos</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Nome Completo</label>
                                    <input type="text" id="edit_full_name" value="${user.full_name || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label>E-mail</label>
                                    <input type="email" id="edit_email" value="${user.email || ''}" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>WhatsApp</label>
                                    <input type="text" id="edit_whatsapp" value="${user.whatsapp || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Data de Nascimento</label>
                                    <input type="date" id="edit_birth_date" value="${user.birth_date || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select id="edit_is_approved">
                                    <option value="true" ${user.is_approved ? 'selected' : ''}>Aprovado</option>
                                    <option value="false" ${!user.is_approved ? 'selected' : ''}>Pendente</option>
                                </select>
                            </div>
                        </div>
                        
                        ${user.user_type === 'agent' ? `
                        <div class="form-section">
                            <h3>👨‍💼 Dados do Agente</h3>
                            <div class="form-group">
                                <label>Nome do Canal</label>
                                <input type="text" id="edit_channel_name" value="${user.channel_name || ''}">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Função</label>
                                    <input type="text" id="edit_function" value="${user.function || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Função (Outro)</label>
                                    <input type="text" id="edit_function_other" value="${user.function_other || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Criador Representado</label>
                                    <input type="text" id="edit_represented_creator" value="${user.represented_creator || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Código de Cadastro</label>
                                    <input type="text" id="edit_registration_code" value="${user.registration_code || ''}">
                                </div>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${user.user_type === 'creator' ? `
                        <div class="form-section">
                            <h3>🎬 Dados do Criador</h3>
                            <div class="form-group">
                                <label>Nome do Canal</label>
                                <input type="text" id="edit_channel_name" value="${user.channel_name || ''}">
                            </div>
                            <div class="form-group">
                                <label>Descrição do Canal</label>
                                <textarea id="edit_channel_description" rows="3">${user.channel_description || ''}</textarea>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Principais Plataformas</label>
                                    <input type="text" id="edit_main_platforms" value="${user.main_platforms || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Número de Seguidores</label>
                                    <input type="text" id="edit_subscribers_count" value="${user.subscribers_count || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Endereço Completo</label>
                                <textarea id="edit_full_address" rows="3">${user.full_address || ''}</textarea>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Telefone</label>
                                    <input type="text" id="edit_phone" value="${user.phone || ''}">
                                </div>
                                <div class="form-group">
                                    <label>País</label>
                                    <input type="text" id="edit_country" value="${user.country || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>URL da Rede Social</label>
                                    <input type="url" id="edit_social_url" value="${user.social_url || ''}">
                                </div>
                                <div class="form-group">
                                    <label>CPF/CNPJ</label>
                                    <input type="text" id="edit_document_number" value="${user.document_number || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Assinatura</label>
                                <input type="text" id="edit_signature" value="${user.signature || ''}">
                            </div>
                        </div>
                        ` : ''}
                        
                        <div class="form-section">
                            <h3>🔐 Gerenciamento de Senha</h3>
                            <div class="password-management">
                                <div class="form-group">
                                    <label>Senha Atual (Hash)</label>
                                    <input type="text" value="${user.password_hash || ''}" readonly style="font-family: monospace; font-size: 12px;">
                                    <button type="button" class="btn btn-copy btn-small" onclick="copyToClipboard('${user.password_hash || ''}')">📋</button>
                                </div>
                                <div class="password-actions">
                                    <button type="button" class="btn btn-secondary" onclick="resetUserPassword(${user.id})">
                                        🔑 Redefinir Senha
                                    </button>
                                    <button type="button" class="btn btn-warning" onclick="generateRandomPassword(${user.id})">
                                        🎲 Gerar Senha Aleatória
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeEditUserModal()">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                💾 Salvar Alterações
                            </button>
                            <button type="button" class="btn btn-info" onclick="loginAsUser(${user.id})">
                                👤 Login como Usuário
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Adicionar modal ao DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Adicionar event listener para o formulário
    document.getElementById('editUserForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveUserChanges(user.id);
    });
}

// Função para fechar modal de edição
function closeEditUserModal() {
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.remove();
    }
}

// Função para salvar alterações do usuário
async function saveUserChanges(userId) {
    try {
        showLoading();
        
        const formData = {
            full_name: document.getElementById('edit_full_name').value,
            email: document.getElementById('edit_email').value,
            whatsapp: document.getElementById('edit_whatsapp').value,
            birth_date: document.getElementById('edit_birth_date').value,
            is_approved: document.getElementById('edit_is_approved').value === 'true'
        };
        
        // Adicionar campos específicos se existirem
        const channelNameField = document.getElementById('edit_channel_name');
        if (channelNameField) formData.channel_name = channelNameField.value;
        
        const functionField = document.getElementById('edit_function');
        if (functionField) formData.function = functionField.value;
        
        const functionOtherField = document.getElementById('edit_function_other');
        if (functionOtherField) formData.function_other = functionOtherField.value;
        
        const representedCreatorField = document.getElementById('edit_represented_creator');
        if (representedCreatorField) formData.represented_creator = representedCreatorField.value;
        
        const registrationCodeField = document.getElementById('edit_registration_code');
        if (registrationCodeField) formData.registration_code = registrationCodeField.value;
        
        // Campos de criador
        const channelDescField = document.getElementById('edit_channel_description');
        if (channelDescField) formData.channel_description = channelDescField.value;
        
        const mainPlatformsField = document.getElementById('edit_main_platforms');
        if (mainPlatformsField) formData.main_platforms = mainPlatformsField.value;
        
        const subscribersField = document.getElementById('edit_subscribers_count');
        if (subscribersField) formData.subscribers_count = subscribersField.value;
        
        const fullAddressField = document.getElementById('edit_full_address');
        if (fullAddressField) formData.full_address = fullAddressField.value;
        
        const phoneField = document.getElementById('edit_phone');
        if (phoneField) formData.phone = phoneField.value;
        
        const countryField = document.getElementById('edit_country');
        if (countryField) formData.country = countryField.value;
        
        const socialUrlField = document.getElementById('edit_social_url');
        if (socialUrlField) formData.social_url = socialUrlField.value;
        
        const documentField = document.getElementById('edit_document_number');
        if (documentField) formData.document_number = documentField.value;
        
        const signatureField = document.getElementById('edit_signature');
        if (signatureField) formData.signature = signatureField.value;
        
        const result = await apiRequest(`/admin/users/${userId}/edit`, 'POST', formData);
        
        showToast('Usuário editado com sucesso!', 'success');
        closeEditUserModal();
        loadAllUsers(); // Recarregar lista
        
    } catch (error) {
        showToast('Erro ao editar usuário: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Função para redefinir senha
async function resetUserPassword(userId) {
    const newPassword = prompt('Digite a nova senha (mínimo 6 caracteres):');
    
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
        showToast('Senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const result = await apiRequest(`/admin/users/${userId}/password`, 'POST', {
            new_password: newPassword
        });
        
        showToast(`Senha redefinida! Nova senha: ${result.new_password}`, 'success');
        
        // Mostrar a nova senha em um alert também
        alert(`Senha redefinida com sucesso!\n\nNova senha: ${result.new_password}\n\nAnote esta senha e forneça ao usuário.`);
        
    } catch (error) {
        showToast('Erro ao redefinir senha: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Função para gerar senha aleatória
async function generateRandomPassword(userId) {
    if (!confirm('Gerar uma nova senha aleatória para este usuário?')) {
        return;
    }
    
    try {
        showLoading();
        
        const result = await apiRequest(`/admin/users/${userId}/generate-password`, 'POST');
        
        showToast(`Nova senha gerada: ${result.new_password}`, 'success');
        
        // Mostrar a nova senha em um alert
        alert(`Nova senha gerada com sucesso!\n\nLogin: ${result.user_login}\nSenha: ${result.new_password}\n\nAnote estas informações e forneça ao usuário.`);
        
    } catch (error) {
        showToast('Erro ao gerar senha: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Função para fazer login como usuário
async function loginAsUser(userId) {
    if (!confirm('Fazer login como este usuário? Você será redirecionado para o painel do usuário.')) {
        return;
    }
    
    try {
        showLoading();
        
        const result = await apiRequest(`/admin/users/${userId}/login-as`, 'POST');
        
        showToast(result.message, 'success');
        
        // Redirecionar após um breve delay
        setTimeout(() => {
            window.location.href = result.redirect_url;
        }, 1500);
        
    } catch (error) {
        showToast('Erro ao fazer login como usuário: ' + error.message, 'error');
        hideLoading();
    }
}

// Função para retornar ao admin (se estiver logado como usuário)
async function returnToAdmin() {
    try {
        const result = await apiRequest('/admin/return-to-admin', 'POST');
        
        showToast(result.message, 'success');
        
        setTimeout(() => {
            window.location.href = result.redirect_url;
        }, 1000);
        
    } catch (error) {
        showToast('Erro ao retornar ao admin: ' + error.message, 'error');
    }
}

// Atualizar a função renderAllUsers para incluir botão de editar
const originalRenderAllUsers = renderAllUsers;
renderAllUsers = function() {
    const tbody = document.getElementById('allUsersTable');
    
    if (allUsers.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p>Nenhum usuário cadastrado</p>
            </td></tr>
        `;
        return;
    }
    
    tbody.innerHTML = allUsers.map(user => `
        <tr>
            <td>
                <div class="user-info">
                    <strong>${user.full_name}</strong>
                    <small>${user.login}</small>
                </div>
            </td>
            <td>
                <button class="btn-copy" onclick="copyToClipboard('${user.email}')" title="Copiar e-mail">
                    ${user.email}
                </button>
            </td>
            <td>
                <span class="badge badge-${user.user_type}">
                    ${user.user_type === 'agent' ? 'Agente' : user.user_type === 'creator' ? 'Criador' : 'Admin'}
                </span>
            </td>
            <td>
                <span class="status-badge ${user.is_approved ? 'approved' : 'pending'}">
                    ${user.is_approved ? 'Aprovado' : 'Pendente'}
                </span>
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-small" onclick="editUser(${user.id})" title="Editar usuário">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="viewUserDetails(${user.id})" title="Ver detalhes">
                        👁️ Detalhes
                    </button>
                    <button class="btn btn-warning btn-small" onclick="revokeUser(${user.id})" title="Revogar acesso">
                        🚫 Revogar
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
};


// ==================== FUNCIONALIDADES DE SOLICITAÇÕES ARQUIVADAS ====================

let archivedRequests = [];

// Função para carregar solicitações arquivadas
async function loadArchivedRequests() {
    try {
        showLoading();
        const result = await apiRequest('/admin/archived-requests');
        archivedRequests = result.requests || [];
        renderArchivedRequests();
    } catch (error) {
        showToast('Erro ao carregar solicitações arquivadas: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Função para renderizar solicitações arquivadas
function renderArchivedRequests() {
    const tbody = document.getElementById('archivedRequestsTable');
    
    if (archivedRequests.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" class="empty-state">
                <div class="empty-state-icon">📦</div>
                <p>Nenhuma solicitação arquivada</p>
                <small style="color: var(--text-secondary);">Solicitações aprovadas/rejeitadas aparecem aqui automaticamente</small>
            </td></tr>
        `;
        return;
    }
    
    tbody.innerHTML = archivedRequests.map(request => `
        <tr>
            <td>
                <div class="user-info">
                    <strong>${request.requester_name}</strong>
                    <small>${request.user_login}</small>
                </div>
            </td>
            <td>
                <button class="btn-copy" onclick="copyToClipboard('${request.original_url}')" title="Copiar URL">
                    ${request.original_url.length > 50 ? request.original_url.substring(0, 50) + '...' : request.original_url}
                </button>
            </td>
            <td>
                <button class="btn-copy" onclick="copyToClipboard('${request.removal_url}')" title="Copiar URL">
                    ${request.removal_url.length > 50 ? request.removal_url.substring(0, 50) + '...' : request.removal_url}
                </button>
            </td>
            <td>
                <span class="status-badge ${request.status === 'approved' ? 'approved' : 'rejected'}">
                    ${getStatusText(request.status)}
                </span>
            </td>
            <td>${formatDate(request.updated_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-small" onclick="showArchivedRequestDetails(${request.id})" title="Ver detalhes">
                        👁️ Detalhes
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="restoreRequest(${request.id})" title="Restaurar para ativa">
                        🔄 Restaurar
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Função para buscar solicitação arquivada por URL
async function searchArchivedRequest() {
    const url = document.getElementById('archiveSearchUrl').value.trim();
    
    if (!url) {
        showToast('Por favor, insira uma URL para buscar', 'error');
        return;
    }
    
    try {
        showLoading();
        const result = await apiRequest(`/admin/search-archived?url=${encodeURIComponent(url)}`);
        
        const resultsContainer = document.getElementById('archiveSearchResults');
        
        if (result.found && result.requests.length > 0) {
            resultsContainer.innerHTML = `
                <div style="background: var(--bg-card); padding: 16px; border-radius: 8px; border-left: 4px solid var(--neon-green);">
                    <h4 style="color: var(--neon-green); margin-bottom: 12px;">✅ ${result.requests.length} Solicitação(ões) Encontrada(s)</h4>
                    ${result.requests.map(request => `
                        <div style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                            <p><strong>Solicitante:</strong> ${request.requester_name}</p>
                            <p><strong>Status:</strong> <span class="status-badge ${request.status === 'approved' ? 'approved' : 'rejected'}">${getStatusText(request.status)}</span></p>
                            <p><strong>Data da Decisão:</strong> ${formatDateTime(request.updated_at)}</p>
                            <p><strong>Observações:</strong> ${request.admin_notes || 'Nenhuma'}</p>
                            <div style="margin-top: 8px;">
                                <button class="btn btn-info btn-small" onclick="showArchivedRequestDetails(${request.id})">
                                    👁️ Ver Detalhes Completos
                                </button>
                                <button class="btn btn-secondary btn-small" onclick="restoreRequest(${request.id})">
                                    🔄 Restaurar
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            resultsContainer.innerHTML = `
                <div style="background: var(--bg-card); padding: 16px; border-radius: 8px; border-left: 4px solid var(--neon-pink);">
                    <h4 style="color: var(--neon-pink); margin-bottom: 8px;">❌ Nenhuma Solicitação Encontrada</h4>
                    <p style="color: var(--text-secondary);">Não foi encontrada nenhuma solicitação arquivada para esta URL.</p>
                </div>
            `;
        }
        
    } catch (error) {
        showToast('Erro ao buscar solicitação: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Função para mostrar detalhes de solicitação arquivada
function showArchivedRequestDetails(requestId) {
    const request = archivedRequests.find(r => r.id === requestId);
    if (!request) {
        showToast('Solicitação não encontrada', 'error');
        return;
    }
    
    // Usar o modal existente showUserDetailsModal adaptado para solicitações
    const modalContent = `
        <div class="modal-section">
            <h3>📋 Detalhes da Solicitação #${request.id}</h3>
        </div>
        
        <div class="modal-section">
            <h4>👤 Solicitante</h4>
            <div class="modal-field">
                <span class="field-label">Nome:</span>
                <span class="field-value">${request.requester_name}</span>
                <button class="btn-copy" onclick="copyToClipboard('${request.requester_name}')">📋</button>
            </div>
            <div class="modal-field">
                <span class="field-label">Login:</span>
                <span class="field-value">${request.user_login}</span>
                <button class="btn-copy" onclick="copyToClipboard('${request.user_login}')">📋</button>
            </div>
        </div>
        
        <div class="modal-section">
            <h4>📺 Informações do Conteúdo</h4>
            <div class="modal-field">
                <span class="field-label">Título Original:</span>
                <span class="field-value">${request.original_title || 'N/A'}</span>
                <button class="btn-copy" onclick="copyToClipboard('${request.original_title || 'N/A'}')">📋</button>
            </div>
            <div class="modal-field">
                <span class="field-label">URL Original:</span>
                <span class="field-value"><a href="${request.original_url}" target="_blank">${request.original_url}</a></span>
                <button class="btn-copy" onclick="copyToClipboard('${request.original_url}')">📋</button>
            </div>
            <div class="modal-field">
                <span class="field-label">Data Original:</span>
                <span class="field-value">${request.original_date || 'N/A'}</span>
                <button class="btn-copy" onclick="copyToClipboard('${request.original_date || 'N/A'}')">📋</button>
            </div>
        </div>
        
        <div class="modal-section">
            <h4>🎯 Informações da Remoção</h4>
            <div class="modal-field">
                <span class="field-label">URL para Remoção:</span>
                <span class="field-value"><a href="${request.removal_url}" target="_blank">${request.removal_url}</a></span>
                <button class="btn-copy" onclick="copyToClipboard('${request.removal_url}')">📋</button>
            </div>
            <div class="modal-field">
                <span class="field-label">Nome do Usuário:</span>
                <span class="field-value">${request.username || 'N/A'}</span>
                <button class="btn-copy" onclick="copyToClipboard('${request.username || 'N/A'}')">📋</button>
            </div>
        </div>
        
        <div class="modal-section">
            <h4>⚖️ Decisão Administrativa</h4>
            <div class="modal-field">
                <span class="field-label">Status:</span>
                <span class="field-value">
                    <span class="status-badge ${request.status === 'approved' ? 'approved' : 'rejected'}">
                        ${getStatusText(request.status)}
                    </span>
                </span>
            </div>
            <div class="modal-field">
                <span class="field-label">Data da Decisão:</span>
                <span class="field-value">${formatDateTime(request.updated_at)}</span>
                <button class="btn-copy" onclick="copyToClipboard('${formatDateTime(request.updated_at)}')">📋</button>
            </div>
            <div class="modal-field">
                <span class="field-label">Observações:</span>
                <span class="field-value">${request.admin_notes || 'Nenhuma observação'}</span>
                ${request.admin_notes ? `<button class="btn-copy" onclick="copyToClipboard('${request.admin_notes}')">📋</button>` : ''}
            </div>
        </div>
        
        <div class="modal-section">
            <h4>📅 Datas</h4>
            <div class="modal-field">
                <span class="field-label">Solicitação Criada:</span>
                <span class="field-value">${formatDateTime(request.created_at)}</span>
            </div>
            <div class="modal-field">
                <span class="field-label">Última Atualização:</span>
                <span class="field-value">${formatDateTime(request.updated_at)}</span>
            </div>
        </div>
        
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="restoreRequest(${request.id})">
                🔄 Restaurar Solicitação
            </button>
            <button class="btn btn-primary" onclick="closeModal()">
                ✅ Fechar
            </button>
        </div>
    `;
    
    // Mostrar modal
    showModal('Detalhes da Solicitação Arquivada', modalContent);
}

// Função para restaurar solicitação arquivada
async function restoreRequest(requestId) {
    if (!confirm('Tem certeza que deseja restaurar esta solicitação para ativa?')) {
        return;
    }
    
    try {
        showLoading();
        await apiRequest(`/admin/requests/${requestId}/restore`, 'POST');
        
        showToast('Solicitação restaurada com sucesso!', 'success');
        
        // Recarregar ambas as listas
        loadArchivedRequests();
        loadRemovalRequests();
        
    } catch (error) {
        showToast('Erro ao restaurar solicitação: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Modificar função showTab para incluir solicitações arquivadas
const originalShowTab = showTab;
showTab = function(tabName) {
    originalShowTab(tabName);
    
    if (tabName === 'archived-requests') {
        loadArchivedRequests();
    }
};

// Modificar função updateRequestStatus para arquivar automaticamente
const originalUpdateRequestStatus = updateRequestStatus;
updateRequestStatus = async function(requestId, status, notes = '') {
    try {
        const result = await originalUpdateRequestStatus(requestId, status, notes);
        
        // Se foi aprovado ou rejeitado, recarregar lista de arquivados
        if (status === 'approved' || status === 'rejected') {
            setTimeout(() => {
                loadArchivedRequests();
            }, 1000);
        }
        
        return result;
    } catch (error) {
        throw error;
    }
};

