// WhatsApp Clone - GitHub Pages Optimized Version
class WhatsAppClone {
    constructor() {
        this.currentChatId = null;
        this.db = null;
        this.autoDestroyTimer = null;
        this.basePath = this.getBasePath();
        this.repoName = this.getRepoName();
        this.init();
    }

    // Detectar caminho base do GitHub Pages
    getBasePath() {
        const path = window.location.pathname;
        const parts = path.split('/');
        
        // Se estiver em subdiretório (GitHub Pages)
        if (parts.length > 2 && parts[1] && !parts[1].includes('.html')) {
            return `/${parts[1]}/`;
        }
        return '/';
    }

    getRepoName() {
        const path = window.location.pathname;
        const parts = path.split('/');
        return parts[1] && !parts[1].includes('.html') ? parts[1] : '';
    }

    init() {
        console.log('🚀 WhatsApp Clone - GitHub Pages Mode');
        console.log('📍 Base Path:', this.basePath);
        console.log('📁 Repo Name:', this.repoName);
        console.log('📍 Current Path:', window.location.pathname);

        // Detectar página atual
        const path = window.location.pathname;
        
        if (path.includes('index.html') || path === this.basePath || path === `${this.basePath}index.html`) {
            this.initIndex();
        } else if (path.includes('chat.html')) {
            this.initChat();
        }
        
        this.registerSW();
    }

