export async function taskHandler(req, res) {
  const { method } = req;
  const { taskId, userId = 'default_user' } = req.query;

  try {
    switch (method) {
      case 'GET':
        return await getTaskById(req, res, userId, taskId);
      case 'PUT':
        return await updateTaskStatus(req, res, userId, taskId);
      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Task Handler Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getTaskById(req, res, userId, taskId) {
  try {
    const tasks = await KVService.hget(KV_KEYS.TASKS, userId) || [];
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    return res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch task' });
  }
}

async function updateTaskStatus(req, res, userId, taskId) {
  try {
    const { status } = req.body;
    
    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const existingTasks = await KVService.hget(KV_KEYS.TASKS, userId) || [];
    const taskIndex = existingTasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    existingTasks[taskIndex] = {
      ...existingTasks[taskIndex],
      status,
      updatedAt: new Date().toISOString()
    };
    
    const success = await KVService.hset(KV_KEYS.TASKS, userId, existingTasks);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update task status' });
    }
    
    return res.status(200).json({
      success: true,
      data: existingTasks[taskIndex],
      message: 'Task status updated successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update task status' });
  }
}