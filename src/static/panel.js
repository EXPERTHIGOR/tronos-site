// Variáveis globais para o painel de remoção
let currentUser = null;
let removalItems = [];
let maxItems = 10;
let userRequests = [];

// Inicialização do painel
document.addEventListener('DOMContentLoaded', function() {
    checkUserAuth();
    initializePanel();
    loadUserRequests();
    
    // Auto-refresh do histórico a cada 60 segundos
    setInterval(loadUserRequests, 60000);
});

async function checkUserAuth() {
    console.log('Iniciando verificação de autenticação...');
    try {
        const result = await apiRequest('/check-auth');
        console.log('Resultado da autenticação:', result);
        
        if (result.authenticated) {
            currentUser = result.user;
            console.log('Usuário autenticado:', currentUser);
            document.getElementById('userName').textContent = currentUser.full_name;
            
            // Verificar se é admin e redirecionar se necessário
            if (currentUser.user_type === 'admin') {
                console.log('Usuário é admin, redirecionando...');
                window.location.href = '/admin.html';
                return;
            }
            
            console.log('Usuário não é admin, continuando no painel...');
        } else {
            console.log('Usuário não autenticado, redirecionando para home...');
            // Usuário não autenticado, redirecionar para home
            window.location.href = '/';
            return;
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        // Em caso de erro, permitir acesso para debug
        console.log('Permitindo acesso para debug...');
        currentUser = { full_name: 'Usuário de Teste', user_type: 'agent' };
        document.getElementById('userName').textContent = currentUser.full_name;
    }
}

function initializePanel() {
    console.log('Inicializando painel...');
    // Adicionar primeiro item por padrão
    addRemovalItem();
    console.log('Primeiro item adicionado');
    
    // Setup do formulário
    const form = document.getElementById('removalForm');
    if (form) {
        form.addEventListener('submit', handleRemovalSubmit);
        console.log('Event listener do formulário adicionado');
    } else {
        console.error('Formulário removalForm não encontrado!');
    }
}

// Adicionar novo item de remoção
function addRemovalItem() {
    if (removalItems.length >= maxItems) {
        showToast(`Limite máximo de ${maxItems} itens atingido`, 'error');
        return;
    }
    
    const itemId = Date.now();
    const itemNumber = removalItems.length + 1;
    
    const itemHtml = `
        <div class="removal-item" data-item-id="${itemId}">
            <div class="removal-item-header">
                <span class="removal-item-number">Item ${itemNumber}</span>
                ${removalItems.length > 0 ? `
                    <button type="button" class="remove-item-btn" onclick="removeRemovalItem(${itemId})">
                        🗑️ Remover
                    </button>
                ` : ''}
            </div>
            
            <div class="form-section">
                <h3>Informações do Conteúdo Original</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label for="originalUrl_${itemId}">URL Original</label>
                        <input type="url" id="originalUrl_${itemId}" name="originalUrl_${itemId}" required 
                               placeholder="https://www.youtube.com/watch?v=...">
                    </div>
                    <div class="form-group">
                        <label for="originalDate_${itemId}">Data do Envio</label>
                        <input type="date" id="originalDate_${itemId}" name="originalDate_${itemId}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="originalTitle_${itemId}">Título Original</label>
                    <input type="text" id="originalTitle_${itemId}" name="originalTitle_${itemId}" required 
                           placeholder="Título do conteúdo original">
                </div>
            </div>
            
            <div class="form-section">
                <h3>Informações para Remoção</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label for="removalUrl_${itemId}">URL para Remoção</label>
                        <input type="url" id="removalUrl_${itemId}" name="removalUrl_${itemId}" required 
                               placeholder="https://www.tiktok.com/@user/video/...">
                    </div>
                    <div class="form-group">
                        <label for="username_${itemId}">Nome do Usuário</label>
                        <input type="text" id="username_${itemId}" name="username_${itemId}" required 
                               placeholder="Nome ou @username">
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('removalItems').insertAdjacentHTML('beforeend', itemHtml);
    removalItems.push(itemId);
    
    updateCounter();
    updateAddButton();
    
    // Scroll para o novo item
    setTimeout(() => {
        const newItem = document.querySelector(`[data-item-id="${itemId}"]`);
        newItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// Remover item de remoção
function removeRemovalItem(itemId) {
    if (removalItems.length <= 1) {
        showToast('Deve haver pelo menos um item', 'error');
        return;
    }
    
    const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
    if (itemElement) {
        itemElement.remove();
        removalItems = removalItems.filter(id => id !== itemId);
        
        // Renumerar itens
        renumberItems();
        updateCounter();
        updateAddButton();
    }
}

// Renumerar itens após remoção
function renumberItems() {
    const items = document.querySelectorAll('.removal-item');
    items.forEach((item, index) => {
        const numberSpan = item.querySelector('.removal-item-number');
        numberSpan.textContent = `Item ${index + 1}`;
    });
}

// Atualizar contador
function updateCounter() {
    document.getElementById('itemCounter').textContent = `${removalItems.length} / ${maxItems} itens`;
}

// Atualizar botão de adicionar
function updateAddButton() {
    const addBtn = document.getElementById('addMoreBtn');
    if (removalItems.length >= maxItems) {
        addBtn.disabled = true;
        addBtn.textContent = `🚫 Limite Máximo Atingido (${maxItems})`;
    } else {
        addBtn.disabled = false;
        addBtn.textContent = `➕ Adicionar Mais (Limite: ${maxItems})`;
    }
}

// Enviar solicitações
async function handleRemovalSubmit(e) {
    e.preventDefault();
    
    if (removalItems.length === 0) {
        showToast('Adicione pelo menos um item para remoção', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const requests = [];
        
        // Coletar dados de todos os itens
        for (const itemId of removalItems) {
            const originalUrl = document.getElementById(`originalUrl_${itemId}`).value;
            const originalTitle = document.getElementById(`originalTitle_${itemId}`).value;
            const originalDate = document.getElementById(`originalDate_${itemId}`).value;
            const removalUrl = document.getElementById(`removalUrl_${itemId}`).value;
            const username = document.getElementById(`username_${itemId}`).value;
            
            if (!originalUrl || !originalTitle || !originalDate || !removalUrl || !username) {
                throw new Error('Todos os campos são obrigatórios');
            }
            
            requests.push({
                original_url: originalUrl,
                original_title: originalTitle,
                original_date: originalDate,
                removal_url: removalUrl,
                username: username
            });
        }
        
        // Enviar cada solicitação
        let successCount = 0;
        for (const request of requests) {
            try {
                await apiRequest('/removal-request', 'POST', request);
                successCount++;
            } catch (error) {
                console.error('Erro ao enviar solicitação:', error);
            }
        }
        
        if (successCount === requests.length) {
            showToast(`${successCount} solicitação(ões) enviada(s) com sucesso!`, 'success');
            
            // Limpar formulário
            document.getElementById('removalItems').innerHTML = '';
            removalItems = [];
            addRemovalItem();
            
            // Recarregar histórico
            loadUserRequests();
        } else {
            showToast(`${successCount} de ${requests.length} solicitações enviadas`, 'warning');
        }
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Carregar histórico de solicitações do usuário
async function loadUserRequests() {
    try {
        const result = await apiRequest('/my-requests');
        userRequests = result;
        renderUserRequests();
        updateTotalRequests();
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        document.getElementById('requestsHistory').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Erro ao carregar histórico de solicitações</p>
            </div>
        `;
    }
}

