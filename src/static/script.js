// Variáveis globais
let currentUser = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkAuthStatus();
});

function initializeApp() {
    // Animações de scroll
    setupScrollAnimations();
    
    // Smooth scrolling para links de navegação
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function setupEventListeners() {
    // Formulários
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerAgentForm').addEventListener('submit', handleRegisterAgent);
    document.getElementById('registerCreatorForm').addEventListener('submit', handleRegisterCreator);
    document.getElementById('contactForm').addEventListener('submit', handleContact);
    
    // Radio buttons para função do agente
    document.querySelectorAll('input[name="agentFunction"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const otherField = document.getElementById('agentFunctionOther');
            if (this.value === 'Outro') {
                otherField.style.display = 'block';
                otherField.required = true;
            } else {
                otherField.style.display = 'none';
                otherField.required = false;
                otherField.value = '';
            }
        });
    });
    
    // Fechar modais ao clicar fora
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    });
}

function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// Funções de Modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        
        // Limpar formulários
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => form.reset());
    }
}

function showLogin() {
    showModal('loginModal');
}

function showRegisterOptions() {
    showModal('registerOptionsModal');
}

function showRegisterForm(type) {
    closeModal('registerOptionsModal');
    if (type === 'agent') {
        showModal('registerAgentModal');
    } else if (type === 'creator') {
        showModal('registerCreatorModal');
    }
}

// Funções de Loading e Toast
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Funções de API
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
        console.error('API Error:', error);
        throw error;
    }
}

