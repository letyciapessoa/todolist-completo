export function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function TaskItem({ task, overdue, onToggle, onEdit, onDelete }) {
  const done = Boolean(task.completed);
  return (
    <li className={`task ${done ? 'is-done' : ''}`}>
      <button
        className={`check ${done ? 'checked' : ''}`}
        onClick={() => onToggle(task)}
        aria-label={done ? 'Marcar como pendente' : 'Marcar como concluída'}
        aria-pressed={done}
      >
        {done && '✓'}
      </button>

      <div className="task-body">
        <span className={`task-title ${overdue ? 'overdue' : ''}`}>{task.title}</span>
        <span className="task-meta">
          {task.due_date && <span>Prazo: {formatDate(task.due_date)}</span>}
          {overdue && <span className="badge">Em atraso</span>}
        </span>
      </div>

      <div className="task-actions">
        <button className="icon-btn" onClick={() => onEdit(task)} aria-label="Editar tarefa">✎</button>
        <button className="icon-btn danger" onClick={() => onDelete(task)} aria-label="Excluir tarefa">✕</button>
      </div>
    </li>
  );
}
