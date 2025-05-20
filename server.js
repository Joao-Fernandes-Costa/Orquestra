// server.js
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db =require('./database.js');
const crypto = require('crypto'); // Para gerar IDs para subtarefas
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
const PORT = 3000;
const saltRounds = 10;

app.use(express.json());
app.use(express.static('public'));

app.use(session({
    store: new SQLiteStore({ db: 'db.sqlite', dir: './', table: 'sessions'}),
    secret: 'seu_segredo_super_secreto_ainda_mais_secreto_agora', // MUDE ISSO!
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ message: 'Não autorizado: Faça login para continuar.' });
    }
}

// --- ROTAS DE AUTENTICAÇÃO (permanecem as mesmas da versão anterior) ---
// POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
// (Cole aqui as rotas de autenticação da versão anterior)
// Registrar um novo usuário
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const sql = "INSERT INTO users (username, password_hash) VALUES (?, ?)";
        db.run(sql, [username, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes("UNIQUE constraint failed: users.username")) {
                    return res.status(409).json({ message: 'Nome de usuário já existe.' });
                }
                console.error("Erro no registro:", err.message);
                return res.status(500).json({ message: 'Erro ao registrar usuário.' });
            }
            req.session.userId = this.lastID;
            req.session.username = username;
            res.status(201).json({ message: 'Usuário registrado com sucesso!', userId: this.lastID, username: username });
        });
    } catch (error) {
        console.error("Erro no bcrypt:", error.message);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

// Login do usuário
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
    }
    const sql = "SELECT * FROM users WHERE username = ?";
    db.get(sql, [username], async (err, user) => {
        if (err) {
            console.error("Erro no login (db):", err.message);
            return res.status(500).json({ message: 'Erro ao tentar fazer login.' });
        }
        if (!user) {
            return res.status(401).json({ message: 'Nome de usuário ou senha inválidos.' });
        }
        try {
            const match = await bcrypt.compare(password, user.password_hash);
            if (match) {
                req.session.userId = user.id;
                req.session.username = user.username;
                res.json({ message: 'Login bem-sucedido!', userId: user.id, username: user.username });
            } else {
                res.status(401).json({ message: 'Nome de usuário ou senha inválidos.' });
            }
        } catch (error) {
            console.error("Erro no bcrypt compare:", error.message);
            res.status(500).json({ message: 'Erro interno no servidor durante o login.' });
        }
    });
});

// Logout do usuário
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Não foi possível fazer logout.' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout bem-sucedido.' });
    });
});

// Verificar status do login (quem sou eu)
app.get('/api/auth/me', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, userId: req.session.userId, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});


// --- ROTAS DE NOTAS (AGORA TAREFAS) ---

// Buscar todas as tarefas DO USUÁRIO LOGADO (com todos os novos campos)
// Adicionaremos filtros por tipo e data depois, se necessário via query params
app.get('/api/notas', isAuthenticated, (req, res) => {
    const sql = "SELECT id, title, subject, type, dueDate, subtasks, done FROM notas WHERE user_id = ?";
    db.all(sql, [req.session.userId], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar tarefas:", err.message);
            return res.status(500).json({ message: 'Erro ao buscar tarefas.' });
        }
        const tarefasFormatadas = rows.map(tarefa => ({
            ...tarefa,
            done: !!tarefa.done, // Converte 0/1 para true/false
            subtasks: tarefa.subtasks ? JSON.parse(tarefa.subtasks) : [] // Converte JSON string para array
        }));
        res.json(tarefasFormatadas);
    });
});