// Handlers de Formulário
async function handleLogin(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const formData = {
            login: document.getElementById('loginUsername').value,
            password: document.getElementById('loginPassword').value
        };
        
        const result = await apiRequest('/login', 'POST', formData);
        
        currentUser = result.user;
        showToast('Login realizado com sucesso!');
        closeModal('loginModal');
        
        // Redirecionar baseado no tipo de usuário
        setTimeout(() => {
            if (result.redirect === '/admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/panel.html';
            }
        }, 1000);
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleRegisterAgent(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const functionValue = document.querySelector('input[name="agentFunction"]:checked').value;
        const functionOther = document.getElementById('agentFunctionOther').value;
        
        const formData = {
            login: document.getElementById('agentLogin').value,
            password: document.getElementById('agentPassword').value,
            full_name: document.getElementById('agentFullName').value,
            channel_name: document.getElementById('agentChannelName').value,
            email: document.getElementById('agentEmail').value,
            birth_date: document.getElementById('agentBirthDate').value,
            whatsapp: document.getElementById('agentWhatsapp').value,
            user_type: 'agent',
            function: functionValue,
            function_other: functionValue === 'Outro' ? functionOther : null,
            represented_creator: document.getElementById('agentRepresentedCreator').value,
            registration_code: document.getElementById('agentRegistrationCode').value
        };
        
        await apiRequest('/register', 'POST', formData);
        
        showToast('Cadastro realizado com sucesso! Aguarde aprovação.');
        closeModal('registerAgentModal');
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleRegisterCreator(e) {
    e.preventDefault();
    showLoading();
    
    try {
        // Verificar se todas as declarações foram aceitas
        const declarations = [];
        for (let i = 1; i <= 9; i++) {
            const checkbox = document.getElementById(`declaration${i}`);
            if (!checkbox.checked) {
                throw new Error(`A declaração ${i} deve ser aceita para prosseguir com o cadastro.`);
            }
            declarations.push(checkbox.checked);
        }
        
        // Verificar se a assinatura confere com o nome completo
        const fullName = document.getElementById('creatorFullName').value.trim();
        const signature = document.getElementById('creatorSignature').value.trim();
        
        if (fullName.toLowerCase() !== signature.toLowerCase()) {
            throw new Error('A assinatura deve ser idêntica ao nome completo informado.');
        }
        
        const formData = {
            // Dados de acesso
            email: document.getElementById('creatorEmail').value,
            password: document.getElementById('creatorPassword').value,
            
            // Dados pessoais
            full_name: fullName,
            full_address: document.getElementById('creatorAddress').value,
            birth_date: document.getElementById('creatorBirthDate').value,
            country: document.getElementById('creatorCountry').value,
            phone: document.getElementById('creatorPhone').value,
            document_number: document.getElementById('creatorDocument').value,
            
            // Dados do canal
            social_url: document.getElementById('creatorChannelUrl').value,
            
            // Declarações
            declaration_1: declarations[0],
            declaration_2: declarations[1],
            declaration_3: declarations[2],
            declaration_4: declarations[3],
            declaration_5: declarations[4],
            declaration_6: declarations[5],
            declaration_7: declarations[6],
            declaration_8: declarations[7],
            declaration_9: declarations[8],
            
            // Assinatura
            signature: signature,
            
            // Tipo de usuário
            user_type: 'creator'
        };
        
        await apiRequest('/register', 'POST', formData);
        
        showToast('Cadastro realizado com sucesso! Aguarde aprovação do administrador.');
        closeModal('registerCreatorModal');
        
        // Limpar formulário
        document.getElementById('registerCreatorForm').reset();
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleContact(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const formData = {
            name: document.getElementById('contactName').value,
            email: document.getElementById('contactEmail').value,
            whatsapp: document.getElementById('contactWhatsapp').value,
            video_url: document.getElementById('contactVideoUrl').value,
            message: document.getElementById('contactMessage').value
        };
        
        await apiRequest('/contact', 'POST', formData);
        
        showToast('Mensagem enviada com sucesso!');
        document.getElementById('contactForm').reset();
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Função de Busca
async function searchContent() {
    const url = document.getElementById('searchUrl').value.trim();
    
    if (!url) {
        showToast('Por favor, insira uma URL válida', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const result = await apiRequest(`/search?url=${encodeURIComponent(url)}`);
        
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '';
        
        if (result.found) {
            // Gerar texto completo para cópia
            const fullText = result.results.map(item => 
                `Título Original: ${item.original_title}\nURL do Vídeo: ${item.video_url}\nMotivo: ${item.reason}\nData da Remoção: ${item.date}`
            ).join('\n\n');
            
            resultsContainer.innerHTML = `
                <div class="search-results-found">
                    <h3 style="color: var(--neon-green); margin-bottom: 16px;">✅ Remoções Encontradas</h3>
                    
                    ${result.results.map(item => `
                        <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid var(--neon-green);">
                            <p><strong>Título Original:</strong> ${item.original_title}</p>
                            <p><strong>URL do Vídeo:</strong> <a href="${item.video_url}" target="_blank" style="color: var(--neon-cyan);">${item.video_url}</a></p>
                            <p><strong>Motivo:</strong> ${item.reason}</p>
                            <p><strong>Data da Remoção:</strong> ${item.date}</p>
                        </div>
                    `).join('')}
                    
                    <!-- Botão para copiar todo o texto -->
                    <div style="text-align: center; margin: 20px 0; background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                        <p style="color: var(--text-secondary); margin-bottom: 12px; font-size: 14px;">
                            📋 <strong>Copie as informações acima para entrar em contato conosco</strong> caso precise de suporte ou tenha dúvidas sobre esta remoção.
                        </p>
                        <button class="btn btn-primary" onclick="copyRemovalInfo()">
                            📋 Copiar Informações Completas
                        </button>
                    </div>
                    
                    <!-- Seção explicativa -->
                    <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid var(--neon-cyan);">
                        <h4 style="color: var(--neon-cyan); margin-bottom: 12px;">ℹ️ Informações sobre a Remoção</h4>
                        <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                            Este conteúdo foi removido por <strong style="color: var(--neon-green);">violação de direitos autorais</strong> 
                            após solicitação formal enviada através da plataforma <strong style="color: var(--neon-cyan);">Tronos/Boorges</strong>.
                        </p>
                        <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                            A <strong style="color: var(--neon-cyan);">Tronos/Boorges</strong> é uma plataforma autorizada que atua como 
                            intermediário técnico no envio de notificações de remoção por direitos autorais, conectando 
                            criadores de conteúdo com agentes especializados.
                        </p>
                        <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
                            <strong style="color: var(--warning);">Se você acredita que esta remoção foi feita por engano</strong> 
                            ou possui direitos legítimos sobre o conteúdo, você pode contestar esta decisão.
                        </p>
                        <div style="text-align: center;">
                            <a href="#contact" onclick="scrollToContact()" class="btn btn-secondary" style="text-decoration: none;">
                                📞 Entrar em Contato
                            </a>
                        </div>
                    </div>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h3 style="color: var(--neon-pink); margin-bottom: 16px;">❌ Nenhuma Remoção Encontrada</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 16px;">${result.message}</p>
                    
                    <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid var(--neon-cyan);">
                        <h4 style="color: var(--neon-cyan); margin-bottom: 12px;">🚀 Precisa Remover Conteúdo Não Autorizado?</h4>
                        <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                            A <strong style="color: var(--neon-cyan);">Tronos/Boorges</strong> é especializada em remoção de direitos autorais! 
                            Conectamos criadores de conteúdo com agentes especializados para proteger sua propriedade intelectual.
                        </p>
                        <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
                            <strong style="color: var(--warning);">Observação:</strong> Se este conteúdo foi removido por nós anteriormente, 
                            pode não aparecer em nossa busca devido a atualizações do sistema. Remoções mais antigas podem não estar indexadas.
                        </p>
                        <div style="margin-top: 16px;">
                            <a href="#contact" onclick="scrollToContact()" class="btn btn-primary" style="text-decoration: none; margin-right: 10px;">
                                📞 Solicitar Remoção
                            </a>
                            <a href="#about" onclick="document.getElementById('about').scrollIntoView({behavior: 'smooth'})" class="btn btn-secondary" style="text-decoration: none;">
                                📋 Saiba Mais
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }
        
        resultsContainer.classList.add('show');
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Função para copiar informações de remoção
function copyRemovalInfo() {
    try {
        // Buscar container de resultados
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) {
            showToast('Nenhuma informação encontrada para copiar.', 'error');
            return;
        }
        
        // Coletar informações de forma mais direta e limpa
        let fullText = '';
        
        // Procurar por elementos com informações específicas
        const titleElement = searchResults.querySelector('p strong:contains("Título Original:")');
        const urlElement = searchResults.querySelector('p strong:contains("URL do Vídeo:")');
        const reasonElement = searchResults.querySelector('p strong:contains("Motivo:")');
        const dateElement = searchResults.querySelector('p strong:contains("Data da Remoção:")');
        
        // Método alternativo: buscar por texto diretamente
        const allParagraphs = searchResults.querySelectorAll('p');
        const infoLines = [];
        
        allParagraphs.forEach(p => {
            const text = p.textContent.trim();
            if (text.includes('Título Original:') || 
                text.includes('URL do Vídeo:') || 
                text.includes('Motivo:') || 
                text.includes('Data da Remoção:')) {
                // Limpar texto removendo espaços extras
                const cleanText = text.replace(/\s+/g, ' ').trim();
                infoLines.push(cleanText);
            }
        });
        
        if (infoLines.length > 0) {
            fullText = infoLines.join('\n');
        } else {
            // Fallback final: coletar texto básico
            fullText = 'Informações da Remoção:\n\n' + searchResults.textContent
                .replace(/\s+/g, ' ')
                .replace(/📋.*?transferência!/g, '')
                .replace(/ℹ️.*?decisão\./g, '')
                .trim();
        }
        
        if (fullText && fullText.length > 10) {
            navigator.clipboard.writeText(fullText).then(() => {
                showToast('📋 Informações copiadas para a área de transferência!', 'success');
                
                // Efeito visual no botão
                try {
                    const button = event.target;
                    const originalText = button.innerHTML;
                    button.innerHTML = '✅ Copiado!';
                    button.style.background = 'var(--neon-green)';
                    
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        button.style.background = '';
                    }, 2000);
                } catch (btnError) {
                    // Ignorar erro do botão, o importante é que copiou
                    console.log('Efeito visual do botão ignorado');
                }
                
            }).catch(err => {
                console.error('Erro ao copiar:', err);
                showToast('Erro ao copiar informações. Tente novamente.', 'error');
            });
        } else {
            showToast('Nenhuma informação válida encontrada para copiar.', 'error');
        }
        
    } catch (error) {
        console.error('Erro na função copyRemovalInfo:', error);
        showToast('Erro ao processar informações. Tente novamente.', 'error');
    }
}

// Funções de Navegação
function scrollToSearch() {
    document.getElementById('search').scrollIntoView({
        behavior: 'smooth'
    });
}

function scrollToContact() {
    document.getElementById('contact').scrollIntoView({
        behavior: 'smooth'
    });
}

// Verificar status de autenticação
async function checkAuthStatus() {
    try {
        // Verificar se há sessão ativa
        const response = await fetch('/api/check-auth');
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
                currentUser = data.user;
                updateNavForLoggedUser();
            }
        }
    } catch (error) {
        console.log('Usuário não autenticado');
    }
}

function updateNavForLoggedUser() {
    if (currentUser) {
        const navButtons = document.querySelector('.nav-buttons');
        
        // Determinar URL do painel baseado no tipo de usuário
        let panelUrl = '/panel.html'; // Padrão para agentes e criadores
        if (currentUser.user_type === 'admin') {
            panelUrl = '/admin.html';
        }
        
        navButtons.innerHTML = `
            <span style="color: var(--neon-cyan);">Olá, ${currentUser.full_name}</span>
            <button class="btn btn-primary" onclick="window.location.href='${panelUrl}'">
                📊 Painel
            </button>
            <button class="btn btn-secondary" onclick="logout()">Sair</button>
        `;
    }
}

async function logout() {
    try {
        await apiRequest('/logout', 'POST');
        currentUser = null;
        showToast('Logout realizado com sucesso!');
        
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Validações de formulário
function validateForm(formId) {
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = 'var(--error)';
            isValid = false;
        } else {
            input.style.borderColor = 'rgba(0, 245, 255, 0.3)';
        }
    });
    
    return isValid;
}

// Formatação de campos
document.addEventListener('input', function(e) {
    // Formatação de WhatsApp
    if (e.target.id.includes('whatsapp') || e.target.id.includes('Whatsapp')) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        e.target.value = value;
    }
    
    // Validação de email em tempo real
    if (e.target.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (e.target.value && !emailRegex.test(e.target.value)) {
            e.target.style.borderColor = 'var(--warning)';
        } else {
            e.target.style.borderColor = 'rgba(0, 245, 255, 0.3)';
        }
    }
});

// Efeitos visuais adicionais
function addParticleEffect(element) {
    const rect = element.getBoundingClientRect();
    const particle = document.createElement('div');
    particle.style.cssText = `
        position: fixed;
        width: 4px;
        height: 4px;
        background: var(--neon-cyan);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        left: ${rect.left + rect.width/2}px;
        top: ${rect.top + rect.height/2}px;
        animation: particleExplode 0.6s ease-out forwards;
    `;
    
    document.body.appendChild(particle);
    
    setTimeout(() => {
        particle.remove();
    }, 600);
}

// CSS para animação de partícula
const style = document.createElement('style');
style.textContent = `
    @keyframes particleExplode {
        0% {
            transform: scale(1) translate(0, 0);
            opacity: 1;
        }
        100% {
            transform: scale(0) translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Adicionar efeito de partícula aos botões
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn')) {
        addParticleEffect(e.target);
    }
});

// Menu mobile
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('mobile-active');
}

// Adicionar listener para o toggle do menu mobile
document.querySelector('.mobile-menu-toggle')?.addEventListener('click', toggleMobileMenu);

// Fechar menu mobile ao clicar em link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        document.querySelector('.nav-menu')?.classList.remove('mobile-active');
    });
});

// Efeito de digitação para o título
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Easter egg - Konami Code
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

document.addEventListener('keydown', function(e) {
    konamiCode.push(e.code);
    
    if (konamiCode.length > konamiSequence.length) {
        konamiCode.shift();
    }
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        activateEasterEgg();
        konamiCode = [];
    }
});

function activateEasterEgg() {
    document.body.style.animation = 'rainbow 2s infinite';
    showToast('🎉 Código Konami ativado! Modo Cyberpunk ON!', 'success');
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rainbow {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
        document.body.style.animation = '';
        style.remove();
    }, 10000);
}