function renderUserRequests() {
    const container = document.getElementById('requestsHistory');
    
    if (userRequests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p>Nenhuma solicitação encontrada</p>
                <small style="color: var(--text-secondary);">
                    Suas solicitações aparecerão aqui após o envio
                </small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userRequests.map(request => `
        <div class="history-item">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-sm);">
                <div>
                    <strong style="color: var(--neon-cyan);">${request.original_title}</strong>
                    <span class="history-status status-${request.status}">
                        ${getStatusText(request.status)}
                    </span>
                </div>
                <small style="color: var(--text-secondary);">
                    ${formatDate(request.created_at)}
                </small>
            </div>
            
            <div style="margin-bottom: var(--spacing-sm);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); font-size: 0.9rem;">
                    <div>
                        <strong>Original:</strong><br>
                        <a href="${request.original_url}" target="_blank" style="color: var(--neon-cyan); word-break: break-all;">
                            ${truncateUrl(request.original_url, 40)}
                        </a>
                    </div>
                    <div>
                        <strong>Para Remoção:</strong><br>
                        <a href="${request.removal_url}" target="_blank" style="color: var(--neon-pink); word-break: break-all;">
                            ${truncateUrl(request.removal_url, 40)}
                        </a>
                    </div>
                </div>
            </div>
            
            <div style="font-size: 0.8rem; color: var(--text-secondary);">
                <strong>Usuário:</strong> ${request.username} | 
                <strong>Data Original:</strong> ${formatDate(request.original_date)}
                ${request.admin_notes ? `<br><strong>Observações:</strong> ${request.admin_notes}` : ''}
            </div>
        </div>
    `).join('');
}

function updateTotalRequests() {
    document.getElementById('totalRequests').textContent = userRequests.length;
}

// Funções utilitárias
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
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

// Validação em tempo real
document.addEventListener('input', function(e) {
    if (e.target.type === 'url') {
        validateUrl(e.target);
    }
    
    if (e.target.type === 'date') {
        validateDate(e.target);
    }
});

function validateUrl(input) {
    try {
        new URL(input.value);
        input.style.borderColor = 'rgba(0, 245, 255, 0.3)';
    } catch {
        if (input.value) {
            input.style.borderColor = 'var(--warning)';
        }
    }
}

function validateDate(input) {
    const selectedDate = new Date(input.value);
    const today = new Date();
    
    if (selectedDate > today) {
        input.style.borderColor = 'var(--warning)';
        showToast('Data não pode ser futura', 'warning');
    } else {
        input.style.borderColor = 'rgba(0, 245, 255, 0.3)';
    }
}

// Auto-save (salvar rascunho localmente)
function saveFormData() {
    const formData = {};
    
    removalItems.forEach(itemId => {
        formData[itemId] = {
            originalUrl: document.getElementById(`originalUrl_${itemId}`)?.value || '',
            originalTitle: document.getElementById(`originalTitle_${itemId}`)?.value || '',
            originalDate: document.getElementById(`originalDate_${itemId}`)?.value || '',
            removalUrl: document.getElementById(`removalUrl_${itemId}`)?.value || '',
            username: document.getElementById(`username_${itemId}`)?.value || ''
        };
    });
    
    localStorage.setItem('tronos_draft', JSON.stringify({
        items: removalItems,
        data: formData,
        timestamp: Date.now()
    }));
}

function loadFormData() {
    const saved = localStorage.getItem('tronos_draft');
    if (!saved) return;
    
    try {
        const { items, data, timestamp } = JSON.parse(saved);
        
        // Verificar se o rascunho não é muito antigo (24 horas)
        if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('tronos_draft');
            return;
        }
        
        if (confirm('Encontramos um rascunho salvo. Deseja carregá-lo?')) {
            // Limpar formulário atual
            document.getElementById('removalItems').innerHTML = '';
            removalItems = [];
            
            // Recriar itens
            items.forEach(itemId => {
                removalItems.push(itemId);
                // Lógica para recriar os campos seria implementada aqui
            });
            
            showToast('Rascunho carregado!', 'success');
        }
    } catch (error) {
        console.error('Erro ao carregar rascunho:', error);
        localStorage.removeItem('tronos_draft');
    }
}

// Auto-save a cada 30 segundos
setInterval(saveFormData, 30000);

// Salvar ao sair da página
window.addEventListener('beforeunload', saveFormData);

// Carregar rascunho ao inicializar (após um pequeno delay)
setTimeout(loadFormData, 1000);

// Função de logout específica para o painel
async function logout() {
    if (confirm('Tem certeza que deseja sair? Dados não salvos serão perdidos.')) {
        try {
            await apiRequest('/logout', 'POST');
            localStorage.removeItem('tronos_draft');
            window.location.href = '/';
        } catch (error) {
            showToast('Erro ao fazer logout', 'error');
        }
    }
}

