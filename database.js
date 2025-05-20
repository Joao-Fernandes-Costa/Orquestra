// database.js
const sqlite3 = require('sqlite3').verbose();
const DBSOURCE = "db.sqlite";

const db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password_hash TEXT
            )`, (err) => {
                if (err) console.error("Erro ao criar tabela users:", err.message);
                else console.log("Tabela 'users' pronta ou já existente.");
            });

            // Modificando a tabela notas
            db.run(`CREATE TABLE IF NOT EXISTS notas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,       -- Novo: Título da tarefa
                subject TEXT,              -- Antigo 'texto', agora 'subject' (assunto/descrição)
                type TEXT NOT NULL,        -- Novo: 'normal', 'agendada', 'lista'
                dueDate TEXT,              -- Novo: Data de vencimento (YYYY-MM-DD)
                subtasks TEXT,             -- Novo: JSON string para subtarefas de uma 'lista'
                done INTEGER DEFAULT 0,    -- Status 'done' da tarefa principal
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`, (err) => {
                if (err) console.error("Erro ao criar/modificar tabela notas:", err.message);
                else console.log("Tabela 'notas' pronta ou já existente com nova estrutura.");
            });
        });
    }
});

module.exports = db;