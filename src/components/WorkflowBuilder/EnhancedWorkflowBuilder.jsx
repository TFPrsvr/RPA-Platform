import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDrop, useDrag } from 'react-dnd'
import { useUser } from '@clerk/clerk-react'
import { WorkflowModel } from '../../models/workflowModel'
import { WORKFLOW_NODE_DEFINITIONS, NODE_CATEGORIES } from '../../constants/workflowTypes'
import { workflowService } from '../../lib/supabase'
import { Button } from '@/components/ui'
import WorkflowConnection from './WorkflowConnection'
import './EnhancedWorkflowBuilder.css'

const EnhancedWorkflowBuilder = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const canvasRef = useRef(null)
  
  const [workflow, setWorkflow] = useState(new WorkflowModel())
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedConnection, setSelectedConnection] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const [canvasScale, setCanvasScale] = useState(1)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStart, setConnectionStart] = useState(null)

  useEffect(() => {
    if (id && user) {
      loadWorkflow()
    }
  }, [id, user])

  const loadWorkflow = async () => {
    try {
      setLoading(true)
      const data = await workflowService.getWorkflow(id, user.id)
      setWorkflow(WorkflowModel.fromJSON(data))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const saveWorkflow = async () => {
    try {
      setLoading(true)
      const workflowData = workflow.toJSON()
      
      if (workflow.id) {
        await workflowService.updateWorkflow(workflow.id, workflowData, user.id)
      } else {
        const saved = await workflowService.createWorkflow(workflowData, user.id, user.id)
        setWorkflow(prev => {
          const updated = new WorkflowModel(prev.toJSON())
          updated.id = saved.id
          return updated
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'workflow-node',
    drop: (item, monitor) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect()
      if (!canvasRect) return

      const dropOffset = monitor.getClientOffset()
      const position = {
        x: (dropOffset.x - canvasRect.left - canvasOffset.x) / canvasScale,
        y: (dropOffset.y - canvasRect.top - canvasOffset.y) / canvasScale
      }

      const node = workflow.addNode(item.nodeType, position)
      setWorkflow(new WorkflowModel(workflow.toJSON()))
      setSelectedNode(node)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  })

  const updateNodeConfig = useCallback((nodeId, config) => {
    const node = workflow.getNode(nodeId)
    if (node) {
      node.updateConfig(config)
      setWorkflow(new WorkflowModel(workflow.toJSON()))
    }
  }, [workflow])

  const deleteNode = useCallback((nodeId) => {
    workflow.removeNode(nodeId)
    setWorkflow(new WorkflowModel(workflow.toJSON()))
    setSelectedNode(null)
  }, [workflow])

  const moveNode = useCallback((nodeId, position) => {
    workflow.updateNode(nodeId, { position })
    setWorkflow(new WorkflowModel(workflow.toJSON()))
  }, [workflow])

  const handleCanvasWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY * -0.01
    const newScale = Math.min(Math.max(canvasScale + delta, 0.25), 3)
    setCanvasScale(newScale)
  }, [canvasScale])

  const startConnection = useCallback((nodeId, portType) => {
    setIsConnecting(true)
    setConnectionStart({ nodeId, portType })
  }, [])

  const completeConnection = useCallback((targetNodeId, inputPort = 'trigger') => {
    if (connectionStart && connectionStart.nodeId !== targetNodeId) {
      workflow.connectNodes(
        connectionStart.nodeId, 
        targetNodeId, 
        connectionStart.portType, 
        inputPort
      )
      setWorkflow(new WorkflowModel(workflow.toJSON()))
    }
    setIsConnecting(false)
    setConnectionStart(null)
  }, [workflow, connectionStart])

  const cancelConnection = useCallback(() => {
    setIsConnecting(false)
    setConnectionStart(null)
  }, [])

  const deleteConnection = useCallback((fromNodeId, toNodeId, outputPort) => {
    workflow.disconnectNodes(fromNodeId, toNodeId, outputPort)
    setWorkflow(new WorkflowModel(workflow.toJSON()))
    setSelectedConnection(null)
  }, [workflow])

  const WorkflowNode = ({ node }) => {
    const nodeDefinition = WORKFLOW_NODE_DEFINITIONS.find(def => def.id === node.type)
    const [{ isDragging }, drag] = useDrag({
      type: 'canvas-node',
      item: { id: node.id, type: node.type },
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      })
    })

    if (!nodeDefinition) return null

    return (
      <div
        ref={drag}
        className={`workflow-node ${selectedNode?.id === node.id ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{
          left: node.position.x,
          top: node.position.y,
          transform: `scale(${canvasScale})`
        }}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedNode(node)
        }}
      >
        <div className="node-header">
          <span className="node-icon">{nodeDefinition.icon}</span>
          <span className="node-title">{nodeDefinition.name}</span>
        </div>
        <div className="node-body">
          <div className="node-config-status">
            {Object.keys(node.config).length > 0 ? '✓ Configured' : 'Not configured'}
          </div>
        </div>
        <div className="node-ports">
          {nodeDefinition.inputs.map((input, index) => (
            <div 
              key={input} 
              className={`input-port ${isConnecting && connectionStart?.nodeId !== node.id ? 'connectable' : ''}`}
              data-port={input}
              style={{ top: `${30 + (index * 20)}px` }}
              onClick={(e) => {
                e.stopPropagation()
                if (isConnecting && connectionStart?.nodeId !== node.id) {
                  completeConnection(node.id, input)
                }
              }}
            />
          ))}
          {nodeDefinition.outputs.map((output, index) => (
            <div 
              key={output} 
              className={`output-port ${!isConnecting ? 'connectable' : ''}`}
              data-port={output}
              style={{ top: `${30 + (index * 20)}px` }}
              onClick={(e) => {
                e.stopPropagation()
                if (!isConnecting) {
                  startConnection(node.id, output)
                }
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  const NodePalette = ({ category, nodes }) => {
    const [isExpanded, setIsExpanded] = useState(true)

    return (
      <div className="node-palette-section">
        <div 
          className="palette-header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="palette-title">{category}</span>
          <span className="palette-toggle">{isExpanded ? '▼' : '▶'}</span>
        </div>
        {isExpanded && (
          <div className="palette-nodes">
            {nodes.map(nodeDefinition => (
              <PaletteNode key={nodeDefinition.id} nodeDefinition={nodeDefinition} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const PaletteNode = ({ nodeDefinition }) => {
    const [{ isDragging }, drag] = useDrag({
      type: 'workflow-node',
      item: { nodeType: nodeDefinition.id },
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      })
    })

    return (
      <div
        ref={drag}
        className={`palette-node ${isDragging ? 'dragging' : ''}`}
        title={nodeDefinition.description}
      >
        <span className="node-icon">{nodeDefinition.icon}</span>
        <span className="node-name">{nodeDefinition.name}</span>
      </div>
    )
  }

  const ConfigPanel = ({ node }) => {
    if (!node) {
      return (
        <div className="config-panel-empty">
          <h3>No Node Selected</h3>
          <p>Select a node from the canvas to configure it</p>
        </div>
      )
    }

    const nodeDefinition = WORKFLOW_NODE_DEFINITIONS.find(def => def.id === node.type)
    if (!nodeDefinition) return null

    return (
      <div className="config-panel-content">
        <div className="config-header">
          <h3>{nodeDefinition.icon} {nodeDefinition.name}</h3>
          <p>{nodeDefinition.description}</p>
        </div>

        <div className="config-form">
          {Object.entries(nodeDefinition.configSchema).map(([key, schema]) => (
            <div key={key} className="config-field">
              <label>{schema.label}</label>
              {schema.type === 'text' && (
                <input
                  type="text"
                  value={node.config[key] || schema.default || ''}
                  onChange={(e) => updateNodeConfig(node.id, { [key]: e.target.value })}
                  placeholder={schema.placeholder}
                  required={schema.required}
                />
              )}
              {schema.type === 'textarea' && (
                <textarea
                  value={node.config[key] || schema.default || ''}
                  onChange={(e) => updateNodeConfig(node.id, { [key]: e.target.value })}
                  placeholder={schema.placeholder}
                  required={schema.required}
                  rows={3}
                />
              )}
              {schema.type === 'number' && (
                <input
                  type="number"
                  value={node.config[key] || schema.default || 0}
                  onChange={(e) => updateNodeConfig(node.id, { [key]: parseFloat(e.target.value) })}
                  min={schema.min}
                  max={schema.max}
                  required={schema.required}
                />
              )}
              {schema.type === 'select' && (
                <select
                  value={node.config[key] || schema.default || ''}
                  onChange={(e) => updateNodeConfig(node.id, { [key]: e.target.value })}
                  required={schema.required}
                >
                  {schema.options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}
              {schema.type === 'boolean' && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={node.config[key] ?? schema.default ?? false}
                    onChange={(e) => updateNodeConfig(node.id, { [key]: e.target.checked })}
                  />
                  <span>{schema.label}</span>
                </label>
              )}
            </div>
          ))}
        </div>

        <div className="config-actions">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteNode(node.id)}
          >
            Delete Node
          </Button>
        </div>
      </div>
    )
  }

  // Group nodes by category
  const nodesByCategory = WORKFLOW_NODE_DEFINITIONS.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = []
    }
    acc[node.category].push(node)
    return acc
  }, {})

  if (loading && !workflow.nodes.size) {
    return <div className="workflow-builder-loading">Loading workflow...</div>
  }

  if (error) {
    return (
      <div className="workflow-builder-error">
        <h2>Error loading workflow</h2>
        <p>{error}</p>
        <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="enhanced-workflow-builder">
      <div className="builder-header">
        <div className="workflow-info">
          <input
            type="text"
            value={workflow.name}
            onChange={(e) => {
              workflow.name = e.target.value
              setWorkflow(new WorkflowModel(workflow.toJSON()))
            }}
            className="workflow-title"
            placeholder="Workflow Name"
          />
          <textarea
            value={workflow.description}
            onChange={(e) => {
              workflow.description = e.target.value
              setWorkflow(new WorkflowModel(workflow.toJSON()))
            }}
            className="workflow-description"
            placeholder="Workflow Description"
            rows={2}
          />
        </div>
        <div className="builder-actions">
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button onClick={saveWorkflow} disabled={loading}>
            {loading ? 'Saving...' : 'Save Workflow'}
          </Button>
        </div>
      </div>

      <div className="builder-content">
        <div className="node-palette">
          <h3>Node Library</h3>
          {Object.entries(nodesByCategory).map(([category, nodes]) => (
            <NodePalette key={category} category={category} nodes={nodes} />
          ))}
        </div>

        <div 
          ref={(el) => {
            canvasRef.current = el
            drop(el)
          }}
          className={`workflow-canvas ${isOver && canDrop ? 'drag-over' : ''} ${isConnecting ? 'connecting' : ''}`}
          onWheel={handleCanvasWheel}
          onClick={() => {
            setSelectedNode(null)
            setSelectedConnection(null)
            if (isConnecting) {
              cancelConnection()
            }
          }}
        >
          <div 
            className="canvas-content"
            style={{
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`
            }}
          >
            {Array.from(workflow.nodes.values()).map(node => (
              <WorkflowNode key={node.id} node={node} />
            ))}
            
            {/* SVG layer for connections */}
            <svg className="connections-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
              {Array.from(workflow.nodes.values()).map(node => 
                node.connections.outputs.map(connection => {
                  const targetNode = workflow.getNode(connection.nodeId)
                  return (
                    <WorkflowConnection
                      key={`${node.id}-${connection.nodeId}-${connection.outputPort}`}
                      fromNode={node}
                      toNode={targetNode}
                      fromPort={connection.outputPort}
                      toPort={connection.inputPort}
                      isSelected={selectedConnection?.from === node.id && selectedConnection?.to === connection.nodeId}
                      onSelect={() => setSelectedConnection({ from: node.id, to: connection.nodeId, port: connection.outputPort })}
                      onDelete={() => deleteConnection(node.id, connection.nodeId, connection.outputPort)}
                    />
                  )
                })
              )}
            </svg>
          </div>
          
          {workflow.nodes.size === 0 && (
            <div className="canvas-empty-state">
              <h3>Start Building Your Workflow</h3>
              <p>Drag nodes from the palette to begin</p>
            </div>
          )}
        </div>

        <div className="config-panel">
          <ConfigPanel node={selectedNode} />
        </div>
      </div>
    </div>
  )
}

export default EnhancedWorkflowBuilder