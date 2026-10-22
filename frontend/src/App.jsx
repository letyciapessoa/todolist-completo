import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { useDebounce } from './hooks/useDebounce.js';
import TaskItem from './components/TaskItem.jsx';
import TaskModal from './components/TaskModal.jsx';

// Data local (YYYY-MM-DD), compatível com o DATE do MySQL (dateStrings: true).
const todayStr = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const VIEWS = {
  today: { label: 'Hoje', match: (t, today) => !t.completed && t.due_date && t.due_date <= today },
  upcoming: { label: 'Próximas', match: (t, today) => !t.completed && (!t.due_date || t.due_date > today) },
  completed: { label: 'Concluídas', match: (t) => Boolean(t.completed) },
};

export default function App() {
  const [data, setData] = useState({ tasks: [], total: 0, completed: 0 });
  const [view, setView] = useState('today');
  const [search, setSearch] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [modal, setModal] = useState(null); // null | { task?: Task }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(async (signal) => {
    try {
      setData(await api.list(debouncedSearch.trim(), signal));
      setError('');
    } catch (err) {
      if (err.name !== 'AbortError') setError('Não foi possível carregar as tarefas. O backend está rodando?');
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  async function mutate(fn) {
    setSaving(true);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const today = todayStr();
  const isOverdue = (t) => !t.completed && t.due_date && t.due_date < today;

  const counts = useMemo(
    () => Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, data.tasks.filter((t) => v.match(t, today)).length])),
    [data.tasks, today]
  );

  // O backend já ordena por data mais próxima (sem data por último).
  const visible = data.tasks
    .filter((t) => VIEWS[view].match(t, today))
    .filter((t) => !overdueOnly || isOverdue(t));

  // Salva direto (sem mutate) para o modal poder exibir erros do backend.
  async function saveFromModal(payload) {
    setSaving(true);
    try {
      if (modal.task) await api.update(modal.task.id, payload);
      else await api.create(payload);
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const toggle = (t) => mutate(() => api.update(t.id, { completed: !t.completed }));
  const remove = (t) => window.confirm(`Excluir "${t.title}"?`) && mutate(() => api.remove(t.id));

  return (
    <div className="app">
      <aside className="sidebar">
        <h1 className="brand">Tarefas da Escola de Letycia</h1>
        <nav>
          {Object.entries(VIEWS).map(([key, v]) => (
            <button key={key} className={`nav-item ${view === key ? 'active' : ''}`} onClick={() => setView(key)}>
              <span>{v.label}</span>
              <span className="count">{counts[key]}</span>
            </button>
          ))}
        </nav>
        <div className="totals">
          <strong>{data.completed}</strong> de <strong>{data.total}</strong> concluídas
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="title-row">
            <h2>{VIEWS[view].label}</h2>
            <span className="status"><i className={saving ? 'dot busy' : 'dot'} />{saving ? 'Salvando...' : 'Salvo'}</span>
          </div>
          <div className="search-row">
            <input
              className="search"
              type="search"
              placeholder="Buscar tarefas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className={`tool ${overdueOnly ? 'on' : ''}`}
              onClick={() => setOverdueOnly((v) => !v)}
              title="Mostrar só tarefas em atraso"
              aria-pressed={overdueOnly}
            >⚑</button>
            <button className="tool" onClick={() => load()} title="Recarregar">↻</button>
          </div>
        </header>

        <section className="content">
          <button className="add-bar" onClick={() => setModal({})}>+ Nova tarefa</button>
          {error && <p className="banner" role="alert">{error}</p>}

          {visible.length === 0 ? (
            <div className="empty">
              <p>{view === 'completed' ? 'Nenhuma tarefa concluída ainda.' : 'Você não tem tarefas pendentes.'}</p>
              {view !== 'completed' && <p>Adicione sua primeira tarefa para começar!</p>}
            </div>
          ) : (
            <ul className="task-list">
              {visible.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  overdue={isOverdue(t)}
                  onToggle={toggle}
                  onEdit={(task) => setModal({ task })}
                  onDelete={remove}
                />
              ))}
            </ul>
          )}
        </section>

        <button className="fab" onClick={() => setModal({})} aria-label="Nova tarefa">+</button>
      </main>

      {modal && <TaskModal task={modal.task} onClose={() => setModal(null)} onSave={saveFromModal} />}
    </div>
  );
}