// Adicionar uma nova tarefa PARA O USUÁRIO LOGADO
app.post('/api/notas', isAuthenticated, (req, res) => {
    const { title, subject, type, dueDate, subtasks: initialSubtasks } = req.body;
    const userId = req.session.userId;

    if (!title || !type) {
        return res.status(400).json({ message: 'Título e Tipo da tarefa são obrigatórios.' });
    }
    if (type === 'agendada' && !dueDate) {
        return res.status(400).json({ message: 'Data de vencimento é obrigatória para tarefas agendadas.' });
    }
    // Validação simples de formato de data (YYYY-MM-DD)
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        return res.status(400).json({ message: 'Formato de data inválido. Use YYYY-MM-DD.' });
    }

    let subtasksParaSalvar = null;
    if (type === 'lista') {
        // Se for do tipo lista, inicializa subtasks como array de objetos com IDs
        // O frontend enviará um array de strings ou objetos simples para as subtasks
        const subtasksCompletas = (Array.isArray(initialSubtasks) ? initialSubtasks : []).map(sub => {
            if (typeof sub === 'string') { // Se o frontend enviar apenas o texto
                return { id: crypto.randomUUID(), text: sub, done: false };
            }
            // Se o frontend enviar um objeto (ex: para edição, mas na criação é mais simples enviar strings)
            return { id: sub.id || crypto.randomUUID(), text: sub.text, done: sub.done || false };
        });
        subtasksParaSalvar = JSON.stringify(subtasksCompletas);
    }

    const sql = `INSERT INTO notas (user_id, title, subject, type, dueDate, subtasks, done) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [userId, title, subject || null, type, type === 'agendada' ? dueDate : null, subtasksParaSalvar, 0];

    db.run(sql, params, function (err) {
        if (err) {
            console.error("Erro ao adicionar tarefa:", err.message);
            return res.status(500).json({ message: 'Erro ao adicionar tarefa.' });
        }
        res.status(201).json({
            message: 'Tarefa adicionada com sucesso!',
            tarefa: {
                id: this.lastID, userId, title, subject: subject || null, type,
                dueDate: type === 'agendada' ? dueDate : null,
                subtasks: subtasksParaSalvar ? JSON.parse(subtasksParaSalvar) : [],
                done: false
            }
        });
    });
});

// Marcar/Desmarcar uma tarefa PRINCIPAL como feita (toggle)
app.put('/api/notas/:id/toggle', isAuthenticated, (req, res) => {
    const idNota = parseInt(req.params.id);
    const userId = req.session.userId;

    const sqlGet = "SELECT done FROM notas WHERE id = ? AND user_id = ?";
    db.get(sqlGet, [idNota, userId], (err, nota) => {
        if (err) return res.status(500).json({ message: "Erro interno." });
        if (!nota) return res.status(404).json({ message: "Tarefa não encontrada ou não pertence a você." });
        
        const novoStatusDone = !nota.done;
        const sqlUpdate = "UPDATE notas SET done = ? WHERE id = ? AND user_id = ?";
        db.run(sqlUpdate, [novoStatusDone ? 1 : 0, idNota, userId], function (errUpdate) {
            if (errUpdate) return res.status(500).json({ message: "Erro ao atualizar status da tarefa." });
            if (this.changes === 0) return res.status(404).json({ message: "Tarefa não encontrada para atualização." });
            res.json({ message: "Status da tarefa atualizado!", id: idNota, done: novoStatusDone });
        });
    });
});

// Editar os detalhes de uma tarefa (title, subject, dueDate, type)
app.put('/api/notas/:id', isAuthenticated, (req, res) => {
    const idNota = parseInt(req.params.id);
    const userId = req.session.userId;
    const { title, subject, type, dueDate, subtasks: newSubtasksArray } = req.body; // Frontend pode enviar subtasks atualizadas

    if (!title || !type) {
        return res.status(400).json({ message: 'Título e Tipo são obrigatórios.' });
    }
    if (type === 'agendada' && !dueDate) {
        return res.status(400).json({ message: 'Data de vencimento é obrigatória para tarefas agendadas.' });
    }
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        return res.status(400).json({ message: 'Formato de data inválido. Use YYYY-MM-DD.' });
    }

    // Lógica para garantir que a tarefa pertence ao usuário antes de atualizar
    const sqlCheck = "SELECT * FROM notas WHERE id = ? AND user_id = ?";
    db.get(sqlCheck, [idNota, userId], (err, currentNota) => {
        if (err) return res.status(500).json({ message: "Erro interno." });
        if (!currentNota) return res.status(403).json({ message: "Tarefa não encontrada ou não pertence a você." });

        let subtasksParaSalvar = currentNota.subtasks; // Mantém as subtasks atuais por padrão
        if (type === 'lista') {
            if (Array.isArray(newSubtasksArray)) { // Se o frontend enviou um novo array de subtasks
                 const subtasksCompletas = newSubtasksArray.map(sub => ({
                    id: sub.id || crypto.randomUUID(), // Preserva ID se existir, senão cria novo
                    text: sub.text,
                    done: sub.done || false
                }));
                subtasksParaSalvar = JSON.stringify(subtasksCompletas);
            } else if (currentNota.type !== 'lista') { // Mudando para lista e não enviou subtasks
                 subtasksParaSalvar = JSON.stringify([]); // Inicializa vazio
            }
        } else { // Se não for do tipo 'lista', não deve ter subtasks
            subtasksParaSalvar = null;
        }


        const sqlUpdate = `UPDATE notas SET title = ?, subject = ?, type = ?, dueDate = ?, subtasks = ?
                           WHERE id = ? AND user_id = ?`;
        const params = [
            title, subject || null, type,
            type === 'agendada' ? dueDate : null,
            subtasksParaSalvar,
            idNota, userId
        ];

        db.run(sqlUpdate, params, function(errUpdate) {
            if (errUpdate) {
                console.error("Erro ao editar tarefa:", errUpdate.message);
                return res.status(500).json({ message: 'Erro ao editar tarefa.' });
            }
            if (this.changes === 0) return res.status(404).json({ message: 'Nenhuma tarefa foi alterada.' });
            
            // Retornar a tarefa atualizada
            db.get("SELECT * FROM notas WHERE id = ?", [idNota], (errSelect, updatedNota) => {
                if(errSelect) return res.status(500).json({ message: 'Erro ao buscar tarefa atualizada.' });
                 res.json({
                    message: 'Tarefa editada com sucesso!',
                    tarefa: {
                        ...updatedNota,
                        done: !!updatedNota.done,
                        subtasks: updatedNota.subtasks ? JSON.parse(updatedNota.subtasks) : []
                    }
                });
            });
        });
    });
});

// Excluir uma tarefa
app.delete('/api/notas/:id', isAuthenticated, (req, res) => {
    // (Lógica de exclusão permanece similar, mas agora excluindo uma "tarefa")
    const idParaExcluir = parseInt(req.params.id);
    const sqlCheck = "SELECT * FROM notas WHERE id = ? AND user_id = ?";
    db.get(sqlCheck, [idParaExcluir, req.session.userId], (err, row) => {
        if (err) return res.status(500).json({ message: 'Erro ao processar.' });
        if (!row) return res.status(403).json({ message: 'Não autorizado ou tarefa não encontrada.' });
        
        const sqlDelete = "DELETE FROM notas WHERE id = ?";
        db.run(sqlDelete, [idParaExcluir], function(errDel) {
            if (errDel) return res.status(500).json({ message: 'Erro ao excluir tarefa.' });
            if (this.changes === 0) return res.status(404).json({ message: 'Tarefa não encontrada.' });
            res.json({ message: 'Tarefa excluída com sucesso!' });
        });
    });
});

// NOVA ROTA: Marcar/Desmarcar uma SUBTAREFA como feita (toggle)
app.put('/api/notas/:notaId/subtask/:subtaskId/toggle', isAuthenticated, (req, res) => {
    const notaId = parseInt(req.params.notaId);
    const subtaskId = req.params.subtaskId; // ID da subtarefa (gerado por crypto.randomUUID())
    const userId = req.session.userId;

    const sqlGet = "SELECT subtasks, type FROM notas WHERE id = ? AND user_id = ?";
    db.get(sqlGet, [notaId, userId], (err, nota) => {
        if (err) return res.status(500).json({ message: "Erro interno." });
        if (!nota) return res.status(404).json({ message: "Tarefa principal não encontrada ou não pertence a você." });
        if (nota.type !== 'lista' || !nota.subtasks) {
            return res.status(400).json({ message: "Esta tarefa não é do tipo lista ou não possui subtarefas." });
        }

        let subtasksArray;
        try {
            subtasksArray = JSON.parse(nota.subtasks);
        } catch (e) {
            return res.status(500).json({ message: "Erro ao processar subtarefas." });
        }

        let subtaskFound = false;
        const updatedSubtasksArray = subtasksArray.map(st => {
            if (st.id === subtaskId) {
                subtaskFound = true;
                return { ...st, done: !st.done };
            }
            return st;
        });

        if (!subtaskFound) {
            return res.status(404).json({ message: "Subtarefa não encontrada." });
        }

        const sqlUpdate = "UPDATE notas SET subtasks = ? WHERE id = ? AND user_id = ?";
        db.run(sqlUpdate, [JSON.stringify(updatedSubtasksArray), notaId, userId], function (errUpdate) {
            if (errUpdate) return res.status(500).json({ message: "Erro ao atualizar subtarefa." });
            if (this.changes === 0) return res.status(404).json({ message: "Tarefa principal não atualizada." });
            res.json({ message: "Status da subtarefa atualizado!", subtasks: updatedSubtasksArray });
        });
    });
});


app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});