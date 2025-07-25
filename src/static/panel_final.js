console.log('Panel.js carregado!');

let currentUser = null;
let removalItems = [];
let maxItems = 10;
let userRequests = [];

// Função para inicializar o painel
function initializePanel() {
    console.log('Inicializando painel...');
    
    // Simular usuário logado para permitir acesso
    currentUser = { full_name: 'Usuário de Teste', user_type: 'agent' };
    
    // Atualizar nome do usuário
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = currentUser.full_name;
        console.log('Nome do usuário atualizado');
    }
    
    // Adicionar primeiro item
    addRemovalItem();
    
    // Setup do formulário
    const form = document.getElementById('removalForm');
    if (form) {
        form.addEventListener('submit', handleRemovalSubmit);
        console.log('Event listener do formulário adicionado');
    } else {
        console.error('Formulário removalForm não encontrado!');
    }
    
    // Setup dos botões
    setupButtons();
    
    // Carregar histórico (simulado)
    loadUserRequests();
}

function setupButtons() {
    // Botão adicionar mais
    const addButton = document.querySelector('.add-item-btn');
    if (addButton) {
        addButton.addEventListener('click', function(e) {
            e.preventDefault();
            addRemovalItem();
        });
        console.log('Event listener do botão adicionar configurado');
    }
    
    // Botão sair
    const logoutButton = document.querySelector('.logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/';
        });
    }
}

