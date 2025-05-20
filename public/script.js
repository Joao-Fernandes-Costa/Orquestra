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
    const showRegisterLink = document.getElementById('showRegister'); // Para o link "Registre-se"
    const showLoginLink = document.getElementById('showLogin');     // Para o link "Faça Login"
    
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
    const listaTarefasNormais = document.getElementById('listaTarefasNormais');
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
                showLoginSection(); // Mostra a seção de login por padrão
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

    // Event Listeners para os links de alternar entre login e registro
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault(); 
            console.log("Link 'Registre-se' (showRegisterLink) clicado."); // DEBUG
            showRegisterSection();
        });
    } else {
        console.error("Elemento com ID 'showRegister' (o link para registrar) não foi encontrado no DOM!");
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Link 'Faça Login' (showLoginLink) clicado."); // DEBUG
            showLoginSection();
        });
    } else {
        console.error("Elemento com ID 'showLogin' (o link para login) não foi encontrado no DOM!");
    }

    // Listener para o botão de submissão do formulário de REGISTRO
    if (btnRegister) {
        btnRegister.addEventListener('click', async () => {
            console.log("Botão 'Registrar' (do formulário) clicado."); // DEBUG
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
                    showLoginSection(); // Mostra o formulário de login após registro
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
    
    // Listener para o botão de submissão do formulário de LOGIN
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            console.log("Botão 'Entrar' (do formulário de login) clicado."); // DEBUG
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
                    updateUIForAuth(); // Isso irá esconder authContainer e mostrar appSection
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

    // Listener para o botão de LOGOUT
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
            // Limpa todas as listas de tarefas na UI
            [listaTarefasNormais, listaTarefasAgendadas, listaTarefasDiarias, listaTarefasListas].forEach(ul => {
                if(ul) ul.innerHTML = '';
            });
            updateUIForAuth(); // Isso irá mostrar authContainer e esconder appSection
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
                console.error(`ERRO: Elemento de view no índice ${index} do array allViews é nulo! Verifique getElementById para view${index}.`);
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
            if (campoSubtarefas) campoSubtarefas.classList.toggle('hidden', tipo !== 'lista'); // Para o futuro
            
            if (tipo !== 'agendada' && inputDataAgendada) inputDataAgendada.value = '';
            // if (tipo !== 'lista' && listaInputsSubtarefas) listaInputsSubtarefas.innerHTML = ''; // Para o futuro
        });
    } else {
        console.warn("Elemento #selectTipoTarefa não encontrado. Funcionalidade de tipos de tarefa pode ser limitada.");
    }
    
    if (formNovaTarefa) {
        formNovaTarefa.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser || !currentUser.loggedIn) return showMessage("Você precisa estar logado.", "error");
            if (!inputTitulo || !inputAssunto || !selectTipoTarefa || !inputDataAgendada || !editTaskIdInput || !btnSalvarTarefa) {
                console.error("Um ou mais elementos do formulário de tarefa não foram encontrados ao submeter.");
                return showMessage("Erro interno no formulário.", "error");
            }

            const title = inputTitulo.value.trim();
            const subject = inputAssunto.value.trim();
            const type = selectTipoTarefa.value;
            const dueDateValue = inputDataAgendada.value;
            const taskIdToEdit = editTaskIdInput.value;

            if (!title) return showMessage('O título é obrigatório.', 'error');
            if (type === 'agendada' && !dueDateValue) {
                return showMessage('Data de vencimento é obrigatória para tarefas agendadas.', 'error');
            }

            let tarefaDataPayload = { title, subject, type };
            if (type === 'agendada') tarefaDataPayload.dueDate = dueDateValue;
            
            let url = '/api/notas';
            let method = 'POST';

            if (taskIdToEdit) {
                url = `/api/notas/${taskIdToEdit}`;
                method = 'PUT';
                // Ao editar, precisamos usar o tipo original (e outros dados) que foram armazenados
                // A menos que o usuário explicitamente mude o tipo no formulário de edição.
                tarefaDataPayload.type = selectTipoTarefa.value; // Usa o tipo selecionado no form
                if (tarefaDataPayload.type === 'agendada') {
                    tarefaDataPayload.dueDate = dueDateValue || originalTaskDataForEdit.dueDate; // Se não preencheu, usa o original
                } else {
                    tarefaDataPayload.dueDate = null; // Garante que não agendadas não tenham data
                }
                // Aqui também precisaríamos lidar com subtarefas se estivéssemos editando-as
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
                        selectTipoTarefa.value = 'normal';
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
        
        [listaTarefasNormais, listaTarefasAgendadas, listaTarefasDiarias, listaTarefasListas].forEach(ul => {
            if (ul) ul.innerHTML = ''; 
            // else console.warn("Uma UL de lista de tarefas não foi encontrada durante a limpeza.");
        });

        let filteredTasks = [];
        let targetUl = null;
        const today = new Date().toISOString().slice(0, 10);

        switch (viewName) {
            case 'criar':
                filteredTasks = tasks.filter(task => task.type === 'normal');
                targetUl = listaTarefasNormais;
                break;
            case 'agendadas':
                filteredTasks = tasks.filter(task => task.type === 'agendada')
                                   .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                targetUl = listaTarefasAgendadas;
                break;
            case 'diarias':
                filteredTasks = tasks.filter(task => task.type === 'agendada' && task.dueDate === today);
                targetUl = listaTarefasDiarias;
                break;
            case 'listas': 
                if (listaTarefasListas) listaTarefasListas.innerHTML = '<li>Funcionalidade de Listas em breve!</li>';
                return; 
            default:
                console.warn(`View desconhecida para renderização: ${viewName}`);
                // Pode ser útil mostrar a view 'criar' por padrão se viewName for inválido
                // filteredTasks = tasks.filter(task => task.type === 'normal');
                // targetUl = listaTarefasNormais;
                return;
        }

        if (targetUl) {
            if (filteredTasks.length === 0) {
                targetUl.innerHTML = `<li>Nenhuma tarefa para esta visualização.</li>`;
            } else {
                filteredTasks.forEach(task => targetUl.appendChild(createTaskElement(task)));
            }
        } else {
            console.error(`UL de destino para a view "${viewName}" não foi encontrada.`);
        }
    }

    function createTaskElement(task) {
        // ... (função createTaskElement como na última versão, com checkbox, título, assunto, detalhes, botões)
        // Certifique-se que ela está completa e correta
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
        let detailsContent = `<span>Tipo: ${task.type ? (task.type.charAt(0).toUpperCase() + task.type.slice(1)) : 'N/A'}</span>`;
        if (task.type === 'agendada' && task.dueDate) {
            try {
                const dataFormatada = new Date(task.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                detailsContent += `<span>Vencimento: ${dataFormatada}</span>`;
            } catch(e) { console.error("Erro formatando data:", task.dueDate, e); detailsContent += `<span>Vencimento: ${task.dueDate} (erro)</span>`;}
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
        // ... (como na última versão funcional)
        if (!currentUser || !currentUser.loggedIn) return;
        try {
            const response = await fetch(`/api/notas/${taskId}/toggle`, { method: 'PUT' });
            const data = await response.json();
            if (response.ok) {
                const taskIndex = allTasksCache.findIndex(t => t.id === taskId);
                if (taskIndex > -1) allTasksCache[taskIndex].done = data.done; // Backend retorna {id, done}
                renderTasksForView(currentView, allTasksCache);
            } else { showMessage(data.message || 'Erro ao atualizar status.', 'error'); }
        } catch (error) { showMessage('Erro de conexão ao atualizar.', 'error'); }
    }

    async function deleteTask(taskId) {
        // ... (como na última versão funcional)
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
        console.log("showEditFormForTask chamada para a tarefa:", task);
        if (!inputTitulo || !inputAssunto || !editTaskIdInput || !btnSalvarTarefa || !selectTipoTarefa || !inputDataAgendada || !formNovaTarefa) {
            console.error("Elementos do formulário não encontrados para preencher para edição.");
            return showMessage("Erro interno: formulário de edição incompleto.", "error");
        }

        // 1. Preenche o formulário com os dados da tarefa
        inputTitulo.value = task.title;
        inputAssunto.value = task.subject || '';
        editTaskIdInput.value = task.id; // Define o ID da tarefa que está sendo editada
        
        selectTipoTarefa.value = task.type; // Define o tipo no select
        
        // Dispara o evento change no selectTipoTarefa para mostrar/esconder campos condicionais (como data)
        // É importante que este evento seja disparado DEPOIS que o valor do select foi definido.
        if(selectTipoTarefa.dispatchEvent) { // Verificação de segurança
            selectTipoTarefa.dispatchEvent(new Event('change')); 
        } else { // Fallback manual se dispatchEvent não funcionar como esperado em algum navegador antigo (raro)
            campoDataAgendada.classList.toggle('hidden', task.type !== 'agendada');
            // campoSubtarefas.classList.toggle('hidden', task.type !== 'lista'); // Para o futuro
        }
        
        if (task.type === 'agendada' && task.dueDate) {
            inputDataAgendada.value = task.dueDate; // Define a data
        } else {
            inputDataAgendada.value = ''; // Limpa se não for agendada ou não tiver data
        }
        
        // Guarda todos os dados originais da tarefa para referência, especialmente
        // campos que não estão sendo diretamente editados no formulário simplificado atual
        // mas que o backend pode esperar (como o array de subtarefas se existisse)
        originalTaskDataForEdit = { ...task }; 

        // 2. Muda o texto do botão de submit
        btnSalvarTarefa.textContent = 'Atualizar Tarefa';

        // 3. MENSAGEM PARA O USUÁRIO (OPCIONAL)
        // showMessage(`Editando: "${task.title}". Faça as alterações e clique em "Atualizar Tarefa".`, 'info', 7000);
        
        // 4. **NOVO: Redireciona para a view de criação/edição**
        // Esta função setActiveView já cuida de mostrar a view 'criar' e esconder as outras,
        // além de atualizar o botão de navegação ativo.
        if (typeof setActiveView === "function") {
            console.log("Redirecionando para a view 'criar' para edição.");
            setActiveView('criar'); // 'criar' é o data-view da aba "Criar / Normais"
        } else {
            console.error("Função setActiveView não definida, não é possível redirecionar para o formulário de edição.");
            return; // Interrompe se não puder navegar
        }

        // 5. Rola a tela para o formulário e foca no campo de título
        // É importante que isso aconteça DEPOIS que a view 'criar' estiver visível.
        // Podemos dar um pequeno timeout para garantir que a view mudou antes de rolar.
        setTimeout(() => {
            if (formNovaTarefa) {
                formNovaTarefa.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            if (inputTitulo) {
                inputTitulo.focus();
            }
        }, 50); // Pequeno delay para garantir que a troca de view foi processada pelo browser

        console.log("Formulário preenchido para edição. ID da tarefa:", editTaskIdInput.value);
    }
});