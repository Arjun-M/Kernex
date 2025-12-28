import { useState, useEffect } from 'react';
import { pluginFetch } from '../authHelper';

const TaskManager = () => {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    pluginFetch('/api/system/tasks').then(res => res.json()).then(data => setTasks(data.tasks));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h3>Active Tasks</h3>
      <ul>
        {tasks.map((task, i) => (
          <li key={i}>{task.name} ({task.pcpu}%)</li>
        ))}
      </ul>
    </div>
  );
};

export default TaskManager;