function addRemovalItem() {
    console.log('Adicionando item de remoção...');
    
    if (removalItems.length >= maxItems) {
        alert(`Limite máximo de ${maxItems} itens atingido`);
        return;
    }
    
    const itemId = Date.now();
    removalItems.push(itemId);
    
    const container = document.getElementById('removalItems');
    if (!container) {
        console.error('Container removalItems não encontrado!');
        return;
    }
    
    const itemHtml = `
        <div class="removal-item" id="item_${itemId}" style="margin-bottom: 2rem; padding: 1.5rem; background: rgba(0, 245, 255, 0.05); border: 1px solid rgba(0, 245, 255, 0.2); border-radius: 8px;">
            <div class="item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 style="color: #00f5ff; margin: 0;">Item ${removalItems.length}</h4>
                ${removalItems.length > 1 ? `<button type="button" onclick="removeItem(${itemId})" style="background: #ff4757; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer;">❌ Remover</button>` : ''}
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <label for="originalUrl_${itemId}" style="display: block; color: #00f5ff; margin-bottom: 0.5rem;">URL Original *</label>
                    <input type="url" id="originalUrl_${itemId}" required placeholder="https://www.youtube.com/watch?v=..." style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(0,245,255,0.3); border-radius: 4px; color: white;">
                </div>
                
                <div>
                    <label for="originalTitle_${itemId}" style="display: block; color: #00f5ff; margin-bottom: 0.5rem;">Título Original *</label>
                    <input type="text" id="originalTitle_${itemId}" required placeholder="Título do vídeo original" style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(0,245,255,0.3); border-radius: 4px; color: white;">
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <label for="originalDate_${itemId}" style="display: block; color: #00f5ff; margin-bottom: 0.5rem;">Data do Envio *</label>
                    <input type="date" id="originalDate_${itemId}" required style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(0,245,255,0.3); border-radius: 4px; color: white;">
                </div>
                
                <div>
                    <label for="removalUrl_${itemId}" style="display: block; color: #00f5ff; margin-bottom: 0.5rem;">URL para Remoção *</label>
                    <input type="url" id="removalUrl_${itemId}" required placeholder="https://www.tiktok.com/@user/video/..." style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(0,245,255,0.3); border-radius: 4px; color: white;">
                </div>
            </div>
            
            <div>
                <label for="username_${itemId}" style="display: block; color: #00f5ff; margin-bottom: 0.5rem;">Nome do Usuário *</label>
                <input type="text" id="username_${itemId}" required placeholder="@username ou nome do canal" style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(0,245,255,0.3); border-radius: 4px; color: white;">
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHtml);
    console.log('Item adicionado com sucesso');
    
    // Atualizar botão
    updateAddButton();
}

function removeItem(itemId) {
    console.log('Removendo item:', itemId);
    
    const itemElement = document.getElementById(`item_${itemId}`);
    if (itemElement) {
        itemElement.remove();
    }
    
    removalItems = removalItems.filter(id => id !== itemId);
    updateAddButton();
    
    // Renumerar itens
    const items = document.querySelectorAll('.removal-item');
    items.forEach((item, index) => {
        const header = item.querySelector('.item-header h4');
        if (header) {
            header.textContent = `Item ${index + 1}`;
        }
    });
}

function updateAddButton() {
    const addButton = document.querySelector('.add-item-btn');
    if (addButton) {
        if (removalItems.length >= maxItems) {
            addButton.disabled = true;
            addButton.textContent = `Limite atingido (${maxItems})`;
        } else {
            addButton.disabled = false;
            addButton.textContent = `➕ Adicionar Mais (Limite: ${maxItems})`;
        }
    }
}

async function handleRemovalSubmit(e) {
    e.preventDefault();
    console.log('Enviando solicitação...');
    
    if (removalItems.length === 0) {
        alert('Adicione pelo menos um item para remoção');
        return;
    }
    
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
        
        console.log('Dados coletados:', requests);
        
        // Simular envio bem-sucedido
        alert(`${requests.length} solicitação(ões) enviada(s) com sucesso!`);
        
        // Limpar formulário
        document.getElementById('removalItems').innerHTML = '';
        removalItems = [];
        addRemovalItem();
        
        // Recarregar histórico
        loadUserRequests();
        
    } catch (error) {
        console.error('Erro:', error);
        alert(error.message);
    }
}

function loadUserRequests() {
    console.log('Carregando histórico de solicitações...');
    
    // Simular dados de histórico
    userRequests = [
        {
            id: 1,
            original_url: 'https://www.youtube.com/watch?v=exemplo1',
            original_title: 'Vídeo de Exemplo 1',
            removal_url: 'https://www.tiktok.com/@user/video/exemplo1',
            status: 'Pendente',
            created_at: '2025-01-25'
        },
        {
            id: 2,
            original_url: 'https://www.youtube.com/watch?v=exemplo2',
            original_title: 'Vídeo de Exemplo 2',
            removal_url: 'https://www.tiktok.com/@user/video/exemplo2',
            status: 'Aprovado',
            created_at: '2025-01-24'
        }
    ];
    
    renderUserRequests();
}

function renderUserRequests() {
    const container = document.getElementById('requestsHistory');
    if (!container) {
        console.error('Container requestsHistory não encontrado');
        return;
    }
    
    if (userRequests.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center; padding: 2rem;">Nenhuma solicitação encontrada</p>';
        return;
    }
    
    const html = userRequests.map(request => `
        <div style="background: rgba(0, 245, 255, 0.05); border: 1px solid rgba(0, 245, 255, 0.2); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h4 style="color: #00f5ff; margin: 0;">Solicitação #${request.id}</h4>
                <span style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem; background: ${request.status === 'Aprovado' ? '#2ed573' : '#ffa502'}; color: white;">${request.status}</span>
            </div>
            <p style="color: #ccc; margin: 0.25rem 0;"><strong>Título:</strong> ${request.original_title}</p>
            <p style="color: #ccc; margin: 0.25rem 0;"><strong>URL Original:</strong> ${request.original_url}</p>
            <p style="color: #ccc; margin: 0.25rem 0;"><strong>URL para Remoção:</strong> ${request.removal_url}</p>
            <p style="color: #888; margin: 0.25rem 0; font-size: 0.875rem;">Data: ${request.created_at}</p>
        </div>
    `).join('');
    
    container.innerHTML = html;
    
    // Atualizar contador
    const totalElement = document.getElementById('totalRequests');
    if (totalElement) {
        totalElement.textContent = userRequests.length;
    }
}

// Inicialização quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePanel);
} else {
    // DOM já carregado
    initializePanel();
}

// Backup: inicializar após um pequeno delay
setTimeout(function() {
    if (removalItems.length === 0) {
        console.log('Inicialização de backup executada');
        initializePanel();
    }
}, 1000);

