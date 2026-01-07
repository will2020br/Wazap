// Sistema de Chat WhatsApp - 100% Client-Side
// Autor: Full-Stack Engineer
// Descrição: Sistema completo de chat usando localStorage e IndexedDB

class WhatsAppClone {
    constructor() {
        this.currentChatId = null;
        this.db = null;
        this.autoDestroyTimer = null;
        this.init();
    }

    init() {
        // Verificar se está na página index ou chat
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            this.initIndex();
        } else if (window.location.pathname.includes('chat.html')) {
            this.initChat();
        }
        
        // Registrar Service Worker para PWA
        this.registerSW();
    }

    // Inicialização da página index
    initIndex() {
        const createBtn = document.getElementById('createChat');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createNewChat());
        }
    }

    // Inicialização da página de chat
    async initChat() {
        // Extrair ID do hash da URL
        this.currentChatId = window.location.hash.substring(1);
        
        if (!this.currentChatId) {
            // Chat vazio - aguardando ID
            this.showEmptyChat();
            return;
        }

        // Inicializar IndexedDB
        await this.initDB();

        // Carregar mensagens existentes
        this.loadMessages();

        // Configurar event listeners
        this.setupChatEventListeners();

        // Verificar autodestruição
        this.checkAutoDestroy();

        // Notificar outros dispositivos
        this.notifyOtherDevices();
    }

    // Criar novo chat
    createNewChat() {
        const chatId = this.generateChatId();
        const chatUrl = `chat.html#${chatId}`;
        
        // Criar entrada no localStorage para indicar que este chat existe
        localStorage.setItem(`chat_${chatId}_created`, new Date().toISOString());
        
        // Redirecionar para o chat
        window.location.href = chatUrl;
    }

    // Gerar ID único para o chat
    generateChatId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Inicializar IndexedDB para arquivos
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('WhatsAppClone', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Criar object store para arquivos
                if (!db.objectStoreNames.contains('files')) {
                    const fileStore = db.createObjectStore('files', { keyPath: 'id' });
                    fileStore.createIndex('chatId', 'chatId', { unique: false });
                }
            };
        });
    }

    // Configurar event listeners da página de chat
    setupChatEventListeners() {
        // Enviar mensagem
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Anexar arquivo
        const attachBtn = document.getElementById('attachBtn');
        const fileInput = document.getElementById('fileInput');
        
        attachBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileAttachment(e));

        // Botões do header
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportChat();
        });

        document.getElementById('deleteBtn').addEventListener('click', () => {
            this.showDeleteConfirm();
        });

        document.getElementById('autoDestroyBtn').addEventListener('click', () => {
            this.showAutoDestroyModal();
        });

        // Modal events
        this.setupModalEvents();
    }

    // Enviar mensagem
    sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text && !this.currentFile) return;
        
        const message = {
            id: Date.now(),
            text: text,
            timestamp: new Date(),
            type: this.currentFile ? 'file' : 'text',
            fileData: this.currentFile,
            sender: 'user'
        };
        
        this.addMessage(message);
        input.value = '';
        this.currentFile = null;
        
        // Simular resposta automática
        setTimeout(() => {
            this.simulateReply();
        }, 1000 + Math.random() * 2000);
    }

    // Simular resposta automática
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
        
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        
        const replyMessage = {
            id: Date.now(),
            text: randomReply,
            timestamp: new Date(),
            type: 'text',
            sender: 'other'
        };
        
        this.addMessage(replyMessage);
    }

    // Adicionar mensagem ao chat
    addMessage(message) {
        // Salvar no localStorage
        const messages = this.getMessages();
        messages.push(message);
        localStorage.setItem(`chat_${this.currentChatId}_messages`, JSON.stringify(messages));
        
        // Renderizar mensagem
        this.renderMessage(message);
        
        // Scroll para a última mensagem
        this.scrollToBottom();
    }

    // Obter mensagens do localStorage
    getMessages() {
        const stored = localStorage.getItem(`chat_${this.currentChatId}_messages`);
        return stored ? JSON.parse(stored) : [];
    }

    // Renderizar mensagem na interface
    renderMessage(message) {
        const messagesList = document.getElementById('messagesList');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender}`;
        
        const time = new Date(message.timestamp);
        const timeStr = time.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        let content = '';
        
        if (message.type === 'text') {
            content = `<div class="message-content">${this.escapeHtml(message.text)}</div>`;
        } else if (message.type === 'file' && message.fileData) {
            content = this.renderFileMessage(message.fileData);
        }
        
        messageDiv.innerHTML = `
            ${content}
            <div class="message-time">${timeStr}</div>
        `;
        
        messagesList.appendChild(messageDiv);
    }

    // Renderizar mensagem de arquivo
    renderFileMessage(fileData) {
        const { type, name, url, size } = fileData;
        
        if (type.startsWith('image/')) {
            return `<div class="message-file">
                <img src="${url}" alt="${name}" onclick="window.open('${url}', '_blank')">
            </div>`;
        } else if (type.startsWith('video/')) {
            return `<div class="message-file">
                <video controls width="200">
                    <source src="${url}" type="${type}">
                    Seu navegador não suporta vídeo.
                </video>
            </div>`;
        } else if (type.startsWith('audio/')) {
            return `<div class="message-file">
                <audio controls>
                    <source src="${url}" type="${type}">
                    Seu navegador não suporta áudio.
                </audio>
            </div>`;
        } else {
            return `<div class="message-file">
                <a href="${url}" download="${name}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.83V19h2v-4.17l1.59 1.59L16 15.01 12 11z" fill="#128C7E"/>
                    </svg>
                    ${name} (${this.formatFileSize(size)})
                </a>
            </div>`;
        }
    }

    // Carregar mensagens existentes
    loadMessages() {
        const messages = this.getMessages();
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';
        
        messages.forEach(message => this.renderMessage(message));
        this.scrollToBottom();
    }

    // Manipular anexo de arquivo
    async handleFileAttachment(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            // Converter arquivo para base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    url: e.target.result,
                    timestamp: new Date()
                };
                
                // Salvar no IndexedDB
                await this.saveFileToDB(fileData);
                
                // Armazenar temporariamente para envio
                this.currentFile = fileData;
                
                // Mostrar preview no input
                const input = document.getElementById('messageInput');
                input.placeholder = `Anexo: ${file.name}`;
                input.style.fontStyle = 'italic';
            };
            
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            alert('Erro ao anexar arquivo. Tente novamente.');
        }
    }

    // Salvar arquivo no IndexedDB
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

    // Obter arquivo do IndexedDB
    async getFileFromDB(fileId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            
            const request = store.get(fileId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Exportar conversa
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
    }

    // Mostrar confirmação de exclusão
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

    // Apagar chat
    deleteChat() {
        // Remover mensagens do localStorage
        localStorage.removeItem(`chat_${this.currentChatId}_messages`);
        
        // Remover arquivos do IndexedDB
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
        
        // Remover configuração de autodestruição
        localStorage.removeItem(`chat_${this.currentChatId}_autodestroy`);
        
        // Redirecionar para index
        window.location.href = 'index.html';
    }

    // Mostrar modal de autodestruição
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

    // Configurar autodestruição
    setAutoDestroy(minutes) {
        const destroyTime = Date.now() + (minutes * 60 * 1000);
        localStorage.setItem(`chat_${this.currentChatId}_autodestroy`, destroyTime);
        
        this.scheduleAutoDestroy(destroyTime);
        
        alert(`Chat será apagado automaticamente em ${minutes} minutos.`);
    }

    // Agendar autodestruição
    scheduleAutoDestroy(destroyTime) {
        const timeLeft = destroyTime - Date.now();
        
        if (timeLeft <= 0) {
            this.deleteChat();
            return;
        }
        
        // Limpar timer anterior se existir
        if (this.autoDestroyTimer) {
            clearTimeout(this.autoDestroyTimer);
        }
        
        // Agendar novo timer
        this.autoDestroyTimer = setTimeout(() => {
            this.deleteChat();
        }, timeLeft);
    }

    // Verificar autodestruição ao carregar
    checkAutoDestroy() {
        const destroyTime = localStorage.getItem(`chat_${this.currentChatId}_autodestroy`);
        if (destroyTime) {
            this.scheduleAutoDestroy(parseInt(destroyTime));
        }
    }

    // Notificar outros dispositivos
    notifyOtherDevices() {
        // Usar BroadcastChannel para notificar outras abas/janelas
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

    // Mostrar notificação
    showNotification(message) {
        // Criar notificação visual
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

    // Configurar eventos do modal
    setupModalEvents() {
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // Botões de cancelar
        document.getElementById('modalCancel').addEventListener('click', () => {
            document.getElementById('confirmModal').classList.remove('active');
        });
        
        document.getElementById('autoDestroyCancel').addEventListener('click', () => {
            document.getElementById('autoDestroyModal').classList.remove('active');
        });
    }

    // Mostrar chat vazio
    showEmptyChat() {
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = `
            <div style="text-align: center; padding: 50px 20px; color: var(--text-secondary);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 20px;">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/>
                </svg>
                <h3>Chat sem identificação</h3>
                <p>Compartilhe o link completo para começar uma conversa</p>
            </div>
        `;
    }

    // Scroll para o final
    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
    }

    // Escapar HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Formatar tamanho de arquivo
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Registrar Service Worker para PWA
    async registerSW() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registrado com sucesso');
            } catch (error) {
                console.log('Falha ao registrar Service Worker:', error);
            }
        }
    }
}

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new WhatsAppClone();
});