console.log('Panel.js carregado!');

let currentUser = null;
let removalItems = [];
let maxItems = 10;

// Inicialização do painel
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, iniciando painel...');
    initializePanel();
});

function initializePanel() {
    console.log('Inicializando painel...');
    
    // Simular usuário logado para teste
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
}

function addRemovalItem() {
    console.log('Adicionando item de remoção...');
    
    const itemId = Date.now();
    removalItems.push(itemId);
    
    const container = document.getElementById('removalItems');
    if (!container) {
        console.error('Container removalItems não encontrado!');
        return;
    }
    
    const itemHtml = `
        <div class="removal-item" id="item_${itemId}">
            <div class="item-header">
                <h4>Item ${removalItems.length}</h4>
                ${removalItems.length > 1 ? `<button type="button" onclick="removeItem(${itemId})" class="remove-btn">❌</button>` : ''}
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="originalUrl_${itemId}">URL Original *</label>
                    <input type="url" id="originalUrl_${itemId}" required placeholder="https://www.youtube.com/watch?v=...">
                </div>
                
                <div class="form-group">
                    <label for="originalTitle_${itemId}">Título Original *</label>
                    <input type="text" id="originalTitle_${itemId}" required placeholder="Título do vídeo original">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="originalDate_${itemId}">Data do Envio *</label>
                    <input type="date" id="originalDate_${itemId}" required>
                </div>
                
                <div class="form-group">
                    <label for="removalUrl_${itemId}">URL para Remoção *</label>
                    <input type="url" id="removalUrl_${itemId}" required placeholder="https://www.tiktok.com/@user/video/...">
                </div>
            </div>
            
            <div class="form-group">
                <label for="username_${itemId}">Nome do Usuário *</label>
                <input type="text" id="username_${itemId}" required placeholder="@username ou nome do canal">
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHtml);
    console.log('Item adicionado com sucesso');
    
    // Atualizar botão se chegou no limite
    updateAddButton();
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
        alert(`${requests.length} solicitação(ões) preparada(s) para envio!`);
        
    } catch (error) {
        console.error('Erro:', error);
        alert(error.message);
    }
}

// Adicionar event listeners para botões
document.addEventListener('DOMContentLoaded', function() {
    // Botão adicionar mais
    const addButton = document.querySelector('.add-item-btn');
    if (addButton) {
        addButton.addEventListener('click', addRemovalItem);
    }
});

