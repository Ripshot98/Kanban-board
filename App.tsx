import React, { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';
import './App.css';

// Types
interface Task {
  id: string;
  content: string;
}

interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

interface BoardState {
  tasks: Record<string, Task>;
  columns: Record<string, Column>;
  columnOrder: string[];
}

// Initial Data
const initialData: BoardState = {
  tasks: {
    'task-1': { id: 'task-1', content: 'Task 1' },
    'task-2': { id: 'task-2', content: 'Task 2' },
    'task-3': { id: 'task-3', content: 'Task 3' },
  },
  columns: {
    'column-1': {
      id: 'column-1',
      title: 'To Do',
      taskIds: ['task-1', 'task-2', 'task-3'],
    },
    'column-2': {
      id: 'column-2',
      title: 'In Progress',
      taskIds: [],
    },
    'column-3': {
      id: 'column-3',
      title: 'Done',
      taskIds: [],
    },
  },
  columnOrder: ['column-1', 'column-2', 'column-3'],
};

const App: React.FC = () => {
  const [boardState, setBoardState] = useState<BoardState>(() => {
    const savedBoard = localStorage.getItem('kanbanBoard');
    return savedBoard ? JSON.parse(savedBoard) : initialData;
  });

  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState<BoardState[]>(() => {
    const savedHistory = localStorage.getItem('kanbanHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const [future, setFuture] = useState<BoardState[]>(() => {
    const savedFuture = localStorage.getItem('kanbanFuture');
    return savedFuture ? JSON.parse(savedFuture) : [];
  });

  // Save the current board state and history to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('kanbanBoard', JSON.stringify(boardState));
    localStorage.setItem('kanbanHistory', JSON.stringify(history));
    localStorage.setItem('kanbanFuture', JSON.stringify(future));
  }, [boardState, history, future]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const start = boardState.columns[source.droppableId];
    const finish = boardState.columns[destination.droppableId];

    let newState = { ...boardState };

    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      newState = {
        ...newState,
        columns: {
          ...newState.columns,
          [start.id]: {
            ...start,
            taskIds: newTaskIds,
          },
        },
      };
    } else {
      const startTaskIds = Array.from(start.taskIds);
      startTaskIds.splice(source.index, 1);

      const finishTaskIds = Array.from(finish.taskIds);
      finishTaskIds.splice(destination.index, 0, draggableId);

      newState = {
        ...newState,
        columns: {
          ...newState.columns,
          [start.id]: {
            ...start,
            taskIds: startTaskIds,
          },
          [finish.id]: {
            ...finish,
            taskIds: finishTaskIds,
          },
        },
      };
    }

    setHistory([...history, boardState]);
    setFuture([]); // Clear the future stack
    setBoardState(newState);
  };

  const addColumn = () => {
    if (!newColumnTitle.trim()) return;

    const newColumnId = `column-${Date.now()}`;
    const newColumn: Column = {
      id: newColumnId,
      title: newColumnTitle,
      taskIds: [],
    };

    const newState = {
      ...boardState,
      columns: {
        ...boardState.columns,
        [newColumnId]: newColumn,
      },
      columnOrder: [...boardState.columnOrder, newColumnId],
    };

    setHistory([...history, boardState]);
    setFuture([]); // Clear the future stack
    setBoardState(newState);
    setNewColumnTitle('');
  };

  const deleteColumn = (columnId: string) => {
    const newColumns = { ...boardState.columns };
    delete newColumns[columnId];

    const newColumnOrder = boardState.columnOrder.filter(
      (id) => id !== columnId
    );

    const newState = {
      ...boardState,
      columns: newColumns,
      columnOrder: newColumnOrder,
    };

    setHistory([...history, boardState]);
    setFuture([]); // Clear the future stack
    setBoardState(newState);
  };

  const undo = () => {
    if (history.length === 0) return;

    const lastState = history[history.length - 1];
    setFuture([boardState, ...future]);
    setBoardState(lastState);
    setHistory(history.slice(0, -1)); 
  };

  const redo = () => {
    if (future.length === 0) return;

    const nextState = future[0];
    setHistory([...history, boardState]);
    setBoardState(nextState);
    setFuture(future.slice(1)); // Remove the first future state
  };

  const filteredTasks = Object.values(boardState.tasks).filter((task) =>
    task.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="controls">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search tasks"
        />
        <button onClick={undo} disabled={history.length === 0}>
          Undo
        </button>
        <button onClick={redo} disabled={future.length === 0}>
          Redo
        </button>
      </div>
      <div className="add-column">
        <input
          type="text"
          value={newColumnTitle}
          onChange={(e) => setNewColumnTitle(e.target.value)}
          placeholder="New column title"
        />
        <button onClick={addColumn}>Add Column</button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board">
          {boardState.columnOrder.map((columnId) => {
            const column = boardState.columns[columnId];
            const tasks = column.taskIds
              .map((taskId) => boardState.tasks[taskId])
              .filter((task) =>
                filteredTasks.find((t) => t.id === task.id)
              );

            return (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    className={`column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    <h2>{column.title}</h2>
                    <button onClick={() => deleteColumn(column.id)}>
                      Delete Column
                    </button>
                    <div className="task-list">
                      {tasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              className="task-card"
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                transition: 'transform 0.2s ease', // Smooth animation
                              }}
                            >
                              {task.content}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default App;