    initIndex() {
        console.log('🏠 Inicializando página inicial');
        const createBtn = document.getElementById('createChat');
        
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                console.log('📝 Criando novo chat...');
                this.createNewChat();
            });
        } else {
            console.error('❌ Botão createChat não encontrado');
        }
    }

    async initChat() {
        console.log('💬 Inicializando chat');
        
        // Extrair ID do hash
        this.currentChatId = window.location.hash.substring(1);
        console.log('🔑 Chat ID:', this.currentChatId);
        
        if (!this.currentChatId) {
            console.log('⚠️ Chat ID não encontrado na URL');
            this.showEmptyChat();
            return;
        }

        try {
            await this.initDB();
            this.loadMessages();
            this.setupChatEventListeners();
            this.checkAutoDestroy();
            this.notifyOtherDevices();
            console.log('✅ Chat inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar chat:', error);
        }
    }

    createNewChat() {
        const chatId = this.generateChatId();
        const chatUrl = `${this.basePath}chat.html#${chatId}`;
        
        console.log('🎯 Redirecionando para:', chatUrl);
        
        // Salvar metadata
        localStorage.setItem(`chat_${chatId}_created`, new Date().toISOString());
        
        // Redirecionar
        window.location.href = chatUrl;
    }

    generateChatId() {
        return 'chat_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('WhatsAppCloneDB', 1);
            
            request.onerror = () => {
                console.error('❌ Erro ao abrir IndexedDB');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB conectado');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                console.log('🔧 Criando/Atualizando IndexedDB');
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('files')) {
                    const fileStore = db.createObjectStore('files', { keyPath: 'id' });
                    fileStore.createIndex('chatId', 'chatId', { unique: false });
                }
            };
        });
    }

    setupChatEventListeners() {
        console.log('🔧 Configurando event listeners do chat');
        
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        const attachBtn = document.getElementById('attachBtn');
        const fileInput = document.getElementById('fileInput');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }
        
        if (attachBtn && fileInput) {
            attachBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileAttachment(e));
        }
        
        // Header buttons
        const backBtn = document.getElementById('backBtn');
        const exportBtn = document.getElementById('exportBtn');
        const deleteBtn = document.getElementById('deleteBtn');
        const autoDestroyBtn = document.getElementById('autoDestroyBtn');
        
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = `${this.basePath}index.html`;
            });
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportChat());
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.showDeleteConfirm());
        }
        
        if (autoDestroyBtn) {
            autoDestroyBtn.addEventListener('click', () => this.showAutoDestroyModal());
        }
        
        this.setupModalEvents();
    }

    sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input) return;
        
        const text = input.value.trim();
        if (!text && !this.currentFile) return;
        
        const message = {
            id: Date.now(),
            text: text,
            timestamp: new Date().toISOString(),
            type: this.currentFile ? 'file' : 'text',
            fileData: this.currentFile,
            sender: 'user'
        };
        
        this.addMessage(message);
        input.value = '';
        this.currentFile = null;
        input.placeholder = 'Digite uma mensagem...';
        input.style.fontStyle = 'normal';
        
        // Simular resposta
        setTimeout(() => this.simulateReply(), 1000 + Math.random() * 2000);
    }

    simulateReply() {
        const replies = [
            "Olá! Como posso ajudar?",
            "Entendi! 😊",
            "Que legal! Conte mais sobre isso.",
            "Concordo com você!",
            "Hmm, interessante...",
            "Desculpe, não entendi muito bem.",
            "Você está tendo um ótimo dia?",
            "Obrigado pela mensagem!"
        ];
        
        const replyMessage = {
            id: Date.now(),
            text: replies[Math.floor(Math.random() * replies.length)],
            timestamp: new Date().toISOString(),
            type: 'text',
            sender: 'other'
        };
        
        this.addMessage(replyMessage);
    }

    addMessage(message) {
        const messages = this.getMessages();
        messages.push(message);
        
        try {
            localStorage.setItem(`chat_${this.currentChatId}_messages`, JSON.stringify(messages));
            this.renderMessage(message);
            this.scrollToBottom();
            console.log('✅ Mensagem adicionada:', message.id);
        } catch (error) {
            console.error('❌ Erro ao salvar mensagem:', error);
        }
    }

    getMessages() {
        try {
            const stored = localStorage.getItem(`chat_${this.currentChatId}_messages`);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('❌ Erro ao carregar mensagens:', error);
            return [];
        }
    }

    renderMessage(message) {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender}`;
        
        const time = new Date(message.timestamp);
        const timeStr = time.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        let content = '';
        
        if (message.type === 'text') {
            content = `<div class="message-content">${this.escapeHtml(message.text || '')}</div>`;
        } else if (message.type === 'file' && message.fileData) {
            content = this.renderFileMessage(message.fileData);
        }
        
        messageDiv.innerHTML = `
            ${content}
            <div class="message-time">${timeStr}</div>
        `;
        
        messagesList.appendChild(messageDiv);
    }

    renderFileMessage(fileData) {
        const { type, name, url, size } = fileData;
        
        if (type.startsWith('image/')) {
            return `<div class="message-file">
                <img src="${url}" alt="${name}" onclick="window.open('${url}', '_blank')" style="max-width: 200px; border-radius: 12px; cursor: pointer;">
            </div>`;
        } else if (type.startsWith('video/')) {
            return `<div class="message-file">
                <video controls style="max-width: 200px; border-radius: 12px;">
                    <source src="${url}" type="${type}">
                    Seu navegador não suporta vídeo.
                </video>
            </div>`;
        } else if (type.startsWith('audio/')) {
            return `<div class="message-file">
                <audio controls style="width: 200px;">
                    <source src="${url}" type="${type}">
                    Seu navegador não suporta áudio.
                </audio>
            </div>`;
        } else {
            return `<div class="message-file">
                <a href="${url}" download="${name}" style="color: #128C7E; text-decoration: none; display: flex; align-items: center; gap: 8px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.83V19h2v-4.17l1.59 1.59L16 15.01 12 11z" fill="#128C7E"/>
                    </svg>
                    ${name} (${this.formatFileSize(size)})
                </a>
            </div>`;
        }
    }

    loadMessages() {
        const messages = this.getMessages();
        const messagesList = document.getElementById('messagesList');
        
        if (!messagesList) return;
        
        messagesList.innerHTML = '';
        messages.forEach(message => this.renderMessage(message));
        this.scrollToBottom();
        console.log(`📨 ${messages.length} mensagens carregadas`);
    }

    async handleFileAttachment(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('📎 Anexando arquivo:', file.name);
        
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    url: e.target.result,
                    timestamp: new Date().toISOString()
                };
                
                await this.saveFileToDB(fileData);
                this.currentFile = fileData;
                
                const input = document.getElementById('messageInput');
                input.placeholder = `Anexo: ${file.name}`;
                input.style.fontStyle = 'italic';
            };
            
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('❌ Erro ao processar arquivo:', error);
            alert('Erro ao anexar arquivo. Tente novamente.');
        }
    }

    async saveFileToDB(fileData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            
            fileData.id = Date.now();
            fileData.chatId = this.currentChatId;
            
            const request = store.add(fileData);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    exportChat() {
        const messages = this.getMessages();
        const chatData = {
            chatId: this.currentChatId,
            exportDate: new Date().toISOString(),
            messages: messages
        };
        
        const dataStr = JSON.stringify(chatData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `chat_${this.currentChatId}_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        console.log('💾 Chat exportado');
    }

    showDeleteConfirm() {
        const modal = document.getElementById('confirmModal');
        const message = document.getElementById('modalMessage');
        
        message.textContent = 'Tem certeza que deseja apagar este chat permanentemente?';
        modal.classList.add('active');
        
        document.getElementById('modalConfirm').onclick = () => {
            this.deleteChat();
            modal.classList.remove('active');
        };
    }

    deleteChat() {
        console.log('🗑️ Apagando chat:', this.currentChatId);
        
        localStorage.removeItem(`chat_${this.currentChatId}_messages`);
        localStorage.removeItem(`chat_${this.currentChatId}_autodestroy`);
        
        if (this.db) {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            const index = store.index('chatId');
            
            const request = index.openCursor(IDBKeyRange.only(this.currentChatId));
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
        }
        
        window.location.href = `${this.basePath}index.html`;
    }

    showAutoDestroyModal() {
        const modal = document.getElementById('autoDestroyModal');
        modal.classList.add('active');
        
        document.getElementById('autoDestroyConfirm').onclick = () => {
            const minutes = parseInt(document.getElementById('destroyTime').value);
            if (minutes > 0) {
                this.setAutoDestroy(minutes);
                modal.classList.remove('active');
            }
        };
    }

    setAutoDestroy(minutes) {
        const destroyTime = Date.now() + (minutes * 60 * 1000);
        localStorage.setItem(`chat_${this.currentChatId}_autodestroy`, destroyTime);
        
        this.scheduleAutoDestroy(destroyTime);
        alert(`Chat será apagado automaticamente em ${minutes} minutos.`);
    }

    scheduleAutoDestroy(destroyTime) {
        const timeLeft = destroyTime - Date.now();
        
        if (timeLeft <= 0) {
            this.deleteChat();
            return;
        }
        
        if (this.autoDestroyTimer) {
            clearTimeout(this.autoDestroyTimer);
        }
        
        this.autoDestroyTimer = setTimeout(() => {
            this.deleteChat();
        }, timeLeft);
        
        console.log(`⏰ Autodestruição agendada em ${Math.ceil(timeLeft / 60000)} minutos`);
    }

    checkAutoDestroy() {
        const destroyTime = localStorage.getItem(`chat_${this.currentChatId}_autodestroy`);
        if (destroyTime) {
            this.scheduleAutoDestroy(parseInt(destroyTime));
        }
    }

    notifyOtherDevices() {
        if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel(`chat_${this.currentChatId}`);
            
            channel.postMessage({
                type: 'chat_opened',
                timestamp: new Date().toISOString()
            });
            
            channel.onmessage = (event) => {
                if (event.data.type === 'chat_opened') {
                    this.showNotification('Este chat foi aberto em outro dispositivo!');
                }
            };
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 2000;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    setupModalEvents() {
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        const modalCancel = document.getElementById('modalCancel');
        const autoDestroyCancel = document.getElementById('autoDestroyCancel');
        
        if (modalCancel) {
            modalCancel.addEventListener('click', () => {
                document.getElementById('confirmModal').classList.remove('active');
            });
        }
        
        if (autoDestroyCancel) {
            autoDestroyCancel.addEventListener('click', () => {
                document.getElementById('autoDestroyModal').classList.remove('active');
            });
        }
    }

    showEmptyChat() {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        messagesList.innerHTML = `
            <div style="text-align: center; padding: 50px 20px; color: var(--text-secondary);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 20px;">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/>
                </svg>
                <h3>Chat sem identificação</h3>
                <p>Compartilhe o link completo para começar uma conversa</p>
                <div style="margin-top: 20px; padding: 10px; background: var(--background); border-radius: 8px; font-family: monospace; font-size: 12px; word-break: break-all;">
                    ${window.location.href}
                </div>
            </div>
        `;
    }

    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async registerSW() {
        if ('serviceWorker' in navigator) {
            try {
                const swUrl = `${this.basePath}sw.js`;
                console.log('📡 Registrando Service Worker:', swUrl);
                await navigator.serviceWorker.register(swUrl);
                console.log('✅ Service Worker registrado com sucesso');
            } catch (error) {
                console.log('❌ Falha ao registrar Service Worker:', error);
            }
        }
    }
}

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📝 DOM carregado, inicializando WhatsApp Clone');
        new WhatsAppClone();
    });
} else {
    console.log('📝 DOM já carregado, inicializando WhatsApp Clone');
    new WhatsAppClone();
}