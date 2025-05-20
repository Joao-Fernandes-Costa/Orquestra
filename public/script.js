// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- SELEÇÃO DE ELEMENTOS ---
    // Autenticação
    const authContainer = document.getElementById('authContainer');
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const btnLogin = document.getElementById('btnLogin');
    const registerUsernameInput = document.getElementById('registerUsername');
    const registerPasswordInput = document.getElementById('registerPassword');
    const btnRegister = document.getElementById('btnRegister');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    
    // Aplicação Principal
    const appSection = document.getElementById('appSection');
    const userInfoText = document.getElementById('userInfoText');
    const btnLogout = document.getElementById('btnLogout');
    const mainNavButtons = document.querySelectorAll('.main-nav button');
    const messageArea = document.getElementById('messageArea');
    
    // Seções de Visualização
    const viewCriar = document.getElementById('viewCriar');
    const viewAgendadas = document.getElementById('viewAgendadas');
    const viewDiarias = document.getElementById('viewDiarias');
    const viewListas = document.getElementById('viewListas');
    const allViews = [viewCriar, viewAgendadas, viewDiarias, viewListas];

    // Formulário Nova Tarefa
    const formNovaTarefa = document.getElementById('formNovaTarefa');
    const inputTitulo = document.getElementById('inputTitulo');
    const inputAssunto = document.getElementById('inputAssunto');
    const selectTipoTarefa = document.getElementById('selectTipoTarefa');
    const campoDataAgendada = document.getElementById('campoDataAgendada');
    const inputDataAgendada = document.getElementById('inputDataAgendada');
    const campoSubtarefas = document.getElementById('campoSubtarefas'); 
    const listaInputsSubtarefas = document.getElementById('listaInputsSubtarefas');
    const btnAdicionarSubtarefaInput = document.getElementById('btnAdicionarSubtarefaInput');
    const editTaskIdInput = document.getElementById('editTaskId');
    const btnSalvarTarefa = document.getElementById('btnSalvarTarefa');

    // Listas de Tarefas ULs
    // const listaTarefasNormais = document.getElementById('listaTarefasNormais'); // Removida da view 'criar'
    const listaTarefasAgendadas = document.getElementById('listaTarefasAgendadas');
    const listaTarefasDiarias = document.getElementById('listaTarefasDiarias');
    const listaTarefasListas = document.getElementById('listaTarefasListas');

    let currentUser = null;
    let currentView = 'criar'; 
    let allTasksCache = [];
    let originalTaskDataForEdit = {}; 

    // --- FUNÇÕES AUXILIARES DE UI ---
    function showMessage(message, type = 'info', duration = 3000) {
        if (!messageArea) { console.error("Elemento messageArea não encontrado."); return; }
        messageArea.textContent = message;
        messageArea.className = 'message-area show';
        if (type === 'error') messageArea.classList.add('error');
        else if (type === 'success') messageArea.classList.add('success');
        setTimeout(() => {
            if (messageArea) messageArea.classList.remove('show');
        }, duration);
    }

    function updateUIForAuth() {
        console.log("updateUIForAuth INÍCIO. currentUser:", JSON.stringify(currentUser));
        if (currentUser && currentUser.loggedIn) {
            if (authContainer) authContainer.classList.add('hidden');
            if (appSection) appSection.classList.remove('hidden');
            if (userInfoText) userInfoText.innerHTML = `Logado como: <strong>${currentUser.username}</strong>`;
            
            console.log("updateUIForAuth: Usuário logado. Chamando setActiveView com currentView:", currentView);
            if (typeof setActiveView === "function") {
                setActiveView(currentView); 
            } else {
                console.error("ERRO CRÍTICO: Função setActiveView não está definida!");
                showMessage("Erro crítico na aplicação (setActiveView).", "error", 10000);
            }
        } else {
            console.log("updateUIForAuth: Usuário NÃO LOGADO. Mostrando authContainer.");
            if (authContainer) authContainer.classList.remove('hidden');
            if (appSection) appSection.classList.add('hidden');
            if (typeof showLoginSection === "function") {
                showLoginSection();
            } else {
                console.error("ERRO CRÍTICO: Função showLoginSection não está definida!");
                showMessage("Erro crítico na aplicação (showLoginSection).", "error", 10000);
            }
        }
        console.log("updateUIForAuth FIM.");
    }

    function showLoginSection() {
        console.log("Chamando showLoginSection");
        if (loginSection && registerSection) {
            loginSection.classList.remove('hidden');
            registerSection.classList.add('hidden');
            console.log("showLoginSection: loginSection visível, registerSection escondida.");
        } else {
            console.error("showLoginSection: loginSection ou registerSection não encontradas no DOM!");
        }
    }

    function showRegisterSection() {
        console.log("Chamando showRegisterSection");
        if (loginSection && registerSection) {
            loginSection.classList.add('hidden');
            registerSection.classList.remove('hidden');
            console.log("showRegisterSection: registerSection visível, loginSection escondida.");
        } else {
            console.error("showRegisterSection: loginSection ou registerSection não encontradas no DOM!");
        }
    }
    
    // --- LÓGICA DE AUTENTICAÇÃO ---
    async function checkCurrentUser() {
        console.log("checkCurrentUser INÍCIO");
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();
            currentUser = data;
            console.log("checkCurrentUser: Resposta de /api/auth/me:", JSON.stringify(data));
        } catch (error) {
            console.error("checkCurrentUser: Erro ao buscar /api/auth/me:", error);
            currentUser = { loggedIn: false };
        }
        updateUIForAuth();
        console.log("checkCurrentUser FIM");
    }

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault(); 
            console.log("Link 'Registre-se' (showRegisterLink) clicado.");
            showRegisterSection();
        });
    } else {
        console.error("Elemento com ID 'showRegister' (o link para registrar) não foi encontrado no DOM!");
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Link 'Faça Login' (showLoginLink) clicado.");
            showLoginSection();
        });
    } else {
        console.error("Elemento com ID 'showLogin' (o link para login) não foi encontrado no DOM!");
    }

    if (btnRegister) {
        btnRegister.addEventListener('click', async () => {
            console.log("Botão 'Registrar' (do formulário) clicado.");
            if (!registerUsernameInput || !registerPasswordInput) {
                console.error("Inputs de registro (username ou password) não encontrados.");
                return showMessage('Erro interno no formulário de registro.', 'error');
            }
            const username = registerUsernameInput.value.trim();
            const password = registerPasswordInput.value.trim();
            if (!username || !password) return showMessage('Nome de usuário e senha são obrigatórios.', 'error');
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                if (response.ok) {
                    showMessage(data.message || 'Registrado! Faça o login.', 'success');
                    showLoginSection(); 
                    if(registerUsernameInput) registerUsernameInput.value = ''; 
                    if(registerPasswordInput) registerPasswordInput.value = '';
                } else {
                     showMessage(data.message || 'Erro no registro.', 'error');
                }
            } catch (error) { 
                console.error("Erro na requisição de registro:", error); 
                showMessage('Erro de conexão ao registrar.', 'error');
            }
        });
    } else {
        console.error("Elemento #btnRegister (botão de submeter registro) não encontrado!");
    }
    
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            console.log("Botão 'Entrar' (do formulário de login) clicado.");
            if (!loginUsernameInput || !loginPasswordInput) {
                console.error("Inputs de login (username ou password) não encontrados.");
                return showMessage('Erro interno no formulário de login.', 'error');
            }
            const username = loginUsernameInput.value.trim();
            const password = loginPasswordInput.value.trim();
            if (!username || !password) return showMessage('Nome de usuário e senha são obrigatórios.', 'error');
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                if (response.ok) {
                    showMessage('Login bem-sucedido!', 'success');
                    currentUser = { loggedIn: true, userId: data.userId, username: data.username };
                    updateUIForAuth();
                    if(loginUsernameInput) loginUsernameInput.value = ''; 
                    if(loginPasswordInput) loginPasswordInput.value = '';
                } else {
                    showMessage(data.message || 'Nome de usuário ou senha inválidos.', 'error');
                }
            } catch (error) { 
                console.error("Erro na requisição de login:", error); 
                showMessage('Erro de conexão ao logar.', 'error');
            }
        });
    } else {
        console.error("Elemento #btnLogin (botão de submeter login) não encontrado!");
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (!confirm('Tem certeza que deseja sair?')) return;
            try {
                const response = await fetch('/api/auth/logout', { method: 'POST' });
                const data = await response.json();
                if (response.ok) showMessage('Logout bem-sucedido.', 'success');
                else showMessage(data.message || 'Erro no logout.', 'error');
            } catch (error) { 
                console.error("Erro na requisição de logout:", error);
                showMessage('Erro de conexão ao deslogar.', 'error');
            }
            currentUser = { loggedIn: false };
            allTasksCache = [];
            [listaTarefasAgendadas, listaTarefasDiarias, listaTarefasListas].forEach(ul => { // Não limpa mais listaTarefasNormais
                if(ul) ul.innerHTML = '';
            });
            updateUIForAuth();
        });
    } else {
        console.error("Elemento #btnLogout não encontrado!");
    }

    // --- LÓGICA DE NAVEGAÇÃO ENTRE VIEWS ---
    function setActiveView(viewName) {
        console.log(`setActiveView INÍCIO para view: ${viewName}`);
        currentView = viewName;

        allViews.forEach((viewElement, index) => {
            if (viewElement) {
                viewElement.classList.add('hidden');
            } else {
                console.error(`ERRO: Elemento de view no índice ${index} do array allViews é nulo! Verifique getElementById.`);
            }
        });
        mainNavButtons.forEach(btn => btn.classList.remove('active-view'));

        let activeViewElement = null;
        if (viewName === 'criar') activeViewElement = viewCriar;
        else activeViewElement = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
        
        const activeButton = document.querySelector(`.main-nav button[data-view="${viewName}"]`);

        console.log(`Tentando tornar visível a view:`, activeViewElement ? activeViewElement.id : "NÃO ENCONTRADO");
        if (activeViewElement) {
            activeViewElement.classList.remove('hidden');
        } else {
            console.error(`ERRO: Elemento da view para "${viewName}" NÃO FOI ENCONTRADO no DOM!`);
        }

        if (activeButton) {
            activeButton.classList.add('active-view');
        } else {
            console.warn(`Botão de navegação para a view "${viewName}" NÃO FOI ENCONTRADO!`);
        }
        
        console.log(`Chamando loadTasksForCurrentView para a view: ${currentView}`);
        if (typeof loadTasksForCurrentView === "function") {
            loadTasksForCurrentView();
        } else {
            console.error("ERRO CRÍTICO: Função loadTasksForCurrentView não está definida!");
        }
        console.log(`setActiveView FIM para view: ${viewName}`);
    }

    if (mainNavButtons && mainNavButtons.length > 0) {
        mainNavButtons.forEach(button => {
            button.addEventListener('click', () => {
                const viewName = button.getAttribute('data-view');
                setActiveView(viewName);
            });
        });
    } else {
        console.warn("Nenhum botão de navegação principal (.main-nav button) encontrado.");
    }
    

    // --- LÓGICA DO FORMULÁRIO DE NOVA TAREFA ---
    if (selectTipoTarefa) {
        selectTipoTarefa.addEventListener('change', () => {
            const tipo = selectTipoTarefa.value;
            if (campoDataAgendada) campoDataAgendada.classList.toggle('hidden', tipo !== 'agendada');
            if (campoSubtarefas) campoSubtarefas.classList.toggle('hidden', tipo !== 'lista');
            
            if (tipo !== 'agendada' && inputDataAgendada) inputDataAgendada.value = '';
            if (tipo !== 'lista' && listaInputsSubtarefas) listaInputsSubtarefas.innerHTML = '';
        });
    } else {
        console.warn("Elemento #selectTipoTarefa não encontrado.");
    }
    
    if (formNovaTarefa) {
        formNovaTarefa.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser || !currentUser.loggedIn) return showMessage("Você precisa estar logado.", "error");
            if (!inputTitulo || !inputAssunto || !selectTipoTarefa || !inputDataAgendada || !editTaskIdInput || !btnSalvarTarefa) {
                console.error("Elementos do formulário de tarefa não encontrados ao submeter.");
                return showMessage("Erro interno no formulário.", "error");
            }

            const title = inputTitulo.value.trim();
            const subject = inputAssunto.value.trim();
            const type = selectTipoTarefa.value;
            const dueDateValue = inputDataAgendada.value;
            const taskIdToEdit = editTaskIdInput.value;

            if (!title) return showMessage('O título é obrigatório.', 'error');
            if (type === 'agendada' && !dueDateValue && !taskIdToEdit) { // Data obrigatória para novas tarefas agendadas
                return showMessage('Data de vencimento é obrigatória para tarefas agendadas.', 'error');
            }
            // Para edição, se a data for limpa, ela se torna null
            if (type === 'agendada' && !dueDateValue && taskIdToEdit && originalTaskDataForEdit.dueDate) {
                if (!confirm("Você está removendo a data de uma tarefa agendada. Isso pode mudar seu tipo ou remover o agendamento. Continuar?")) {
                    inputDataAgendada.value = originalTaskDataForEdit.dueDate; // Restaura
                    return;
                }
            }


            let tarefaDataPayload = { title, subject, type };
            if (type === 'agendada') {
                tarefaDataPayload.dueDate = dueDateValue || null; // Permite limpar a data ao editar
            } else {
                tarefaDataPayload.dueDate = null; 
            }
            // Lógica para subtarefas (type === 'lista') virá depois
            // tarefaDataPayload.subtasks = (type === 'lista') ? coletarSubtarefas() : [];
            
            let url = '/api/notas';
            let method = 'POST';

            if (taskIdToEdit) {
                url = `/api/notas/${taskIdToEdit}`;
                method = 'PUT';
                // Ao editar, o tipo e a data são pegos do formulário. Se a data for limpa
                // para uma tarefa agendada, o backend deve tratar isso (ex: remover a data).
                // O objeto originalTaskDataForEdit tem o estado anterior completo da tarefa.
                // Para esta etapa, vamos confiar que o backend aceita null para dueDate se o tipo
                // não for 'agendada', ou se a data for explicitamente removida de uma agendada.
            }
            
            console.log(`Enviando ${method} para ${url} com payload:`, JSON.stringify(tarefaDataPayload));

            try {
                const response = await fetch(url, {
                    method: method, headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tarefaDataPayload),
                });
                const data = await response.json();
                if (response.ok && data.tarefa) {
                    showMessage(taskIdToEdit ? 'Tarefa atualizada!' : 'Tarefa adicionada!', 'success');
                    formNovaTarefa.reset();
                    editTaskIdInput.value = '';
                    btnSalvarTarefa.textContent = 'Adicionar Tarefa';
                    originalTaskDataForEdit = {};
                    if(selectTipoTarefa) {
                        selectTipoTarefa.value = 'diaria';
                        selectTipoTarefa.dispatchEvent(new Event('change'));
                    }

                    if (taskIdToEdit) {
                        const index = allTasksCache.findIndex(t => t.id === parseInt(taskIdToEdit));
                        if (index !== -1) allTasksCache[index] = data.tarefa;
                        else allTasksCache.push(data.tarefa);
                    } else {
                        allTasksCache.push(data.tarefa);
                    }
                    renderTasksForView(currentView, allTasksCache);
                } else {
                    showMessage(data.message || 'Erro ao salvar tarefa.', 'error');
                }
            } catch (error) { console.error('Falha ao salvar tarefa:', error); showMessage('Erro de conexão.', 'error');}
        });
    } else console.error("Elemento #formNovaTarefa não encontrado!");


    // --- LÓGICA DE TAREFAS (Fetch, Render, Ações) ---
    async function fetchAllTasks() {
        if (!currentUser || !currentUser.loggedIn) return [];
        console.log("fetchAllTasks: Buscando tarefas do servidor...");
        try {
            const response = await fetch('/api/notas');
            if (!response.ok) {
                if (response.status === 401) {
                    showMessage('Sessão expirou. Faça login novamente.', 'error');
                    currentUser = { loggedIn: false }; updateUIForAuth(); return [];
                }
                throw new Error('Erro ao buscar tarefas: ' + response.statusText);
            }
            allTasksCache = await response.json();
            console.log(`WorkspaceAllTasks: ${allTasksCache.length} tarefas recebidas.`);
            return allTasksCache;
        } catch (error) {
            console.error('Falha ao buscar todas as tarefas:', error);
            return [];
        }
    }
    
    async function loadTasksForCurrentView() {
        if (!currentUser || !currentUser.loggedIn) return;
        console.log("loadTasksForCurrentView: Chamando fetchAllTasks...");
        await fetchAllTasks(); 
        renderTasksForView(currentView, allTasksCache);
    }
    
    function renderTasksForView(viewName, tasks) {
        console.log(`Renderizando view: ${viewName} com ${tasks ? tasks.length : 0} tarefas no cache.`);
        
        [listaTarefasAgendadas, listaTarefasDiarias, listaTarefasListas].forEach(ul => {
            if (ul) ul.innerHTML = ''; 
        });

        let filteredTasks = [];
        let targetUl = null;
        const today = new Date().toISOString().slice(0, 10);

        switch (viewName) {
            case 'criar': 
                console.log("View 'criar', apenas formulário será exibido. Nenhuma lista renderizada aqui.");
                return; 
            case 'agendadas':
                filteredTasks = tasks.filter(task => task.type === 'agendada' && task.dueDate) // Garante que dueDate existe
                                   .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                targetUl = listaTarefasAgendadas;
                break;
            case 'diarias': 
                filteredTasks = tasks.filter(task => task.type === 'diaria');
                targetUl = listaTarefasDiarias;
                break;
            case 'listas': 
                if (listaTarefasListas) listaTarefasListas.innerHTML = '<li>Funcionalidade de Listas em breve!</li>';
                return; 
            default:
                console.warn(`View desconhecida para renderização: ${viewName}. Default para 'criar'.`);
                // Se a view for desconhecida, não faz nada ou volta para a view de criar
                // setActiveView('criar'); // Opcional: redirecionar para view padrão
                return;
        }

        if (targetUl) {
            if (filteredTasks.length === 0) {
                targetUl.innerHTML = `<li>Nenhuma tarefa para esta visualização.</li>`;
            } else {
                filteredTasks.forEach(task => targetUl.appendChild(createTaskElement(task)));
            }
        } else if (viewName !== 'criar') { 
            console.error(`UL de destino para a view "${viewName}" não foi encontrada.`);
        }
    }

    function createTaskElement(task) {
        const itemLista = document.createElement('li');
        itemLista.setAttribute('data-id', task.id);
        itemLista.classList.add(`task-type-${task.type}`);

        const taskHeader = document.createElement('div'); 
        taskHeader.classList.add('task-header');
        const checkboxTask = document.createElement('input'); 
        checkboxTask.type = 'checkbox'; checkboxTask.checked = task.done;
        checkboxTask.classList.add('task-checkbox');
        checkboxTask.addEventListener('change', () => toggleTaskDone(task.id));
        const titleSpan = document.createElement('span'); 
        titleSpan.textContent = task.title; titleSpan.classList.add('task-title');
        if (task.done) titleSpan.classList.add('done');
        taskHeader.appendChild(checkboxTask); taskHeader.appendChild(titleSpan);
        itemLista.appendChild(taskHeader);

        if (task.subject) { 
            const subjectP = document.createElement('p');
            subjectP.textContent = task.subject; subjectP.classList.add('task-subject');
            if (task.done) subjectP.classList.add('done');
            itemLista.appendChild(subjectP);
        }

        const detailsDiv = document.createElement('div');
        detailsDiv.classList.add('task-details');
        let typeDisplay = task.type ? (task.type.charAt(0).toUpperCase() + task.type.slice(1)) : 'N/A';
        if (typeDisplay === 'Diaria') typeDisplay = 'Diária'; // Correção para acento
        
        let detailsContent = `<span>Tipo: ${typeDisplay}</span>`;
        if (task.type === 'agendada' && task.dueDate) {
            try {
                // Adicionar 'T00:00:00' para evitar problemas de fuso horário com new Date()
                const dataObj = new Date(task.dueDate + 'T00:00:00');
                const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                detailsContent += `<span>Vencimento: ${dataFormatada}</span>`;
            } catch(e) { console.error("Erro formatando data:", task.dueDate, e); detailsContent += `<span>Vencimento: ${task.dueDate} (formato inválido)</span>`;}
        }
        detailsDiv.innerHTML = detailsContent;
        itemLista.appendChild(detailsDiv);

        // Subtarefas (para o futuro)
        // if (task.type === 'lista' && task.subtasks && task.subtasks.length > 0) { ... }

        const actionsDiv = document.createElement('div'); 
        actionsDiv.classList.add('task-actions');
        const btnEditar = document.createElement('button'); 
        btnEditar.textContent = 'Editar'; btnEditar.classList.add('btn-editar');
        btnEditar.addEventListener('click', () => showEditFormForTask(task));
        const btnExcluir = document.createElement('button'); 
        btnExcluir.textContent = 'Excluir'; btnExcluir.classList.add('btn-excluir');
        btnExcluir.addEventListener('click', () => deleteTask(task.id));
        actionsDiv.appendChild(btnEditar); actionsDiv.appendChild(btnExcluir);
        itemLista.appendChild(actionsDiv);
        
        return itemLista;
    }

    async function toggleTaskDone(taskId) {
        if (!currentUser || !currentUser.loggedIn) return;
        try {
            const response = await fetch(`/api/notas/${taskId}/toggle`, { method: 'PUT' });
            const data = await response.json();
            if (response.ok) {
                const taskIndex = allTasksCache.findIndex(t => t.id === taskId);
                if (taskIndex > -1) allTasksCache[taskIndex].done = data.done;
                renderTasksForView(currentView, allTasksCache);
            } else { showMessage(data.message || 'Erro ao atualizar status.', 'error'); }
        } catch (error) { showMessage('Erro de conexão ao atualizar.', 'error'); }
    }

    async function deleteTask(taskId) {
        if (!currentUser || !currentUser.loggedIn) return;
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
        try {
            const response = await fetch(`/api/notas/${taskId}`, { method: 'DELETE' });
            if (response.ok) {
                allTasksCache = allTasksCache.filter(t => t.id !== taskId);
                renderTasksForView(currentView, allTasksCache);
                showMessage('Tarefa excluída com sucesso.', 'success');
            } else { showMessage((await response.json()).message || 'Erro ao excluir.', 'error');}
        } catch (error) { showMessage('Erro de conexão ao excluir.', 'error'); }
    }
    
    function showEditFormForTask(task) {
        if (!inputTitulo || !inputAssunto || !editTaskIdInput || !btnSalvarTarefa || !selectTipoTarefa || !inputDataAgendada || !formNovaTarefa) {
            console.error("Elementos do formulário não encontrados para preencher para edição.");
            return showMessage("Erro interno: formulário de edição incompleto.", "error");
        }
        inputTitulo.value = task.title;
        inputAssunto.value = task.subject || '';
        editTaskIdInput.value = task.id;
        
        selectTipoTarefa.value = task.type;
        selectTipoTarefa.dispatchEvent(new Event('change')); 
        
        if (task.type === 'agendada' && task.dueDate) {
            inputDataAgendada.value = task.dueDate;
        } else {
            inputDataAgendada.value = '';
        }

        originalTaskDataForEdit = { ...task }; 
        btnSalvarTarefa.textContent = 'Atualizar Tarefa';
        
        if (typeof setActiveView === "function") {
            setActiveView('criar'); // Navega para a view do formulário
        } else {
            console.error("Função setActiveView não definida, não é possível redirecionar para edição.");
            return; 
        }

        setTimeout(() => {
            if (formNovaTarefa) formNovaTarefa.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (inputTitulo) inputTitulo.focus();
        }, 50);
    }

    // --- INICIALIZAÇÃO ---
    if (authContainer && appSection && loginSection && registerSection && showRegisterLink && showLoginLink && btnLogin && btnRegister && btnLogout && formNovaTarefa && 
        (listaTarefasAgendadas || listaTarefasDiarias || listaTarefasListas) ) { // Verifica se pelo menos uma lista de tarefas existe
        checkCurrentUser();
    } else {
        console.error("ERRO CRÍTICO: Um ou mais elementos principais da página não foram encontrados. Verifique os IDs no HTML e a seleção no JS.");
        showMessage("Erro crítico ao carregar a página. Verifique o console.", "error", 10000);
    }
});